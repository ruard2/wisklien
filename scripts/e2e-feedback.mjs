// LET OP: maakt een testkind aan en verwijdert het weer. Alleen lokaal gebruiken.
// Test: duimpjes (bij een som en bij uitleg) worden bewaard, het waarom komt op dezelfde regel, de ouder ziet het.
import '../src/env.js';
import pg from 'pg';

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

await api('/api/parent/login', { password: process.env.PARENT_PIN || '1234' });
for (const k of (await api('/api/kids')).kids.filter((k) => k.name === 'Duimtest')) { await api('/api/kids/select', { id: k.id }); await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' }); }
const kid = (await api('/api/kids', { name: 'Duimtest', lang: 'nl', country: 'NL', grade: 6, age: 10, setup: { research: false } })).kid;

// som: duim omlaag, daarna het waarom (eigen woorden van het kind, met zijn naam erin)
const a = await api('/api/feedback', { vote: 'down', message: 'Het goede antwoord is 12.', ctx: { kind: 'som', cat: 'breuken', question: '3/4 van 16 = ?' } });
assert(a.id, 'duimpje bewaard, met een id');
await api('/api/feedback', { id: a.id, reason: 'De som klopt niet', text: 'Duimtest snapt niet waarom het 12 is', ctx: { kind: 'som', cat: 'breuken' } });
// uitleg van Max: duim omhoog
await api('/api/feedback', { vote: 'up', message: 'Eerst delen door 4, dan keer 3.', ctx: { kind: 'lesson', cat: 'breuken' } });
const ov = await api('/api/parent/overview');
assert(ov.feedback.length === 2, `ouder ziet 2 duimpjes (${ov.feedback.length})`);
const som = ov.feedback.find((x) => x.over === 'som');
assert(som && som.vote === 'down' && som.reason === 'De som klopt niet' && /waarom het 12/.test(som.own) && som.question === '3/4 van 16 = ?', 'het waarom staat op dezelfde regel als de duim');
assert(ov.feedback.find((x) => x.over === 'les')?.vote === 'up', 'duim omhoog bij een les');
const n = (await db.query('SELECT COUNT(*)::int n FROM public.leerlog WHERE kid_id=$1', [kid.id])).rows[0].n;
assert(n === 0, 'meedoen staat uit: niets in de leerlog, wel bij het kind bewaard');
await api('/api/feedback', { ctx: {} }).then(() => assert(false, 'lege feedback geweigerd')).catch(() => assert(true, 'lege feedback geweigerd'));

await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' });
await db.end();
console.log(failed ? `\n${failed} fout(en)` : '\nAlles klopt ✓');
process.exit(failed ? 1 : 0);
