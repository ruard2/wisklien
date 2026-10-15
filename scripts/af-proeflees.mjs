// Afrikaans laten nalezen door OpenAI (kost AI-aanroepen). Schrijft voorstellen naar een JSON-bestand;
// er wordt NIETS automatisch aangepast.
//   node scripts/af-proeflees.mjs uit.json
import '../src/env.js';
import fs from 'node:fs';
import OpenAI from 'openai';
import { kidStore } from '../src/db.js';
import { GENERATORS, generate } from '../src/za/generators.js';
import { DIDACTIEK, ALGEMEEN } from '../src/za/didactiek.js';
import { MNEMONICS } from '../src/za/mnemonics.js';

const o = new OpenAI();
const MODEL = process.env.PROOF_MODEL || 'gpt-6-luna';
const SYS = `Jy is 'n ervare Afrikaanse taalversorger en onderwyser in Suid-Afrikaanse laerskole (KABV/CAPS Wiskunde, graad 4-7).
Jy kry tekste uit 'n wiskunde-app vir kinders van 9 tot 13. Kontroleer spelling, grammatika, idioom en natuurlike Suid-Afrikaanse Afrikaans
(geen Nederlands of anglisismes nie), en of die wiskundewoorde dié is wat in Suid-Afrikaanse skole gebruik word.
Reëls:
- Gee SLEGS tekste wat verbeter moet word. Laat goeie tekste weg.
- Behou plekhouers soos {n}, {b}, {c}, HTML-etikette, emoji, getalle, R-bedrae en simbole (×, ÷, □) presies.
- Hou dit kort en kindvriendelik; verander nie die betekenis of die wiskunde nie.
- Antwoord as JSON: {"fixes":[{"id":"…","af":"verbeterde teks","waarom":"kort rede"}]}`;

async function check(items, label) {
  const out = [];
  for (let i = 0; i < items.length; i += 60) {
    const batch = items.slice(i, i + 60);
    const r = await o.chat.completions.create({
      model: MODEL, response_format: { type: 'json_object' }, max_completion_tokens: 16000,
      messages: [{ role: 'system', content: SYS }, { role: 'user', content: JSON.stringify(batch.map(({ id, af, nl }) => (nl ? { id, nederlands: nl, afrikaans: af } : { id, afrikaans: af }))) }],
    });
    try { out.push(...(JSON.parse(r.choices[0].message.content).fixes || [])); } catch { console.error('ongeldig antwoord', label, i); }
    console.log(`${label}: ${Math.min(i + 60, items.length)}/${items.length}`);
  }
  return out.map((f) => ({ ...f, bron: label, oud: items.find((x) => x.id === f.id)?.af }));
}

// 1. app-teksten (public/i18n.js) en server-teksten (src/i18n.js)
const dict = (file, name) => {
  const src = fs.readFileSync(file, 'utf8');
  const body = src.slice(src.indexOf(`const ${name} = {`));
  const obj = new Function(`${body.slice(0, body.indexOf('\n};') + 3)}; return ${name};`)();
  return Object.entries(obj).map(([nl, af], i) => ({ id: `${name}${i}`, nl, af }));
};
const app = dict('public/i18n.js', 'AF'), server = dict('src/i18n.js', 'AFS');

// 2. handboek en geheuehulpies
const did = [];
for (const [cat, d] of Object.entries(DIDACTIEK)) {
  did.push({ id: `${cat}.kern`, af: d.kern }, { id: `${cat}.voorkennis`, af: d.voorkennis });
  d.niveaus.forEach((n, i) => { did.push({ id: `${cat}.${i}.doel`, af: n.doel }); n.aanpak.forEach((a, j) => did.push({ id: `${cat}.${i}.aanpak${j}`, af: a })); });
  d.fouten.forEach((f, i) => did.push({ id: `${cat}.fout${i}`, af: f.fout }, { id: `${cat}.hulp${i}`, af: f.hulp }));
  Object.entries(d.woorden).forEach(([w, u]) => did.push({ id: `${cat}.woord.${w}`, af: `${w}: ${u}` }));
  did.push({ id: `${cat}.controle`, af: d.controle });
}
Object.entries(ALGEMEEN).forEach(([k, v]) => did.push({ id: `algemeen.${k}`, af: v }));
Object.entries(MNEMONICS).forEach(([cat, ms]) => ms.forEach((m, i) => did.push({ id: `${cat}.mn${i}`, af: `${m.kort} — ${m.uitleg}` })));

// 3. somme: per onderwerp en vlak twee voorbeelde, alle teksten (vraag, stappe, tussenstappe)
const seen = new Set(), sums = [];
await kidStore.run({ kid: 0, cur: 'za', lang: 'af' }, async () => {
  for (const cat of Object.keys(GENERATORS)) for (let lv = 0; lv < 4; lv++) for (let k = 0; k < 3; k++) {
    const q = generate(cat, lv);
    for (const t of [q.text, ...q.steps, ...q.guide.flatMap((g) => [g.ask, g.tip]), q.guideFinal, ...(q.wrong || []).flatMap((w) => [w.label, w.fix])]) {
      if (t && !seen.has(t)) { seen.add(t); sums.push({ id: `som${sums.length}`, af: t }); }
    }
  }
});

const res = [...await check(app, 'app'), ...await check(server, 'server'), ...await check(did, 'handboek'), ...await check(sums, 'somme')];
fs.writeFileSync(process.argv[2] || 'af-proeflees.json', JSON.stringify(res, null, 1));
console.log(`${res.length} voorstellen → ${process.argv[2] || 'af-proeflees.json'}`);
process.exit(0);
