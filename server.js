import './src/env.js';
import express from 'express';
import crypto from 'node:crypto';
import { q, one, migrate, getSetting, setSetting, connect, kidStore, currentKid, listKids, getKid, createKid, renameKid, deleteKid, kidContext, updateKidProfile, setKidPassword, kidPasswords, kidHasPassword } from './src/db.js';
import { checkAnswer, publicQuestion, publicStep, hintsFor, CATEGORIES, catById, LEVEL_NAMES, startLevelForGroep, detectMisconception, MNEMONICS, mnemonicsFor, DIDACTIEK, pack } from './src/curriculum.js';
import {
  PRACTICE_COUNT, FREE_GUIDED, SOLO_BONUS,
  getSkills, updateSkill, saveSkill, intakePlan, INTAKE_MAX, skillFromIntake, getStruggling, snapshotSkills,
  allocate, buildPlan, nextQuestion, applyPlan, updateState, rewardFor, helpOffer, skillScore, skillLabel,
  awardBadge, getBadges,
} from './src/engine.js';
import { ts, teacherName, dayNames, defaultRewards } from './src/i18n.js';
import { aiEnabled, aiProvider, aiModel, teacherTurn, analyzeScratch, splitForm, lessonTurn, reflect, updateProfile, profileText, parentAdvice, teachBack, remember, planSession } from './src/ai.js';
import { todayNL, weekdayNL, setTestClock } from './src/util.js';
import { logEvent, migrateLeerlog } from './src/leerlog.js';
import { rewardCfg, cleanRewards, isTaskDay, taskWeek, nextTaskDay, DAILY_COUNTS } from './src/rewards.js';
import { computeSignals, adaptFlags, signalsForMax, needWorkCats, whatHelps, isWordProblem } from './src/signals.js';

const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const PARENT_PIN = process.env.PARENT_PIN || '1234';
const APP_PIN = process.env.APP_PIN || '';
const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 400);
if (!process.env.PARENT_PIN) console.warn('[let op] PARENT_PIN niet gezet — standaard is 1234');
else if (PARENT_PIN.length < 6 || PARENT_PIN === '1234') console.warn('[let op] PARENT_PIN is zwak: met de beheerderspincode open je élk kind, ook kinderen met een eigen ouderwachtwoord. Kies een lange pincode.');

const app = express();
app.use(express.json({ limit: '600kb' })); // ruim genoeg voor een kladblok-plaatje

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
  const name = role === 'child' ? 'cc' : 'cp';
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append('Set-Cookie', `${name}=${encodeURIComponent(makeToken(role, days))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${days * 86400}${secure}`);
}
const pinOk = (given, real) => {
  const a = Buffer.from(String(given || '')), b = Buffer.from(String(real));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
// ---------- welk kind? (alleen een naam kiezen, geen pincode) ----------
const cookieOf = (req, name) => Object.fromEntries((req.headers.cookie || '').split(';').map((x) => x.trim().split('=')).filter((x) => x[0]))[name];
const kidIdOf = (req) => Number(cookieOf(req, 'kid')) || null;
function setKidCookie(res, id) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append('Set-Cookie', `kid=${id}; Path=/; SameSite=Lax; Max-Age=${id ? 365 * 86400 : 0}${secure}`);
}
// Alles daarna draait in het eigen database-schema van dit kind.
function withKid(req, res, next) {
  const id = kidIdOf(req);
  (id ? getKid(id) : Promise.resolve(null)).then((kid) => {
    if (!kid) return res.status(401).json({ error: 'kid' });
    req.kid = kid;
    kidStore.run(kidContext(kid), next);
  }).catch(next);
}
// ---------- ouder: wachtwoord per kind ----------
// Rol in de ouder-cookie: 'parent' = beheerder (PARENT_PIN uit .env, alle kinderen),
// 'pk-o-3-7' = ouder van kind 3 en 7 (wachtwoord), 'o' = ook kinderen zonder eigen wachtwoord.
const hashPw = (pw) => { const salt = crypto.randomBytes(16).toString('hex'); return `${salt}:${crypto.scryptSync(String(pw), salt, 32).toString('hex')}`; };
function pwMatches(pw, stored) {
  if (!stored) return false;
  const [salt, h] = stored.split(':'), a = crypto.scryptSync(String(pw), salt, 32), b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function parentScope(req) {
  const t = cookieOf(req, 'cp');
  if (!t) return null;
  const [r, exp, sig] = decodeURIComponent(t).split('.');
  if (!(Number(exp) > Date.now() && sig === sign(`${r}.${exp}`))) return null;
  if (r === 'parent') return { all: true, ids: [] };
  const m = r.match(/^pk(-o)?((?:-\d+)*)$/);
  return m ? { all: false, open: !!m[1], ids: m[2].split('-').filter(Boolean).map(Number) } : null;
}
async function mayParent(req, kidId) {
  const sc = parentScope(req);
  if (!sc) return false;
  if (sc.all || sc.ids.includes(kidId)) return true;
  return sc.open && !(await kidHasPassword(kidId));
}
const child = (req, res, next) => (!APP_PIN || hasRole(req, 'child') || parentScope(req) ? withKid(req, res, next) : res.status(401).json({ error: 'login' }));
const parent = (req, res, next) => withKid(req, res, () => mayParent(req, req.kid.id)
  .then((ok) => (ok ? next() : res.status(401).json({ error: 'parent-login' }))).catch(next));
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error(e); res.status(500).json({ error: ts('Er ging iets mis op de server.') }); });

// ---------- AI-limiet per dag (kostenbewaking) ----------
// per kind per dag (kostenbewaking)
const aiUse = new Map();
function aiAllowed() {
  const key = `${currentKid()}:${todayNL()}`;
  const n = aiUse.get(key) || 0;
  if (n >= AI_DAILY_LIMIT) return false;
  if (aiUse.size > 500) aiUse.clear();
  aiUse.set(key, n + 1);
  return true;
}

// ---------- hulpfuncties ----------
const getName = async () => (await getKid(currentKid()))?.name || 'Rekenaar';
const prevDay = (d) => new Date(Date.parse(d + 'T12:00:00Z') - 864e5).toISOString().slice(0, 10);
const dowOf = (d) => new Date(d + 'T12:00:00Z').getUTCDay();
const addDays = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
// de dagtaak-dagen van deze week (welke dagen: instelling van de ouder, standaard ma t/m vr)
async function weekInfo(day = todayNL(), rc = null) {
  rc ||= await rewardCfg();
  const days = taskWeek(rc, day);
  const done = new Set((await q(`SELECT day::text AS d FROM sessions WHERE kind='daily' AND status='done' AND day = ANY($1::date[])`, [days])).rows.map((r) => r.d));
  const given = await getSetting(`weekbonus:${days[0]}`, null);
  return { days: days.map((d) => ({ day: d, dow: dowOf(d), done: done.has(d), today: d === todayNL() })), count: done.size, bonus: rc.weekBonusCents, given: !!given };
}


// ---------- wekelijkse verrassing (één per week, willekeurige dag, alleen als het goed ging) ----------
async function surpriseCfg() { return { enabled: true, rewards: defaultRewards(), min: 0.7, ...(await getSetting('surprise_cfg', {})) }; }
async function maybeSurprise(s) {
  const cfg = await surpriseCfg();
  if (!cfg.enabled || !cfg.rewards?.length || s.kind !== 'daily') return null;
  const days = taskWeek(await rewardCfg(), s.day);
  const key = `surprise:${days[0]}`;
  let pick = await getSetting(key, null);
  if (!pick) { pick = { day: days[Math.floor(Math.random() * days.length)], given: false }; await setSetting(key, pick); }
  if (pick.given || s.day < pick.day || s.correct / s.total < cfg.min) return null;
  const reward = cfg.rewards[Math.floor(Math.random() * cfg.rewards.length)];
  // een geldbedrag ("1 euro", "R10", "10 rand") gaat meteen in de spaarpot
  const euro = reward.match(/(\d+(?:[.,]\d+)?)\s*(?:euro|rand)/i) || reward.match(/\bR\s?(\d+(?:[.,]\d+)?)/);
  if (euro) await q(`INSERT INTO ledger(cents, kind, note) VALUES ($1,'earn',$2)`, [Math.round(Number(euro[1].replace(',', '.')) * 100), ts('Verrassing: {r}', { r: reward })]);
  await setSetting(key, { ...pick, given: true, reward });
  const list = await getSetting('surprises', []);
  list.push({ date: s.day, reward, delivered: !!euro });
  await setSetting('surprises', list.slice(-50));
  return reward;
}
async function goalInfo(balance) {
  const g = await getSetting('goal', null);
  if (!g) return null;
  return { ...g, reached: balance >= g.cents, left: Math.max(0, g.cents - balance) };
}

