// Leerlog uitlezen: wat doen de kinderen, waar lopen ze vast, wat vinden ze van de uitleg van Max?
//   node scripts/leerlog.mjs overzicht [dagen]        samenvatting (standaard 7 dagen)
//   node scripts/leerlog.mjs gesprekken [aantal] [nl|af]  laatste gesprekken en lessen, leesbaar
//   node scripts/leerlog.mjs duimpjes [dagen]          alle 👎 met de uitleg erbij
//   node scripts/leerlog.mjs export [dagen] [bestand]  alles als JSONL (voor verdere analyse)
// Database: LEERLOG_DATABASE_URL (de online database, "DATABASE_PUBLIC_URL" van Railway) of anders DATABASE_URL.
import '../src/env.js';
import fs from 'node:fs';
import pg from 'pg';

const url = process.env.LEERLOG_DATABASE_URL || process.env.DATABASE_URL;
if (!url) { console.error('Zet LEERLOG_DATABASE_URL in .env (Railway → Postgres → Variables → DATABASE_PUBLIC_URL).'); process.exit(1); }
const db = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false } });
await db.connect();
const [mode = 'overzicht', a1, a2] = process.argv.slice(2);
const q = async (sql, p) => (await db.query(sql, p)).rows;
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '–');
const cut = (s, n = 160) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };

if (mode === 'overzicht') {
  const days = Number(a1) || 7;
  const since = `now() - interval '${days} days'`;
  console.log(`\n=== Leerlog, laatste ${days} dagen ===`);
  const kinds = await q(`SELECT lang, kind, COUNT(*)::int n FROM public.leerlog WHERE created_at > ${since} GROUP BY 1,2 ORDER BY 1,2`);
  console.log('\nGebeurtenissen:'); for (const r of kinds) console.log(`  ${r.lang}  ${r.kind.padEnd(15)} ${r.n}`);

  console.log('\nPer kind (schuilnaam):');
  for (const r of await q(`SELECT alias, lang, country, grade, age,
      COUNT(*) FILTER (WHERE kind='antwoord')::int ant, COUNT(*) FILTER (WHERE kind='antwoord' AND (data->>'goed')::bool)::int goed,
      COUNT(*) FILTER (WHERE kind='antwoord' AND (data->>'weetniet')::bool)::int weetniet,
      COUNT(*) FILTER (WHERE kind IN ('gesprek','les'))::int max, COUNT(*) FILTER (WHERE kind='feedback')::int fb,
      MAX(created_at) laatst FROM public.leerlog WHERE created_at > ${since} GROUP BY 1,2,3,4,5 ORDER BY laatst DESC`)) {
    console.log(`  ${r.alias} (${r.lang}/${r.country}, ${r.country === 'ZA' ? 'graad' : 'groep'} ${r.grade ?? '?'}, ${r.age ?? '?'} jr): ${r.ant} antwoorden, ${pct(r.goed, r.ant)} goed, ${r.weetniet}× weet niet, ${r.max} berichten van Max, ${r.fb} feedback; laatst ${r.laatst.toISOString().slice(0, 16).replace('T', ' ')}`);
  }

  console.log('\nOnderdelen met de meeste fouten:');
  for (const r of await q(`SELECT lang, cat, level, COUNT(*)::int n, COUNT(*) FILTER (WHERE (data->>'goed')::bool)::int goed
      FROM public.leerlog WHERE kind='antwoord' AND created_at > ${since} GROUP BY 1,2,3 HAVING COUNT(*) >= 3 ORDER BY COUNT(*) FILTER (WHERE (data->>'goed')::bool)::float / COUNT(*) LIMIT 12`)) {
    console.log(`  ${r.lang}  ${String(r.cat).padEnd(16)} niveau ${r.level}: ${pct(r.goed, r.n)} goed (${r.n} sommen)`);
  }

  console.log('\nDenkfouten:');
  for (const r of await q(`SELECT lang, data->>'denkfout' d, COUNT(*)::int n FROM public.leerlog WHERE kind='antwoord' AND data->>'denkfout' IS NOT NULL AND created_at > ${since} GROUP BY 1,2 ORDER BY n DESC LIMIT 10`)) console.log(`  ${r.lang}  ${r.n}× ${r.d}`);

  console.log('\nDuimpjes bij de uitleg van Max:');
  for (const r of await q(`SELECT lang, COUNT(*) FILTER (WHERE data->>'stem'='up')::int op, COUNT(*) FILTER (WHERE data->>'stem'='down')::int neer
      FROM public.leerlog WHERE kind='feedback' AND created_at > ${since} GROUP BY 1`)) console.log(`  ${r.lang}  👍 ${r.op}  👎 ${r.neer}`);
  for (const r of await q(`SELECT lang, data->>'waarom' w, COUNT(*)::int n FROM public.leerlog WHERE kind='feedback' AND data->>'waarom' IS NOT NULL AND created_at > ${since} GROUP BY 1,2 ORDER BY n DESC`)) console.log(`     ${r.lang}  ${r.n}× ${r.w}`);
  // hielp de uitleg? volgende antwoord in hetzelfde onderdeel na een gesprek
  const help = await q(`SELECT g.lang, COUNT(*)::int n, COUNT(*) FILTER (WHERE (a.data->>'goed')::bool)::int goed FROM public.leerlog g
      JOIN LATERAL (SELECT data FROM public.leerlog x WHERE x.kid_id=g.kid_id AND x.kind='antwoord' AND x.cat=g.cat AND x.created_at > g.created_at ORDER BY x.created_at LIMIT 1) a ON true
      WHERE g.kind IN ('gesprek','les') AND g.created_at > ${since} GROUP BY 1`);
  for (const r of help) console.log(`  ${r.lang}  na een uitleg van Max was de volgende som in dat onderdeel ${pct(r.goed, r.n)} goed (${r.n}×)`);

  const ouder = await q(`SELECT lang, alias, created_at, data->>'tekst' t FROM public.leerlog WHERE kind='ouder_feedback' ORDER BY id DESC LIMIT 10`);
  if (ouder.length) { console.log('\nFeedback van ouders:'); for (const r of ouder) console.log(`  [${r.created_at.toISOString().slice(0, 10)} ${r.lang} ${r.alias}] ${cut(r.t, 400)}`); }
}

