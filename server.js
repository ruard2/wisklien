import './src/env.js';
import express from 'express';
import crypto from 'node:crypto';
import { q, one, migrate, getSetting, setSetting, pool } from './src/db.js';
import { checkAnswer, publicQuestion, publicStep, hintsFor, CATEGORIES, catById, LEVEL_NAMES } from './src/generators.js';
import {
  INTAKE_POINTS, DAILY_POINTS, DAILY_COUNT, PRACTICE_COUNT, FREE_GUIDED, SOLO_BONUS,
  getSkills, updateSkill, saveSkill, intakePlan, skillFromIntake, getStruggling, snapshotSkills,
  allocate, buildPlan, nextQuestion, updateState, rewardFor, helpOffer, skillScore, skillLabel,
  awardBadge, getBadges,
} from './src/engine.js';
import { aiEnabled, explain, coachCard, parentAdvice, teachBack } from './src/ai.js';
import { todayNL, isSchoolDay, weekdayNL } from './src/util.js';

const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const PARENT_PIN = process.env.PARENT_PIN || '1234';
const APP_PIN = process.env.APP_PIN || '';
const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 80);
const WEEK_BONUS = Number(process.env.WEEK_BONUS ?? 25); // centen als alle 5 dagtaken van een week af zijn
if (!process.env.PARENT_PIN) console.warn('[let op] PARENT_PIN niet gezet — standaard is 1234');

const app = express();
app.use(express.json({ limit: '50kb' }));