// Leerlingprofiel dat de AI-leraar bijhoudt (denkfouten, wat helpt)
async function getProfile() { return getSetting('profile', null); }
async function refreshProfile() {
  if (!aiEnabled()) return;
  const rows = (await q(`SELECT cat, level, text, given, display, correct, hints, guided, scratch_note FROM attempts ORDER BY id DESC LIMIT 60`)).rows;
  if (rows.length < 8) return;
  const attempts = rows.reverse().map((r) => ({ ...r, label: catById[r.cat]?.label || r.cat, level: LEVEL_NAMES[r.level] }));
  const updated = await updateProfile({
    name: await getName(), oldProfile: profileText(await getProfile()), attempts,
    stats: await profileStats(),
    misconceptions: (await q(`SELECT misconception, COUNT(*)::int n FROM attempts WHERE misconception IS NOT NULL GROUP BY misconception ORDER BY n DESC LIMIT 10`)).rows,
    memory: await memoryText(),
    signals: signalsForMax(await refreshSignals(), await whatHelps()),
  });
  if (updated) await setSetting('profile', { ...updated, updated_at: new Date().toISOString() });
}
// Signalen "hoe leert dit kind" (berekend, geen AI): bewaard, en opnieuw berekend na elke sessie en elke 5 sommen
async function getSignals() {
  const cached = await getSetting('signals', null);
  if (cached && Date.now() - Date.parse(cached.at) < 6 * 3600e3) return cached;
  return refreshSignals();
}
async function refreshSignals() {
  const sig = await computeSignals();
  await setSetting('signals', sig);
  return sig;
}
// Wat Max over het kind meekrijgt: profiel + signalen (onder de motorkap)
async function teacherProfile() {
  const extra = signalsForMax(await getSignals(), await whatHelps());
  return [profileText(await getProfile()), extra].filter(Boolean).join('\n\n');
}

// Cijfers per onderdeel voor het profiel en het overzicht: niveau, % goed, trend
async function profileStats() {
  const skills = await getSkills();
  const tot = Object.fromEntries((await q(`SELECT cat, COUNT(*)::int n, SUM(CASE WHEN correct THEN 1 ELSE 0 END)::int ok,
      COUNT(*) FILTER (WHERE created_at > now() - interval '14 days')::int n14,
      SUM(CASE WHEN correct AND created_at > now() - interval '14 days' THEN 1 ELSE 0 END)::int ok14 FROM attempts GROUP BY cat`)).rows.map((r) => [r.cat, r]));
  const old = Object.fromEntries((await q(`SELECT DISTINCT ON (cat) cat, score FROM skill_snapshots WHERE day <= CURRENT_DATE - 14 ORDER BY cat, day DESC`)).rows.map((r) => [r.cat, r.score]));
  return skills.map((s) => {
    const t = tot[s.cat] || { n: 0, ok: 0, n14: 0, ok14: 0 };
    const now = skillScore(s), was = old[s.cat];
    return { cat: s.cat, label: catById[s.cat].label, level: LEVEL_NAMES[s.level], levelIdx: s.level, score: Math.round(now), n: t.n,
      pct: t.n ? Math.round((100 * t.ok) / t.n) : 0, pct14: t.n14 ? Math.round((100 * t.ok14) / t.n14) : null,
      trend: was == null ? 'nog onbekend' : now - was >= 5 ? 'vooruit' : now - was <= -5 ? 'achteruit' : 'gelijk' };
  });
}

// Geheugen van de leraar: korte notities met datum, de nieuwste achteraan
async function getMemory() { return getSetting('memory', []); }
async function addMemory(notes) {
  if (!notes?.length) return;
  const mem = [...(await getMemory()), ...notes.map((n) => ({ d: todayNL(), n: String(n).slice(0, 200) }))].slice(-60);
  await setSetting('memory', mem);
}
async function memoryText() {
  const mem = (await getMemory()).slice(-18);
  const today = todayNL();
  const ago = (d) => { const n = Math.round((Date.parse(today) - Date.parse(d)) / 864e5); return n <= 0 ? 'vandaag' : n === 1 ? 'gisteren' : `${n} dagen geleden`; };
  return mem.map((m) => `- (${ago(m.d)}) ${m.n}`).join('\n');
}
// Kladblok: alleen een echt plaatje of een stukje tekst, met een maximale grootte
function cleanScratch(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const image = typeof raw.image === 'string' && raw.image.length < 550_000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(raw.image) ? raw.image : null;
  const text = typeof raw.text === 'string' ? raw.text.trim().slice(0, 600) : '';
  return image || text ? { image, text } : null;
}
async function saveScratch(sessionId, idx, sc) {
  await q(`INSERT INTO scratch(session_id, idx, image, text) VALUES ($1,$2,$3,$4)
           ON CONFLICT (session_id, idx) DO UPDATE SET image=EXCLUDED.image, text=EXCLUDED.text, created_at=now()`, [sessionId, idx, sc.image, sc.text || null]);
  // plaatjes zijn groot: alleen de laatste 60 bewaren
  await q(`DELETE FROM scratch WHERE (session_id, idx) NOT IN (SELECT session_id, idx FROM scratch ORDER BY created_at DESC LIMIT 60)`);
}
async function loadScratch(sessionId, idx) {
  return (await one(`SELECT image, text FROM scratch WHERE session_id=$1 AND idx=$2`, [sessionId, idx])) || null;
}

// Wat er eerder in deze sessie gebeurde (voor de leraar)
function sessionLog(s, upto) {
  const lines = [];
  for (let k = Math.max(0, upto - 8); k < upto; k++) {
    const x = s.questions[k], r = s.results[k];
    if (!x || !r) continue;
    const lastTeacher = (x.chat || []).filter((m) => m.role === 'teacher').at(-1)?.text;
    lines.push(`${k + 1}. [${catById[x.cat].label}] ${x.text} → "${r.given}" ${r.correct ? 'goed' : 'FOUT (goed: ' + x.display + ')'}${r.guided ? ', met tussenstappen' : ''}${lastTeacher ? ` — jij zei toen: "${lastTeacher.slice(0, 140)}"` : ''}`);
  }
  return lines.join('\n');
}
// Transcript van een sessie (voor de notities na afloop)
function sessionTranscript(s) {
  return s.questions.map((x, k) => {
    const r = s.results[k];
    if (!r) return null;
    const chat = (x.chat || []).map((m) => `   ${m.role === 'teacher' ? teacherName() : 'kind'}: ${m.text.slice(0, 220)}`).join('\n');
    return `[${catById[x.cat].label}, ${LEVEL_NAMES[x.level]}] ${x.text} → "${r.given}" (${r.correct ? 'goed' : 'fout, goed: ' + x.display}${r.guided ? ', met tussenstappen' : ''})${chat ? '\n' + chat : ''}`;
  }).filter(Boolean).join('\n');
}

async function wallet() {
  const r = await one(`SELECT COALESCE(SUM(cents) FILTER (WHERE kind='earn'),0)::int AS earned,
                              COALESCE(-SUM(cents) FILTER (WHERE kind='payout'),0)::int AS paid FROM ledger`);
  return { earned: r.earned, paid: r.paid, balance: r.earned - r.paid };
}

async function streak() {
  const done = new Set((await q(`SELECT day::text AS d FROM sessions WHERE kind='daily' AND status='done'`)).rows.map((r) => r.d));
  const rc = await rewardCfg();
  let d = todayNL(), n = 0;
  if (!done.has(d)) d = prevDay(d);
  for (let i = 0; i < 400; i++, d = prevDay(d)) {
    if (!isTaskDay(rc, d)) continue;
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
    chat: qq.chat || [],
    example: qq.example || null,
    mnemonic: mnemonicsFor(qq.cat)[0] || null,
    adapt: s.kind === 'intake' ? { readAloud: !!s.state?.adapt?.readAloud && isWordProblem(qq.text) } : {
      readAloud: !!s.state?.adapt?.readAloud && isWordProblem(qq.text),
      impulsive: !!s.state?.adapt?.impulsive,
      showWork: (s.state?.adapt?.needWork || []).includes(qq.cat) && !qq.guided,
    },
    base: s.max_points / s.total,
  };
}
function sessionPayload(s, skills, extra = {}) {
  return {
    id: s.id, kind: s.kind, status: s.status, total: s.total,
    answered: s.results.length, correct: s.correct, maxPoints: s.max_points,
    points: s.points_acc, streak: s.state?.streak || 0, easy: !!s.state?.easy,
    current: s.status === 'active' ? currentPayload(s, skills) : null,
    coach: s.state?.coach || null,
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
      attempts: s.attempts, correct: s.correct, struggling: struggling.includes(s.cat), calib: s.calib || 0,
      guidedWins: s.guided_wins, soloBonus: s.solo_bonus, note: s.ai_note || null,
      toNext: s.level < 3 ? Math.round(((s.recent || []).reduce((a, b) => a + b, 0) / Math.max(8, (s.recent || []).length)) * 100) : null,
    };
  }).sort((a, b) => b.score - a.score);
  return { list, struggling, skills };
}

