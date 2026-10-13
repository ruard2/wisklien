// LET OP: wist alle gegevens! Alleen lokaal gebruiken.
// End-to-end test tegen een draaiende server + database (lokaal, NIET op productie draaien:
// het wist alle gegevens). Start met: node scripts/e2e.mjs
import '../src/env.js';
import pg from 'pg';
import { fracStr, hhmm } from '../src/util.js';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
let cookie = '';
async function api(path, body) {
  const r = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path} → ${r.status} ${JSON.stringify(j)}`);
  return j;
}
const good = (q) => q.type === 'number' ? String(q.answer).replace('.', ',') : q.type === 'fraction' ? fracStr(q.answer) : q.type === 'time' ? hhmm(q.answer) : q.answer;
const bad = (q) => q.type === 'choice' ? (q.answer + 1) % q.options.length : q.type === 'time' ? '0:01' : '999999';
const assert = (c, m) => { if (!c) { console.error('✗', m); process.exitCode = 1; } else console.log('✓', m); };

async function play(kind, pCorrect, extra = {}) {
  const s = await api('/api/session/start', { kind, ...extra });
  const full = (await db.query('SELECT questions FROM sessions WHERE id=$1', [s.id])).rows[0].questions;
  assert(!('answer' in s.questions[0]) && !('steps' in s.questions[0]), `${kind}: client krijgt geen antwoorden`);
  let last;
  for (let i = s.results.length; i < s.total; i++) {
    if (i === 1) { const h = await api(`/api/session/${s.id}/hint`, { index: i }); assert(h.hint, `${kind}: hint werkt`); }
    const ok = Math.random() < pCorrect;
    last = await api(`/api/session/${s.id}/answer`, { index: i, answer: ok ? good(full[i]) : bad(full[i]), timeMs: 5000 });
    if (last.correct !== ok) console.log('  ! onverwacht', full[i].text, good(full[i]), last);
  }
  return { s, last };
}

// alles wissen via ouder-API
await api('/api/parent/login', { pin: process.env.PARENT_PIN || '1234' });
await api('/api/parent/reset', { what: 'all', confirm: 'RESET' });

let st = await api('/api/state');
assert(!st.intakeDone, 'begint zonder intake');
await api('/api/session/start', { kind: 'daily' }).then(() => assert(false, 'dagtaak geblokkeerd vóór intake'), () => assert(true, 'dagtaak geblokkeerd vóór intake'));

const intake = await play('intake', 0.6);
assert(intake.s.total === 39, `intake heeft 39 sommen (${intake.s.total})`);
assert(intake.last.done && intake.last.summary.points === Math.round(intake.last.summary.correct * 100 / 39), `intake punten = ${intake.last.summary.points} voor ${intake.last.summary.correct} goed`);
st = await api('/api/state');
assert(st.intakeDone, 'intake klaar');
assert(st.wallet.balance === intake.last.summary.points, `spaarpot ${st.wallet.balance} cent`);
console.log('  ranglijst:', st.skills.map((x) => `${x.label} ${x.score}`).join(' | '));

if (st.today.schoolDay) {
  const sAlloc = await api('/api/session/start', { kind: 'daily' });
  const cats = {}; for (const q of sAlloc.questions) cats[q.cat] = (cats[q.cat] || 0) + 1;
  console.log('  verdeling dagtaak:', JSON.stringify(cats));
  assert(sAlloc.total === 20, 'dagtaak 20 sommen');
  const daily = await play('daily', 0.75);
  assert(daily.last.summary.points === Math.round(daily.last.summary.correct * 50 / 20), `dagtaak punten ${daily.last.summary.points} voor ${daily.last.summary.correct} goed`);
  const again = await api('/api/session/start', { kind: 'daily' });
  assert(again.status === 'done', 'tweede keer dagtaak = dezelfde (al klaar)');
}
const pr = await play('practice', 0.5, { cat: 'breuken' });
assert(pr.last.summary.points === 0, 'oefenen geeft geen centen');
assert(pr.s.questions.every((q) => q.cat === 'breuken'), 'gericht oefenen alleen breuken');

st = await api('/api/state');
const ov = await api('/api/parent/overview');
assert(ov.wallet.balance === st.wallet.balance, 'ouderoverzicht = zelfde saldo');
await api('/api/parent/payout', { cents: 50 });
const ov2 = await api('/api/parent/overview');
assert(ov2.wallet.balance === st.wallet.balance - 50 && ov2.wallet.paid === 50, 'uitbetaling verwerkt');
await api('/api/parent/payout', { cents: 999999 }).then(() => assert(false, 'te veel uitbetalen geweigerd'), () => assert(true, 'te veel uitbetalen geweigerd'));
await db.end();
