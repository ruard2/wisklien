// Test: wat als de AI niet (of heel traag) antwoordt? De dagtaak moet toch snel starten.
// Start eerst een tweede server waarvan de AI nooit antwoordt:
//   PORT=3002 OPENAI_BASE_URL=http://10.255.255.1/v1 OPENAI_MODEL=gpt-6-luna node server.js
// en dan: E2E_BASE=http://localhost:3002 node scripts/e2e-traag.mjs
import '../src/env.js';
import pg from 'pg';

const BASE = process.env.E2E_BASE || 'http://localhost:3002';
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
for (const k of (await api('/api/kids')).kids.filter((k) => k.name === 'Traagtest')) { await api('/api/kids/select', { id: k.id }); await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' }); }
const kid = (await api('/api/kids', { name: 'Traagtest', lang: 'nl', country: 'NL', grade: 8, age: 11 })).kid;
await db.query(`INSERT INTO kid_${kid.id}.sessions(kind, day, questions, total, max_points, plan, state, status) VALUES ('intake', CURRENT_DATE, '[]', 21, 0, '[]', '{}', 'done')`);
assert((await api('/api/state')).ai === true, 'AI staat aan (maar antwoordt nooit)');
let t0 = Date.now();
const d = await api('/api/session/start', { kind: 'daily' });
const secs = (Date.now() - t0) / 1000;
assert(d.id && d.total === 20 && secs < 20, `dagtaak start toch, na ${secs.toFixed(1)} s (vaste regels)`);
t0 = Date.now();
const st = await api('/api/state');
assert(st && (Date.now() - t0) < 3000, `startscherm laadt direct (${Date.now() - t0} ms)`);
await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' });
await db.query('DELETE FROM public.leerlog WHERE kid_id=$1', [kid.id]);
await db.end();
console.log(failed ? `\n${failed} fout(en)` : '\nAlles klopt ✓');
process.exit(failed ? 1 : 0);
