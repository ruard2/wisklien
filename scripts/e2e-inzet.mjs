// LET OP: maakt een testkind aan en verwijdert het weer. Alleen lokaal gebruiken.
// Test: geld voor de moeite (dagtaak af = hele bedrag) en afgeraffelde sommen komen terug.
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
const wrongCalm = (q) => q.type === 'choice' ? (q.answer + 1) % q.options.length : q.type === 'time' ? '0:01' : q.type === 'fraction' ? '1/2' : String(Math.round(Number(q.answer) * 1.1 + 1)).replace('.', ',');
let SCHEMA;
const cur = async (id) => { const s = (await db.query(`SELECT questions, results, total, state FROM ${SCHEMA}.sessions WHERE id=$1`, [id])).rows[0]; return { q: s.questions[s.results.length], total: s.total, state: s.state, n: s.results.length }; };

await api('/api/parent/login', { password: process.env.PARENT_PIN || '1234' });
for (const k of (await api('/api/kids')).kids.filter((k) => k.name === 'Inzettest')) { await api('/api/kids/select', { id: k.id }); await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' }); }
const kid = (await api('/api/kids', { name: 'Inzettest', lang: 'nl', country: 'NL', grade: 7, age: 10, setup: { dailyCents: 40, dailyCount: 10, days: [0, 1, 2, 3, 4, 5, 6] } })).kid;
SCHEMA = `kid_${kid.id}`;
await db.query(`INSERT INTO ${SCHEMA}.sessions(kind, day, questions, total, max_points, plan, state, status) VALUES ('intake', CURRENT_DATE, '[]', 21, 0, '[]', '{}', 'done')`);

const d = await api('/api/session/start', { kind: 'daily' });
assert(d.total === 10, `dagtaak 10 sommen (${d.total})`);
// 1) rustig en fout (lang nagedacht, redelijk antwoord): geen herhaling
let c = await cur(d.id);
let r = await api(`/api/session/${d.id}/answer`, { index: 0, answer: wrongCalm(c.q), timeMs: 40000 });
assert(!r.redo && !r.rushed, 'rustig fout: telt gewoon, komt niet terug');
// 2) en 3) afraffelen: onzin binnen een seconde → komt terug, na 2× grijpt Max in
let idx = 1, rushes = 0, warned = false;
for (let k = 0; k < 2; k++) {
  c = await cur(d.id);
  idx = c.n;
  r = await api(`/api/session/${d.id}/answer`, { index: idx, answer: c.q.type === 'choice' ? (c.q.answer + 1) % c.q.options.length : '999999', timeMs: 800 });
  if (r.redo) rushes++;
  if (r.rushWarn) warned = true;
}
c = await cur(d.id);
assert(rushes === 2 && c.total === 12, `2 afgeraffelde sommen komen terug: dagtaak nu ${c.total} sommen`);
assert(warned, 'na 2× afraffelen grijpt Max in');
assert(r.next?.adapt?.pause > 0, `denkpauze: "controleer" pas na ${r.next?.adapt?.pause} s`);
// 4) snel maar GOED: nooit afraffelen
c = await cur(d.id);
r = await api(`/api/session/${d.id}/answer`, { index: c.n, answer: good(c.q), timeMs: 700 });
assert(r.correct && !r.redo, 'snel en goed: prima, komt niet terug');
// rest: alles goed, de herhalingen komen aan het eind
let last = r, sawRedo = 0;
for (let k = 0; k < 30 && !last.done; k++) {
  c = await cur(d.id);
  if (c.q.redo) sawRedo++;
  last = await api(`/api/session/${d.id}/answer`, { index: c.n, answer: good(c.q), timeMs: 9000 });
}
assert(sawRedo === 2, `de 2 afgeraffelde sommen kwamen aan het eind terug (${sawRedo})`);
assert(last.done && last.summary.points === 40, `dagtaak af = het hele bedrag, ook met fouten (${last.summary.points} cent, ${last.summary.correct}/${last.summary.total} goed)`);
// ouder ziet de inzet
const ov = await api('/api/parent/overview');
const sess = ov.sessions.find((s) => s.id === d.id);
assert(sess && sess.rushes === 2 && sess.redos === 2, `ouder ziet: ${sess?.rushes}× gehaast`);
// leerlog
const ll = (await db.query(`SELECT data FROM public.leerlog WHERE kid_id=$1 AND kind='antwoord' AND data->>'haast' IS NOT NULL`, [kid.id])).rows;
assert(ll.length === 2, `leerlog: 2 antwoorden met haast (${ll.map((x) => x.data.haast)})`);

await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' });
await db.query('DELETE FROM public.leerlog WHERE kid_id=$1', [kid.id]);
await db.end();
console.log(failed ? `\n${failed} fout(en)` : '\nAlles klopt ✓');
process.exit(failed ? 1 : 0);
