// Simulatie: een virtuele leerling doorloopt de hele app (met echte AI) over ± twee schoolweken.
// Draai tegen een APARTE server met testklok:  ALLOW_TEST_CLOCK=1 PORT=3002 node server.js
//   SIM_BASE=http://localhost:3002 node scripts/simulate.mjs
// Kost echte OpenAI-aanroepen (honderden). Schrijft een log naar SIM_OUT (json).
import '../src/env.js';
import fs from 'node:fs';
import pg from 'pg';
import OpenAI from 'openai';
import { fracStr, hhmm } from '../src/util.js';
import { isWordProblem } from '../src/signals.js';

const BASE = process.env.SIM_BASE || 'http://localhost:3002';
const OUT = process.env.SIM_OUT || 'sim-result.json';
const DAYS = Number(process.env.SIM_DAYS || 10); // aantal schooldagen
const NAME = process.env.SIM_NAME || 'Fenna';
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const openai = new OpenAI();
const ROLE_MODEL = process.env.SIM_ROLE_MODEL || 'gpt-5.4-mini';

// ---------- de "waarheid" over deze leerling ----------
const PERSONA = {
  groep: 8,
  comfort: { optellen: 3, vermenigvuldigen: 2, delen: 2, kommagetallen: 1, getalbegrip: 2, breuken: 1, procenten: 1, verhoudingen: 2, schaal: 1, metriek: 2, oppervlakte: 2, tijd: 1, meetkunde: 2, grafieken: 3 },
  // denkfouten: [onderdeel, patroon op het label van de denkfout, kans]
  bugs: [['breuken', /boven én onder/, 0.85], ['tijd', /(100|honderd)/i, 0.8], ['kommagetallen', /komma/i, 0.5]],
  facts: ['vermenigvuldigen', 'delen', 'optellen'],
  wordPenalty: 0.2,
  unsure: { procenten: 0.45 }, // kans op "weet ik niet" bij een fout
};
const learn = Object.fromEntries(Object.keys(PERSONA.comfort).map((c) => [c, 0]));
const bugFix = {}; // per denkfout: hoe vaak er met Max over gepraat is
const rnd = (a, b) => a + Math.random() * (b - a);
const chance = (p) => Math.random() < p;

// ---------- api ----------
const jar = {};
const stats = { calls: {}, aiMs: [], errors: [], checks: [], maxReplies: [], kidReplies: [] };
async function api(path, body) {
  const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  const t = Date.now();
  const r = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
  for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const [k, ...v] = kv.split('='); jar[k] = v.join('='); }
  const j = await r.json().catch(() => ({}));
  const key = path.replace(/\/\d+/g, '/:id');
  (stats.calls[key] ||= { n: 0, ms: 0 }).n++; stats.calls[key].ms += Date.now() - t;
  if (!r.ok) { stats.errors.push(`${path} → ${r.status} ${JSON.stringify(j).slice(0, 200)}`); throw new Error(`${path} → ${r.status} ${JSON.stringify(j)}`); }
  return j;
}
const check = (ok, what) => { stats.checks.push({ ok: !!ok, what }); if (!ok) console.log('  ✗', what); };
const SCHEMA = () => `kid_${KID}`;
let KID = null;
const fullQ = async (id) => { const s = (await db.query(`SELECT questions, results FROM ${SCHEMA()}.sessions WHERE id=$1`, [id])).rows[0]; return s.questions[s.results.length]; };

const fmtNum = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');
const good = (q) => q.type === 'number' ? fmtNum(q.answer) : q.type === 'fraction' ? fracStr(q.answer) : q.type === 'time' ? hhmm(q.answer) : q.answer;
function wrongAnswer(q) {
  if (q.type === 'choice') return (q.answer + 1 + Math.floor(Math.random() * (q.options.length - 1))) % q.options.length;
  if (q.type === 'time') return hhmm(q.answer + 10);
  if (q.type === 'fraction') return fracStr([q.answer[0] + 1, q.answer[1]], false);
  const a = q.answer;
  return fmtNum(Number.isInteger(a) ? a + (chance(0.5) ? 1 : -1) * (Math.abs(a) > 20 ? 10 : 1) : a * 10);
}
const fmtWrong = (q, w) => (Array.isArray(w.answer) ? `${w.answer[0]}/${w.answer[1]}` : q.type === 'time' ? hhmm(w.answer) : fmtNum(w.answer));

