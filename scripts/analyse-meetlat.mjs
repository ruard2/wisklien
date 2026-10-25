// Diepe analyse van een Max-test (download van /audit, "alles" als JSON) tegen de code van NU.
//   node scripts/analyse-meetlat.mjs pad/naar/max-test-7-af.json [--md rapport.md]
//
// Wat het doet (zodat we structureel verbeteren en niet per som plakken):
//  1. Elk probleem van de beoordelaar krijgt een BRON: vaste uitleg (stappenplan, tussenstap, tip, hint, slot, denkfout,
//     kaart) of Max (begin, na fout, bij stap), en een SOORT (verklapt, vaag, sprong, andere aanpak, …).
//  2. Voor vaste uitleg maakt het de som opnieuw met het zaad van de meetlat (dezelfde getallen, de generator van nu) en
//     kijkt of de geciteerde tekst er nog in staat: "opgelost" of "nog open". Zo zie je wat een run nog meet dat al weg is.
//  3. Het groepeert open problemen per onderwerp × soort over alle sjablonen heen: patronen die in veel sjablonen terugkomen,
//     moeten in gedeelde code (tips.js, kwaliteit.js, kaarten, prompt) worden opgelost, niet per som.
//  4. Het draait de automatische regels (poort, tip-regels) op de huidige sommen van dezelfde gevallen.
process.env.DATABASE_URL ||= 'postgresql://niet-nodig@localhost/x';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
const { kidStore } = await import('../src/db.js');
const C = await import('../src/curriculum.js');
const { metZaad } = await import('../src/util.js');
const { kaartTekst } = await import('../src/uitleg/index.js');
const { problemen, REGELS, verklaptAntwoord, nederlandsInAfrikaans, snaptNiet, zelfdeVraag, noemtGetal } = await import('../src/kwaliteit.js');

const pad = process.argv[2];
if (!pad) { console.error('Gebruik: node scripts/analyse-meetlat.mjs max-test-N-xx.json [--md uit.md]'); process.exit(1); }
const mdPad = process.argv.includes('--md') ? process.argv[process.argv.indexOf('--md') + 1] : null;
const job = JSON.parse(fs.readFileSync(pad, 'utf8'));
const items = job.items || [];
const lang = job.lang || items[0]?.lang || 'nl';
const cur = lang === 'af' ? 'za' : 'nl';
const meet = JSON.parse(gunzipSync(fs.readFileSync(new URL(`../src/meetlat/${lang}.json.gz`, import.meta.url))).toString('utf8'));
const geval = Object.fromEntries(meet.cases.map((c) => [c.id, c]));

