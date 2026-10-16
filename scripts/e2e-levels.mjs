// LET OP: maakt een testkind aan en verwijdert het weer. Alleen lokaal gebruiken.
// Test: levels voor inzet (20 echt gemaakte sommen = 1 level), beloning om de X levels, ouder vinkt af.
import '../src/env.js';
import pg from 'pg';
import { fracStr, hhmm } from '../src/util.js';

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

await api('/api/parent/login', { password: process.env.PARENT_PIN || '1234' });
for (const k of (await api('/api/kids')).kids.filter((k) => k.name === 'Leveltest')) { await api('/api/kids/select', { id: k.id }); await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' }); }
const kid = (await api('/api/kids', { name: 'Leveltest', lang: 'af', country: 'ZA', grade: 5, age: 10, setup: { levelEvery: 5, levelGift: '🎬 fliek' } })).kid;
const S = `kid_${kid.id}`;
await db.query(`INSERT INTO ${S}.sessions(kind, day, questions, total, max_points, plan, state, status) VALUES ('intake', CURRENT_DATE, '[]', 21, 0, '[]', '{}', 'done')`);

let st = await api('/api/state');
assert(st.inzet.level === 1 && st.inzet.count === 0 && st.inzet.every === 5 && st.inzet.toReward === 4, `begin: level 1, beloning over 4 levels (${JSON.stringify(st.inzet)})`);
// eerdere sommen tellen mee: 79 oude pogingen (waarvan 2 afgeraffeld → 77)
await db.query(`INSERT INTO ${S}.attempts(cat, level, correct, hints, time_ms) SELECT 'optel', 1, true, 0, 5000 FROM generate_series(1, 79)`);
await db.query(`INSERT INTO ${S}.sessions(kind, day, questions, total, max_points, plan, state, status, results) VALUES ('daily', CURRENT_DATE - 1, '[]', 20, 0, '[]', '{}', 'done', '[{"rushed":"gok","redo":true},{"rushed":"niet-gelezen"},{"rushed":"weetniet"}]')`);
st = await api('/api/state');
assert(st.inzet.count === 77 && st.inzet.level === 4 && st.inzet.inLevel === 17, `oude sommen tellen mee, afgeraffeld niet (${st.inzet.count} → level ${st.inzet.level})`);

// nog 3 sommen → 80 = level 5 = beloning
const p = await api('/api/session/start', { kind: 'practice', fresh: true });
let up = null;
for (let i = 0; i < 3; i++) {
  const s = (await db.query(`SELECT questions, results FROM ${S}.sessions WHERE id=$1`, [p.id])).rows[0];
  const r = await api(`/api/session/${p.id}/answer`, { index: s.results.length, answer: good(s.questions[s.results.length]), timeMs: 9000 });
  if (r.levelUp) up = r.levelUp;
}
assert(up && up.level === 5 && up.reward && up.gift === '🎬 fliek', `level 5 gehaald → feest met beloning (${JSON.stringify(up)})`);
st = await api('/api/state');
assert(st.inzet.level === 5 && st.inzet.toReward === 5, 'volgende beloning over 5 levels');
assert(Array.isArray(st.goalsDone), 'state heeft gehaalde doelen');

let ov = await api('/api/parent/overview');
assert(ov.levelLog[0]?.level === 5 && ov.levelLog[0].given === false, 'ouder ziet: beloning nog te geven');
await api('/api/parent/level-given', { index: 0 });
ov = await api('/api/parent/overview');
assert(ov.levelLog[0].given === true, 'ouder vinkt de beloning af');
await api('/api/parent/rewards', { ...ov.rewards, levelEvery: 7 }).then(() => assert(false, 'ongeldig aantal levels geweigerd')).catch(() => assert(true, 'ongeldig aantal levels geweigerd'));
await api('/api/parent/rewards', { ...ov.rewards, levelEvery: 0 });
st = await api('/api/state');
assert(st.inzet.every === 0 && st.inzet.toReward === null, 'ouder kan de levelbeloning uitzetten');

await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' });
await db.query('DELETE FROM public.leerlog WHERE kid_id=$1', [kid.id]);
await db.end();
console.log(failed ? `\n${failed} fout(en)` : '\nAlles klopt ✓');
process.exit(failed ? 1 : 0);
