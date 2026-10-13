import './src/env.js';
import express from 'express';
import crypto from 'node:crypto';
import { q, one, migrate, getSetting, setSetting, pool } from './src/db.js';
import { checkAnswer, publicQuestion, CATEGORIES, catById } from './src/generators.js';
import {
  INTAKE_POINTS, DAILY_POINTS, DAILY_COUNT, PRACTICE_COUNT,
  getSkills, updateSkill, saveSkill, buildIntake, skillFromIntake, getStruggling,
  snapshotSkills, allocate, buildSession, skillScore, skillLabel,
} from './src/engine.js';
import { aiEnabled, explain, coachCard, parentAdvice } from './src/ai.js';
import { todayNL, isSchoolDay, weekdayNL } from './src/util.js';

const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const PARENT_PIN = process.env.PARENT_PIN || '1234';
const APP_PIN = process.env.APP_PIN || '';
const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 80);
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

function sessionPayload(s, extra = {}) {
  return {
    id: s.id, kind: s.kind, status: s.status, total: s.total,
    questions: s.questions.map(publicQuestion),
    results: s.results.map((r) => ({ correct: r.correct, given: r.given, display: r.display, note: r.note })),
    correct: s.correct, maxPoints: s.max_points,
    pointsSoFar: s.total ? (s.correct * s.max_points) / s.total : 0,
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
      cat: s.cat, label: meta.label, icon: meta.icon, domain: meta.domain, level: s.level, score,
      tag: skillLabel(score), trend: prev[s.cat] != null ? Math.round(score - prev[s.cat]) : null,
      attempts: s.attempts, correct: s.correct, struggling: struggling.includes(s.cat),
    };
  }).sort((a, b) => b.score - a.score);
  return { list, struggling, skills };
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
  const daily = await one(`SELECT id, status, correct, total, points FROM sessions WHERE kind='daily' AND day=$1 ORDER BY id DESC LIMIT 1`, [today]);
  const active = await one(`SELECT id, kind FROM sessions WHERE status='active' ORDER BY id DESC LIMIT 1`);
  const history = (await q(`SELECT day::text AS day, correct, total, points FROM sessions WHERE kind='daily' AND status='done' ORDER BY day DESC LIMIT 10`)).rows.reverse();
  const { list, struggling } = await skillsView();
  res.json({
    name: await getName(),
    ai: aiEnabled(),
    intakeDone: intake?.status === 'done',
    intakeActive: intake?.status === 'active' ? intake.id : null,
    today: { date: today, weekday: weekdayNL(), schoolDay: isSchoolDay(), daily: daily || null },
    active,
    wallet: await wallet(),
    streak: await streak(),
    skills: list,
    struggling,
    history,
    points: { intake: INTAKE_POINTS, daily: DAILY_POINTS, dailyCount: DAILY_COUNT },
  });
}));

