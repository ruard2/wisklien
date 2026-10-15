// LET OP: maakt testkinderen aan en verwijdert ze weer. Alleen lokaal gebruiken (kost 1-2 AI-aanroepen).
// Test van de leerlog: antwoorden, gesprek met Max, duimpjes, ouderfeedback, naam nooit opgeslagen, uitzetten werkt.
import '../src/env.js';
import pg from 'pg';
import { fracStr, hhmm } from '../src/util.js';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
function client() {
  const jar = {};
  return async function api(path, body) {
    const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
    const r = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const [k, ...v] = kv.split('='); jar[k] = v.join('='); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${path} → ${r.status} ${JSON.stringify(j)}`);
    return j;
  };
}
let failed = 0;
const assert = (c, m) => { if (!c) { failed++; console.error('✗', m); } else console.log('✓', m); };
const good = (q) => q.type === 'number' ? String(q.answer).replace('.', ',') : q.type === 'fraction' ? fracStr(q.answer) : q.type === 'time' ? hhmm(q.answer) : q.answer;
const logs = async (id) => (await db.query('SELECT * FROM public.leerlog WHERE kid_id=$1 ORDER BY id', [id])).rows;

const admin = client();
await admin('/api/parent/login', { password: process.env.PARENT_PIN || '1234' });
for (const k of (await admin('/api/kids')).kids.filter((k) => /^Zanelle|^Sanderijn/.test(k.name))) { await admin('/api/kids/select', { id: k.id }); await admin('/api/parent/delete-kid', { confirm: 'VERWIJDER' }); }

// ---- Afrikaans kind, meehelpen aan ----
const home = client();
const kid = (await home('/api/kids', { name: 'Zanelle', lang: 'af', country: 'ZA', grade: 6, age: 11, setup: { password: 'toetswagwoord' } })).kid;
const S = `kid_${kid.id}`;
let s = await home('/api/session/start', { kind: 'intake', groep: 6 });
const q0 = (await db.query(`SELECT questions FROM ${S}.sessions WHERE id=$1`, [s.id])).rows[0].questions[0];
await home(`/api/session/${s.id}/answer`, { index: 0, answer: good(q0), timeMs: 7000 });
await home(`/api/session/${s.id}/answer`, { index: 1, answer: '999999', timeMs: 3000 });
let L = await logs(kid.id);
assert(L.filter((r) => r.kind === 'antwoord').length === 2, `2 antwoorden gelogd (${L.length})`);
assert(L[0].lang === 'af' && L[0].country === 'ZA' && L[0].grade === 6 && L[0].age === 11 && /^Leerling-\d{4}$/.test(L[0].alias), `met taal/land/graad/leeftijd en schuilnaam (${L[0].alias})`);
assert(L[1].data.goed === false && L[1].data.gegeven === '999999' && L[1].data.som, 'fout antwoord met som en gegeven antwoord');

// gesprek met Max na de fout (intake: mag ná het antwoord)
const chat = await home(`/api/session/${s.id}/chat`, { index: 1, mode: 'start' });
await home(`/api/session/${s.id}/chat`, { index: 1, message: 'Ek is Zanelle en ek verstaan dit nie' });
L = await logs(kid.id);
const g = L.filter((r) => r.kind === 'gesprek');
assert(g.length === 2 && g.every((r) => r.data.max), `2 gespreksbeurten met antwoord van Max gelogd (${g.length})`);
assert(!JSON.stringify(L).includes('Zanelle'), 'echte naam komt nergens in de leerlog (ook niet in getypte tekst)');
console.log('  Max:', String(chat.reply || '').slice(0, 140));

// duimpjes
await home('/api/feedback', { vote: 'down', message: chat.reply, ctx: { kind: 'chat', cat: q0.cat, session: s.id, question: 'som' } });
await home('/api/feedback', { reason: 'Te lank', message: chat.reply, ctx: { kind: 'chat', cat: q0.cat, session: s.id } });
L = await logs(kid.id);
assert(L.filter((r) => r.kind === 'feedback').length === 2, '👎 en de reden gelogd');

// ouder
await home('/api/parent/login', { password: 'toetswagwoord' });
await home('/api/parent/feedback', { text: 'Erik vind die verduideliking soms te lank.' });
assert((await logs(kid.id)).some((r) => r.kind === 'ouder_feedback'), 'ouderfeedback gelogd');
assert((await home('/api/parent/overview')).research === true, 'meehelpen staat standaard aan');

// uitzetten → niets meer
await home('/api/parent/research', { on: false });
const before = (await logs(kid.id)).length;
await home(`/api/session/${s.id}/answer`, { index: 2, answer: '1', timeMs: 3000 });
assert((await logs(kid.id)).length === before, 'meehelpen uit: niets meer gelogd');

// ---- bij het aanmaken uitgezet ----
const other = client();
const kid2 = (await other('/api/kids', { name: 'Sanderijn', lang: 'nl', country: 'NL', grade: 7, age: 10, setup: { research: false } })).kid;
const s2 = await other('/api/session/start', { kind: 'intake', groep: 7 });
await other(`/api/session/${s2.id}/answer`, { index: 0, answer: '1', timeMs: 3000 });
assert((await logs(kid2.id)).length === 0, 'meehelpen uitgezet bij aanmaken: niets gelogd');

for (const id of [kid.id, kid2.id]) { await admin('/api/kids/select', { id }); await admin('/api/parent/delete-kid', { confirm: 'VERWIJDER' }); }
await db.query('DELETE FROM public.leerlog WHERE kid_id = ANY($1)', [[kid.id, kid2.id]]);
await db.end();
console.log(failed ? `\n${failed} fout(en)` : '\nAlles klopt ✓');
process.exit(failed ? 1 : 0);