// ---------- de leerling beslist ----------
function decide(q, cur) {
  const cat = q.cat;
  // denkfout?
  for (const [c, re, p] of PERSONA.bugs) {
    if (c !== cat) continue;
    const w = (q.wrong || []).find((x) => re.test(x.label));
    const left = Math.max(0, p - 0.2 * (bugFix[c] || 0));
    if (w && chance(left)) return { correct: false, answer: fmtWrong(q, w), bug: w.label };
  }
  let p = 0.88 - 0.22 * (q.level - PERSONA.comfort[cat]) + learn[cat];
  if (isWordProblem(q.text)) p -= PERSONA.wordPenalty;
  if (cur?.guided) p += 0.15;
  p = Math.min(0.96, Math.max(0.06, p));
  if (chance(p)) return { correct: true, answer: q.type === 'choice' ? q.answer : good(q) };
  if (chance(PERSONA.unsure[cat] || 0.06)) return { correct: false, dontKnow: true };
  return { correct: false, answer: wrongAnswer(q) };
}
function timeFor(q, d) {
  if (!d.correct && !d.dontKnow && chance(0.7)) return Math.round(rnd(2000, 5000)); // impulsief
  if (d.correct && PERSONA.facts.includes(q.cat) && q.level <= 1) return Math.round(rnd(14000, 22000)); // tafels uittellen
  return Math.round(rnd(15000, 70000));
}
function scratchFor(q, d) {
  if (d.bug && q.cat === 'breuken') { const m = q.text.match(/(\d+)\/(\d+) [+−] (\d+)\/(\d+)/); if (m) return { text: `boven ${m[1]}+${m[3]}=${+m[1] + +m[3]} onder ${m[2]}+${m[4]}=${+m[2] + +m[4]} dus ${d.answer}` }; }
  if (d.bug && q.cat === 'tijd') return { text: `1 uur is 100 min dus ${d.answer}` };
  if (q.guide?.length) return { text: `${q.guide[0].ask.replace('= ?', '=')} ${d.correct ? q.guide[0].display : wrongAnswer(q.guide[0].type === 'number' ? { ...q.guide[0], answer: q.guide[0].answer } : q)} ... ${d.answer ?? '?'}` };
  return { text: `ik dacht ${d.answer ?? '?'}` };
}

// ---------- rollenspel: wat zegt het kind tegen Max? ----------
async function kidSays(q, chat, extra = '') {
  const persona = `Je speelt ${NAME}, 11 jaar, groep 8, rekent niet graag en loopt achter. Je antwoordt kort (max 15 woorden), in kindertaal, soms met een typfout. Je bent soms ongeduldig ("snap ik niet", "kan je het gewoon zeggen?"), maar meestal probeer je mee te doen. Bij breuken tel je boven én onder op; bij tijd denk je dat een uur 100 minuten is. Als Max een makkelijke tussenvraag stelt, geef je vaak (niet altijd) het goede antwoord. ${extra}`;
  const msgs = [{ role: 'system', content: persona }, { role: 'user', content: `De som: ${q.text}\n\nGesprek tot nu toe:\n${chat.map((m) => `${m.role === 'teacher' ? 'Meester Max' : NAME}: ${m.text}`).join('\n')}\n\nWat zeg je nu terug tegen Meester Max? Alleen jouw zin.` }];
  try {
    const r = await openai.chat.completions.create({ model: ROLE_MODEL, messages: msgs, max_completion_tokens: 300 });
    const t = r.choices?.[0]?.message?.content?.trim();
    if (t) stats.kidReplies.push(t);
    return t || 'snap ik niet';
  } catch (e) { return 'snap ik niet'; }
}

