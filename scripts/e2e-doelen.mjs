// LET OP: maakt een testkind aan en verwijdert het weer. Alleen lokaal gebruiken.
// Test: zelf oefenen op een onderwerp, met een eigen doel (stapje beter / kei), feest + cadeau van de ouder.
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
for (const k of (await api('/api/kids')).kids.filter((k) => k.name === 'Doeltest')) { await api('/api/kids/select', { id: k.id }); await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' }); }
const kid = (await api('/api/kids', { name: 'Doeltest', lang: 'nl', country: 'NL', grade: 7, age: 10, setup: { goalGift: '🍦 een ijsje samen halen' } })).kid;
const S = `kid_${kid.id}`;
await db.query(`INSERT INTO ${S}.sessions(kind, day, questions, total, max_points, plan, state, status) VALUES ('intake', CURRENT_DATE, '[]', 21, 0, '[]', '{}', 'done')`);
await db.query(`INSERT INTO ${S}.skills(cat, level, mastery) VALUES ('breuken', 1, 50) ON CONFLICT (cat) DO UPDATE SET level=1, mastery=50`);

// gewoon oefenen: 10 sommen, geen doel
let p = await api('/api/session/start', { kind: 'practice', cat: 'breuken', goal: 'oefen', fresh: true });
let st = await api('/api/state');
assert(p.total === 10 && st.goals.length === 0, `gewoon oefenen: 10 sommen, geen doel (${p.total})`);
assert(st.goalGift === '🍦 een ijsje samen halen', 'kind ziet welk cadeau er bij een doel hoort');

// doel: een stapje beter
p = await api('/api/session/start', { kind: 'practice', cat: 'breuken', goal: 'stap', fresh: true });
st = await api('/api/state');
const g = st.goals.find((x) => x.cat === 'breuken');
assert(g && g.kind === 'stap' && g.total === 1 && g.done === 0, `doel gezet: een stapje beter (${g?.done}/${g?.total} voetstapjes)`);
assert(!JSON.stringify(st.goals).match(/groep|niveau|level/), 'geen groep of niveau in het doel voor het kind');
// het kind komt een stapje verder (we zetten het niveau omhoog, zoals na 8 van de 10 goed)
await db.query(`UPDATE ${S}.skills SET level=2 WHERE cat='breuken'`);
const q = (await db.query(`SELECT questions, results FROM ${S}.sessions WHERE id=$1`, [p.id])).rows[0];
const r = await api(`/api/session/${p.id}/answer`, { index: q.results.length, answer: good(q.questions[q.results.length]), timeMs: 9000 });
assert(r.goalReached && r.goalReached.cat === 'breuken' && r.goalReached.gift === '🍦 een ijsje samen halen', `doel bereikt → feest met cadeau (${JSON.stringify(r.goalReached)})`);
st = await api('/api/state');
assert(!st.goals.find((x) => x.cat === 'breuken'), 'doel is van de lijst (gehaald)');
assert(st.badges.find((b) => b.id === 'oefendoel')?.earned, 'badge "Doel bereikt"');
// ouder ziet het en vinkt het cadeau af
let ov = await api('/api/parent/overview');
assert(ov.goalLog[0]?.label && ov.goalLog[0].given === false, 'ouder ziet: doel gehaald, cadeau nog te geven');
await api('/api/parent/goal-given', { index: 0 });
ov = await api('/api/parent/overview');
assert(ov.goalLog[0].given === true, 'ouder vinkt het cadeau af');
// kei-doel: pas klaar als het hoogste niveau én sterk
await api('/api/session/start', { kind: 'practice', cat: 'breuken', goal: 'kei', fresh: true });
st = await api('/api/state');
const k = st.goals.find((x) => x.cat === 'breuken');
assert(k && k.kind === 'kei' && k.total === 2, `kei-doel: ${k?.done}/${k?.total} voetstapjes (hoogste stap + sterk)`);
// oefenen levert geen geld op
assert((await api('/api/state')).wallet.balance === 0, 'oefenen levert geen geld op');

await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' });
await db.query('DELETE FROM public.leerlog WHERE kid_id=$1', [kid.id]);
await db.end();
console.log(failed ? `\n${failed} fout(en)` : '\nAlles klopt ✓');
process.exit(failed ? 1 : 0);