// ---------- simpele inlog met ondertekende cookie ----------
const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('hex').slice(0, 32);
function makeToken(role, days) {
  const exp = Date.now() + days * 864e5;
  return `${role}.${exp}.${sign(`${role}.${exp}`)}`;
}
function hasRole(req, role) {
  const c = Object.fromEntries((req.headers.cookie || '').split(';').map((x) => x.trim().split('=')).filter((x) => x[0]));
  const t = c[role === 'parent' ? 'cp' : 'cc'];
  if (!t) return false;
  const [r, exp, sig] = decodeURIComponent(t).split('.');
  return r === role && Number(exp) > Date.now() && sig === sign(`${r}.${exp}`);
}
function setCookie(res, role, days) {
  const name = role === 'parent' ? 'cp' : 'cc';
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${name}=${encodeURIComponent(makeToken(role, days))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${days * 86400}${secure}`);
}
const pinOk = (given, real) => {
  const a = Buffer.from(String(given || '')), b = Buffer.from(String(real));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const child = (req, res, next) => (!APP_PIN || hasRole(req, 'child') || hasRole(req, 'parent') ? next() : res.status(401).json({ error: 'login' }));
const parent = (req, res, next) => (hasRole(req, 'parent') ? next() : res.status(401).json({ error: 'parent-login' }));
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error(e); res.status(500).json({ error: 'Er ging iets mis op de server.' }); });

// ---------- AI-limiet per dag (kostenbewaking) ----------
const aiUse = { day: '', n: 0 };
function aiAllowed() {
  const d = todayNL();
  if (aiUse.day !== d) { aiUse.day = d; aiUse.n = 0; }
  if (aiUse.n >= AI_DAILY_LIMIT) return false;
  aiUse.n++;
  return true;
}

// ---------- hulpfuncties ----------
const getName = () => getSetting('name', process.env.CHILD_NAME || 'Christo');
const prevDay = (d) => new Date(Date.parse(d + 'T12:00:00Z') - 864e5).toISOString().slice(0, 10);
const dowOf = (d) => new Date(d + 'T12:00:00Z').getUTCDay();
const addDays = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
// maandag t/m vrijdag van de huidige week (Nederlandse tijd)
function schoolWeek(today = todayNL()) {
  const w = dowOf(today);
  const monday = addDays(today, w === 0 ? -6 : 1 - w);
  return [0, 1, 2, 3, 4].map((k) => addDays(monday, k));
}
async function weekInfo() {
  const days = schoolWeek();
  const done = new Set((await q(`SELECT day::text AS d FROM sessions WHERE kind='daily' AND status='done' AND day = ANY($1::date[])`, [days])).rows.map((r) => r.d));
  const given = await getSetting(`weekbonus:${days[0]}`, null);
  return { days: days.map((d) => ({ day: d, done: done.has(d), today: d === todayNL() })), count: done.size, bonus: WEEK_BONUS, given: !!given };
}
async function goalInfo(balance) {
  const g = await getSetting('goal', null);
  if (!g) return null;
  return { ...g, reached: balance >= g.cents, left: Math.max(0, g.cents - balance) };
}

async function wallet() {
  const r = await one(`SELECT COALESCE(SUM(cents) FILTER (WHERE kind='earn'),0)::int AS earned,
                              COALESCE(-SUM(cents) FILTER (WHERE kind='payout'),0)::int AS paid FROM ledger`);
  return { earned: r.earned, paid: r.paid, balance: r.earned - r.paid };
}

async function streak() {
  const done = new Set((await q(`SELECT day::text AS d FROM sessions WHERE kind='daily' AND status='done'`)).rows.map((r) => r.d));
  let d = todayNL(), n = 0;
  if (!done.has(d)) d = prevDay(d);
  for (let i = 0; i < 400; i++, d = prevDay(d)) {
    const w = dowOf(d);
    if (w === 0 || w === 6) continue;
    if (done.has(d)) n++; else break;
  }
  return n;
}

// De huidige som + alles wat de client nodig heeft om hem te tonen (ook na hervatten).
function currentPayload(s, skills) {
  const i = s.results.length;
  const qq = s.questions[i];
  if (!qq) return null;
  const skill = skills.find((x) => x.cat === qq.cat);
  const offer = helpOffer(qq, skill);
  return {
    index: i,
    question: publicQuestion(qq),
    offer,
    // bij het "nu moet je het zelf kunnen"-moment: welke tussenstappen hij steeds deed (zonder antwoorden)
    plan: offer.mode === 'choose' ? qq.guide.map((g) => g.ask) : null,
    guided: !!qq.guided,
    chose: qq.chose || null,
    guideDone: (qq.guideDone || []),
    guideStep: qq.guided && qq.guideStep < qq.guide.length ? publicStep(qq.guide[qq.guideStep]) : null,
    guideFinal: qq.guided && qq.guideStep >= qq.guide.length ? qq.guideFinal : null,
    hints: hintsFor(qq).slice(0, qq.hints || 0),
    hintCount: hintsFor(qq).length,
    base: s.max_points / s.total,
  };
}
function sessionPayload(s, skills, extra = {}) {
  return {
    id: s.id, kind: s.kind, status: s.status, total: s.total,
    answered: s.results.length, correct: s.correct, maxPoints: s.max_points,
    points: s.points_acc, streak: s.state?.streak || 0, easy: !!s.state?.easy,
    current: s.status === 'active' ? currentPayload(s, skills) : null,
    ...extra,
  };
}

async function skillsView() {
  const skills = await getSkills();
  const struggling = await getStruggling(skills);
  const weekAgo = (await q(`SELECT DISTINCT ON (cat) cat, score FROM skill_snapshots WHERE day <= (CURRENT_DATE - 6) ORDER BY cat, day DESC`)).rows;
  const prev = Object.fromEntries(weekAgo.map((r) => [r.cat, r.score]));
  const list = skills.map((s) => {
    const score = skillScore(s), meta = catById[s.cat];
    return {
      cat: s.cat, label: meta.label, icon: meta.icon, domain: meta.domain, level: s.level, levelName: LEVEL_NAMES[s.level], score,
      tag: skillLabel(score), trend: prev[s.cat] != null ? Math.round(score - prev[s.cat]) : null,
      attempts: s.attempts, correct: s.correct, struggling: struggling.includes(s.cat),
      guidedWins: s.guided_wins, soloBonus: s.solo_bonus,
      toNext: s.level < 3 ? Math.round(((s.recent || []).reduce((a, b) => a + b, 0) / Math.max(8, (s.recent || []).length)) * 100) : null,
    };
  }).sort((a, b) => b.score - a.score);
  return { list, struggling, skills };
}

async function loadSession(id, client = pool) {
  return (await client.query('SELECT * FROM sessions WHERE id=$1', [id])).rows[0];
}

// =====================================================================
// API kind
// =====================================================================
app.post('/api/login', wrap(async (req, res) => {
  if (!APP_PIN || pinOk(req.body.pin, APP_PIN)) { setCookie(res, 'child', 180); return res.json({ ok: true }); }
  res.status(401).json({ error: 'Verkeerde pincode' });
}));

app.get('/api/state', child, wrap(async (req, res) => {
  const today = todayNL();
  const intake = await one(`SELECT id, status FROM sessions WHERE kind='intake' ORDER BY id DESC LIMIT 1`);
  const daily = await one(`SELECT id, status, correct, total, points, results FROM sessions WHERE kind='daily' AND day=$1 ORDER BY id DESC LIMIT 1`, [today]);
  const history = (await q(`SELECT day::text AS day, correct, total, points FROM sessions WHERE kind='daily' AND status='done' ORDER BY day DESC LIMIT 10`)).rows.reverse();
  const { list, struggling } = await skillsView();
  const w = await wallet();
  const goal = await goalInfo(w.balance);
  if (goal?.reached) await awardBadge('doel');
  const badges = await getBadges();
  res.json({
    name: await getName(),
    ai: aiEnabled(),
    intakeDone: intake?.status === 'done',
    intakeActive: intake?.status === 'active' ? intake.id : null,
    today: { date: today, weekday: weekdayNL(), schoolDay: isSchoolDay(), daily: daily ? { id: daily.id, status: daily.status, correct: daily.correct, total: daily.total, points: daily.points, answered: daily.results.length } : null },
    wallet: await wallet(),
    streak: await streak(),
    record: await getSetting('record', 0),
    week: await weekInfo(),
    goal: await goalInfo((await wallet()).balance),
    skills: list,
    struggling,
    history,
    badges,
    points: { intake: INTAKE_POINTS, daily: DAILY_POINTS, dailyCount: DAILY_COUNT, freeGuided: FREE_GUIDED, soloBonus: SOLO_BONUS },
  });
}));

async function createSession(kind, plan, total, maxPoints, skills) {
  const s = { kind, plan, total, max_points: maxPoints, questions: [], results: [], state: {} };
  s.questions.push(nextQuestion(s, skills));
  return one(`INSERT INTO sessions(kind, day, questions, total, max_points, plan, state) VALUES ($1,$2,$3,$4,$5,$6,'{}') RETURNING *`,
    [kind, todayNL(), JSON.stringify(s.questions), total, maxPoints, JSON.stringify(plan)]);
}

app.post('/api/session/start', child, wrap(async (req, res) => {
  const kind = req.body.kind;
  const today = todayNL();
  const intake = await one(`SELECT id, status FROM sessions WHERE kind='intake' ORDER BY id DESC LIMIT 1`);
  const { skills, struggling } = await skillsView();

  if (kind === 'intake') {
    if (intake?.status === 'done') return res.status(400).json({ error: 'De starttoets is al gedaan.' });
    if (intake) return res.json(sessionPayload(await loadSession(intake.id), skills));
    const plan = intakePlan();
    return res.json(sessionPayload(await createSession('intake', plan, plan.length, INTAKE_POINTS, skills), skills));
  }
  if (intake?.status !== 'done') return res.status(400).json({ error: 'Doe eerst de starttoets.' });

  if (kind === 'daily') {
    if (!isSchoolDay()) return res.status(400).json({ error: 'In het weekend is er geen dagtaak. Je kunt wel extra oefenen!' });
    const existing = await one(`SELECT * FROM sessions WHERE kind='daily' AND day=$1 ORDER BY id DESC LIMIT 1`, [today]);
    if (existing) return res.json(sessionPayload(existing, skills, { struggling }));
    const plan = buildPlan(skills, allocate(skills, DAILY_COUNT, struggling));
    return res.json(sessionPayload(await createSession('daily', plan, DAILY_COUNT, DAILY_POINTS, skills), skills, { struggling }));
  }

  if (kind === 'practice') {
    const active = await one(`SELECT * FROM sessions WHERE kind='practice' AND status='active' ORDER BY id DESC LIMIT 1`);
    const focus = req.body.cat && catById[req.body.cat] ? req.body.cat : null;
    if (active && (!focus || active.plan.every((c) => c === focus))) return res.json(sessionPayload(active, skills, { struggling }));
    if (active) await q(`UPDATE sessions SET status='stopped' WHERE id=$1`, [active.id]);
    const plan = focus ? Array(PRACTICE_COUNT).fill(focus) : buildPlan(skills, allocate(skills, PRACTICE_COUNT, struggling));
    return res.json(sessionPayload(await createSession('practice', plan, PRACTICE_COUNT, 0, skills), skills, { struggling }));
  }
  res.status(400).json({ error: 'Onbekend soort sessie' });
}));

app.get('/api/session/:id', child, wrap(async (req, res) => {
  const s = await loadSession(req.params.id);
  if (!s) return res.status(404).json({ error: 'Niet gevonden' });
  res.json(sessionPayload(s, await getSkills()));
}));

// Helper: huidige som ophalen en controleren dat het de goede index is
async function lockCurrent(client, id, index) {
  const s = (await client.query('SELECT * FROM sessions WHERE id=$1 FOR UPDATE', [id])).rows[0];
  if (!s || s.status !== 'active' || Number(index) !== s.results.length || !s.questions[s.results.length]) return { s, qq: null };
  return { s, qq: s.questions[s.results.length] };
}
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// Hint: volgende stap van het stappenplan als tekst (de laatste stap verklapt het antwoord)
app.post('/api/session/:id/hint', child, wrap(async (req, res) => {
  const out = await tx(async (c) => {
    const { s, qq } = await lockCurrent(c, req.params.id, req.body.index);
    if (!qq || qq.noHelp) return { error: 'Geen hint mogelijk.' };
    const all = hintsFor(qq), used = qq.hints || 0;
    if (used >= all.length) return { hint: null, more: false, hints: all.slice(0, used) };
    qq.hints = used + 1;
    await c.query('UPDATE sessions SET questions=$2 WHERE id=$1', [s.id, JSON.stringify(s.questions)]);
    return { hint: all[used], hints: all.slice(0, used + 1), more: used + 1 < all.length };
  });
  if (out.error) return res.status(400).json(out);
  res.json(out);
}));

// Kiezen: helemaal zelf (dubbel) of met tussenstappen; of zelf "samen stap voor stap" starten
app.post('/api/session/:id/guide', child, wrap(async (req, res) => {
  const out = await tx(async (c) => {
    const { s, qq } = await lockCurrent(c, req.params.id, req.body.index);
    if (!qq || qq.noHelp || !qq.guide.length) return { error: 'Hier zijn geen tussenstappen.' };
    const skill = (await c.query('SELECT * FROM skills WHERE cat=$1', [qq.cat])).rows[0];
    const offer = helpOffer(qq, skill || {});
    if (offer.mode === 'choose' && skill && !skill.transition_seen) {
      await c.query('UPDATE skills SET transition_seen=true WHERE cat=$1', [qq.cat]);
    }
    if (req.body.choice === 'solo') {
      if (offer.mode !== 'choose') return { error: 'Niets te kiezen.' };
      qq.chose = 'solo';
    } else {
      if (qq.guided) return { step: qq.guideStep < qq.guide.length ? publicStep(qq.guide[qq.guideStep]) : null, done: qq.guideDone || [] };
      qq.guided = true; qq.guideStep = 0; qq.guideDone = []; qq.stepTries = 0;
      if (offer.mode === 'choose') qq.chose = 'guided';
    }
    await c.query('UPDATE sessions SET questions=$2 WHERE id=$1', [s.id, JSON.stringify(s.questions)]);
    return { ok: true, chose: qq.chose || null, guided: !!qq.guided, step: qq.guided ? publicStep(qq.guide[0]) : null, total: qq.guide.length };
  });
  if (out.error) return res.status(400).json(out);
  res.json(out);
}));

// Eén tussenstap nakijken. Twee keer fout → we laten zien hoe het moet en gaan door.
app.post('/api/session/:id/step', child, wrap(async (req, res) => {
  const out = await tx(async (c) => {
    const { s, qq } = await lockCurrent(c, req.params.id, req.body.index);
    if (!qq || !qq.guided || qq.guideStep >= qq.guide.length) return { error: 'Geen stap open.' };
    const step = qq.guide[qq.guideStep];
    const given = String(req.body.answer ?? '').slice(0, 30);
    const check = checkAnswer(step, given);
    if (check.empty) return { error: 'Vul eerst iets in.' };
    let result;
    const shown = step.type === 'choice' ? step.options[Number(given)] : given;
    if (check.correct) {
      qq.guideDone.push({ ask: step.ask, display: step.display, given: shown, ok: true });
      qq.guideStep++; qq.stepTries = 0;
      result = { correct: true, note: check.note || null };
    } else if ((qq.stepTries || 0) >= 1) {
      qq.guideDone.push({ ask: step.ask, display: step.display, given: shown, ok: false });
      qq.guideStep++; qq.stepTries = 0;
      result = { correct: false, revealed: true, display: step.display, tip: step.tip };
    } else {
      qq.stepTries = 1;
      result = { correct: false, tip: step.tip };
    }
    await c.query('UPDATE sessions SET questions=$2 WHERE id=$1', [s.id, JSON.stringify(s.questions)]);
    const finished = qq.guideStep >= qq.guide.length;
    return { ...result, done: qq.guideDone, next: finished ? null : publicStep(qq.guide[qq.guideStep]), final: finished ? qq.guideFinal : null };
  });
  if (out.error) return res.status(400).json(out);
  res.json(out);
}));

app.post('/api/session/:id/answer', child, wrap(async (req, res) => {
  const newBadges = [];
  const award = async (c, id) => { const b = await awardBadge(id, c); if (b) newBadges.push(b); };
  const out = await tx(async (c) => {
    const s = (await c.query('SELECT * FROM sessions WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    const i = Number(req.body.index);
    if (!s) return { status: 404, error: 'Niet gevonden' };
    if (i < s.results.length) return { ...s.results[i], steps: s.questions[i].steps, dup: true };
    if (s.status !== 'active' || i !== s.results.length) return { status: 400, error: 'Ongeldige som' };

    const qq = s.questions[i];
    const dontKnow = !!req.body.dontKnow;
    const given = dontKnow ? '' : String(req.body.answer ?? '').slice(0, 40);
    const check = dontKnow ? { correct: false } : checkAnswer(qq, given);
    if (check.empty) return { status: 400, error: 'Vul eerst een antwoord in.' };
    const shownGiven = dontKnow ? 'weet ik niet' : qq.type === 'choice' ? qq.options[Number(given)] : given;
    const helped = !!qq.guided || (qq.hints || 0) > 0;

    // ---- vaardigheid bijwerken ----
    let skill = (await c.query('SELECT * FROM skills WHERE cat=$1', [qq.cat])).rows[0]
      || { cat: qq.cat, level: qq.level, mastery: 40, recent: [], scaffold: 0, guided_wins: 0, solo_bonus: 0, transition_seen: false, attempts: 0, correct: 0 };
    const reward = s.kind === 'intake' ? { mult: check.correct ? 1 : 0, kind: 'normal' } : rewardFor(qq, skill, check.correct);
    let event = null, eventLevel = null;
    if (s.kind !== 'intake') {
      if (!qq.booster) {
        // een som onder zijn niveau (rustig-aan) telt mee, maar goed telt dan als "half":
        // het lukt dan alleen een niveau lager — fout telt gewoon als fout.
        const upd = updateSkill(skill, check.correct, helped || qq.level < skill.level);
        event = upd.event; eventLevel = upd.level;
        skill = upd;
      } else {
        // opsteker (iets wat zeker lukt): telt licht mee, verandert het niveau niet
        skill = { ...skill, mastery: Math.round((skill.mastery + 0.1 * ((check.correct ? 65 : 0) - skill.mastery)) * 10) / 10,
          attempts: skill.attempts + 1, correct: skill.correct + (check.correct ? 1 : 0) };
      }
      if (reward.kind === 'guided-free') skill.guided_wins = (skill.guided_wins || 0) + 1;
      if (reward.kind === 'solo-double') skill.solo_bonus = (skill.solo_bonus || 0) + 1;
      await saveSkill(skill, c);
    }

    const base = s.max_points / s.total;
    const cents = base * reward.mult;
    const result = { correct: check.correct, given: shownGiven, display: qq.display, note: check.note || null, hints: qq.hints || 0, guided: !!qq.guided, cents, rewardKind: reward.kind, retry: !!qq.retry };
    s.results.push(result);
    s.correct += check.correct ? 1 : 0;
    s.points_acc += cents;
    s.state = updateState(s, qq, check.correct);

    await c.query(`INSERT INTO attempts(session_id, cat, level, correct, hints, time_ms, given, text, display, guided, mult) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [s.id, qq.cat, qq.level, check.correct, qq.hints || 0, Math.min(Number(req.body.timeMs) || 0, 36e5), shownGiven, qq.text, qq.display, !!qq.guided, reward.mult]);

    // ---- badges tijdens de sessie ----
    if (s.state.streak === 5) await award(c, 'rij5');
    if (s.state.streak === 10) await award(c, 'rij10');
    if (qq.retry && check.correct) await award(c, 'comeback');
    if (qq.chose === 'solo' && check.correct) await award(c, 'zelf');
    if (event === 'up') { await award(c, 'omhoog'); if (eventLevel === 1) await award(c, 'opstap'); }
    if (s.kind !== 'intake' && skillScore(skill) >= 85) await award(c, 'sterk');
    if (qq.guided && check.correct) {
      const n = (await c.query('SELECT COUNT(*)::int n FROM attempts WHERE guided AND correct')).rows[0].n;
      if (n >= 10) await award(c, 'stappen');
    }

    const done = s.results.length >= s.total;
    let summary = null;
    if (done) {
      const points = Math.round(s.points_acc);
      await c.query(`UPDATE sessions SET results=$2, correct=$3, status='done', points=$4, points_acc=$5, state=$6, finished_at=now() WHERE id=$1`,
        [s.id, JSON.stringify(s.results), s.correct, points, s.points_acc, JSON.stringify(s.state)]);
      if (points > 0) {
        await c.query(`INSERT INTO ledger(cents, kind, note, session_id) VALUES ($1,'earn',$2,$3)`, [points, s.kind === 'intake' ? 'Starttoets' : `Dagtaak ${s.day}`, s.id]);
      }
      if (s.kind === 'intake') {
        const per = {};
        s.questions.forEach((x, k) => (per[x.cat] ||= []).push({ level: x.level, correct: s.results[k].correct }));
        for (const [cat, hist] of Object.entries(per)) await saveSkill(skillFromIntake(cat, hist), c);
        await award(c, 'start');
      }
      let record = false;
      if (s.kind === 'daily') {
        await award(c, 'dag1');
        if (s.correct === s.total) await award(c, 'perfect');
        if (s.correct / s.total < 0.5) await award(c, 'doorzetter');
        const prev = Number((await c.query(`SELECT value FROM settings WHERE key='record'`)).rows[0]?.value || 0);
        if (s.correct > prev) {
          await c.query(`INSERT INTO settings(key, value) VALUES ('record', $1) ON CONFLICT (key) DO UPDATE SET value=$1`, [JSON.stringify(s.correct)]);
          if (prev > 0) { record = true; await award(c, 'record'); }
        }
      }
      const perCat = {};
      s.questions.forEach((x, k) => {
        const p = (perCat[x.cat] ||= { cat: x.cat, label: catById[x.cat].label, icon: catById[x.cat].icon, n: 0, ok: 0 });
        p.n++; if (s.results[k].correct) p.ok++;
      });
      summary = { kind: s.kind, correct: s.correct, total: s.total, points, maxPoints: s.max_points, perCat: Object.values(perCat), bestStreak: s.state.best || 0, record,
        guidedOk: s.results.filter((r) => r.guided && r.correct).length, retryOk: s.results.filter((r) => r.retry && r.correct).length };
    } else {
      const skills = await (async () => {
        const rows = (await c.query('SELECT * FROM skills')).rows;
        const all = await getSkills();
        return all.map((x) => rows.find((r) => r.cat === x.cat) || x);
      })();
      s.questions.push(nextQuestion(s, skills));
      await c.query(`UPDATE sessions SET results=$2, correct=$3, questions=$4, state=$5, points_acc=$6 WHERE id=$1`,
        [s.id, JSON.stringify(s.results), s.correct, JSON.stringify(s.questions), JSON.stringify(s.state), s.points_acc]);
    }
    return { s, qq, result, event, eventLevel, done, summary };
  });
  if (out.error) return res.status(out.status || 400).json({ error: out.error });
  if (out.dup) return res.json(out);
  const { s, qq, result, event, eventLevel, done, summary } = out;
  let weekBonus = 0;
  if (done) {
    await snapshotSkills();
    if (s.kind === 'daily') {
      const st = await streak();
      for (const [n, id] of [[3, 'reeks3'], [5, 'reeks5'], [10, 'reeks10']]) if (st >= n) { const b = await awardBadge(id); if (b) newBadges.push(b); }
      // weekbonus: alle 5 dagtaken van deze week af
      const wk = await weekInfo();
      if (wk.count === 5 && !wk.given && WEEK_BONUS > 0) {
        await setSetting(`weekbonus:${wk.days[0].day}`, true);
        await q(`INSERT INTO ledger(cents, kind, note) VALUES ($1,'earn',$2)`, [WEEK_BONUS, `Weekbonus week van ${wk.days[0].day}`]);
        weekBonus = WEEK_BONUS;
        const b = await awardBadge('week'); if (b) newBadges.push(b);
      }
    }
  }
  // teach-back: af en toe na een goede som (zelf gedaan) vragen om uit te leggen hoe hij het deed
  let teachback = false;
  if (result.correct && !qq.guided && s.kind !== 'intake' && qq.guide.length && !s.state.teachback && s.results.length >= 3 && Math.random() < 0.4) {
    teachback = true;
    await q(`UPDATE sessions SET state = state || '{"teachback": true}'::jsonb WHERE id=$1`, [s.id]);
  }
  const skills = await getSkills();
  res.json({
    ...result, steps: qq.steps, done, summary, event,
    eventCat: event ? catById[qq.cat].label : null, eventLevel: event ? LEVEL_NAMES[eventLevel] : null,
    streak: s.state.streak, easy: s.state.easyChanged, points: s.points_acc, badges: newBadges, weekBonus, teachback,
    next: done ? null : currentPayload(s, skills),
  });
}));