app.post('/api/session/start', child, wrap(async (req, res) => {
  const kind = req.body.kind;
  const today = todayNL();
  const intake = await one(`SELECT id, status FROM sessions WHERE kind='intake' ORDER BY id DESC LIMIT 1`);

  if (kind === 'intake') {
    if (intake?.status === 'done') return res.status(400).json({ error: 'De starttoets is al gedaan.' });
    if (intake) return res.json(sessionPayload(await one('SELECT * FROM sessions WHERE id=$1', [intake.id])));
    const qs = buildIntake();
    const s = await one(`INSERT INTO sessions(kind, day, questions, total, max_points) VALUES ('intake',$1,$2,$3,$4) RETURNING *`,
      [today, JSON.stringify(qs), qs.length, INTAKE_POINTS]);
    return res.json(sessionPayload(s));
  }

  if (intake?.status !== 'done') return res.status(400).json({ error: 'Doe eerst de starttoets.' });
  const { skills, struggling } = await skillsView();

  if (kind === 'daily') {
    if (!isSchoolDay()) return res.status(400).json({ error: 'In het weekend is er geen dagtaak. Je kunt wel extra oefenen!' });
    const existing = await one(`SELECT * FROM sessions WHERE kind='daily' AND day=$1 ORDER BY id DESC LIMIT 1`, [today]);
    if (existing) return res.json(sessionPayload(existing, { struggling }));
    const alloc = allocate(skills, DAILY_COUNT, struggling);
    const qs = buildSession(skills, alloc);
    const s = await one(`INSERT INTO sessions(kind, day, questions, total, max_points) VALUES ('daily',$1,$2,$3,$4) RETURNING *`,
      [today, JSON.stringify(qs), qs.length, DAILY_POINTS]);
    return res.json(sessionPayload(s, { struggling, alloc }));
  }

  if (kind === 'practice') {
    const active = await one(`SELECT * FROM sessions WHERE kind='practice' AND status='active' ORDER BY id DESC LIMIT 1`);
    if (active) return res.json(sessionPayload(active, { struggling }));
    // optioneel één categorie gericht oefenen
    const focus = req.body.cat && catById[req.body.cat] ? req.body.cat : null;
    const alloc = focus ? { [focus]: PRACTICE_COUNT } : allocate(skills, PRACTICE_COUNT, struggling);
    const qs = buildSession(skills, alloc);
    const s = await one(`INSERT INTO sessions(kind, day, questions, total, max_points) VALUES ('practice',$1,$2,$3,0) RETURNING *`,
      [today, JSON.stringify(qs), qs.length]);
    return res.json(sessionPayload(s, { struggling }));
  }
  res.status(400).json({ error: 'Onbekend soort sessie' });
}));

app.get('/api/session/:id', child, wrap(async (req, res) => {
  const s = await one('SELECT * FROM sessions WHERE id=$1', [req.params.id]);
  if (!s) return res.status(404).json({ error: 'Niet gevonden' });
  res.json(sessionPayload(s));
}));

app.post('/api/session/:id/hint', child, wrap(async (req, res) => {
  const s = await one('SELECT * FROM sessions WHERE id=$1', [req.params.id]);
  const i = Number(req.body.index);
  if (!s || s.status !== 'active' || i !== s.results.length) return res.status(400).json({ error: 'Deze som is al klaar.' });
  const qq = s.questions[i];
  const used = qq.hints || 0;
  const usable = Math.max(0, qq.steps.length - 1); // de laatste stap verklapt het antwoord
  if (used >= usable) return res.json({ hint: null, more: false });
  qq.hints = used + 1;
  await q('UPDATE sessions SET questions=$2 WHERE id=$1', [s.id, JSON.stringify(s.questions)]);
  res.json({ hint: qq.steps[used], hints: qq.steps.slice(0, used + 1), more: used + 1 < usable });
}));

