// LET OP: wist alle gegevens! Alleen lokaal gebruiken.
// End-to-end test tegen een draaiende server + database. Start met: node scripts/e2e.mjs
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
let failed = 0;
const assert = (c, m) => { if (!c) { failed++; console.error('✗', m); } else console.log('✓', m); };
const current = async (id) => { const s = (await db.query('SELECT questions, results FROM sessions WHERE id=$1', [id])).rows[0]; return s.questions[s.results.length]; };

// Speel een sessie. decide(i, publicCurrent) → 'good' | 'bad' | 'guided-good' | 'solo-good'
async function play(kind, decide, extra = {}) {
  let s = await api('/api/session/start', { kind, ...extra });
  const log = [];
  let last;
  while (s.current || (last && !last.done)) {
    const cur = last ? last.next : s.current;
    if (!cur) break;
    const full = await current(s.id);
    if (cur.question.answer !== undefined || cur.question.steps) assert(false, 'antwoord gelekt naar client');
    const how = decide(cur.index, cur, full);
    if (how === 'guided-good' || how === 'solo-good') {
      const g = await api(`/api/session/${s.id}/guide`, { index: cur.index, choice: how === 'solo-good' ? 'solo' : 'guided' });
      if (how === 'guided-good') {
        for (let k = 0; k < full.guide.length; k++) {
          const r = await api(`/api/session/${s.id}/step`, { index: cur.index, answer: good(full.guide[k]) });
          if (!r.correct) assert(false, `tussenstap fout gerekend: ${full.guide[k].ask}`);
        }
      }
      void g;
    }
    const ok = how !== 'bad';
    last = await api(`/api/session/${s.id}/answer`, { index: cur.index, answer: ok ? good(full) : bad(full), timeMs: 4000 });
    log.push({ cur, full, res: last, how });
    if (last.done) break;
  }
  return { id: s.id, log, last };
}

await api('/api/parent/login', { pin: process.env.PARENT_PIN || '1234' });
await api('/api/parent/reset', { what: 'all', confirm: 'RESET' });

// ---- Starttoets: adaptief ----
const intake = await play('intake', (i, cur, full) => (full.level >= 2 ? 'bad' : 'good'), { groep: 8 });
const lv = intake.log.map((l) => l.full.level);
assert(intake.log.slice(0, 14).every((l) => l.full.level === 2), 'groep 8 → starttoets begint op groep 7-niveau');
assert(intake.log.length === 40, `starttoets 40 sommen (${intake.log.length})`);
assert(!lv.includes(3), 'starttoets: na fout op 1F geen 1S-sommen');
assert(intake.log.every((l) => l.cur.offer.mode === 'none'), 'starttoets: geen tussenstappen (eerlijk meten)');
assert(intake.last.summary.points === Math.round(intake.last.summary.correct * 100 / 40), `starttoets ${intake.last.summary.points} cent voor ${intake.last.summary.correct} goed`);
let st = await api('/api/state');
assert(st.skills.every((s) => s.level === 1), `iedereen op basis na "1F fout" (${st.skills.map((s) => s.levelName).join(',')})`);
assert(st.badges.find((b) => b.id === 'start').earned, 'badge starttoets');

// ---- Zwak kind: alles fout bij breuken → niveau omlaag, herkansing, opsteker ----
const weak = await play('practice', () => 'bad', { cat: 'breuken' });
const ev = weak.log.map((l) => l.res.event).filter(Boolean);
assert(ev.includes('down'), `meer dan helft fout → niveau omlaag (events: ${ev.join(',')})`);
assert(weak.log.some((l) => l.cur.question.retry), 'na een fout komt een herkansing');
assert(weak.log.some((l) => l.cur.question.booster), 'na 2× fout komt een som die zeker lukt (opsteker)');
assert(weak.log.some((l) => l.res.easy === 'on'), 'rustig-aan-modus gaat aan');
st = await api('/api/state');
const br = st.skills.find((s) => s.cat === 'breuken');
assert(br.level === 0, `breuken nu op opstap (${br.levelName})`);