// AI: andere uitleg / hint / doorvragen bij een som
app.post('/api/session/:id/explain', child, wrap(async (req, res) => {
  const s = await loadSession(req.params.id);
  const i = Number(req.body.index);
  if (!s || !s.questions[i]) return res.status(404).json({ error: 'Niet gevonden' });
  if (s.kind === 'intake' && !s.results[i]) return res.json({ text: null, reason: 'Tijdens de starttoets helpt Rekenmaatje nog niet. Daarna wel!' });
  if (!aiEnabled()) return res.json({ text: null, reason: 'Rekenmaatje (AI) staat niet aan.' });
  if (!aiAllowed()) return res.json({ text: null, reason: 'Rekenmaatje heeft voor vandaag genoeg uitgelegd. Morgen weer!' });
  const r = s.results[i];
  const chat = Array.isArray(req.body.chat) ? req.body.chat.slice(-6).map((m) => ({ role: m.role === 'ai' ? 'ai' : 'kid', text: String(m.text).slice(0, 400) })) : [];
  const text = await explain({ question: s.questions[i], answered: !!r, given: r?.given, correct: r?.correct, chat, name: await getName() });
  res.json({ text, reason: text ? null : 'Rekenmaatje kon nu even niet antwoorden.' });
}));

// Spaardoel kiezen of wissen (door het kind zelf)
app.post('/api/goal', child, wrap(async (req, res) => {
  if (req.body.clear) { await q(`DELETE FROM settings WHERE key='goal'`); return res.json({ goal: null }); }
  const name = String(req.body.name || '').trim().slice(0, 40);
  const euros = Number(String(req.body.euros || '').replace(',', '.'));
  if (!name) return res.status(400).json({ error: 'Waar spaar je voor?' });
  if (!(euros >= 1 && euros <= 500)) return res.status(400).json({ error: 'Kies een bedrag tussen € 1 en € 500.' });
  await setSetting('goal', { name, cents: Math.round(euros * 100), since: todayNL() });
  res.json({ goal: await goalInfo((await wallet()).balance) });
}));

