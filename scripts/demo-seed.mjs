// Demo-data maken: een virtueel kind ("Maxime") oefent ± drie schoolweken met de échte app (zonder AI),
// daarna exporteren we haar schema naar src/demo/<taal>.json.gz. Met die momentopname maakt de server
// in een paar tellen een demo-kind aan (knop "Bekijk de demo"), met de datums verschoven naar de laatste schooldagen.
//
// Draaien (lokale database, aparte server mét testklok en zonder AI-sleutels):
//   ALLOW_TEST_CLOCK=1 PORT=3002 OPENAI_API_KEY= ANTHROPIC_API_KEY= node server.js
//   SIM_BASE=http://localhost:3002 node scripts/demo-seed.mjs nl     (en daarna: … af)
import '../src/env.js';
import fs from 'node:fs';
import { gzipSync } from 'node:zlib';
import pg from 'pg';
import { fracStr, hhmm } from '../src/util.js';
import { isWordProblem } from '../src/signals.js';
import { DEMO_TEXT } from '../src/demo/texts.js';

const LANG = process.argv[2] === 'af' ? 'af' : 'nl';
const AF = LANG === 'af';
const BASE = process.env.SIM_BASE || 'http://localhost:3002';
const DAYS = Number(process.env.SIM_DAYS || 16); // schooldagen
const NAME = 'Maxime';
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

// ---------- wie is Maxime? (groep 8 / graad 6) ----------
// comfort: tot welk niveau (0-3) het onderdeel goed gaat. learn: hoeveel beter per schooldag.
const C = AF
  ? { optel: 3.2, vermenigvuldig: 2, deling: 1.6, getalbegrip: 3, breuke: 0.4, desimale: 1, persentasie: 0.6, finansies: 2, patrone: 2, meetkunde: 2.2, meting: 1.6, omtrek: 2, tyd: 0.5, data: 3.2 }
  : { optellen: 3.2, vermenigvuldigen: 2, delen: 1.6, kommagetallen: 1, getalbegrip: 3, breuken: 0.4, procenten: 0.6, verhoudingen: 1.8, schaal: 1.6, metriek: 2, oppervlakte: 2, tijd: 0.5, meetkunde: 2.2, grafieken: 3.2 };
const GROWTH = AF ? { breuke: 0.035, tyd: 0.03, desimale: 0.01, persentasie: 0.008 } : { breuken: 0.035, tijd: 0.03, kommagetallen: 0.01, procenten: 0.008 };
// denkfouten: [onderdeel, kans aan het begin] — slijten in de loop van de weken
const BUGS = AF ? [['breuke', /noemers/i, 0.75], ['tyd', /minute gelees/i, 0.7], ['persentasie', /afslag/i, 0.5], ['desimale', /komma/i, 0.35]]
  : [['breuken', /boven (én|en) onder/i, 0.75], ['tijd', /100/, 0.7], ['procenten', /korting/i, 0.5], ['kommagetallen', /komma/i, 0.35]];
const GROEP = AF ? 6 : 8;

let dayNo = 0;
const learn = (cat) => (GROWTH[cat] || 0.004) * dayNo;
const rnd = (a, b) => a + Math.random() * (b - a);
const chance = (p) => Math.random() < p;

