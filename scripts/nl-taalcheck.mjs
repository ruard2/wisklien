// Taalcontrole Nederlands: zoekt vertaald Engels en woorden die Nederlandse rekenmethodes niet gebruiken
// (lijst VERMIJD in de TAALGIDS van src/didactiek.js) in alles wat een Nederlands kind leest.
//   node --env-file=.env scripts/nl-taalcheck.mjs [extra-bestand.txt …]   (bv. uitvoer van lessen-check)
// Exit 1 als er iets gevonden is.
import fs from 'node:fs';
import { TAALGIDS, DIDACTIEK, ALGEMEEN, vermijdRe } from '../src/didactiek.js';
import { MNEMONICS } from '../src/mnemonics.js';
import * as G from '../src/generators.js';

const RULES = vermijdRe();
const found = [];
const scan = (bron, text) => {
  if (!text || typeof text !== 'string') return;
  text = text.replace(/\[\[[^\]]*\]\]/g, ''); // plaatjescodes ziet het kind niet
  for (const r of RULES) { const m = text.match(r.re); if (m) found.push({ bron, woord: m[2], beter: r.beter, tekst: text.length > 160 ? text.slice(0, 160) + '…' : text }); }
};

// 1. sommen, stappen, tussenstappen, hints en denkfouten (veel varianten per onderdeel en niveau)
const seen = new Set();
for (const cat of Object.keys(G.GENERATORS)) for (let lv = 0; lv < 4; lv++) for (let i = 0; i < 40; i++) {
  const q = G.generate(cat, lv);
  for (const t of [q.text, ...q.steps, ...q.guide.flatMap((x) => [x.ask, x.tip]), q.guideFinal, ...(q.wrong || []).flatMap((w) => [w.label, w.fix]), ...G.hintsFor(q)]) {
    if (!t) continue;
    const k = String(t).replace(/\d+([.,\s]\d+)*/g, '#');
    if (seen.has(k)) continue;
    seen.add(k);
    scan(`som ${cat}/${lv}`, t);
  }
}
// 2. handboek en ezelsbruggen
for (const [cat, d] of Object.entries(DIDACTIEK)) {
  for (const t of [d.kern, d.voorkennis, ...d.modellen, ...Object.entries(d.woorden).map(([w, u]) => `${w}: ${u}`), d.controle, ...d.vermijd.map(() => ''),
    ...d.niveaus.flatMap((n) => [n.doel, ...n.aanpak, n.voorbeeld]), ...d.fouten.flatMap((f) => [f.fout, f.hulp])]) scan(`handboek ${cat}`, t);
}
Object.values(ALGEMEEN).forEach((t) => scan('handboek algemeen', t));
for (const [cat, ms] of Object.entries(MNEMONICS)) ms.forEach((m) => { scan(`ezelsbrug ${cat}`, m.kort); scan(`ezelsbrug ${cat}`, m.uitleg); });
// 3. app-teksten (Nederlandse bron van t('…')) en serverteksten
const app = fs.readFileSync('public/app.js', 'utf8');
for (const m of app.matchAll(/\bt\((['"])((?:\\.|(?!\1).)*)\1/g)) scan('app', m[2]);
for (const m of app.matchAll(/\btr\(\s*(['`])((?:\\.|(?!\1).)*)\1/g)) scan('app (eerste instelling)', m[2]);
// vaste lijsten (complimenten, moppen, ondertitels): alleen de Nederlandse versies
for (const name of ['PRAISE', 'MOPPEN', 'SUBLINES']) {
  const i = app.indexOf(`const ${name} =`);
  if (i < 0) continue;
  const block = app.slice(i, app.indexOf('\n};', i) > 0 && name === 'PRAISE' ? app.indexOf('\n};', i) : app.indexOf('\n', app.indexOf(name === 'MOPPEN' ? '\n];' : ';', i)));
  for (const m of block.matchAll(/'((?:\\.|[^'])*)'/g)) scan(`app (${name})`, m[1]);
}
const srv = fs.readFileSync('src/i18n.js', 'utf8');
for (const m of srv.matchAll(/^\s*'((?:\\.|[^'])*)'\s*:/gm)) scan('server', m[1]);
// 4. extra bestanden (bv. lessen van Max)
for (const f of process.argv.slice(2)) for (const line of fs.readFileSync(f, 'utf8').split('\n')) if (/^MAX:/.test(line)) scan(`Max (${f.split(/[\\/]/).pop()})`, line.slice(5));

const by = {};
for (const x of found) (by[x.woord.toLowerCase()] ||= []).push(x);
for (const [w, xs] of Object.entries(by).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n"${w}" → ${xs[0].beter}  (${xs.length}×)`);
  for (const x of xs.slice(0, 4)) console.log(`   [${x.bron}] ${x.tekst}`);
}
console.log(`\n${seen.size} somteksten gecontroleerd; ${found.length} vondsten.`);
process.exit(found.length ? 1 : 0);