// Teach-back: hij legt uit hoe hij een som oploste; Rekenmaatje geeft feedback
app.post('/api/session/:id/teachback', child, wrap(async (req, res) => {
  const s = await loadSession(req.params.id);
  const i = Number(req.body.index);
  const qq = s?.questions[i], r = s?.results[i];
  if (!qq || !r) return res.status(404).json({ error: 'Niet gevonden' });
  const text = String(req.body.text || '').trim().slice(0, 600);
  if (text.length < 3) return res.status(400).json({ error: 'Schrijf eerst kort op hoe je het deed.' });
  const b = await awardBadge('uitlegger');
  let feedback = null;
  if (aiEnabled() && aiAllowed()) feedback = await teachBack({ question: qq, explanation: text, name: await getName() });
  res.json({ feedback, steps: qq.steps, badge: b });
}));

// AI: uitlegkaart voor een onderdeel (gecachet per week en niveau)
app.get('/api/coach/:cat', child, wrap(async (req, res) => {
  const cat = req.params.cat;
  if (!catById[cat]) return res.status(404).json({ error: 'Onbekend' });
  const skill = (await getSkills()).find((s) => s.cat === cat);
  const week = Math.floor(Date.now() / (7 * 864e5));
  const key = `coach:${cat}:${skill.level}:${week}`;
  const cached = await one('SELECT content FROM ai_cache WHERE key=$1', [key]);
  if (cached) return res.json({ text: cached.content });
  if (!aiEnabled() || !aiAllowed()) return res.json({ text: null });
  const mistakes = (await q(`SELECT text, given, display FROM attempts WHERE cat=$1 AND NOT correct ORDER BY id DESC LIMIT 4`, [cat])).rows;
  const text = await coachCard({ catLabel: catById[cat].label, level: skill.level, mistakes, name: await getName() });
  if (text) await q('INSERT INTO ai_cache(key, content) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET content=$2', [key, text]);
  res.json({ text });
}));