async function loadSession(id, client = { query: q }) {
  return (await client.query('SELECT * FROM sessions WHERE id=$1', [id])).rows[0];
}

// =====================================================================
// API kind
// =====================================================================
const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🐙', '🦄', '🐯', '🐨', '🚀', '⚽', '🎮', '🦖'];
app.get('/api/kids', wrap(async (req, res) => res.json({ kids: await listKids(), current: kidIdOf(req), avatars: AVATARS })));
// Profielgegevens controleren. Taal bepaalt het curriculum: Nederlands → NL, Afrikaans → Suid-Afrika (KABV).
const rewardError = (e, af) => ({
  amount: af ? 'Kies ’n bedrag van 0 tot R10 per dag (0 = geen geld).' : 'Kies een bedrag van 0 tot € 10 per dag (0 = geen geld).',
  count: af ? 'Kies hoeveel somme per dag.' : 'Kies hoeveel sommen per dag.',
  days: af ? 'Kies minstens een dag.' : 'Kies minstens één dag.',
}[e] || e);
function cleanSurprise(b) {
  const rewards = (Array.isArray(b.rewards) ? b.rewards : String(b.rewards || '').split('\n')).map((r) => String(r).trim().slice(0, 60)).filter(Boolean).slice(0, 12);
  const min = [0.5, 0.6, 0.7, 0.8, 0.9].includes(Number(b.min)) ? Number(b.min) : 0.7;
  return { enabled: !!b.enabled && rewards.length > 0, rewards: rewards.length ? rewards : defaultRewards(), min };
}
function cleanProfile(b, partial = false) {
  const lang = b.lang === 'af' ? 'af' : b.lang === 'nl' ? 'nl' : null;
  const country = b.country === 'ZA' ? 'ZA' : b.country === 'NL' ? 'NL' : null;
  const grade = b.grade == null || b.grade === '' ? null : Number(b.grade);
  const age = b.age == null || b.age === '' ? null : Number(b.age);
  const af = (lang || (country === 'ZA' ? 'af' : 'nl')) === 'af';
  if (!partial && (!lang || !country)) return { error: af ? 'Kies jou land en taal.' : 'Kies je land en taal.' };
  const [lo, hi] = af ? [3, 7] : [3, 8];
  if ((!partial || grade != null) && !(Number.isInteger(grade) && grade >= lo && grade <= hi)) return { error: af ? `In watter graad is jy? (${lo} tot ${hi})` : `In welke groep zit je? (${lo} tot ${hi})` };
  if ((!partial || age != null) && !(Number.isInteger(age) && age >= 6 && age <= 16)) return { error: af ? 'Hoe oud is jy?' : 'Hoe oud ben je?' };
  return { lang: lang ?? undefined, country: country ?? undefined, grade: grade ?? undefined, age: age ?? undefined };
}
app.post('/api/kids', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim().replace(/\s+/g, ' ').slice(0, 30);
  if (name.length < 2) return res.status(400).json({ error: ts('Hoe heet je? (minstens 2 letters)') });
  const kids = await listKids();
  if (kids.length >= 12) return res.status(400).json({ error: ts('Er zijn al heel veel profielen.') });
  if (kids.some((k) => k.name.toLowerCase() === name.toLowerCase())) return res.status(400).json({ error: ts('Er is al een {n}. Kies die hierboven!', { n: name }) });
  const p = cleanProfile(req.body);
  if (p.error) return res.status(400).json({ error: p.error });
  // optioneel: de ouder stelt meteen beloning, weekplan, wachtwoord en verrassingen in
  const setup = req.body.setup && typeof req.body.setup === 'object' ? req.body.setup : null;
  const af = p.lang === 'af';
  let rcfg = null, pw = null, surprise = null;
  if (setup) {
    const r = cleanRewards(setup);
    if (r.error) return res.status(400).json({ error: rewardError(r.error, af) });
    rcfg = r.cfg;
    if (setup.password) {
      pw = String(setup.password);
      if (pw.length < 4 || pw.length > 64) return res.status(400).json({ error: af ? 'Die ouerwagwoord moet minstens 4 tekens hê.' : 'Het ouderwachtwoord moet minstens 4 tekens hebben.' });
    }
    if (setup.surprise) surprise = cleanSurprise(setup.surprise);
  }
  const kid = await createKid(name, AVATARS.includes(req.body.avatar) ? req.body.avatar : AVATARS[kids.length % AVATARS.length], p);
  if (pw) await setKidPassword(kid.id, hashPw(pw));
  if (rcfg || surprise || setup?.research === false) await kidStore.run(kidContext(kid), async () => {
    if (rcfg) await setSetting('reward_cfg', rcfg);
    if (setup && setup.research === false) await setSetting('research', false);
    if (surprise) await setSetting('surprise_cfg', surprise);
  });
  setKidCookie(res, kid.id);
  res.json({ kid });
}));
app.post('/api/kids/select', wrap(async (req, res) => {
  const kid = await getKid(req.body.id);
  if (!kid) return res.status(404).json({ error: ts('Dat profiel bestaat niet meer.') });
  setKidCookie(res, kid.id);
  res.json({ kid });
}));
app.post('/api/kids/leave', (req, res) => { setKidCookie(res, 0); res.json({ ok: true }); });

app.post('/api/login', wrap(async (req, res) => {
  if (!APP_PIN || pinOk(req.body.pin, APP_PIN)) { setCookie(res, 'child', 180); return res.json({ ok: true }); }
  res.status(401).json({ error: ts('Verkeerde pincode') });
}));

app.get('/api/state', child, wrap(async (req, res) => {
  const rc = await rewardCfg();
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
    groep: req.kid.grade ?? await getSetting('groep', null),
    kid: { id: req.kid.id, name: req.kid.name, avatar: req.kid.avatar, lang: req.kid.lang || 'nl', country: req.kid.country || 'NL', grade: req.kid.grade ?? null, age: req.kid.age ?? null },
    curriculum: pack().id, gradeWord: pack().gradeWord, levelNames: [...LEVEL_NAMES],
    currency: req.kid.country === 'ZA' ? 'ZAR' : 'EUR',
    ai: aiEnabled(),
    teacher: teacherName(),
    intakeDone: intake?.status === 'done',
    intakeActive: intake?.status === 'active' ? intake.id : null,
    today: { date: today, weekday: weekdayNL(), schoolDay: isTaskDay(rc, today), nextDay: dayNames()[dowOf(nextTaskDay(rc, today))], daily: daily ? { id: daily.id, status: daily.status, correct: daily.correct, total: daily.total, points: daily.points, answered: daily.results.length } : null },
    wallet: await wallet(),
    streak: await streak(),
    record: await getSetting('record', 0),
    week: await weekInfo(today, rc),
    ahead: await (async () => {
      const todays = daily?.status === 'done';
      if (isTaskDay(rc, today) && !todays) return null;
      const d = nextTaskDay(rc, today);
      const s = await one(`SELECT status, answered FROM (SELECT status, jsonb_array_length(results) AS answered FROM sessions WHERE kind='daily' AND day=$1 ORDER BY id DESC LIMIT 1) x`, [d]);
      return { day: d, name: dayNames()[dowOf(d)], status: s?.status || null, answered: s?.answered || 0 };
    })(),
    mnemonics: MNEMONICS,
    goal: await goalInfo((await wallet()).balance),
    skills: list,
    struggling,
    history,
    badges,
    // "zo pak je het aan" per onderdeel, op het niveau waarop het kind nu oefent (uit het didactisch handboek)
    aanpak: Object.fromEntries(list.map((s) => {
      const d = DIDACTIEK[s.cat], n = d?.niveaus[s.level];
      return [s.cat, n ? { kern: d.kern, stappen: n.aanpak, voorbeeld: n.voorbeeld } : null];
    })),
    points: { intake: rc.intakeCents, intakeCount: INTAKE_MAX, daily: rc.dailyCents, dailyCount: rc.dailyCount, daysPerWeek: rc.days.length, freeGuided: FREE_GUIDED, soloBonus: SOLO_BONUS },
  });
}));

