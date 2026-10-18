// LET OP: maakt een testkind aan en verwijdert het weer. Alleen lokaal gebruiken (server met ALLOW_TEST_CLOCK=1).
// Test: een drukke week (5 dagtaken + elke dag 4 oefenrondes op hetzelfde onderwerp, alles op het laagste niveau)
// zonder één som die terugkomt (zelfde tekst én zelfde plaatje).
import '../src/env.js';
import pg from 'pg';
import { fracStr, hhmm, sumKey } from '../src/util.js';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const jar = {};
async function api(path, body) {
  const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  const r = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
  for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const [k, ...v] = kv.split('='); jar[k] = v.join('='); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path} → ${r.status} ${JSON.stringify(j)}`);
  return j;
}
let failed = 0;
const assert = (c, m) => { if (!c) { failed++; console.error('✗', m); } else console.log('✓', m); };
const good = (q) => q.type === 'number' ? String(q.answer).replace('.', ',') : q.type === 'fraction' ? fracStr(q.answer) : q.type === 'time' ? hhmm(q.answer) : q.answer;

for (const [lang, country, cats] of [['nl', 'NL', ['schaal', 'meetkunde']], ['af', 'ZA', ['meetkunde', 'meting']]]) {
  await api('/api/parent/login', { password: process.env.PARENT_PIN || '1234' });
  for (const k of (await api('/api/kids')).kids.filter((k) => k.name === 'Herhaaltest')) { await api('/api/kids/select', { id: k.id }); await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' }); }
  const kid = (await api('/api/kids', { name: 'Herhaaltest', lang, country, grade: 5, age: 9 })).kid;
  const S = `kid_${kid.id}`;
  await db.query(`INSERT INTO ${S}.sessions(kind, day, questions, total, max_points, plan, state, status) VALUES ('intake', CURRENT_DATE - 1, '[]', 21, 0, '[]', '{}', 'done')`);
  const low = async () => {
    const all = (await api('/api/state')).skills.map((x) => x.cat);
    for (const c of all) await db.query(`INSERT INTO ${S}.skills(cat, level, mastery) VALUES ($1, 0, 40) ON CONFLICT (cat) DO UPDATE SET level=0, mastery=40, ex_level=0`, [c]);
  };
  const play = async (body) => {
    const p = await api('/api/session/start', body);
    for (let n = 0; n < 60; n++) {
      const s = (await db.query(`SELECT questions, results, status FROM ${S}.sessions WHERE id=$1`, [p.id])).rows[0];
      if (s.status === 'done' || s.results.length >= s.questions.length) break;
      const r = await api(`/api/session/${p.id}/answer`, { index: s.results.length, answer: good(s.questions[s.results.length]), timeMs: 12000 });
      if (r.done) break;
    }
  };
  for (let d = 1; d <= 5; d++) { // maandag t/m vrijdag
    await api('/api/test/clock', { days: d });
    await low(); await play({ kind: 'daily' });
    for (let k = 0; k < 4; k++) { await low(); await play({ kind: 'practice', cat: cats[k % 2], goal: 'oefen', fresh: true }); }
  }
  await api('/api/test/clock', { days: 0 });
  const qs = (await db.query(`SELECT jsonb_build_object('text', x->'text', 'visual', x->'visual', 'options', x->'options') q FROM ${S}.sessions, jsonb_array_elements(questions) x WHERE kind <> 'intake'`)).rows.map((r) => r.q);
  const seen = new Map();
  for (const q of qs) seen.set(sumKey(q), (seen.get(sumKey(q)) || 0) + 1);
  const dups = [...seen].filter(([, n]) => n > 1);
  assert(qs.length >= 280, `${lang}: een drukke week gespeeld (${qs.length} sommen)`);
  assert(!dups.length, `${lang}: geen enkele som twee keer${dups.length ? ` — dubbel: ${dups.slice(0, 3).map(([k]) => k.split('|')[0]).join(' · ')}` : ''}`);
  await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' });
  await db.query('DELETE FROM public.leerlog WHERE kid_id=$1', [kid.id]);
}
await db.end();
console.log(failed ? `\n${failed} fout(en)` : '\nAlles klopt ✓');
process.exit(failed ? 1 : 0);