// =====================================================================
// API ouder
// =====================================================================
app.post('/api/parent/login', wrap(async (req, res) => {
  if (pinOk(req.body.pin, PARENT_PIN)) { setCookie(res, 'parent', 30); return res.json({ ok: true }); }
  await new Promise((r) => setTimeout(r, 800));
  res.status(401).json({ error: 'Verkeerde pincode' });
}));
app.post('/api/parent/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'cp=; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/parent/overview', parent, wrap(async (req, res) => {
  const { list, struggling } = await skillsView();
  const snaps = (await q(`SELECT day::text AS day, cat, score FROM skill_snapshots WHERE day > CURRENT_DATE - 60 ORDER BY day`)).rows;
  const sessions = (await q(`SELECT id, kind, day::text AS day, status, correct, total, points, max_points,
      EXTRACT(EPOCH FROM (finished_at - created_at))::int AS secs FROM sessions WHERE status <> 'stopped' ORDER BY id DESC LIMIT 40`)).rows;
  const ledger = (await q(`SELECT cents, kind, note, created_at FROM ledger ORDER BY id DESC LIMIT 40`)).rows;
  const recentWrong = (await q(`SELECT cat, text, given, display, created_at FROM attempts WHERE NOT correct ORDER BY id DESC LIMIT 25`)).rows
    .map((r) => ({ ...r, label: catById[r.cat].label }));
  const acc = (await q(`SELECT cat, COUNT(*)::int n, SUM(CASE WHEN correct THEN 1 ELSE 0 END)::int ok,
      AVG(time_ms)::int avg_ms, SUM(hints)::int hints, SUM(CASE WHEN guided THEN 1 ELSE 0 END)::int guided
      FROM attempts WHERE created_at > now() - interval '14 days' GROUP BY cat`)).rows;
  res.json({
    name: await getName(), ai: aiEnabled(), wallet: await wallet(), streak: await streak(),
    skills: list, struggling, snaps, sessions, ledger, recentWrong, acc, categories: CATEGORIES, badges: await getBadges(),
  });
}));