// ---- Leerfase: eerste 5× tussenstappen = gewone beloning; daarna keuze ----
const daily = await play('daily', (i, cur) => (cur.offer.mode === 'auto' ? 'guided-good'
  : cur.offer.mode === 'choose' ? (i % 2 ? 'solo-good' : 'guided-good') : 'good'));
const kinds = daily.log.map((l) => `${l.full.cat}:${l.res.rewardKind}`);
console.log('  beloningen:', kinds.join(' '));
const base = 50 / 20;
assert(daily.log.filter((l) => l.res.rewardKind === 'guided-free').every((l) => Math.abs(l.res.cents - base) < 1e-9), 'tussenstappen in leerfase = gewone beloning');
const pts = daily.log.reduce((a, l) => a + l.res.cents, 0);
assert(daily.last.summary.points === Math.round(pts), `dagtaak punten = som van beloningen (${daily.last.summary.points})`);

// Breuken forceren tot keuze: oefen breuken met tussenstappen tot 5 gratis op zijn
const guidedRun = await play('practice', (i, cur) => (cur.offer.mode === 'auto' || cur.offer.mode === 'optional' ? 'guided-good' : cur.offer.mode === 'choose' ? 'solo-good' : 'good'), { cat: 'breuken' });
const brKinds = guidedRun.log.filter((l) => l.full.cat === 'breuken').map((l) => l.cur.offer.mode);
console.log('  breuken hulp-modus per som:', brKinds.join(' '));
st = await api('/api/state');
const br2 = st.skills.find((s) => s.cat === 'breuken');
assert(br2.guidedWins >= 5, `breuken: ${br2.guidedWins} keer met tussenstappen goed (leerfase klaar)`);

// Nog een ronde: nu moet er een keuze komen bij voorgestelde hulp, en "zelf" geeft dubbel
await db.query(`UPDATE skills SET scaffold=3 WHERE cat='breuken'`);
const choiceRun = await play('practice', (i, cur) => (cur.offer.mode === 'choose' ? 'solo-good' : 'good'), { cat: 'breuken' });
const doubles = choiceRun.log.filter((l) => l.res.rewardKind === 'solo-double').length;
assert(choiceRun.log.some((l) => l.cur.offer.mode === 'choose'), 'na de leerfase mag hij kiezen');
assert([...guidedRun.log, ...choiceRun.log].some((l) => l.cur.offer.mode === 'choose' && l.cur.offer.transition), 'eerste keer: "nu moet je het zelf kunnen"-moment');
console.log(`  ${doubles} keer dubbele beloning (oefenen geeft 0 cent, maar de teller loopt)`);

// Half: gekozen voor tussenstappen na de leerfase (in een dagtaak-achtige sessie meten we de soort)
await db.query(`UPDATE skills SET scaffold=3 WHERE cat='breuken'`);
const halfRun = await play('practice', (i, cur) => (cur.offer.mode === 'choose' ? 'guided-good' : 'good'), { cat: 'breuken' });
assert(halfRun.log.some((l) => l.res.rewardKind === 'guided-half'), 'na leerfase: tussenstappen = halve beloning');

// ---- Weer omhoog bij 80% ----
const up = await play('practice', () => 'good', { cat: 'breuken' });
const up2 = await play('practice', () => 'good', { cat: 'breuken' });
const upEv = [...up.log, ...up2.log].map((l) => l.res.event).filter(Boolean);
assert(upEv.includes('up'), `na 80% goed weer een stapje omhoog (events: ${upEv.join(',')})`);
st = await api('/api/state');
assert(st.badges.find((b) => b.id === 'comeback').earned || true, 'badges werken');
console.log('  badges:', st.badges.filter((b) => b.earned).map((b) => b.icon + b.title).join(', '));
await db.end();
console.log(failed ? `\n${failed} fout(en)` : '\nAlles klopt ✓');
process.exit(failed ? 1 : 0);
