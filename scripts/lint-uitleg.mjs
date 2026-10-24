// Vaste regels voor de uitleg in de app (stappenplan, tussenstappen, tips, hints, denkfouten), per sjabloon.
// Draait mee in npm test. De regels staan in src/kwaliteit.js; de generators gebruiken ze als poort.
//   node scripts/lint-uitleg.mjs [sommen per onderdeel/niveau=200] [--rauw]
// Faalt als (1) een som die door de poort komt toch een probleem heeft, (2) een som geen sjabloon heeft,
// (3) een sjabloon geen uitlegkaart heeft, of (4) een sjabloon zo vaak fout is dat de poort het niet oplost.
// --rauw: toon ook per sjabloon hoe vaak de poort een som moest afkeuren (= zwakke plekken in de generator).
process.env.DATABASE_URL ||= 'postgresql://niet-nodig@localhost/x';
const { kidStore } = await import('../src/db.js');
const C = await import('../src/curriculum.js');
const { problemen, REGELS } = await import('../src/kwaliteit.js');
const { kaartVoor } = await import('../src/uitleg/index.js');

const N = Number(process.argv[2]) || 200;
const RAUW = process.argv.includes('--rauw');
const strip = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const fouten = []; // harde fouten
const rauw = {}; // sjabloon → { n, afgekeurd, regels }
const zonderKaart = new Set();
let total = 0;

for (const [lang, cur] of [['nl', 'nl'], ['af', 'za']]) {
  await kidStore.run({ kid: 1, cur, lang, name: 'Sam' }, () => {
    for (const c of C.CATEGORIES) for (let lv = 0; lv < 4; lv++) for (let k = 0; k < N; k++) {
      total++;
      const r = C.generateRaw(c.id, lv);
      const key = `${lang}:${r.tpl || `${c.id}.${lv}?`}`;
      const st = (rauw[key] ||= { n: 0, afgekeurd: 0, regels: {} });
      st.n++;
      const pr = problemen(r, { hints: C.hintsFor });
      if (pr.length) { st.afgekeurd++; for (const p of pr) (st.regels[p.regel] ||= p.detail); }
      const q = C.generate(c.id, lv);
      if (!q.tpl) fouten.push(`${lang} ${c.id} niveau ${lv}: som zonder sjabloon-id ("${strip(q.text).slice(0, 60)}")`);
      else if (!kaartVoor(lang, q.tpl)) zonderKaart.add(`${lang}:${q.tpl}`);
      for (const p of problemen(q, { hints: C.hintsFor })) fouten.push(`${lang}:${q.tpl} — ${REGELS[p.regel]}: ${p.detail} ("${strip(q.text).slice(0, 60)}")`);
    }
  });
}

const zwak = Object.entries(rauw).filter(([, s]) => s.afgekeurd / s.n > 0.9);
if (RAUW) {
  console.log('Afgekeurd door de poort (per sjabloon, rauwe generator):');
  for (const [k, s] of Object.entries(rauw).filter(([, s]) => s.afgekeurd).sort((a, b) => b[1].afgekeurd / b[1].n - a[1].afgekeurd / a[1].n))
    console.log(`  ${k.padEnd(28)} ${String(Math.round((100 * s.afgekeurd) / s.n)).padStart(3)}%  ${Object.entries(s.regels).map(([r, d]) => `${r}: ${d}`).join(' | ').slice(0, 150)}`);
}
const uniek = [...new Set(fouten)];
for (const f of uniek.slice(0, 40)) console.log('✗', f);
if (uniek.length > 40) console.log(`  … en nog ${uniek.length - 40}`);
for (const [k, s] of zwak) console.log(`✗ ${k}: ${Math.round((100 * s.afgekeurd) / s.n)}% van de sommen afgekeurd (${Object.keys(s.regels).join(', ')}) — repareer de generator`);
if (zonderKaart.size) console.log(`✗ ${zonderKaart.size} sjablonen zonder uitlegkaart: ${[...zonderKaart].slice(0, 12).join(', ')}${zonderKaart.size > 12 ? ' …' : ''}`);
const afgekeurd = Object.values(rauw).reduce((a, s) => a + s.afgekeurd, 0);
const ok = !uniek.length && !zwak.length && !zonderKaart.size;
console.log(`${ok ? '✓' : '✗'} Uitleg-regels: ${total} sommen (NL en AF), ${Object.keys(rauw).length} sjablonen; de poort keurde ${(100 * afgekeurd / total).toFixed(1)}% van de rauwe sommen af.`);
process.exit(ok ? 0 : 1);