const norm = (s) => String(s ?? '').toLowerCase().replace(/\*+|["“”'’„]/g, '').replace(/\s+/g, ' ').replace(/[  ]/g, ' ').trim();
const bron = (waar) => {
  const w = String(waar || '').toLowerCase();
  if (/max/.test(w)) return /begin/.test(w) ? 'max-begin' : /stap/.test(w) ? 'max-stap' : 'max-fout';
  for (const b of ['stappenplan', 'tussenstap', 'tip', 'hint', 'slot', 'denkfout', 'kaart', 'samenhang', 'taal', 'som']) if (w.includes(b)) return b;
  return 'anders';
};
const SOORT = { onduidelik: 'onduidelijk', voorsê: 'voorzeggen' };

// huidige vaste uitleg van een geval
function nu(it) {
  const c = geval[it.geval];
  if (!c) return null;
  return kidStore.run({ kid: 1, cur, lang, name: 'Sam' }, () => {
    const q = c.seed != null ? metZaad(c.seed, () => C.generate(c.cat, c.level)) : c.q;
    const zelfde = q.tpl === c.q.tpl && q.text === c.q.text;
    const teksten = [...(q.steps || []), ...(q.guide || []).flatMap((s) => [s.ask, s.tip || '', ...(s.options || [])]), q.guideFinal || '',
      ...(C.hintsFor(q) || []), ...(q.wrong || []).flatMap((w) => [w.label, w.fix]), kaartTekst(lang, q.tpl)].map(norm);
    const autoTips = (q.guide || []).filter((s) => s.tipAuto).map((s) => norm(s.tip));
    return { q, zelfde, teksten, autoTips, poort: problemen(q, { hints: C.hintsFor }) };
  });
}
// staat (een stuk van) het citaat nog in de huidige teksten?
function nogAanwezig(citaat, teksten) {
  const delen = String(citaat || '').split(/\s*(?:\.\.\.|…|\/|\n| \| )\s*/).map(norm).map((d) => d.replace(/^(\d+\.\s*|vraag:\s*|tip by fout:\s*|tip bij fout:\s*|slot:\s*)/, '')).filter((d) => d.length >= 12);
  if (!delen.length) return null; // niet te controleren
  return delen.some((d) => teksten.some((t) => t.includes(d.slice(0, 60))));
}

const rijen = [];
for (const it of items) {
  const n = it.verdict?.problemen?.length ? nu(it) : null;
  for (const p of it.verdict?.problemen || []) {
    const b = bron(p.waar), soort = SOORT[p.soort] || p.soort;
    let status = 'max';
    if (!b.startsWith('max')) {
      const nog = n ? nogAanwezig(p.citaat, n.teksten) : null;
      status = !n ? 'onbekend' : nog === false ? 'opgelost' : nog ? 'open' : 'onbekend';
      // tip die nu automatisch is aangevuld met een rekenaanpak: verbeterd (de oude zin staat er nog, met het "hoe" erbij)
      if (status === 'open' && b === 'tip' && nogAanwezig(p.citaat, n.autoTips)) status = 'verbeterd';
    }
    rijen.push({ geval: it.geval, tpl: it.tpl, cat: it.cat, level: it.level, bron: b, soort, ernst: p.ernst || 2, status, citaat: String(p.citaat || '').replace(/\s+/g, ' ').slice(0, 160), uitleg: String(p.uitleg || '').replace(/\s+/g, ' ').slice(0, 200) });
  }
}

const tel = (xs, key) => Object.entries(xs.reduce((m, x) => ((m[key(x)] = (m[key(x)] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
const L = [];
const D = ['som', 'stappenplan', 'tussenstappen', 'tips', 'max_begin', 'max_na_fout', 'max_stap', 'samenhang', 'taal'];
const gem = (k) => { const v = items.map((x) => x.verdict?.cijfers?.[k]).filter((x) => typeof x === 'number'); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '–'; };
L.push(`# Analyse Max-test #${job.id} (${lang.toUpperCase()}, ${items.length} sommen)`);
L.push(`Versie ${job.versie || '?'} · Max ${job.model} · beoordelaar ${job.judge_model} · kind ${job.kid_model || '?'} · meetlat ${job.meetlat_versie || 'v1'}`);
L.push(`\nCijfers: ${D.map((k) => `${k} ${gem(k)}`).join(' · ')}`);
L.push(`Verklapt ${items.filter((x) => x.verdict?.max_verklapt).length} · denkfout niet herkend ${items.filter((x) => x.verdict?.max_herkent_fout === false).length} · met rekenfout ${items.filter((x) => x.verdict?.rekenfouten?.length).length}`);

const vast = rijen.filter((r) => !r.bron.startsWith('max'));
L.push(`\n## Vaste uitleg: ${vast.length} problemen — ${vast.filter((r) => r.status === 'opgelost').length} al opgelost in de code van nu, ${vast.filter((r) => r.status === 'verbeterd').length} automatisch verbeterd, ${vast.filter((r) => r.status === 'open').length} nog open, ${vast.filter((r) => r.status === 'onbekend').length} niet automatisch te controleren`);
const open = vast.filter((r) => r.status !== 'opgelost' && r.status !== 'verbeterd');
L.push('\n### Open, per bron × soort (patronen over sjablonen heen)');
for (const [k, n] of tel(open, (r) => `${r.bron} · ${r.soort}`).slice(0, 15)) {
  const xs = open.filter((r) => `${r.bron} · ${r.soort}` === k);
  L.push(`- **${k}**: ${n}× in ${new Set(xs.map((r) => r.tpl)).size} sjablonen (${[...new Set(xs.map((r) => r.cat))].join(', ')})`);
  for (const r of xs.slice(0, 4)) L.push(`  - ${r.tpl} [${r.status}] “${r.citaat}” — ${r.uitleg}`);
}
L.push('\n### Per onderwerp (open vaste uitleg)');
for (const [k, n] of tel(open, (r) => r.cat)) L.push(`- ${k}: ${n}`);

const max = rijen.filter((r) => r.bron.startsWith('max'));
L.push(`\n## Max: ${max.length} problemen`);
for (const [k, n] of tel(max, (r) => `${r.bron} · ${r.soort}`).slice(0, 14)) {
  const xs = max.filter((r) => `${r.bron} · ${r.soort}` === k);
  L.push(`- **${k}**: ${n}× (${new Set(xs.map((r) => r.cat)).size} onderwerpen)`);
  for (const r of xs.slice(0, 3)) L.push(`  - ${r.tpl}: “${r.citaat}” — ${r.uitleg}`);
}

// Eigen metingen op de gesprekken (zonder beoordelaar, dus vergelijkbaar tussen runs en modellen)
{
  const nums = (t) => new Set((String(t).replace(/\[\[[^\]]*\]\]/g, ' ').match(/\d+(?:,\d+)?/g) || []));
  let tegen = 0, tegenN = 0, herh = 0, herhN = 0, verkl = 0, nl = 0, maxN = 0, stapZonder = 0, stapN = 0;
  for (const it of items) {
    const t = it.gesprekken?.na_fout || [], given = it.fout_antwoord?.gegeven;
    const maxTeksten = [it.gesprekken?.begin?.max, ...t.filter((x) => x.wie === 'max').map((x) => x.tekst), it.gesprekken?.stap?.max].filter(Boolean);
    for (const m of maxTeksten) { maxN++; if (lang === 'af' && nederlandsInAfrikaans(m).length) nl++; }
    if (it.gesprekken?.begin?.max && verklaptAntwoord(it.gesprekken.begin.max, it.antwoord, { som: it.som })) verkl++;
    for (let i = 1; i < t.length; i++) {
      if (t[i].wie !== 'max' || t[i - 1].wie !== 'kind') continue;
      if (noemtGetal(t[i - 1].tekst, it.antwoord)) { tegenN++; if (!noemtGetal(t[i].tekst, given) && /\b(klopt|precies|goed|juist|reg|presies|korrek)\b/i.test(t[i].tekst)) tegen++; }
      if (i >= 2 && snaptNiet(t[i - 1].tekst)) { herhN++; if (zelfdeVraag(t[i - 2].tekst, t[i].tekst)) herh++; }
      if (!noemtGetal(t[i - 1].tekst, it.antwoord) && verklaptAntwoord(t[i].tekst, it.antwoord, { som: it.som, kind: t.slice(0, i).filter((x) => x.wie === 'kind').map((x) => x.tekst).join(' ') })) verkl++;
    }
    const st = it.gesprekken?.stap;
    if (st?.max) { stapN++; const bekend = new Set([...nums(it.som), ...nums(st.vraag), ...nums(st.gegeven), ...nums(st.tip || '')]); if (![...nums(st.max)].some((x) => !bekend.has(x))) stapZonder++; }
  }
  const pct = (a, b) => (b ? `${a}/${b} (${Math.round((100 * a) / b)}%)` : '–');
  L.push('\n## Eigen metingen (zonder beoordelaar; vergelijk deze tussen runs)');
  L.push(`- Kind zegt het goede antwoord na een fout, Max bevestigt zonder het eerdere antwoord te noemen: ${pct(tegen, tegenN)}`);
  L.push(`- Na "snap het niet" bijna dezelfde vraag: ${pct(herh, herhN)}`);
  L.push(`- Max noemt het eindantwoord voordat het kind het zei (detector): ${verkl}`);
  L.push(`- Hulp bij een tussenstap zonder nieuw (makkelijker) voorbeeld: ${pct(stapZonder, stapN)}`);
  if (lang === 'af') L.push(`- Berichten van Max met Nederlandse/Engelse woorden: ${pct(nl, maxN)}`);
}

// Huidige poort op dezelfde gevallen
const poort = [];
for (const it of items) { const n = nu(it); if (n) for (const p of n.poort) poort.push(`${it.tpl}: ${REGELS[p.regel]} — ${p.detail}`); }
const vers = items.map(nu).filter(Boolean);
L.push(`\n## Code van nu op dezelfde gevallen\n- ${vers.filter((x) => x.zelfde).length}/${vers.length} gevallen geven nog precies dezelfde som (de rest: generator veranderd → meetlat gebruikt de bevroren som)`);
L.push(`- Automatische regels: ${poort.length ? poort.length + ' meldingen' : 'geen meldingen'}`);
for (const x of poort.slice(0, 10)) L.push(`  - ${x}`);

const out = L.join('\n');
if (mdPad) fs.writeFileSync(mdPad, out);
console.log(out);
process.exit(0);