// Max maakt het lesplan: niveau en aantal sommen per onderdeel + een woordje. Terugval: vaste regels.
// Het AI-deel duurt ~10 s, daarom wordt het na elke sessie alvast op de achtergrond gemaakt (nextPlan).
async function askPlan(n) {
  const acc = Object.fromEntries((await q(`SELECT cat, COUNT(*)::int n, SUM(CASE WHEN correct THEN 1 ELSE 0 END)::int ok FROM attempts WHERE created_at > now() - interval '14 days' GROUP BY cat`)).rows.map((r) => [r.cat, r]));
  const view = (await skillsView()).list;
  const rows = view.map((v) => ({ cat: v.cat, label: v.label, levelName: v.levelName, score: v.score, trend: v.trend, struggling: v.struggling, recent: acc[v.cat] ? `${acc[v.cat].ok}/${acc[v.cat].n} goed` : '', calib: v.calib > 0 }));
  return planSession({ name: await getName(), profile: await teacherProfile(), memory: await memoryText(), groep: (await getKid(currentKid()))?.grade ?? await getSetting('groep', 8), rows, n });
}
async function precomputePlan() {
  if (!aiEnabled() || !aiAllowed()) return;
  const raw = await askPlan((await rewardCfg()).dailyCount);
  if (raw?.onderdelen) await setSetting('nextPlan', { made: todayNL(), raw });
}
async function makePlan(n, skills, struggling) {
  if (aiEnabled()) {
    try {
      // eerst een klaarliggend plan (max 3 dagen oud) gebruiken, anders nu vragen
      let raw = null;
      const cached = n === (await rewardCfg()).dailyCount ? await getSetting('nextPlan', null) : null;
      if (cached && (Date.parse(todayNL()) - Date.parse(cached.made)) / 864e5 <= 3) { raw = cached.raw; await q(`DELETE FROM settings WHERE key='nextPlan'`); }
      else if (aiAllowed()) raw = await askPlan(n);
      const applied = applyPlan(skills, raw, n); // toetst ook aan de huidige niveaus (max 1 stap verschil)
      if (applied) {
        for (const it of applied.items) {
          const s = skills.find((x) => x.cat === it.cat);
          if (it.level !== s.level) {
            await q(`UPDATE skills SET level=$2, mastery=50, recent='[]', updated_at=now() WHERE cat=$1`, [it.cat, it.level]);
            s.level = it.level; s.mastery = 50; s.recent = [];
          }
          if (it.note) await q(`UPDATE skills SET ai_note=$2, ai_note_at=now() WHERE cat=$1`, [it.cat, it.note]);
        }
        const coach = {
          message: applied.message,
          items: applied.items.filter((x) => x.count > 0).sort((a, b) => b.count - a.count).map((x) => ({
            cat: x.cat, label: catById[x.cat].label, icon: catById[x.cat].icon, levelName: LEVEL_NAMES[x.level], count: x.count, note: x.note,
          })),
        };
        return { plan: buildPlan(skills, applied.alloc), coach };
      }
      if (raw) console.warn('[lesplan] onbruikbaar plan, val terug op vaste regels');
    } catch (e) { console.error('[lesplan]', e.message); }
  }
  return { plan: buildPlan(skills, allocate(skills, n, struggling)), coach: null };
}

