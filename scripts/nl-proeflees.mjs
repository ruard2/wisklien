// Nederlands laten nalezen door OpenAI (kost AI-aanroepen), met de TAALGIDS als norm.
// Schrijft voorstellen naar een JSON-bestand; er wordt NIETS automatisch aangepast.
//   node scripts/nl-proeflees.mjs uit.json [app,server,handboek,somme]
import '../src/env.js';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import OpenAI from 'openai';
import * as G from '../src/generators.js';
import { DIDACTIEK, ALGEMEEN, taalgidsText } from '../src/didactiek.js';
import { MNEMONICS } from '../src/mnemonics.js';

const o = new OpenAI();
const MODEL = process.env.PROOF_MODEL || 'gpt-6-luna';
const SYS = `Je bent een ervaren leerkracht groep 7-8 en taalredacteur van een Nederlandse rekenmethode (zoals De wereld in getallen en Alles telt).
Je krijgt teksten uit een reken-app voor kinderen van 9 tot 12 die achterlopen met rekenen. Zoek:
- vertaald Engels (letterlijk vertaalde zinsbouw of uitdrukkingen, zoals "laten we", "je hebt het", "maakt sense", "goed werk", "dat is correct");
- woorden die Nederlandse rekenmethodes NIET gebruiken, of afwijken van de taalgids hieronder;
- stroeve, onnatuurlijke of te moeilijke zinnen voor een kind van 10 (Nederlands, niet Vlaams);
- spelfouten.
${taalgidsText()}
Regels:
- Geef ALLEEN teksten die echt beter moeten. Goede teksten laat je weg. Verander niets alleen omdat het anders ook kan.
- Behoud plekhouders zoals {n}, {b}, {m}, HTML-tags, emoji, getallen, € en symbolen (×, :, −, ≈, □) precies.
- Verander de rekenaanpak of de wiskunde niet; houd de methodewoorden uit de taalgids aan (rijgen, splitsen, kolomsgewijs, happen, verhoudingstabel, positieschema, gelijknamig, …).
- Antwoord als JSON: {"fixes":[{"id":"…","nl":"verbeterde tekst","waarom":"kort"}]}`;

async function check(items, label) {
  const out = [];
  for (let i = 0; i < items.length; i += 60) {
    const batch = items.slice(i, i + 60);
    try {
      const r = await o.chat.completions.create({ model: MODEL, response_format: { type: 'json_object' }, max_completion_tokens: 16000,
        messages: [{ role: 'system', content: SYS }, { role: 'user', content: JSON.stringify(batch.map(({ id, nl }) => ({ id, tekst: nl }))) }] });
      out.push(...(JSON.parse(r.choices[0].message.content).fixes || []));
    } catch (e) { console.error('fout', label, i, e.message); }
    console.log(`${label}: ${Math.min(i + 60, items.length)}/${items.length}`);
  }
  return out.map((f) => ({ ...f, bron: label, oud: items.find((x) => x.id === f.id)?.nl }));
}

const want = (process.argv[3] || 'app,server,handboek,somme').split(',');
const parts = [];
if (want.includes('app')) {
  const keys = JSON.parse(execFileSync(process.execPath, ['scripts/i18n-keys.mjs', '--list'], { encoding: 'utf8' }));
  parts.push(['app', keys.map((nl, i) => ({ id: `app${i}`, nl }))]);
}
if (want.includes('server')) {
  const src = fs.readFileSync('src/i18n.js', 'utf8');
  const keys = [...src.matchAll(/^\s*'((?:\\.|[^'])*)'\s*:/gm)].map((m) => m[1].replace(/\\'/g, "'"));
  parts.push(['server', keys.map((nl, i) => ({ id: `srv${i}`, nl }))]);
}
if (want.includes('handboek')) {
  const did = [];
  for (const [cat, d] of Object.entries(DIDACTIEK)) {
    did.push({ id: `${cat}.kern`, nl: d.kern }, { id: `${cat}.voorkennis`, nl: d.voorkennis }, { id: `${cat}.controle`, nl: d.controle });
    d.niveaus.forEach((n, i) => { did.push({ id: `${cat}.${i}.doel`, nl: n.doel }, { id: `${cat}.${i}.voorbeeld`, nl: n.voorbeeld }); n.aanpak.forEach((a, j) => did.push({ id: `${cat}.${i}.aanpak${j}`, nl: a })); });
    d.fouten.forEach((f, i) => did.push({ id: `${cat}.fout${i}`, nl: f.fout }, { id: `${cat}.hulp${i}`, nl: f.hulp }));
    Object.entries(d.woorden).forEach(([w, u]) => did.push({ id: `${cat}.woord.${w}`, nl: u }));
  }
  Object.entries(ALGEMEEN).forEach(([k, v]) => did.push({ id: `algemeen.${k}`, nl: v }));
  Object.entries(MNEMONICS).forEach(([cat, ms]) => ms.forEach((m, i) => did.push({ id: `${cat}.mn${i}.kort`, nl: m.kort }, { id: `${cat}.mn${i}.uitleg`, nl: m.uitleg })));
  parts.push(['handboek', did]);
}
if (want.includes('somme')) {
  const seen = new Set(), sums = [];
  for (const cat of Object.keys(G.GENERATORS)) for (let lv = 0; lv < 4; lv++) for (let k = 0; k < 6; k++) {
    const q = G.generate(cat, lv);
    for (const t of [q.text, ...q.steps, ...q.guide.flatMap((g) => [g.ask, g.tip]), q.guideFinal, ...(q.wrong || []).flatMap((w) => [w.label, w.fix])]) {
      if (!t) continue;
      const key = String(t).replace(/\d+([.,\s]\d+)*/g, '#');
      if (!seen.has(key)) { seen.add(key); sums.push({ id: `som${sums.length}`, nl: t, cat }); }
    }
  }
  parts.push(['somme', sums]);
}
const res = [];
for (const [label, items] of parts) res.push(...await check(items, label));
fs.writeFileSync(process.argv[2] || 'nl-proeflees.json', JSON.stringify(res, null, 1));
console.log(`${res.length} voorstellen → ${process.argv[2] || 'nl-proeflees.json'}`);
process.exit(0);