app.post('/api/parent/payout', parent, wrap(async (req, res) => {
  const cents = Math.round(Number(req.body.cents));
  const w = await wallet();
  if (!(cents > 0) || cents > w.balance) return res.status(400).json({ error: 'Ongeldig bedrag' });
  await q(`INSERT INTO ledger(cents, kind, note) VALUES ($1,'payout',$2)`, [-cents, String(req.body.note || 'Uitbetaald').slice(0, 80)]);
  res.json({ wallet: await wallet() });
}));

app.post('/api/parent/advice', parent, wrap(async (req, res) => {
  if (!aiEnabled()) return res.json({ text: null, reason: 'Zet ANTHROPIC_API_KEY om AI-advies te krijgen.' });
  const key = `advice:${todayNL()}`;
  const cached = !req.body.fresh && await one('SELECT content FROM ai_cache WHERE key=$1', [key]);
  if (cached) return res.json({ text: cached.content });
  if (!aiAllowed()) return res.json({ text: null, reason: 'AI-limiet voor vandaag bereikt.' });
  const { list } = await skillsView();
  const acc = (await q(`SELECT cat, COUNT(*)::int n, SUM(CASE WHEN correct THEN 1 ELSE 0 END)::int ok, SUM(CASE WHEN guided THEN 1 ELSE 0 END)::int guided FROM attempts WHERE created_at > now() - interval '14 days' GROUP BY cat`)).rows;
  const accBy = Object.fromEntries(acc.map((a) => [a.cat, a]));
  const wrong = (await q(`SELECT cat, text, given, display FROM attempts WHERE NOT correct ORDER BY id DESC LIMIT 12`)).rows;
  const days = (await q(`SELECT COUNT(*)::int n FROM sessions WHERE kind='daily' AND status='done'`)).rows[0].n;
  const summary = [
    `Aantal afgeronde dagtaken: ${days}. Reeks: ${await streak()} schooldagen.`,
    'Score per onderdeel (0-100). Niveaus: opstap = groep 5/6, basis = groep 6/7, 1F = fundamenteel eind groep 8, 1S = streefniveau. Laatste 14 dagen: goed / totaal (met tussenstappen):',
    ...list.map((s) => `- ${s.label} (${s.domain}): score ${s.score}, niveau ${s.levelName}${s.trend != null ? `, trend ${s.trend >= 0 ? '+' : ''}${s.trend}` : ''}${accBy[s.cat] ? `, ${accBy[s.cat].ok}/${accBy[s.cat].n} goed (${accBy[s.cat].guided} met tussenstappen)` : ''}${s.struggling ? ' — LOOPT VAST' : ''}`),
    'Recente fouten:',
    ...wrong.map((w) => `- [${catById[w.cat].label}] ${w.text} → "${w.given}" (goed: ${w.display})`),
  ].join('\n');
  const text = await parentAdvice({ name: await getName(), summary });
  if (text) await q('INSERT INTO ai_cache(key, content) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET content=$2', [key, text]);
  res.json({ text, reason: text ? null : 'AI kon nu geen advies geven.' });
}));