async function createSession(kind, plan, total, maxPoints, skills, state = {}, day = todayNL()) {
  // foutenschrift: herhalingen die vandaag aan de beurt zijn, verspreid door de sessie
  if (kind !== 'intake') {
    const max = kind === 'daily' ? 5 : 3;
    const due = (await q(`SELECT id, cat, level, shape FROM reviews WHERE NOT done AND due <= $1 ORDER BY due, id LIMIT $2`, [day, max])).rows;
    if (due.length) {
      plan = [...plan];
      state = { ...state, reviews: due };
      due.forEach((r, k) => { const pos = Math.min(plan.length - 1, 1 + k * 4); plan[pos] = `review:${k}`; });
    }
  }
  // stille aanpassingen op basis van de signalen (het kind ziet geen labels)
  try { state = { ...state, adapt: { ...adaptFlags(await getSignals()), needWork: kind === 'intake' ? [] : await needWorkCats() } }; } catch (e) { console.error('[signalen]', e.message); }
  // dagtaak: begin met 2 opwarmers (tafels), zoals in de rekenles
  if (kind === 'daily') plan = ['warmup', 'warmup', ...plan].slice(0, total);
  const s = { kind, plan, total, max_points: maxPoints, questions: [], results: [], state };
  s.questions.push(nextQuestion(s, skills));
  return one(`INSERT INTO sessions(kind, day, questions, total, max_points, plan, state) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [kind, day, JSON.stringify(s.questions), total, maxPoints, JSON.stringify(plan), JSON.stringify(state)]);
}

app.post('/api/session/start', child, wrap(async (req, res) => {
  const kind = req.body.kind;
  const today = todayNL();
  const intake = await one(`SELECT id, status FROM sessions WHERE kind='intake' ORDER BY id DESC LIMIT 1`);
  const { skills, struggling } = await skillsView();

  if (kind === 'intake') {
    if (intake?.status === 'done') return res.status(400).json({ error: ts('De starttoets is al gedaan.') });
    if (intake) return res.json(sessionPayload(await loadSession(intake.id), skills));
    const groep = Number(req.body.groep) || req.kid.grade || Number(await getSetting('groep', 0));
    const [lo, hi] = pack().gradeRange;
    if (!(groep >= lo && groep <= hi)) return res.status(400).json({ error: pack().gradeWord === 'graad' ? 'In watter graad is jy?' : 'In welke groep zit je?' });
    if (!req.kid.grade) await updateKidProfile(req.kid.id, { grade: groep });
    await setSetting('groep', groep);
    const plan = intakePlan();
    return res.json(sessionPayload(await createSession('intake', plan, plan.length, (await rewardCfg()).intakeCents, skills, { startLevel: startLevelForGroep(groep) }), skills));
  }
  if (intake?.status !== 'done') return res.status(400).json({ error: ts('Doe eerst de starttoets.') });

  if (kind === 'daily') {
    const rc = await rewardCfg();
    let day = today;
    if (req.body.ahead) {
      // vooruitwerken: de dagtaak van de volgende schooldag alvast doen (max. 1 dag vooruit)
      const todays = await one(`SELECT status FROM sessions WHERE kind='daily' AND day=$1 ORDER BY id DESC LIMIT 1`, [today]);
      if (isTaskDay(rc, today) && todays?.status !== 'done') return res.status(400).json({ error: ts('Maak eerst je dagtaak van vandaag af.') });
      day = nextTaskDay(rc, today);
    } else if (!isTaskDay(rc, today)) return res.status(400).json({ error: ts('Vandaag is er geen dagtaak. Je kunt wel extra oefenen of vooruitwerken!') });
    const existing = await one(`SELECT * FROM sessions WHERE kind='daily' AND day=$1 ORDER BY id DESC LIMIT 1`, [day]);
    if (existing) return res.json(sessionPayload(existing, skills, { struggling }));
    const { plan, coach } = await makePlan(rc.dailyCount, skills, struggling);
    return res.json(sessionPayload(await createSession('daily', plan, rc.dailyCount, rc.dailyCents, skills, coach ? { coach } : {}, day), skills, { struggling }));
  }

  if (kind === 'practice') {
    const active = await one(`SELECT * FROM sessions WHERE kind='practice' AND status='active' ORDER BY id DESC LIMIT 1`);
    const focus = req.body.cat && catById[req.body.cat] ? req.body.cat : null;
    if (active && (!focus || active.plan.every((c) => c === focus))) return res.json(sessionPayload(active, skills, { struggling }));
    if (active) await q(`UPDATE sessions SET status='stopped' WHERE id=$1`, [active.id]);
    const made = focus ? { plan: Array(PRACTICE_COUNT).fill(focus), coach: null } : await makePlan(PRACTICE_COUNT, skills, struggling);
    return res.json(sessionPayload(await createSession('practice', made.plan, PRACTICE_COUNT, 0, skills, made.coach ? { coach: made.coach } : {}), skills, { struggling }));
  }
  res.status(400).json({ error: ts('Onbekend soort sessie') });
}));

app.get('/api/session/:id', child, wrap(async (req, res) => {
  const s = await loadSession(req.params.id);
  if (!s) return res.status(404).json({ error: ts('Niet gevonden') });
  res.json(sessionPayload(s, await getSkills()));
}));

// Helper: huidige som ophalen en controleren dat het de goede index is
async function lockCurrent(client, id, index) {
  const s = (await client.query('SELECT * FROM sessions WHERE id=$1 FOR UPDATE', [id])).rows[0];
  if (!s || s.status !== 'active' || Number(index) !== s.results.length || !s.questions[s.results.length]) return { s, qq: null };
  return { s, qq: s.questions[s.results.length] };
}
async function tx(fn) {
  const client = await connect();
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
    if (!qq || qq.noHelp) return { error: ts('Geen hint mogelijk.') };
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
    if (!qq || qq.noHelp || !qq.guide.length) return { error: ts('Hier zijn geen tussenstappen.') };
    const skill = (await c.query('SELECT * FROM skills WHERE cat=$1', [qq.cat])).rows[0];
    const offer = helpOffer(qq, skill || {});
    if (offer.mode === 'choose' && skill && !skill.transition_seen) {
      await c.query('UPDATE skills SET transition_seen=true WHERE cat=$1', [qq.cat]);
    }
    if (req.body.choice === 'solo') {
      if (offer.mode !== 'choose') return { error: ts('Niets te kiezen.') };
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
    if (!qq || !qq.guided || qq.guideStep >= qq.guide.length) return { error: ts('Geen stap open.') };
    const step = qq.guide[qq.guideStep];
    const given = String(req.body.answer ?? '').slice(0, 30);
    const check = checkAnswer(step, given);
    if (check.empty) return { error: ts('Vul eerst iets in.') };
    let result;
    const shown = step.type === 'choice' ? step.options[Number(given)] : given;
    if (!check.correct && !(qq.stepErrors ||= []).includes(step.ask)) qq.stepErrors.push(step.ask);
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
    if (!s) return { status: 404, error: ts('Niet gevonden') };
    if (i < s.results.length) return { ...s.results[i], steps: s.questions[i].steps, dup: true };
    if (s.status !== 'active' || i !== s.results.length) return { status: 400, error: ts('Ongeldige som') };

    const qq = s.questions[i];
    const dontKnow = !!req.body.dontKnow;
    const given = dontKnow ? '' : String(req.body.answer ?? '').slice(0, 40);
    const check = dontKnow ? { correct: false } : checkAnswer(qq, given);
    if (check.empty) return { status: 400, error: ts('Vul eerst een antwoord in.') };
    const shownGiven = dontKnow ? ts('weet ik niet') : qq.type === 'choice' ? qq.options[Number(given)] : given;
    const scratch = cleanScratch(req.body.scratch);
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
    const misconception = !check.correct && !dontKnow ? detectMisconception(qq, given, checkAnswer) : null;
    const result = { correct: check.correct, given: shownGiven, display: qq.display, note: check.note || null, hints: qq.hints || 0, guided: !!qq.guided, cents, rewardKind: reward.kind, retry: !!qq.retry, review: !!qq.review, misconception };
    if (misconception) qq.misconception = misconception;
    if (s.kind !== 'intake') {
      if (qq.example) await c.query('UPDATE skills SET ex_level=$2 WHERE cat=$1', [qq.cat, qq.level]);
      // foutenschrift bijwerken
      const today = todayNL();
      if (qq.reviewId) {
        const r = (await c.query('SELECT box FROM reviews WHERE id=$1', [qq.reviewId])).rows[0];
        if (r) {
          if (!check.correct) await c.query(`UPDATE reviews SET box=1, due=$2, last_at=now() WHERE id=$1`, [qq.reviewId, addDays(today, 1)]);
          else if (r.box >= 3) await c.query(`UPDATE reviews SET done=true, last_at=now() WHERE id=$1`, [qq.reviewId]);
          else await c.query(`UPDATE reviews SET box=box+1, due=$2, last_at=now() WHERE id=$1`, [qq.reviewId, addDays(today, r.box === 1 ? 3 : 7)]);
        }
      } else if (!check.correct && !qq.booster && !qq.retry) {
        const exists = (await c.query('SELECT 1 FROM reviews WHERE NOT done AND cat=$1 AND shape=$2', [qq.cat, qq.shape])).rowCount;
        if (!exists) await c.query(`INSERT INTO reviews(cat, level, shape, text, due) VALUES ($1,$2,$3,$4,$5)`, [qq.cat, qq.level, qq.shape, qq.text, addDays(today, 1)]);
      }
    }
    s.results.push(result);
    s.correct += check.correct ? 1 : 0;
    s.points_acc += cents;
    s.state = updateState(s, qq, check.correct);

    await c.query(`INSERT INTO attempts(session_id, cat, level, correct, hints, time_ms, given, text, display, guided, mult, misconception, scratch_text, nsteps, word, step_errors) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [s.id, qq.cat, qq.level, check.correct, qq.hints || 0, Math.min(Number(req.body.timeMs) || 0, 36e5), shownGiven, qq.text, qq.display, !!qq.guided, reward.mult, misconception?.label || null, scratch?.text || null,
        (qq.guide?.length || 0) + 1, isWordProblem(qq.text), JSON.stringify(qq.stepErrors || [])]);
    logEvent('antwoord', { som: qq.text, gegeven: shownGiven, goed: check.correct, juist: qq.display, tijd_s: Math.round((Number(req.body.timeMs) || 0) / 1000),
      hints: qq.hints || 0, tussenstappen: !!qq.guided, stapfouten: qq.stepErrors || [], denkfout: misconception?.label || null, kladblok: scratch?.text || null,
      sessie: s.kind, herkansing: !!qq.retry, herhaling: !!qq.review, weetniet: !!dontKnow }, { cat: qq.cat, level: qq.level, session: s.id });
    // uitleg die Max eerder gaf over dit onderdeel: hielp het? (de eerstvolgende som telt)
    await c.query(`UPDATE explanations SET outcome=$2 WHERE cat=$1 AND outcome IS NULL AND created_at > now() - interval '3 days'`, [qq.cat, check.correct]);

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
        await c.query(`INSERT INTO ledger(cents, kind, note, session_id) VALUES ($1,'earn',$2,$3)`, [points, s.kind === 'intake' ? ts('Starttoets') : ts('Dagtaak {d}', { d: s.day }), s.id]);
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
  // kladblok bewaren en (op de achtergrond) laten bekijken door de leraar: zo leert hij hoe er gerekend wordt
  const scratch = cleanScratch(req.body.scratch);
  if (scratch) {
    const idx = Number(req.body.index);
    await saveScratch(s.id, idx, scratch);
    if (aiEnabled() && aiAllowed()) {
      getName().then((name) => analyzeScratch({ name, question: qq, given: result.given, correct: result.correct, scratch }))
        .then((note) => note && q(`UPDATE attempts SET scratch_note=$1 WHERE id = (SELECT id FROM attempts WHERE session_id=$2 ORDER BY id DESC LIMIT 1)`, [note, s.id]))
        .catch((e) => console.error('[kladblok]', e.message));
    }
  }
  let weekBonus = 0, surprise = null;
  if (done && s.kind === 'daily') surprise = await maybeSurprise(s).catch((e) => { console.error('[verrassing]', e.message); return null; });
  if (done) {
    await snapshotSkills();
    if (s.kind === 'daily') {
      const st = await streak();
      for (const [n, id] of [[3, 'reeks3'], [5, 'reeks5'], [10, 'reeks10']]) if (st >= n) { const b = await awardBadge(id); if (b) newBadges.push(b); }
      // weekbonus: alle dagtaken van die week af
      const wk = await weekInfo(s.day);
      if (wk.count === wk.days.length && !wk.given && wk.bonus > 0) {
        await setSetting(`weekbonus:${wk.days[0].day}`, true);
        await q(`INSERT INTO ledger(cents, kind, note) VALUES ($1,'earn',$2)`, [wk.bonus, ts('Weekbonus week van {d}', { d: wk.days[0].day })]);
        weekBonus = wk.bonus;
        const b = await awardBadge('week'); if (b) newBadges.push(b);
      }
    }
  }
  if (!done && aiEnabled() && s.results.length % 10 === 0) refreshProfile().catch((e) => console.error('[profiel]', e.message));
  else if (done || s.results.length % 5 === 0) refreshSignals().catch((e) => console.error('[signalen]', e.message));
  if (done) {
    refreshProfile().catch((e) => console.error('[profiel]', e.message));
    precomputePlan().catch((e) => console.error('[lesplan]', e.message));
    if (aiEnabled()) {
      const full = await loadSession(s.id);
      getName().then((name) => remember({ name, transcript: sessionTranscript(full) })).then(addMemory).catch((e) => console.error('[geheugen]', e.message));
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
    streak: s.state.streak, easy: s.state.easyChanged, points: s.points_acc, badges: newBadges, weekBonus, teachback, surprise,
    next: done ? null : currentPayload(s, skills),
  });
}));