// ---------- api ----------
const jar = {};
async function api(path, body) {
  const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  const r = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
  for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const [k, ...v] = kv.split('='); jar[k] = v.join('='); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path} → ${r.status} ${JSON.stringify(j)}`);
  return j;
}
let KID = null;
const SCHEMA = () => `kid_${KID}`;
const fullQ = async (id) => { const s = (await db.query(`SELECT questions, results FROM ${SCHEMA()}.sessions WHERE id=$1`, [id])).rows[0]; return s.questions[s.results.length]; };

const fmtNum = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');
const good = (q) => (q.type === 'number' ? fmtNum(q.answer) : q.type === 'fraction' ? fracStr(q.answer) : q.type === 'time' ? hhmm(q.answer) : q.answer);
function wrongAnswer(q) {
  if (q.type === 'choice') return (q.answer + 1 + Math.floor(Math.random() * (q.options.length - 1))) % q.options.length;
  if (q.type === 'time') return hhmm(q.answer + 10);
  if (q.type === 'fraction') return fracStr([q.answer[0] + 1, q.answer[1]], false);
  const a = q.answer;
  if (typeof a !== 'number') return '0';
  return fmtNum(Number.isInteger(a) ? a + (chance(0.5) ? 1 : -1) * (Math.abs(a) > 20 ? 10 : 1) : a * 10);
}
const fmtWrong = (q, w) => (Array.isArray(w.answer) ? `${w.answer[0]}/${w.answer[1]}` : q.type === 'time' ? hhmm(w.answer) : fmtNum(w.answer));

function decide(q, guided) {
  const cat = q.cat;
  for (const [c, re, p] of BUGS) {
    if (c !== cat || !q.wrong?.length) continue;
    const w = q.wrong.find((x) => re.test(x.label) && (typeof x.answer === 'number' || Array.isArray(x.answer)));
    if (w && chance(Math.max(0.05, p - 0.04 * dayNo))) return { correct: false, answer: fmtWrong(q, w), bug: true };
  }
  let p = 0.86 - 0.3 * (q.level - (C[cat] ?? 2)) + learn(cat);
  if (isWordProblem(q.text)) p -= 0.12;
  if (guided) p += 0.15;
  p = Math.min(0.96, Math.max(0.08, p));
  if (chance(p)) return { correct: true, answer: q.type === 'choice' ? q.answer : good(q) };
  if (chance(0.07)) return { correct: false, dontKnow: true };
  return { correct: false, answer: wrongAnswer(q) };
}
const timeFor = (d) => (!d.correct && !d.dontKnow && chance(0.4) ? Math.round(rnd(3000, 6000)) : Math.round(rnd(12000, 55000)));

async function play(kind, extra = {}) {
  let s = await api('/api/session/start', { kind, ...extra });
  let cur = s.current, n = 0, ok = 0, last = null;
  while (cur) {
    const q = await fullQ(s.id);
    let guided = false;
    if (cur.offer?.mode === 'auto') { await api(`/api/session/${s.id}/guide`, { index: cur.index }); guided = true; }
    else if (cur.offer?.mode === 'choose') { guided = chance(0.5); await api(`/api/session/${s.id}/guide`, { index: cur.index, choice: guided ? 'guided' : 'solo' }); }
    else if (kind !== 'intake' && cur.offer?.mode !== 'none' && chance(0.1) && q.guide?.length) { await api(`/api/session/${s.id}/guide`, { index: cur.index }); guided = true; }
    if (!guided && kind !== 'intake' && chance(0.12)) await api(`/api/session/${s.id}/hint`, { index: cur.index }).catch(() => {});
    if (guided) {
      for (const st of q.guide || []) {
        if (!chance(Math.min(0.95, 0.75 + learn(q.cat)))) {
          const w = await api(`/api/session/${s.id}/step`, { index: cur.index, answer: st.type === 'choice' ? (st.answer + 1) % st.options.length : st.type === 'number' ? fmtNum(st.answer + 1) : '1' }).catch(() => null);
          if (w?.revealed) continue;
        }
        await api(`/api/session/${s.id}/step`, { index: cur.index, answer: st.type === 'choice' ? st.answer : st.type === 'number' ? fmtNum(st.answer) : st.type === 'fraction' ? fracStr(st.answer) : st.type === 'time' ? hhmm(st.answer) : st.answer }).catch(() => null);
      }
    }
    const d = decide(q, guided);
    const body = { index: cur.index, timeMs: timeFor(d) };
    if (d.dontKnow) body.dontKnow = true; else body.answer = d.answer;
    const r = await api(`/api/session/${s.id}/answer`, body);
    n++; if (r.correct) ok++;
    last = r;
    cur = r.done ? null : r.next;
  }
  console.log(`  ${kind}: ${ok}/${n} goed${last?.surprise ? ` · verrassing: ${last.surprise.label || last.surprise}` : ''}${last?.weekBonus ? ' · weekbonus' : ''}`);
}

// ---------- de drie weken ----------
await api('/api/parent/login', { pin: process.env.PARENT_PIN || '1234' });
for (const k of (await api('/api/kids')).kids.filter((k) => k.name === NAME)) { await api('/api/kids/select', { id: k.id }); await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' }); }
const T = DEMO_TEXT[LANG];
KID = (await api('/api/kids', {
  name: NAME, avatar: '🦊', lang: LANG, country: AF ? 'ZA' : 'NL', grade: GROEP, age: AF ? 11 : 11,
  setup: { dailyCents: AF ? 500 : 50, intakeCents: AF ? 1000 : 100, weekBonusCents: AF ? 300 : 25, dailyCount: 20, days: [1, 2, 3, 4, 5],
    levelEvery: 5, levelGift: T.levelGift, goalGift: T.goalGift, research: false, surprise: { enabled: true, rewards: T.surprises } },
})).kid.id;
await api('/api/parent/surprise', { enabled: true, min: 0.6, rewards: T.surprises });
console.log(`${NAME} (${LANG}) = kid_${KID}`);

// testklok: een maandag een paar weken terug
let offset = -30;
const dow = (o) => new Date(Date.now() + o * 864e5).getDay();
while (dow(offset) !== 1) offset++;
const windows = []; // per gesimuleerde dag: welke echte tijd erbij hoort
const days = [];
for (dayNo = 0; dayNo < DAYS; dayNo++) {
  const today = (await api('/api/test/clock', { days: offset })).today;
  console.log(`Dag ${dayNo + 1} (${today})`);
  const w = { day: today, t0: Date.now() };
  if (dayNo === 0) { await play('intake', { groep: GROEP }); await api('/api/goal', { name: T.goal.name, euros: T.goal.amount }); }
  await play('daily');
  if (dayNo === 4) await play('practice', { cat: AF ? 'breuke' : 'breuken', goal: 'stap' });
  if (dayNo === 2 || dayNo === 9 || dayNo === 13) await play('practice');
  if (dayNo === 10) await api('/api/parent/payout', { cents: AF ? 2000 : 200, note: T.payout });
  w.t1 = Date.now();
  windows.push(w); days.push(today);
  offset++; while (dow(offset) === 0 || dow(offset) === 6) offset++;
}
const simToday = (await api('/api/test/clock', { days: offset })).today;
await api('/api/test/clock', { days: 0 });

// ---------- exporteren ----------
// Echte tijd → gesimuleerde dag (we oefenen 's middags rond kwart over vier)
function simTs(t) {
  const ms = new Date(t).getTime();
  let w = windows[0];
  for (const x of windows) if (ms >= x.t0 - 5000) w = x;
  const base = Date.parse(`${w.day}T14:15:00Z`); // 16:15 Nederlandse tijd (zomer)
  const span = Math.max(1, w.t1 - w.t0);
  return new Date(base + Math.max(0, Math.min(1, (ms - w.t0) / span)) * 40 * 60e3).toISOString();
}
const TABLES = ['settings', 'skills', 'sessions', 'attempts', 'skill_snapshots', 'ledger', 'badges', 'reviews', 'explanations'];
const DROP_SETTINGS = /^(weekbonus:|surprise:|praatje:|signals$|nextPlan$|ai_)/;
const out = { lang: LANG, name: NAME, days, simToday, kid: { name: NAME, avatar: '🦊', lang: LANG, country: AF ? 'ZA' : 'NL', grade: GROEP, age: 11 }, tables: {} };
for (const t of TABLES) {
  const { rows, fields } = await db.query(`SELECT * FROM ${SCHEMA()}.${t} ORDER BY 1`);
  const tsCols = fields.filter((f) => f.dataTypeID === 1184).map((f) => f.name);
  out.tables[t] = rows.filter((r) => t !== 'settings' || !DROP_SETTINGS.test(r.key)).map((r) => {
    for (const c of tsCols) if (r[c]) r[c] = simTs(r[c]);
    return r;
  });
}
// wat de AI-leraar onderweg zou hebben bijgehouden (geschreven teksten, zie src/demo/texts.js)
const set = (key, value) => { out.tables.settings = out.tables.settings.filter((r) => r.key !== key); out.tables.settings.push({ key, value }); };
set('memory', T.memory.map(([i, n]) => ({ d: days[i], n })));
set('profile', { ...T.profile, updated_at: `${days.at(-1)}T15:05:00.000Z` });
fs.mkdirSync('src/demo', { recursive: true });
fs.writeFileSync(`src/demo/${LANG}.json.gz`, gzipSync(JSON.stringify(out), { level: 9 }));
const st = Object.fromEntries(TABLES.map((t) => [t, out.tables[t].length]));
console.log(`\n→ src/demo/${LANG}.json.gz (${Math.round(fs.statSync(`src/demo/${LANG}.json.gz`).size / 1024)} kB)`, st);
await db.end();