app.post('/api/session/:id/answer', child, wrap(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const s = (await client.query('SELECT * FROM sessions WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    const i = Number(req.body.index);
    if (!s) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Niet gevonden' }); }
    if (i < s.results.length) { // dubbel verstuurd: geef het eerdere resultaat terug
      await client.query('ROLLBACK');
      const r = s.results[i];
      return res.json({ ...r, steps: s.questions[i].steps, done: s.status === 'done' });
    }
    if (s.status !== 'active' || i !== s.results.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Ongeldige som' }); }

    const qq = s.questions[i];
    const given = String(req.body.answer ?? '').slice(0, 40);
    const check = checkAnswer(qq, given);
    if (check.empty) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Vul eerst een antwoord in.' }); }
    const shownGiven = qq.type === 'choice' ? qq.options[Number(given)] : given;
    const result = { correct: check.correct, given: shownGiven, display: qq.display, note: check.note || null, hints: qq.hints || 0 };
    s.results.push(result);
    s.correct += check.correct ? 1 : 0;

    await client.query(`INSERT INTO attempts(session_id, cat, level, correct, hints, time_ms, given, text, display) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [s.id, qq.cat, qq.level, check.correct, qq.hints || 0, Math.min(Number(req.body.timeMs) || 0, 36e5), shownGiven, qq.text, qq.display]);

    let event = null;
    if (s.kind !== 'intake') {
      const row = (await client.query('SELECT * FROM skills WHERE cat=$1', [qq.cat])).rows[0]
        || { cat: qq.cat, level: qq.level, mastery: 40, level_attempts: 0, attempts: 0, correct: 0 };
      // een opstapje (som van een lager niveau) telt maar licht mee en verandert het niveau niet
      const upd = qq.level >= row.level ? updateSkill(row, check.correct, qq.hints || 0)
        : { ...row, mastery: Math.round((row.mastery + 0.1 * ((check.correct ? 65 : 0) - row.mastery)) * 10) / 10,
          attempts: row.attempts + 1, correct: row.correct + (check.correct ? 1 : 0), event: null };
      event = upd.event;
      await client.query(`INSERT INTO skills(cat, level, mastery, level_attempts, attempts, correct, updated_at) VALUES ($1,$2,$3,$4,$5,$6, now())
        ON CONFLICT (cat) DO UPDATE SET level=$2, mastery=$3, level_attempts=$4, attempts=$5, correct=$6, updated_at=now()`,
      [upd.cat, upd.level, upd.mastery, upd.level_attempts, upd.attempts, upd.correct]);
    }

    const done = s.results.length >= s.total;
    let summary = null;
    if (done) {
      const points = Math.round((s.correct * s.max_points) / s.total);
      s.points = points;
      await client.query(`UPDATE sessions SET results=$2, correct=$3, status='done', points=$4, finished_at=now() WHERE id=$1`,
        [s.id, JSON.stringify(s.results), s.correct, points]);
      if (points > 0) {
        const note = s.kind === 'intake' ? 'Starttoets' : `Dagtaak ${s.day}`;
        await client.query(`INSERT INTO ledger(cents, kind, note, session_id) VALUES ($1,'earn',$2,$3)`, [points, note, s.id]);
      }
      if (s.kind === 'intake') {
        const per = {};
        s.questions.forEach((x, k) => { (per[x.cat] ||= {})[x.level] = s.results[k].correct; });
        for (const [cat, byLevel] of Object.entries(per)) {
          const sk = skillFromIntake(cat, byLevel);
          await client.query(`INSERT INTO skills(cat, level, mastery, level_attempts, attempts, correct) VALUES ($1,$2,$3,$4,$5,$6)
            ON CONFLICT (cat) DO UPDATE SET level=$2, mastery=$3, level_attempts=$4, attempts=$5, correct=$6, updated_at=now()`,
          [cat, sk.level, sk.mastery, sk.level_attempts, sk.attempts, sk.correct]);
        }
      }
      const perCat = {};
      s.questions.forEach((x, k) => {
        const p = (perCat[x.cat] ||= { cat: x.cat, label: catById[x.cat].label, icon: catById[x.cat].icon, n: 0, ok: 0 });
        p.n++; if (s.results[k].correct) p.ok++;
      });
      summary = { correct: s.correct, total: s.total, points, maxPoints: s.max_points, perCat: Object.values(perCat) };
    } else {
      await client.query(`UPDATE sessions SET results=$2, correct=$3, questions=$4 WHERE id=$1`, [s.id, JSON.stringify(s.results), s.correct, JSON.stringify(s.questions)]);
    }
    await client.query('COMMIT');
    if (done) await snapshotSkills();

    res.json({
      ...result, steps: qq.steps, done, summary, event,
      eventCat: event ? catById[qq.cat].label : null,
      pointsSoFar: s.max_points ? (s.correct * s.max_points) / s.total : 0,
    });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}));

// AI: andere uitleg / hint / doorvragen bij een som
app.post('/api/session/:id/explain', child, wrap(async (req, res) => {
  const s = await one('SELECT * FROM sessions WHERE id=$1', [req.params.id]);
  const i = Number(req.body.index);
  if (!s || !s.questions[i]) return res.status(404).json({ error: 'Niet gevonden' });
  if (!aiEnabled()) return res.json({ text: null, reason: 'Rekenmaatje (AI) staat niet aan.' });
  if (!aiAllowed()) return res.json({ text: null, reason: 'Rekenmaatje heeft voor vandaag genoeg uitgelegd. Morgen weer!' });
  const r = s.results[i];
  const chat = Array.isArray(req.body.chat) ? req.body.chat.slice(-6).map((m) => ({ role: m.role === 'ai' ? 'ai' : 'kid', text: String(m.text).slice(0, 400) })) : [];
  const text = await explain({ question: s.questions[i], answered: !!r, given: r?.given, correct: r?.correct, chat, name: await getName() });
  res.json({ text, reason: text ? null : 'Rekenmaatje kon nu even niet antwoorden.' });
}));

// AI: uitlegkaart voor een categorie (gecachet per week en niveau)
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
      EXTRACT(EPOCH FROM (finished_at - created_at))::int AS secs FROM sessions ORDER BY id DESC LIMIT 40`)).rows;
  const ledger = (await q(`SELECT cents, kind, note, created_at FROM ledger ORDER BY id DESC LIMIT 40`)).rows;
  const recentWrong = (await q(`SELECT cat, text, given, display, created_at FROM attempts WHERE NOT correct ORDER BY id DESC LIMIT 25`)).rows
    .map((r) => ({ ...r, label: catById[r.cat].label }));
  const acc = (await q(`SELECT cat, COUNT(*)::int n, SUM(CASE WHEN correct THEN 1 ELSE 0 END)::int ok,
      AVG(time_ms)::int avg_ms, SUM(hints)::int hints FROM attempts WHERE created_at > now() - interval '14 days' GROUP BY cat`)).rows;
  res.json({
    name: await getName(), ai: aiEnabled(), wallet: await wallet(), streak: await streak(),
    skills: list, struggling, snaps, sessions, ledger, recentWrong, acc, categories: CATEGORIES,
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
  const { list, struggling } = await skillsView();
  const acc = (await q(`SELECT cat, COUNT(*)::int n, SUM(CASE WHEN correct THEN 1 ELSE 0 END)::int ok FROM attempts WHERE created_at > now() - interval '14 days' GROUP BY cat`)).rows;
  const accBy = Object.fromEntries(acc.map((a) => [a.cat, a]));
  const wrong = (await q(`SELECT cat, text, given, display FROM attempts WHERE NOT correct ORDER BY id DESC LIMIT 12`)).rows;
  const days = (await q(`SELECT COUNT(*)::int n FROM sessions WHERE kind='daily' AND status='done'`)).rows[0].n;
  const summary = [
    `Aantal afgeronde dagtaken: ${days}. Reeks: ${await streak()} schooldagen.`,
    'Score per onderdeel (0-100; niveau 1=basis, 2=1F, 3=1S), goed laatste 14 dagen:',
    ...list.map((s) => `- ${s.label} (${s.domain}): score ${s.score}, niveau ${s.level}${s.trend != null ? `, trend ${s.trend >= 0 ? '+' : ''}${s.trend}` : ''}${accBy[s.cat] ? `, ${accBy[s.cat].ok}/${accBy[s.cat].n} goed` : ''}${s.struggling ? ' — LOOPT VAST' : ''}`),
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
    // starttoets opnieuw (bijv. na lange pauze); spaarpot blijft staan
    await q(`DELETE FROM sessions WHERE kind='intake'`);
    await q('DELETE FROM skills');
  } else {
    await q('TRUNCATE attempts, sessions, skills, skill_snapshots, ledger, ai_cache RESTART IDENTITY');
  }
  res.json({ ok: true });
}));

// =====================================================================
app.get('/healthz', (req, res) => res.send('ok'));
app.use(express.static('public', {
  setHeaders(res, path) {
    if (path.endsWith('sw.js') || path.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  },
}));
app.get('*', (req, res) => res.sendFile('index.html', { root: 'public' }));

await migrate();
app.listen(PORT, () => console.log(`Rekenapp draait op http://localhost:${PORT}`));