// De leraar: gesprek bij een som. Het gesprek wordt per som bewaard (ook na herladen).
// mode: 'start' (gesprek openen na een fout), 'step' (vast bij een tussenstap) of een gewoon bericht.
app.post('/api/session/:id/chat', child, wrap(async (req, res) => {
  const s = await loadSession(req.params.id);
  const i = Number(req.body.index);
  const qq = s?.questions[i];
  if (!qq) return res.status(404).json({ error: ts('Niet gevonden') });
  if (s.kind === 'intake' && !s.results[i]) return res.json({ reply: null, reason: ts('Tijdens de starttoets helpt {m} nog niet: we willen eerst zien wat jij al kunt. Daarna wel! 😉', { m: teacherName() }) });
  if (!aiEnabled()) return res.json({ reply: null, reason: ts('{m} (AI) staat nog niet aan. Vraag papa of mama om een OpenAI-sleutel in te stellen.', { m: teacherName() }) });
  if (!aiAllowed()) return res.json({ reply: null, reason: ts('{m} heeft vandaag al heel veel uitgelegd. Morgen weer!', { m: teacherName() }) });

  const r = s.results[i];
  const message = String(req.body.message || '').trim().slice(0, 400);
  const mode = req.body.mode;
  qq.chat ||= [];
  if (mode === 'start' && qq.chat.length) return res.json({ reply: null, chat: qq.chat }); // al gestart
  let phase = r ? (r.correct ? 'right' : 'wrong') : 'before';
  let step = null, given = r?.given;
  if (!r && qq.guided && qq.guideStep < qq.guide.length && (mode === 'step' || qq.stepTries)) {
    phase = 'step'; step = qq.guide[qq.guideStep]; given = req.body.stepGiven || '';
  }
  if (message) qq.chat.push({ role: 'kid', text: message });
  // kladblok: vóór het antwoord stuurt de app het actuele kladblok mee, daarna gebruiken we het bewaarde
  const scratch = (!r && cleanScratch(req.body.scratch)) || (r ? await loadScratch(s.id, i) : null);
  const reply = await teacherTurn({
    name: await getName(), profile: await teacherProfile(), memory: await memoryText(), today: sessionLog(s, i),
    question: qq, levelName: LEVEL_NAMES[qq.level], phase, given, chat: qq.chat, step, misconception: qq.misconception, scratch,
  });
  const { text: replyText, form } = splitForm(reply);
  if (form) await q(`INSERT INTO explanations(cat, form, session_id, idx) VALUES ($1,$2,$3,$4)`, [qq.cat, form, s.id, i]);
  if (replyText) qq.chat.push({ role: 'teacher', text: replyText, phase });
  logEvent('gesprek', { som: qq.text, juist: qq.display, gegeven: given ?? null, fase: phase, stap: step?.ask || null, kind: message || (mode === 'start' ? '(opent gesprek na fout)' : mode === 'step' ? '(vast bij tussenstap)' : ''),
    max: replyText || null, vorm: form || null, denkfout: qq.misconception?.label || null, beurt: qq.chat.length }, { cat: qq.cat, level: qq.level, session: s.id });
  qq.chat = qq.chat.slice(-24);
  await q('UPDATE sessions SET questions = jsonb_set(questions, $2, $3::jsonb) WHERE id=$1', [s.id, `{${i},chat}`, JSON.stringify(qq.chat)]);
  res.json({ reply: replyText, chat: qq.chat, reason: replyText ? null : ts('{m} kon nu even niet antwoorden. Probeer het zo nog eens.', { m: teacherName() }) });
}));

// Korte interactieve les van de leraar over een onderdeel (de app bewaart het gesprek)
app.post('/api/lesson', child, wrap(async (req, res) => {
  const cat = req.body.cat;
  if (!catById[cat]) return res.status(404).json({ error: ts('Onbekend onderdeel') });
  if (!aiEnabled()) return res.json({ reply: null });
  if (!aiAllowed()) return res.json({ reply: null, reason: ts('{m} heeft vandaag al heel veel uitgelegd. Morgen weer!', { m: teacherName() }) });
  const chat = (Array.isArray(req.body.chat) ? req.body.chat : []).slice(-14)
    .map((m) => ({ role: m.role === 'teacher' ? 'teacher' : 'kid', text: String(m.text || '').slice(0, 600) }));
  const skill = (await getSkills()).find((x) => x.cat === cat);
  const mistakes = (await q(`SELECT text, given, display FROM attempts WHERE cat=$1 AND NOT correct ORDER BY id DESC LIMIT 4`, [cat])).rows;
  const out = await lessonTurn({ name: await getName(), profile: await teacherProfile(), memory: await memoryText(), cat, catLabel: catById[cat].label, level: skill.level, levelName: LEVEL_NAMES[skill.level], mistakes, chat });
  if (out?.ready && chat.length >= 2) {
    const transcript = `Les over ${catById[cat].label}:\n` + [...chat, { role: 'teacher', text: out.text }].map((m) => `${m.role === 'teacher' ? teacherName() : 'kind'}: ${m.text}`).join('\n');
    remember({ name: await getName(), transcript }).then(addMemory).catch(() => {});
  }
  const { text: lessonText, form: lessonForm } = splitForm(out?.text || '');
  if (lessonForm) await q(`INSERT INTO explanations(cat, form) VALUES ($1,$2)`, [cat, lessonForm]);
  logEvent('les', { kind: [...chat].reverse().find((m) => m.role === 'kid')?.text || '(start les)', max: lessonText || null, vorm: lessonForm || null, klaar: !!out?.ready, beurt: chat.length + 1 },
    { cat, level: skill.level });
  res.json({ reply: lessonText || null, ready: !!out?.ready });
}));

// Persoonlijk berichtje van de leraar na een sessie (één keer per sessie, daarna bewaard)
app.post('/api/session/:id/reflect', child, wrap(async (req, res) => {
  const s = await loadSession(req.params.id);
  if (!s || s.status !== 'done') return res.status(400).json({ error: ts('Sessie is nog niet klaar.') });
  if (s.state?.reflection) return res.json({ text: s.state.reflection });
  if (!aiEnabled() || !aiAllowed()) return res.json({ text: null });
  const per = {};
  s.questions.forEach((x, k) => { const p = (per[x.cat] ||= { label: catById[x.cat].label, n: 0, ok: 0 }); p.n++; if (s.results[k]?.correct) p.ok++; });
  const wrong = s.questions.map((x, k) => ({ x, r: s.results[k] })).filter((o) => o.r && !o.r.correct).slice(0, 5);
  const summary = `Sessie (${s.kind === 'intake' ? 'starttoets' : s.kind === 'daily' ? 'dagtaak' : 'oefenen'}): ${s.correct} van de ${s.total} goed. Langste reeks: ${s.state?.best || 0}.
Per onderdeel: ${Object.values(per).map((p) => `${p.label} ${p.ok}/${p.n}`).join(', ')}.
${wrong.length ? `Fouten: ${wrong.map((o) => `${o.x.text} → "${o.r.given}" (goed: ${o.x.display})`).join(' | ')}` : 'Geen fouten!'}
Herkansingen goed: ${s.results.filter((r) => r.retry && r.correct).length}. Met tussenstappen goed: ${s.results.filter((r) => r.guided && r.correct).length}.`;
  const text = await reflect({ name: await getName(), profile: await teacherProfile(), memory: await memoryText(), summary });
  if (text) await q(`UPDATE sessions SET state = state || $2::jsonb WHERE id=$1`, [s.id, JSON.stringify({ reflection: text })]);
  if (text) logEvent('reflectie', { sessie: s.kind, goed: s.correct, totaal: s.total, max: text }, { session: s.id });
  res.json({ text });
}));