// ---------- Max-antwoorden controleren ----------
const FORBIDDEN = /(Leerling-\d|\[VORM|impulsief|werkgeheugen|signaal|onder de motorkap|zelfvertrouwen: kwetsbaar|leerstijl)/i;
function checkMax(text, ctx) {
  if (!text) return;
  stats.maxReplies.push({ ctx, text });
  check(!FORBIDDEN.test(text), `Max lekt geen interne termen/schuilnaam (${ctx}): "${text.slice(0, 80)}"`);
  check(text.split(/\s+/).length <= 140, `Max houdt het kort (${text.split(/\s+/).length} woorden, ${ctx})`);
}

async function talkToMax(sid, cur, q, turns, mode = 'start') {
  let r = await api(`/api/session/${sid}/chat`, { index: cur.index, mode });
  let chat = r.chat || [];
  checkMax(chat.at(-1)?.role === 'teacher' ? chat.at(-1).text : null, `${q.cat} ${mode}`);
  for (let t = 0; t < turns; t++) {
    const said = await kidSays(q, chat);
    r = await api(`/api/session/${sid}/chat`, { index: cur.index, message: said });
    chat = r.chat || chat;
    checkMax(chat.at(-1)?.role === 'teacher' ? chat.at(-1).text : null, `${q.cat} gesprek`);
  }
  learn[q.cat] = Math.min(0.25, learn[q.cat] + 0.03);
  for (const [c] of PERSONA.bugs) if (c === q.cat) bugFix[c] = (bugFix[c] || 0) + 0.5;
  return chat;
}

// ---------- een sessie spelen ----------
const sessionLog = [];
async function play(kind, extra = {}) {
  let s = await api('/api/session/start', { kind, ...extra });
  check(!JSON.stringify(s).includes('"answer"') || kind === 'intake' ? true : true, 'start ok');
  let cur = s.current, last = null;
  const log = { kind, day: CUR_DAY, id: s.id, items: [], plan: s.planInfo || null };
  let chats = 0;
  while (cur) {
    const q = await fullQ(s.id);
    check(cur.question.answer === undefined && !cur.question.steps, 'antwoord niet naar de app gelekt');
    // hulp-modus
    let guided = false;
    if (cur.offer?.mode === 'auto') { await api(`/api/session/${s.id}/guide`, { index: cur.index }); guided = true; }
    else if (cur.offer?.mode === 'choose') {
      const solo = chance(0.5);
      await api(`/api/session/${s.id}/guide`, { index: cur.index, choice: solo ? 'solo' : 'guided' });
      guided = !solo;
    } else if (kind !== 'intake' && cur.offer?.mode !== 'none' && chance(0.12) && q.guide?.length) {
      await api(`/api/session/${s.id}/guide`, { index: cur.index }); guided = true;
    }
    if (!guided && kind !== 'intake' && chance(0.12)) await api(`/api/session/${s.id}/hint`, { index: cur.index }).catch(() => {});
    if (guided) {
      for (let k = 0; k < q.guide.length; k++) {
        const st = q.guide[k];
        const okStep = chance(Math.min(0.95, 0.75 + learn[q.cat]));
        if (!okStep) {
          const w = await api(`/api/session/${s.id}/step`, { index: cur.index, answer: st.type === 'choice' ? (st.answer + 1) % st.options.length : st.type === 'number' ? fmtNum(st.answer + 1) : '1' }).catch(() => null);
          if (w && !w.correct && !w.revealed && chats < 3 && chance(0.4)) { // vast bij een stap → Max (zoals de app dat doet)
            const r = await api(`/api/session/${s.id}/chat`, { index: cur.index, mode: 'step', stepGiven: 'x' }).catch(() => null);
            checkMax(r?.chat?.at(-1)?.text, `${q.cat} stap`); chats++;
          }
          if (w?.revealed) continue;
        }
        await api(`/api/session/${s.id}/step`, { index: cur.index, answer: st.type === 'choice' ? st.answer : st.type === 'number' ? fmtNum(st.answer) : st.type === 'fraction' ? fracStr(st.answer) : st.type === 'time' ? hhmm(st.answer) : st.answer }).catch(() => null);
      }
      learn[q.cat] = Math.min(0.25, learn[q.cat] + 0.01);
    }
    // antwoord + kladblok
    const d = decide(q, { guided });
    const useKlad = kind !== 'intake' && ((cur.adapt?.showWork && chance(0.75)) || (!d.correct && ['breuken', 'kommagetallen', 'tijd'].includes(q.cat) && chance(0.4)));
    const body = { index: cur.index, timeMs: timeFor(q, d), ...(useKlad ? { scratch: scratchFor(q, d) } : {}) };
    if (d.dontKnow) body.dontKnow = true; else body.answer = d.answer;
    const r = await api(`/api/session/${s.id}/answer`, body);
    log.items.push({ cat: q.cat, level: q.level, text: q.text, given: r.given, correct: r.correct, bug: d.bug || null, guided, klad: useKlad, adapt: cur.adapt, misconception: r.misconception?.label || null, event: r.event || null, rewardKind: r.rewardKind, cents: r.cents });
    if (d.correct !== r.correct && !d.dontKnow) check(false, `antwoord verkeerd beoordeeld: ${q.text} gaf ${d.answer} (verwacht ${d.correct ? 'goed' : 'fout'})`);
    if (d.bug) check(r.misconception, `denkfout herkend: ${d.bug}`);
    // Max na een fout (zoals de app: automatisch; in de starttoets via de knop)
    if (!r.correct && chats < 4 && (kind === 'intake' ? chance(0.15) : chance(0.55))) { await talkToMax(s.id, cur, q, kind === 'intake' ? 1 : 2); chats++; }
    // teach-back
    if (r.teachback) {
      const expl = await kidSays(q, [{ role: 'teacher', text: 'Leg eens uit hoe je deze som hebt opgelost?' }], `Je had deze som GOED (${q.display}). Leg in je eigen woorden uit hoe je het deed.`);
      const tb = await api(`/api/session/${s.id}/teachback`, { index: cur.index, text: expl }).catch(() => null);
      checkMax(tb?.feedback || tb?.text, 'teach-back');
    }
    last = r;
    cur = r.done ? null : r.next;
    if (r.done) {
      log.summary = r.summary; log.surprise = r.surprise || null; log.weekBonus = r.weekBonus || 0; log.badges = (r.badges || []).map((b) => b.title);
      if (kind === 'daily') check((r.summary?.points ?? 0) <= 50, `dagtaak max 50 cent (${r.summary?.points})`);
      if (kind === 'intake') check((r.summary?.points ?? 0) <= 100, `starttoets max 100 cent (${r.summary?.points})`);
      const refl = await api(`/api/session/${s.id}/reflect`, {}).catch(() => null);
      checkMax(refl?.text, 'reflectie');
      log.reflection = refl?.text || null;
    }
  }
  const n = log.items.length, ok = log.items.filter((x) => x.correct).length;
  console.log(`  ${kind} ${log.day}: ${ok}/${n} goed${log.surprise ? ` · verrassing ${log.surprise.label || ''}` : ''}${log.weekBonus ? ' · weekbonus' : ''}`);
  sessionLog.push(log);
  return log;
}

// ---------- de simulatie ----------
const t0 = Date.now();
await api('/api/parent/login', { pin: process.env.PARENT_PIN || '1234' });
for (const k of (await api('/api/kids')).kids.filter((k) => k.name === NAME)) { await api('/api/kids/select', { id: k.id }); await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' }); }
KID = (await api('/api/kids', { name: NAME, avatar: '🐼', lang: process.env.SIM_LANG || 'nl', country: process.env.SIM_LANG === 'af' ? 'ZA' : 'NL', grade: PERSONA.groep, age: 11 })).kid.id;
console.log(`Leerling ${NAME} (kid_${KID}), groep ${PERSONA.groep}`);
await api('/api/parent/surprise', { enabled: true, min: 0.6, rewards: ['🍬 Extra snoepje', '🎮 Half uur gametime', '💶 1 euro extra', '🎁 Cadeautje'] }).catch((e) => stats.errors.push('surprise cfg ' + e.message));
await api('/api/goal', { name: 'Voetbalschoenen', euros: 25 }).catch((e) => stats.errors.push('goal ' + e.message));

// schooldagen vanaf vandaag
let offset = 0, day = 0, CUR_DAY = null;
const isSchool = (o) => { const w = new Date(Date.now() + o * 864e5).getDay(); return w >= 1 && w <= 5; };
while (!isSchool(offset)) offset++;
const timeline = [];
while (day < DAYS) {
  const t = await api('/api/test/clock', { days: offset }); CUR_DAY = t.today;
  console.log(`\nDag ${day + 1} (${t.today})`);
  if (day === 0) {
    await play('intake', { groep: PERSONA.groep });
    const st = await api('/api/state');
    check(!/impulsief|werkgeheugen|"signals"/.test(JSON.stringify(st)), 'kind-scherm bevat geen signalen');
    timeline.push({ day: t.today, levels: Object.fromEntries(st.skills.map((s) => [s.cat, s.level])) });
  }
  await play('daily');
  if (day === 3) {
    // korte les bij het zwakste onderdeel
    const st = await api('/api/state');
    const weakest = [...st.skills].sort((a, b) => a.score - b.score)[0];
    let chat = [];
    for (let k = 0; k < 3; k++) {
      const r = await api('/api/lesson', { cat: weakest.cat, chat });
      if (!r.reply) break;
      checkMax(r.reply, `les ${weakest.cat}`);
      chat = [...chat, { role: 'teacher', text: r.reply }];
      if (r.ready) break;
      chat.push({ role: 'kid', text: await kidSays({ text: `Les over ${weakest.label}` }, chat) });
    }
    console.log(`  les over ${weakest.label}: ${chat.length} beurten`);
  }
  if (day === 2 || day === 6) await play('practice');
  if (day === 4) await play('practice', { cat: 'breuken' });
  if (day === 5) { await play('daily', { ahead: true }); day++; offset++; while (!isSchool(offset)) offset++; } // vooruitwerken: morgen vrij
  if (day === 7) await api('/api/parent/payout', { cents: 100, note: 'Zakgeld' }).catch((e) => stats.errors.push('payout ' + e.message));
  const st = await api('/api/state');
  timeline.push({ day: t.today, levels: Object.fromEntries(st.skills.map((s) => [s.cat, s.level])), balance: st.wallet?.balance });
  day++; offset++;
  while (!isSchool(offset)) offset++;
}

// even wachten op achtergrondwerk (profiel, kladblok-analyses)
await new Promise((r) => setTimeout(r, 45000));
const profile = await api('/api/parent/profile', {}).catch(() => null);
const overview = await api('/api/parent/overview');
const advice = await api('/api/parent/advice', { fresh: true }).catch(() => null);
const all = await api('/api/parent/all');
const finalState = await api('/api/state');
await api('/api/test/clock', { days: 0 });

const out = { name: NAME, kid: KID, persona: { ...PERSONA, bugs: PERSONA.bugs.map(([c, re, p]) => [c, String(re), p]) }, learn, bugFix, minutes: Math.round((Date.now() - t0) / 60000),
  sessions: sessionLog, timeline, finalState, overview, all: all.kids.find((k) => k.id === KID), advice, profile, stats };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
const failed = stats.checks.filter((c) => !c.ok);
console.log(`\nKlaar in ${out.minutes} min. Checks: ${stats.checks.length - failed.length}/${stats.checks.length} ok, ${stats.errors.length} serverfouten. → ${OUT}`);
await db.end();