if (mode === 'gesprekken') {
  const n = Number(a1) || 10, lang = a2 || null;
  const rows = await q(`SELECT * FROM public.leerlog WHERE kind IN ('gesprek','les','uitleg','feedback') ${lang ? 'AND lang=$1' : ''} ORDER BY id DESC LIMIT 400`, lang ? [lang] : []);
  const groups = new Map();
  for (const r of rows.reverse()) {
    const key = r.kind === 'les' ? `les:${r.kid_id}:${r.cat}:${r.created_at.toISOString().slice(0, 13)}` : `som:${r.session_id}:${r.data.som || ''}`;
    (groups.get(key) || groups.set(key, []).get(key)).push(r);
  }
  for (const g of [...groups.values()].slice(-n)) {
    const f = g[0];
    console.log(`\n--- ${f.alias} (${f.lang}, ${f.country === 'ZA' ? 'graad' : 'groep'} ${f.grade ?? '?'}) · ${f.cat || ''} · ${f.created_at.toISOString().slice(0, 16).replace('T', ' ')}`);
    if (f.data.som) console.log(`SOM: ${f.data.som}  (goed: ${f.data.juist ?? '?'}${f.data.gegeven != null ? `, kind gaf: ${f.data.gegeven}` : ''})`);
    for (const r of g) {
      if (r.kind === 'feedback') { console.log(`   ${r.data.stem === 'up' ? '👍' : r.data.stem === 'down' ? '👎' : '💬'} ${r.data.waarom || ''}${r.data.eigen_woorden ? ` "${r.data.eigen_woorden}"` : ''}`); continue; }
      if (r.data.kind) console.log(`KIND: ${cut(r.data.kind, 300)}`);
      if (r.data.max) console.log(`MAX:  ${cut(r.data.max, 600)}`);
    }
  }
}

if (mode === 'duimpjes') {
  const days = Number(a1) || 30;
  for (const r of await q(`SELECT * FROM public.leerlog WHERE kind='feedback' AND (data->>'stem'='down' OR data->>'waarom' IS NOT NULL OR data->>'eigen_woorden' IS NOT NULL) AND created_at > now() - interval '${days} days' ORDER BY id DESC LIMIT 60`)) {
    console.log(`\n${r.data.stem === 'down' ? '👎' : '💬'} ${r.data.waarom || ''}${r.data.eigen_woorden ? ` — kind: "${r.data.eigen_woorden}"` : ''} · ${r.alias} (${r.lang}) · ${r.cat || ''} · ${r.data.over}`);
    if (r.data.som) console.log(`  som: ${r.data.som}`);
    console.log(`  uitleg: ${cut(r.data.bericht_max, 500)}`);
  }
}

if (mode === 'export') {
  const days = Number(a1) || 30, file = a2 || `leerlog-${new Date().toISOString().slice(0, 10)}.jsonl`;
  const rows = await q(`SELECT id, created_at, alias, lang, country, grade, age, kind, cat, level, session_id, data FROM public.leerlog WHERE created_at > now() - interval '${days} days' ORDER BY id`);
  fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`${rows.length} regels → ${file}`);
}
await db.end();