// Feedback van het kind op een uitleg van Max (👍/👎 + waarom), voor het verbeteren van de AI
app.post('/api/feedback', child, wrap(async (req, res) => {
  const vote = req.body.vote === 'up' ? 'up' : req.body.vote === 'down' ? 'down' : null;
  const reason = String(req.body.reason || '').slice(0, 80) || null;
  const msg = String(req.body.message || '').slice(0, 1500);
  const ctx = req.body.ctx || {};
  const cat = catById[ctx.cat] ? ctx.cat : null;
  if (!vote && !reason) return res.status(400).json({ error: 'leeg' });
  await logEvent('feedback', { over: ctx.kind === 'lesson' ? 'les' : 'gesprek', stem: vote, waarom: reason, bericht_max: msg, som: String(ctx.question || '').slice(0, 300) || null },
    { cat, session: Number(ctx.session) || null });
  res.json({ ok: true });
}));

// Spaardoel kiezen of wissen (door het kind zelf)
app.post('/api/goal', child, wrap(async (req, res) => {
  if (req.body.clear) { await q(`DELETE FROM settings WHERE key='goal'`); return res.json({ goal: null }); }
  const name = String(req.body.name || '').trim().slice(0, 40);
  const euros = Number(String(req.body.euros || '').replace(',', '.'));
  if (!name) return res.status(400).json({ error: ts('Waar spaar je voor?') });
  if (!(euros >= 1 && euros <= 500)) return res.status(400).json({ error: ts('Kies een bedrag tussen {a} en {b}.', { a: req.kid.country === 'ZA' ? 'R1' : '€ 1', b: req.kid.country === 'ZA' ? 'R500' : '€ 500' }) });
  await setSetting('goal', { name, cents: Math.round(euros * 100), since: todayNL() });
  res.json({ goal: await goalInfo((await wallet()).balance) });
}));

// Teach-back: hij legt uit hoe hij een som oploste; Rekenmaatje geeft feedback
app.post('/api/session/:id/teachback', child, wrap(async (req, res) => {
  const s = await loadSession(req.params.id);
  const i = Number(req.body.index);
  const qq = s?.questions[i], r = s?.results[i];
  if (!qq || !r) return res.status(404).json({ error: ts('Niet gevonden') });
  const text = String(req.body.text || '').trim().slice(0, 600);
  if (text.length < 3) return res.status(400).json({ error: ts('Schrijf eerst kort op hoe je het deed.') });
  const b = await awardBadge('uitlegger');
  let feedback = null;
  if (aiEnabled() && aiAllowed()) feedback = await teachBack({ question: qq, explanation: text, name: await getName(), profile: await teacherProfile(), memory: await memoryText() });
  logEvent('uitleg', { som: qq.text, goed: r.correct, kind: text, max: feedback }, { cat: qq.cat, level: qq.level, session: s.id });
  res.json({ feedback, steps: qq.steps, badge: b });
}));

// =====================================================================
// API ouder
// =====================================================================
// ---------- testklok (alleen voor simulaties, nooit in productie) ----------
if (process.env.ALLOW_TEST_CLOCK === '1' && process.env.NODE_ENV !== 'production') {
  app.post('/api/test/clock', (req, res) => { setTestClock(req.body.days); res.json({ today: todayNL() }); });
  console.log('[test] testklok staat aan');
}

// ---------- overzicht voor ouder/leerkracht: alle kinderen op één pagina ----------
const parentOnly = (req, res, next) => (parentScope(req) ? next() : res.status(401).json({ error: 'parent-login' }));
async function kidSummary(k) {
  const intake = await one(`SELECT status FROM sessions WHERE kind='intake' ORDER BY id DESC LIMIT 1`);
  const week = await one(`SELECT COUNT(*)::int n, COALESCE(SUM(CASE WHEN correct THEN 1 ELSE 0 END),0)::int ok FROM attempts WHERE created_at > now() - interval '7 days'`);
  const last = await one(`SELECT MAX(created_at) AS t FROM attempts`);
  const sessions7 = await one(`SELECT COUNT(*)::int n FROM sessions WHERE status='done' AND kind <> 'intake' AND created_at > now() - interval '7 days'`);
  return {
    id: k.id, name: k.name, avatar: k.avatar, lang: k.lang || 'nl', country: k.country || 'NL', teacher: teacherName(),
    intakeDone: intake?.status === 'done', lastActive: last?.t || null,
    week: { n: week.n, pct: week.n ? Math.round((100 * week.ok) / week.n) : null }, sessions7: sessions7.n,
    streak: await streak(), wallet: await wallet(), stats: await profileStats(), profile: await getProfile(),
    memory: (await getMemory()).slice(-6).reverse(),
    misconceptions: (await q(`SELECT misconception, COUNT(*)::int n FROM attempts WHERE misconception IS NOT NULL AND created_at > now() - interval '30 days' GROUP BY misconception ORDER BY n DESC LIMIT 4`)).rows,
    scratchNotes: (await q(`SELECT text, given, correct, scratch_note FROM attempts WHERE scratch_note IS NOT NULL ORDER BY id DESC LIMIT 3`)).rows,
    reviewsOpen: (await one(`SELECT COUNT(*)::int n FROM reviews WHERE NOT done`)).n,
    signals: await refreshSignals(),
  };
}
app.get('/api/parent/all', parentOnly, wrap(async (req, res) => {
  const kids = [];
  for (const k of await listKids()) if (await mayParent(req, k.id)) kids.push(await kidStore.run(kidContext(k), () => kidSummary(k)));
  res.json({ teacher: teacherName(), ai: aiEnabled(), levels: LEVEL_NAMES, cats: CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: c.icon })), kids });
}));

// Profiel aanpassen (land, taal, groep/graad, leeftijd). Een andere taal = een ander curriculum.
app.post('/api/parent/kidprofile', parent, wrap(async (req, res) => {
  const p = cleanProfile(req.body, true);
  if (p.error) return res.status(400).json({ error: p.error });
  await updateKidProfile(req.kid.id, p);
  res.json({ ok: true });
}));

// Inloggen: met PARENT_PIN uit .env (beheerder: alle kinderen), of met het ouderwachtwoord van een kind
// (dan alle kinderen met dat wachtwoord). Zonder PARENT_PIN in .env opent 1234 alleen kinderen zonder eigen wachtwoord.
app.post('/api/parent/login', wrap(async (req, res) => {
  const pw = String(req.body.password ?? req.body.pin ?? '');
  if (process.env.PARENT_PIN && pinOk(pw, PARENT_PIN)) { setCookie(res, 'parent', 30); return res.json({ ok: true }); }
  const ids = pw ? (await kidPasswords()).filter((k) => pwMatches(pw, k.parent_pw)).map((k) => k.id) : [];
  const open = !process.env.PARENT_PIN && pinOk(pw, PARENT_PIN);
  if (ids.length || open) { setCookie(res, `pk${open ? '-o' : ''}${ids.map((i) => `-${i}`).join('')}`, 30); return res.json({ ok: true }); }
  await new Promise((r) => setTimeout(r, 800));
  res.status(401).json({ error: ts('Verkeerd wachtwoord') });
}));
// Ouder: feedback voor de makers, en meedoen aan het verbeteren aan/uit
app.post('/api/parent/feedback', parent, wrap(async (req, res) => {
  const text = String(req.body.text || '').trim().slice(0, 3000);
  if (text.length < 3) return res.status(400).json({ error: ts('Vul eerst iets in.') });
  await logEvent('ouder_feedback', { tekst: text });
  res.json({ ok: true });
}));
app.post('/api/parent/research', parent, wrap(async (req, res) => {
  await setSetting('research', !!req.body.on);
  res.json({ ok: true, research: !!req.body.on });
}));
// Beloning en weekplan wijzigen (achter het ouderwachtwoord)
app.post('/api/parent/rewards', parent, wrap(async (req, res) => {
  const r = cleanRewards(req.body, await rewardCfg());
  if (r.error) return res.status(400).json({ error: rewardError(r.error, req.kid.lang === 'af') });
  await setSetting('reward_cfg', r.cfg);
  res.json({ ok: true, rewards: r.cfg });
}));
// Ouderwachtwoord instellen, wijzigen of weghalen (leeg = weghalen)
app.post('/api/parent/password', parent, wrap(async (req, res) => {
  const pw = String(req.body.password || '');
  const af = req.kid.lang === 'af';
  if (pw && (pw.length < 4 || pw.length > 64)) return res.status(400).json({ error: af ? 'Die ouerwagwoord moet minstens 4 tekens hê.' : 'Het ouderwachtwoord moet minstens 4 tekens hebben.' });
  if (pw && pw !== String(req.body.password2 || '')) return res.status(400).json({ error: af ? 'Die twee wagwoorde is nie dieselfde nie.' : 'De twee wachtwoorden zijn niet hetzelfde.' });
  await setKidPassword(req.kid.id, pw ? hashPw(pw) : null);
  // deze ouder blijft ingelogd voor dit kind
  const sc = parentScope(req);
  if (sc && !sc.all) setCookie(res, `pk${sc.open ? '-o' : ''}${[...new Set([...sc.ids, req.kid.id])].map((i) => `-${i}`).join('')}`, 30);
  res.json({ ok: true, hasPassword: !!pw });
}));
app.post('/api/parent/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'cp=; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/parent/overview', parent, wrap(async (req, res) => {
  const rewards = await rewardCfg(), hasPassword = await kidHasPassword(req.kid.id);
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
    name: await getName(), lang: req.kid.lang || 'nl', country: req.kid.country || 'NL', grade: req.kid.grade ?? null, age: req.kid.age ?? null,
    ai: aiEnabled(), aiProvider: aiProvider(), aiModel: aiModel(), teacher: teacherName(), profile: await getProfile(), memory: (await getMemory()).slice(-20).reverse(),
    wallet: await wallet(), streak: await streak(), rewards, hasPassword, dailyCounts: DAILY_COUNTS, research: (await getSetting('research', true)) !== false,
    skills: list, struggling, snaps, sessions, ledger, recentWrong, acc, categories: CATEGORIES, badges: await getBadges(),
    surprise: { cfg: await surpriseCfg(), list: (await getSetting('surprises', [])).slice(-12).reverse() },
    reviews: (await one(`SELECT COUNT(*) FILTER (WHERE NOT done)::int open, COUNT(*) FILTER (WHERE done)::int done FROM reviews`)),
    misconceptions: (await q(`SELECT misconception, COUNT(*)::int n FROM attempts WHERE misconception IS NOT NULL AND created_at > now() - interval '30 days' GROUP BY misconception ORDER BY n DESC LIMIT 8`)).rows,
    scratchNotes: (await q(`SELECT cat, text, given, correct, scratch_note, created_at FROM attempts WHERE scratch_note IS NOT NULL ORDER BY id DESC LIMIT 8`)).rows,
    signals: await refreshSignals(),
  });
}));