app.post('/api/parent/settings', parent, wrap(async (req, res) => {
  if (req.body.name) await setSetting('name', String(req.body.name).slice(0, 30));
  res.json({ ok: true });
}));

app.post('/api/parent/reset', parent, wrap(async (req, res) => {
  if (req.body.confirm !== 'RESET') return res.status(400).json({ error: 'Bevestig met RESET' });
  if (req.body.what === 'intake') {
    // starttoets opnieuw (bijv. na lange pauze); spaarpot en badges blijven staan
    await q(`DELETE FROM sessions WHERE kind='intake'`);
    await q('DELETE FROM skills');
  } else {
    await q('TRUNCATE attempts, sessions, skills, skill_snapshots, ledger, ai_cache, badges RESTART IDENTITY');
    await q(`DELETE FROM settings WHERE key IN ('record','goal') OR key LIKE 'weekbonus:%'`);
  }
  res.json({ ok: true });
}));

// =====================================================================
app.get('/healthz', (req, res) => res.send('ok'));
app.use(express.static('public', {
  setHeaders(res, path) {
    if (path.endsWith('sw.js') || path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css')) res.setHeader('Cache-Control', 'no-cache');
  },
}));
app.get('*', (req, res) => res.sendFile('index.html', { root: 'public' }));

await migrate();
app.listen(PORT, () => console.log(`Rekenapp draait op http://localhost:${PORT}`));
