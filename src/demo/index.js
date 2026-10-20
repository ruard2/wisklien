// Demo: een virtueel kind (Maxime) met ± drie weken geschiedenis, zodat een bezoeker de app meteen in werking ziet
// zonder eerst zelf de starttoets te doen. De geschiedenis komt uit een momentopname (src/demo/nl.json.gz / af.json.gz,
// gemaakt met scripts/demo-seed.mjs). Bij het aanmaken schuiven alle datums naar de laatste schooldagen vóór vandaag,
// zodat de reeks klopt, de herhalingen van vandaag klaarstaan en de dagtaak van vandaag nog open is.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { pool, connect, createKid, deleteKid } from '../db.js';
import { todayNL } from '../util.js';

const MAX_DEMOS = Number(process.env.DEMO_MAX || 40); // tegelijk bestaande demo-kinderen
const KEEP_HOURS = Number(process.env.DEMO_KEEP_HOURS || 48); // daarna ruimen we ze op

const cache = {};
function fixture(lang) {
  return (cache[lang] ||= JSON.parse(gunzipSync(readFileSync(new URL(`./${lang}.json.gz`, import.meta.url))).toString('utf8')));
}

// ---------- datums verschuiven ----------
const DAY = 864e5;
const addDays = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * DAY).toISOString().slice(0, 10);
const diffDays = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / DAY);
const isSchoolDay = (d) => { const w = new Date(d + 'T12:00:00Z').getUTCDay(); return w >= 1 && w <= 5; };

// Gesimuleerde schooldag i → de i-de van de laatste N schooldagen vóór vandaag; latere datums (herhalingen) → vanaf vandaag.
export function dateMapper(simDays, simToday, today = todayNL()) {
  const real = [];
  for (let d = addDays(today, -1); real.length < simDays.length; d = addDays(d, -1)) if (isSchoolDay(d)) real.unshift(d);
  const idx = new Map(simDays.map((d, i) => [d, real[i]]));
  return (d) => {
    if (idx.has(d)) return idx.get(d);
    if (d >= simToday) return addDays(today, diffDays(d, simToday));
    if (d < simDays[0]) return addDays(real[0], diffDays(d, simDays[0]));
    let prev = simDays[0];
    for (const s of simDays) if (s <= d) prev = s;
    return idx.get(prev);
  };
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/, TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
function shiftTs(v, map) {
  const day = v.slice(0, 10);
  return new Date(Date.parse(v) + diffDays(map(day), day) * DAY).toISOString();
}
function deepMap(v, map) {
  if (typeof v === 'string') return DATE_RE.test(v) ? map(v) : TS_RE.test(v) ? shiftTs(v, map) : v;
  if (Array.isArray(v)) return v.map((x) => deepMap(x, map));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepMap(x, map)]));
  return v;
}

const TABLES = ['settings', 'skills', 'sessions', 'attempts', 'skill_snapshots', 'ledger', 'badges', 'reviews', 'explanations'];
const SERIAL = ['sessions', 'attempts', 'ledger', 'reviews', 'explanations'];

export async function createDemoKid(lang = 'nl') {
  lang = lang === 'af' ? 'af' : 'nl';
  await cleanupDemos();
  const f = fixture(lang);
  const map = dateMapper(f.days, f.simToday);
  const kid = await createKid(f.kid.name, f.kid.avatar, { lang: f.kid.lang, country: f.kid.country, grade: f.kid.grade, age: f.kid.age, demo: true });
  const client = await connect(kid.id);
  try {
    await client.query('BEGIN');
    for (const t of TABLES) {
      for (const row of f.tables[t] || []) {
        const cols = Object.keys(row);
        const vals = cols.map((c) => {
          const v = deepMap(row[c], map);
          return v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
        });
        await client.query(`INSERT INTO ${t} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`, vals);
      }
    }
    for (const t of SERIAL) await client.query(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), GREATEST(1, (SELECT COALESCE(MAX(id), 0) FROM ${t})), (SELECT COUNT(*) > 0 FROM ${t}))`);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    await client.release();
    await deleteKid(kid.id).catch(() => {});
    throw e;
  }
  await client.release();
  return kid;
}

// Oude demo's opruimen, en nooit meer dan MAX_DEMOS tegelijk (de oudste gaan eerst)
export async function cleanupDemos() {
  const old = (await pool.query(`SELECT id FROM public.kids WHERE demo AND (created_at < now() - make_interval(hours => $1)
      OR id NOT IN (SELECT id FROM public.kids WHERE demo ORDER BY created_at DESC LIMIT $2))`, [KEEP_HOURS, Math.max(0, MAX_DEMOS - 1)])).rows;
  for (const k of old) await deleteKid(k.id).catch(() => {});
}