app.post('/api/parent/payout', parent, wrap(async (req, res) => {
  const cents = Math.round(Number(req.body.cents));
  const w = await wallet();
  if (!(cents > 0) || cents > w.balance) return res.status(400).json({ error: ts('Ongeldig bedrag') });
  await q(`INSERT INTO ledger(cents, kind, note) VALUES ($1,'payout',$2)`, [-cents, String(req.body.note || 'Uitbetaald').slice(0, 80)]);
  res.json({ wallet: await wallet() });
}));

app.post('/api/parent/advice', parent, wrap(async (req, res) => {
  if (!aiEnabled()) return res.json({ text: null, reason: ts('Zet OPENAI_API_KEY in de instellingen (.env) om AI-advies te krijgen.') });
  const key = `advice:${todayNL()}`;
  const cached = !req.body.fresh && await one('SELECT content FROM ai_cache WHERE key=$1', [key]);
  if (cached) return res.json({ text: cached.content });
  if (!aiAllowed()) return res.json({ text: null, reason: ts('AI-limiet voor vandaag bereikt.') });
  const { list } = await skillsView();
  const acc = (await q(`SELECT cat, COUNT(*)::int n, SUM(CASE WHEN correct THEN 1 ELSE 0 END)::int ok, SUM(CASE WHEN guided THEN 1 ELSE 0 END)::int guided FROM attempts WHERE created_at > now() - interval '14 days' GROUP BY cat`)).rows;
  const accBy = Object.fromEntries(acc.map((a) => [a.cat, a]));
  const wrong = (await q(`SELECT cat, text, given, display FROM attempts WHERE NOT correct ORDER BY id DESC LIMIT 12`)).rows;
  const days = (await q(`SELECT COUNT(*)::int n FROM sessions WHERE kind='daily' AND status='done'`)).rows[0].n;
  const summary = [
    `Aantal afgeronde dagtaken: ${days}. Reeks: ${await streak()} schooldagen.`,
    pack().id === 'za'
      ? `Het kind zit in graad ${req.kid.grade ?? await getSetting('groep', 7)} (Suid-Afrika, KABV). Score per onderdeel (0-100). Niveau = op welk graadniveau het kind dit onderdeel nu oefent (graad 4 t/m 7). Laatste 14 dagen: goed / totaal (met tussenstappen):`
      : `Het kind zit in groep ${req.kid.grade ?? await getSetting('groep', 8)}. Score per onderdeel (0-100). Niveau = op welk groepsniveau het kind dit onderdeel nu oefent (groep 5 t/m 8; groep 7 bevat de meeste 1F-stof, groep 8 = eindniveau 1F/1S). Laatste 14 dagen: goed / totaal (met tussenstappen):`,
    ...list.map((s) => `- ${s.label} (${s.domain}): score ${s.score}, niveau ${s.levelName}${s.trend != null ? `, trend ${s.trend >= 0 ? '+' : ''}${s.trend}` : ''}${accBy[s.cat] ? `, ${accBy[s.cat].ok}/${accBy[s.cat].n} goed (${accBy[s.cat].guided} met tussenstappen)` : ''}${s.struggling ? ' — LOOPT VAST' : ''}`),
    'Recente fouten:',
    ...wrong.map((w) => `- [${catById[w.cat].label}] ${w.text} → "${w.given}" (goed: ${w.display})`),
  ].join('\n');
  const text = await parentAdvice({ name: await getName(), summary, profile: await teacherProfile() });
  if (text) await q('INSERT INTO ai_cache(key, content) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET content=$2', [key, text]);
  res.json({ text, reason: text ? null : 'AI kon nu geen advies geven.' });
}));

app.post('/api/parent/profile', parent, wrap(async (req, res) => {
  if (!aiEnabled()) return res.status(400).json({ error: ts('AI staat niet aan.') });
  await refreshProfile();
  res.json({ profile: await getProfile() });
}));

app.post('/api/parent/settings', parent, wrap(async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 30);
  if (name.length >= 2) await renameKid(req.kid.id, name);
  res.json({ ok: true });
}));

app.post('/api/parent/surprise', parent, wrap(async (req, res) => {
  const rewards = (Array.isArray(req.body.rewards) ? req.body.rewards : []).map((r) => String(r).trim().slice(0, 60)).filter(Boolean).slice(0, 12);
  const min = Math.max(0.3, Math.min(1, Number(req.body.min) || 0.7));
  await setSetting('surprise_cfg', { enabled: !!req.body.enabled, rewards: rewards.length ? rewards : defaultRewards(), min });
  res.json({ cfg: await surpriseCfg() });
}));
app.post('/api/parent/surprise/delivered', parent, wrap(async (req, res) => {
  const list = await getSetting('surprises', []);
  const i = list.length - 1 - Number(req.body.index); // de lijst wordt omgekeerd getoond
  if (list[i]) list[i].delivered = true;
  await setSetting('surprises', list);
  res.json({ ok: true });
}));

app.post('/api/parent/delete-kid', parent, wrap(async (req, res) => {
  if (req.body.confirm !== 'VERWIJDER') return res.status(400).json({ error: ts('Bevestig het verwijderen.') });
  await deleteKid(req.kid.id);
  setKidCookie(res, 0);
  res.json({ ok: true });
}));

app.post('/api/parent/reset', parent, wrap(async (req, res) => {
  if (req.body.confirm !== 'RESET') return res.status(400).json({ error: ts('Bevestig met RESET') });
  if (req.body.what === 'intake') {
    // starttoets opnieuw (bijv. na lange pauze); spaarpot en badges blijven staan
    await q(`DELETE FROM sessions WHERE kind='intake'`);
    await q('DELETE FROM skills');
  } else {
    await q('TRUNCATE attempts, sessions, skills, skill_snapshots, ledger, ai_cache, badges RESTART IDENTITY');
    await q(`DELETE FROM settings WHERE key IN ('record','goal','groep','profile','memory') OR key LIKE 'weekbonus:%'`);
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
await migrateLeerlog();
app.listen(PORT, () => console.log(`Rekenapp draait op http://localhost:${PORT}`));
