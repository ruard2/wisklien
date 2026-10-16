// Leerlogica: adaptieve starttoets, niveau per onderdeel, live bijsturen tijdens
// een sessie, beloningsregels en badges.
import { q } from './db.js';
import { ts } from './i18n.js';
import { CAT_IDS, generate, generateLike, catById, warmupCats } from './curriculum.js';
import { shuffle, pick, todayNL } from './util.js';

export const INTAKE_POINTS = 100; // centen, alleen voor goede antwoorden
export const DAILY_POINTS = 50;
export const DAILY_COUNT = 20;
export const PRACTICE_COUNT = 20;
export const FREE_GUIDED = 5;   // eerste 5 keer tussenstappen: gewone beloning
export const SOLO_BONUS = 5;    // daarna 5 keer dubbel als hij kiest om het zelf te doen

// ---------- score per onderdeel ----------
// niveau 0..3 (opstap, basis, 1F, 1S) en beheersing 0..100 → één score 0..100
export const skillScore = (s) => Math.round(Math.min(100, s.level * 25 + s.mastery / 4));
export function skillLabel(score) {
  if (score >= 85) return 'Sterk';
  if (score >= 60) return 'Goed';
  if (score >= 35) return 'Op weg';
  return 'Oefenen';
}

const DEFAULT_SKILL = (cat) => ({ cat, level: 1, mastery: 40, recent: [], scaffold: 0, guided_wins: 0, solo_bonus: 0, transition_seen: false, attempts: 0, correct: 0, ex_level: -1, calib: 0 });
export async function getSkills() {
  const rows = (await q('SELECT * FROM skills')).rows;
  const byCat = Object.fromEntries(rows.map((r) => [r.cat, r]));
  return CAT_IDS.map((cat) => byCat[cat] || DEFAULT_SKILL(cat));
}

// ---------- niveauregels ----------
// Elke poging telt: 1 = zelf goed, 0,5 = goed met hulp (hints/tussenstappen), 0 = fout.
// Meer dan de helft fout (van de laatste 6, min. 4 pogingen) → niveau omlaag + extra hulp.
// Daarna pas omhoog bij 80% (gemiddelde van de laatste 10, min. 8 pogingen).
export function updateSkill(s, correct, helped) {
  const val = correct ? (helped ? 0.5 : 1) : 0;
  const recent = [...(s.recent || []), val].slice(-10);
  const target = correct ? (helped ? 65 : 100) : 0;
  let mastery = Math.round((s.mastery + 0.2 * (target - s.mastery)) * 10) / 10;
  let { level, scaffold } = s;
  let event = null;
  // Inregelen: na de (korte) starttoets is het niveau nog een schatting. De eerste sommen per onderdeel
  // stellen het daarom sneller bij: 3× zelf goed op rij → omhoog, 2× fout op rij → omlaag.
  const calib = Math.max(0, (s.calib || 0) - 1);
  if (s.calib > 0) {
    const l3 = recent.slice(-3), l2 = recent.slice(-2);
    if (l3.length === 3 && l3.every((v) => v === 1) && level < 3) {
      return { ...s, level: level + 1, mastery: 45, recent: [], scaffold, attempts: s.attempts + 1, correct: s.correct + 1, calib, event: 'up' };
    }
    if (l2.length === 2 && l2.every((v) => v === 0) && level > 0) {
      return { ...s, level: level - 1, mastery: 55, recent: [], scaffold: 2, attempts: s.attempts + 1, correct: s.correct, calib, event: 'down' };
    }
  }
  const last6 = recent.slice(-6);
  const wrong = last6.filter((v) => v === 0).length;
  const avg10 = recent.reduce((a, b) => a + b, 0) / recent.length;
  let newRecent = recent;
  if (recent.length >= 4 && wrong / last6.length > 0.5 && level > 0) {
    level -= 1; mastery = 60; newRecent = []; scaffold = 3; event = 'down';
  } else if (recent.length >= 8 && avg10 >= 0.8 && level < 3) {
    level += 1; mastery = 45; newRecent = []; event = 'up';
  } else if (recent.length >= 4 && wrong / last6.length > 0.5) {
    scaffold = Math.max(scaffold, 3); // al op het laagste niveau: wel extra hulp
  }
  if (correct && !helped && scaffold > 0) scaffold -= 1;
  return { ...s, level, mastery, recent: newRecent, scaffold, attempts: s.attempts + 1, correct: s.correct + (correct ? 1 : 0), calib, event };
}

export async function saveSkill(s, client = { query: q }) {
  await client.query(`INSERT INTO skills(cat, level, mastery, recent, scaffold, guided_wins, solo_bonus, transition_seen, attempts, correct, calib, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
      ON CONFLICT (cat) DO UPDATE SET level=$2, mastery=$3, recent=$4, scaffold=$5, guided_wins=$6, solo_bonus=$7, transition_seen=$8, attempts=$9, correct=$10, calib=$11, updated_at=now()`,
  [s.cat, s.level, s.mastery, JSON.stringify(s.recent || []), s.scaffold || 0, s.guided_wins || 0, s.solo_bonus || 0, !!s.transition_seen, s.attempts || 0, s.correct || 0, s.calib || 0]);
}

// ---------- adaptieve starttoets ----------
// Per onderdeel 3 sommen: begin op basis; goed → moeilijker, fout → makkelijker.
// Zo krijgt hij geen 1S-sommen als basis nog niet lukt.
// Kort houden (± 15 minuten): ronde 1 = elk onderdeel één som, ronde 2 = 7 extra sommen
// waar het meest te leren valt ('*' wordt pas gekozen als ronde 1 klaar is). De rest leert de app gaandeweg
// (zie "inregelen" in updateSkill).
export const INTAKE_EXTRA = 7;
export const INTAKE_MAX = CAT_IDS.length + INTAKE_EXTRA;
export function intakePlan() {
  return [...shuffle(CAT_IDS), ...Array(INTAKE_EXTRA).fill('*')];
}
// Ronde 2: eerst onderdelen die fout gingen (een niveau lager: wat lukt wél?), dan goede (kan het hoger?).
function intakeExtraCat(session) {
  const asked = session.questions.map((qq, k) => ({ cat: qq.cat, correct: session.results[k]?.correct }));
  const done2 = new Set(asked.slice(CAT_IDS.length).map((a) => a.cat));
  const first = asked.slice(0, CAT_IDS.length).filter((a) => !done2.has(a.cat));
  const wrong = shuffle(first.filter((a) => !a.correct)), right = shuffle(first.filter((a) => a.correct));
  return (wrong[0] || right[0] || { cat: pick(CAT_IDS) }).cat;
}
export function intakeLevel(history, start = 2) {
  // history: [{level, correct}] voor dit onderdeel in de starttoets
  if (!history.length) return start;
  const last = history.at(-1);
  if (last.correct) return Math.min(3, last.level + 1);
  return Math.max(0, last.level - 1);
}
export function skillFromIntake(cat, history) {
  // hoogste niveau dat goed ging, en of het daarboven fout ging
  const ok = history.filter((h) => h.correct).map((h) => h.level);
  const bad = history.filter((h) => !h.correct).map((h) => h.level);
  const best = ok.length ? Math.max(...ok) : -1;
  let level, mastery;
  if (best === -1) { level = Math.max(0, Math.min(...bad) - 1); mastery = 40; } // alleen fout: schatting één groep lager dan de foute som
  else if (best === 3) { level = 3; mastery = 70; }
  else if (bad.some((l) => l === best + 1)) { level = best; mastery = 60; }
  else { level = best; mastery = 50; }
  if (bad.some((l) => l <= best)) mastery -= 15; // wisselvallig
  // maar 1-2 sommen per onderdeel: de eerste 8 sommen daarna stellen het niveau sneller bij
  return { ...DEFAULT_SKILL(cat), level, mastery, attempts: history.length, correct: ok.length, calib: 8 };
}

// ---------- probleemonderdelen ----------
export async function getStruggling(skills) {
  const out = [];
  for (const s of skills) {
    if (skillScore(s) >= 50) continue;
    const snaps = (await q('SELECT score FROM skill_snapshots WHERE cat=$1 ORDER BY day DESC LIMIT 4', [s.cat])).rows.map((r) => r.score);
    const recent = (await q('SELECT correct FROM attempts WHERE cat=$1 ORDER BY id DESC LIMIT 8', [s.cat])).rows;
    const stuck = snaps.length >= 4 && snaps[0] - snaps[3] < 5;
    const failing = recent.length >= 8 && recent.filter((r) => r.correct).length <= 3;
    if (stuck || failing || s.scaffold > 0) out.push(s.cat);
  }
  return out;
}

export async function snapshotSkills() {
  const day = todayNL();
  for (const s of await getSkills()) {
    await q(`INSERT INTO skill_snapshots(day, cat, score) VALUES ($1,$2,$3) ON CONFLICT (day, cat) DO UPDATE SET score = $3`, [day, s.cat, skillScore(s)]);
  }
}

// ---------- verdeling van de dagelijkse sommen ----------
// Het lesplan van Max controleren en toepassen. Vangnet: niveau max 1 stap anders dan nu,
// aantallen kloppen precies, onbekende onderdelen genegeerd. Geeft null bij een onbruikbaar plan.
export function applyPlan(skills, plan, n) {
  if (!plan || !Array.isArray(plan.onderdelen)) return null;
  const byCat = Object.fromEntries(skills.map((s) => [s.cat, s]));
  const items = [];
  for (const o of plan.onderdelen) {
    const s = byCat[o?.cat];
    if (!s || items.some((x) => x.cat === o.cat)) continue;
    const wanted = Number.isFinite(Number(o.niveau)) ? Math.round(Number(o.niveau)) : s.level;
    const level = Math.max(0, Math.min(3, Math.max(s.level - 1, Math.min(s.level + 1, wanted))));
    const count = Math.max(0, Math.min(6, Math.round(Number(o.aantal) || 0)));
    items.push({ cat: o.cat, level, count, note: String(o.notitie || '').slice(0, 160) });
  }
  if (items.length < 5) return null;
  // aantallen precies op n zetten
  let sum = items.reduce((a, b) => a + b.count, 0);
  if (sum === 0) return null;
  if (sum !== n) {
    const scaled = items.map((x) => ({ x, exact: (x.count * n) / sum }));
    scaled.forEach((o) => (o.x.count = Math.min(6, Math.floor(o.exact))));
    let left = n - items.reduce((a, b) => a + b.count, 0);
    const order = scaled.sort((a, b) => (b.exact % 1) - (a.exact % 1) || skillScore(byCat[a.x.cat]) - skillScore(byCat[b.x.cat]));
    for (let guard = 0; left > 0 && guard < 200; guard++) for (const o of order) { if (left <= 0) break; if (o.x.count < 6) { o.x.count++; left--; } }
    sum = items.reduce((a, b) => a + b.count, 0);
    if (sum !== n) return null;
  }
  return {
    message: String(plan.bericht || '').slice(0, 600),
    items,
    alloc: Object.fromEntries(items.filter((x) => x.count > 0).map((x) => [x.cat, x.count])),
  };
}

export function allocate(skills, n, struggling = []) {
  const weights = skills.map((s) => {
    const score = skillScore(s);
    let w = Math.pow((100 - score) / 100, 1.5) + 0.03;
    if (struggling.includes(s.cat)) w *= 1.3;
    return { cat: s.cat, w, score };
  });
  const sum = weights.reduce((a, b) => a + b.w, 0);
  const CAP = Math.max(3, Math.ceil(n * 0.3));
  const alloc = weights.map((x) => ({ ...x, n: Math.min(CAP, Math.floor((n * x.w) / sum)), rem: ((n * x.w) / sum) % 1 }));
  let left = n - alloc.reduce((a, b) => a + b.n, 0);
  const order = [...alloc].sort((a, b) => b.rem - a.rem || a.score - b.score);
  for (let guard = 0; left > 0 && guard < 500; guard++) {
    for (const x of order) { if (left <= 0) break; if (x.n < CAP) { x.n++; left--; } }
  }
  const zero = alloc.filter((x) => x.n === 0);
  if (zero.length && n >= 10) {
    for (const z of shuffle(zero).slice(0, 2)) {
      const donor = [...alloc].sort((a, b) => b.n - a.n)[0];
      if (donor.n > 2) { donor.n--; z.n++; }
    }
  }
  // inregelen: onderdelen waarvan het niveau nog een schatting is, komen in de eerste dagen allemaal even langs
  const calibrating = alloc.filter((x) => x.n === 0 && (skills.find((s) => s.cat === x.cat)?.calib || 0) > 0);
  for (const z of shuffle(calibrating).slice(0, 4)) {
    const donor = [...alloc].sort((a, b) => b.n - a.n)[0];
    if (donor.n > 2) { donor.n--; z.n++; }
  }
  return Object.fromEntries(alloc.filter((x) => x.n > 0).map((x) => [x.cat, x.n]));
}

// Volgorde van onderdelen: door elkaar, beginnen met een sterk onderdeel.
export function buildPlan(skills, alloc) {
  const byCat = Object.fromEntries(skills.map((s) => [s.cat, s]));
  const buckets = Object.entries(alloc).map(([cat, k]) => Array(k).fill(cat));
  buckets.sort((a, b) => skillScore(byCat[b[0]]) - skillScore(byCat[a[0]]));
  const first = buckets[0].shift();
  const rest = [];
  const pool = shuffle(buckets.filter((b) => b.length));
  let last = first;
  while (pool.some((b) => b.length)) {
    pool.sort((a, b) => b.length - a.length);
    const b = pool.find((x) => x.length && x[0] !== last) || pool.find((x) => x.length);
    last = b.shift();
    rest.push(last);
  }
  return [first, ...rest];
}

// ---------- de volgende som kiezen (live bijsturen) ----------
// state: { easy, streak, wrongStreak, retry: {cat, level} | null }
export function nextQuestion(session, skills) {
  const i = session.questions.length;
  const byCat = Object.fromEntries(skills.map((s) => [s.cat, s]));
  const st = session.state || {};

  if (session.kind === 'intake') {
    const cat = session.plan[i] === '*' ? intakeExtraCat(session) : session.plan[i];
    const history = session.questions.map((qq, k) => ({ cat: qq.cat, level: qq.level, correct: session.results[k]?.correct })).filter((h) => h.cat === cat);
    const qq = generate(cat, intakeLevel(history, session.state?.startLevel ?? 2));
    qq.noHelp = true; // starttoets: eerlijk meten, geen tussenstappen
    return qq;
  }

  const strongest = [...skills].sort((a, b) => skillScore(b) - skillScore(a))[0];
  const done = session.results.length;
  const rate = done ? session.results.filter((r) => r.correct).length / done : 1;
  let qq;

  if (st.retry) {
    // herkansing: zelfde soort som, nieuwe getallen, samen stap voor stap
    qq = generate(st.retry.cat, st.retry.level);
    qq.retry = true;
    qq.suggestGuide = true;
  } else if (st.wrongStreak === 2 || (i === session.total - 1 && rate < 0.6 && done > 3)) {
    // twee keer fout op rij, of laatste som van een zware sessie: iets wat zeker lukt
    qq = generate(strongest.cat, Math.max(0, strongest.level - 1));
    qq.booster = true;
  } else {
    // planwijzer: herkansingen en opstekers schuiven het plan op, ze slaan niets over
    const p = st.planIdx || 0;
    const item = session.plan[p] || session.plan[p % session.plan.length] || strongest.cat;
    // opwarmer: snelle tafelsom (automatiseren); meet ook of tafels vlot gaan of uitgeteld worden
    if (item === 'warmup') {
      const [mul, div] = warmupCats(), wc = Math.random() < 0.7 ? mul : div;
      let wq;
      for (let k = 0; k < 12; k++) { wq = generate(wc, Math.min(1, byCat[wc]?.level ?? 1)); if (wq.text.length < 30) break; }
      wq.warmup = true; wq.fromPlan = true;
      return wq;
    }
    // herhaling uit het foutenschrift: dezelfde soort som als die eerder misging
    if (typeof item === 'string' && item.startsWith('review:')) {
      const r = (st.reviews || [])[Number(item.slice(7))];
      if (r && byCat[r.cat]) {
        const rq = generateLike(r.cat, Math.min(r.level, byCat[r.cat].level + 1), r.shape);
        rq.review = true; rq.reviewId = r.id; rq.fromPlan = true;
        return rq;
      }
    }
    const cat = item.startsWith?.('review:') ? strongest.cat : item;
    const s = byCat[cat];
    let level = s.level;
    let suggest = (s.scaffold || 0) > 0;
    if (st.easy && level > 0) { level -= 1; suggest = true; }
    qq = generate(cat, level);
    qq.suggestGuide = suggest && qq.guide.length > 0;
    qq.fromPlan = true;
    // eerste keer op dit niveau: eerst voordoen (uitgewerkt voorbeeld), dan samen, dan zelf
    // (alleen bij een nieuw niveau of een zwak onderdeel, en max. 2 per sessie: niet te druk)
    const exLevel = s.ex_level ?? -1;
    const needsExample = (exLevel !== -1 && exLevel !== level) || (exLevel === -1 && skillScore(s) < 50);
    if (session.kind !== 'intake' && needsExample && qq.guide.length && session.questions.filter((x) => x.example).length < 2) {
      const ex = generateLike(cat, level, qq.shape, qq.text);
      qq.example = { text: ex.text, steps: ex.steps, display: ex.display, visual: ex.visual || null, options: ex.options || null };
      qq.suggestGuide = true;
    }
  }
  return qq;
}

// Werk de sessie-toestand bij na een antwoord.
export function updateState(session, qq, correct) {
  const st = { streak: 0, wrongStreak: 0, easy: false, retry: null, ...(session.state || {}) };
  st.streak = correct ? st.streak + 1 : 0;
  st.wrongStreak = correct ? 0 : st.wrongStreak + 1;
  st.best = Math.max(st.best || 0, st.streak);
  // herkansing alleen na een fout, niet na een mislukte herkansing en niet in de starttoets
  st.retry = !correct && !qq.retry && !qq.booster && session.kind !== 'intake' && qq.guide.length ? { cat: qq.cat, level: qq.level } : null;
  if (qq.fromPlan) st.planIdx = (st.planIdx || 0) + 1;
  // "rustig aan"-modus: laatste 4 antwoorden minder dan de helft goed
  const last = [...session.results.slice(-3).map((r) => r.correct), correct];
  const wasEasy = st.easy;
  if (last.length >= 4) st.easy = last.filter(Boolean).length < 2;
  // rustige modus (zelfvertrouwen kwetsbaar): al bij 2 fout van de laatste 3 een tandje terug
  if (st.adapt?.calm && last.length >= 3 && last.slice(-3).filter((x) => !x).length >= 2) st.easy = true;
  if (wasEasy && st.streak >= 3) st.easy = false;
  st.easyChanged = st.easy !== wasEasy ? (st.easy ? 'on' : 'off') : null;
  return st;
}

// ---------- beloning per som ----------
// Basis = max centen / aantal sommen. Tussenstappen: eerste 5 keer (per onderdeel) gewoon,
// daarna de helft. Kiest hij daarna "helemaal zelf": 5 keer dubbel, daarna gewoon.
export function rewardFor(qq, skill, correct) {
  if (!correct) return { mult: 0, kind: 'none' };
  if (qq.guided) {
    if ((skill.guided_wins || 0) < FREE_GUIDED) return { mult: 1, kind: 'guided-free' };
    return { mult: 0.5, kind: 'guided-half' };
  }
  if (qq.chose === 'solo' && (skill.solo_bonus || 0) < SOLO_BONUS) return { mult: 2, kind: 'solo-double' };
  return { mult: 1, kind: 'normal' };
}

// Wat er rond een som te kiezen valt (voor de client).
export function helpOffer(qq, skill) {
  if (qq.noHelp || !qq.guide?.length) return { mode: 'none' };
  const free = (skill.guided_wins || 0) < FREE_GUIDED;
  const bonusLeft = Math.max(0, SOLO_BONUS - (skill.solo_bonus || 0));
  if (qq.suggestGuide && free) return { mode: 'auto', freeLeft: FREE_GUIDED - (skill.guided_wins || 0) };
  if (qq.suggestGuide && !free) return { mode: 'choose', bonusLeft, transition: !skill.transition_seen };
  return { mode: 'optional', free, freeLeft: Math.max(0, FREE_GUIDED - (skill.guided_wins || 0)) };
}

// ---------- badges ----------
export const BADGES = {
  start: { icon: '🚀', title: 'Gestart!', text: 'Je hebt de starttoets gedaan.' },
  dag1: { icon: '✏️', title: 'Eerste dagtaak', text: 'Je eerste dagtaak is af.' },
  reeks3: { icon: '🔥', title: '3 dagen op rij', text: 'Drie schooldagen achter elkaar geoefend.' },
  reeks5: { icon: '🔥', title: 'Hele week!', text: 'Vijf schooldagen op rij.' },
  reeks10: { icon: '🌋', title: '10 dagen op rij', text: 'Twee weken volgehouden!' },
  rij5: { icon: '⚡', title: '5 op rij', text: 'Vijf sommen achter elkaar goed.' },
  rij10: { icon: '⚡⚡', title: '10 op rij', text: 'Tien sommen achter elkaar goed!' },
  omhoog: { icon: '⬆️', title: 'Niveau omhoog', text: 'Je bent bij een onderdeel een niveau gestegen.' },
  opstap: { icon: '🪜', title: 'Klimmer', text: 'Van het laagste niveau omhoog geklommen!' },
  sterk: { icon: '💪', title: 'Sterk!', text: 'Een onderdeel staat op "Sterk".' },
  comeback: { icon: '🦸', title: 'Weer op dreef', text: 'Eerst fout, daarna de herkansing goed.' },
  zelf: { icon: '🎯', title: 'Zelf gedaan', text: 'Je koos "helemaal zelf" en had het goed.' },
  perfect: { icon: '🏆', title: 'Foutloos', text: 'Een hele dagtaak zonder fouten.' },
  record: { icon: '📈', title: 'Nieuw record', text: 'Meer sommen goed dan ooit in een dagtaak.' },
  doorzetter: { icon: '🧗', title: 'Doorzetter', text: 'Een lastige dag, maar je hebt hem afgemaakt.' },
  stappen: { icon: '🪄', title: 'Stappenmeester', text: '10 sommen goed met tussenstappen.' },
  week: { icon: '📅', title: 'Weekbonus', text: 'Alle vijf dagtaken van een week af.' },
  doel: { icon: '🎯', title: 'Spaardoel gehaald', text: 'Genoeg gespaard voor je doel!' },
  uitlegger: { icon: '🗣️', title: 'Uitlegger', text: 'Je hebt uitgelegd hoe jij een som oplost.' },
};
export async function awardBadge(id, client = { query: q }) {
  if (!BADGES[id]) return null;
  const r = await client.query('INSERT INTO badges(id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id', [id]);
  return r.rowCount ? { id, ...BADGES[id], title: ts(BADGES[id].title), text: ts(BADGES[id].text) } : null;
}
export async function getBadges() {
  const got = Object.fromEntries((await q('SELECT id, earned_at FROM badges')).rows.map((r) => [r.id, r.earned_at]));
  return Object.entries(BADGES).map(([id, b]) => ({ id, ...b, title: ts(b.title), text: ts(b.text), earned: !!got[id], earned_at: got[id] || null }));
}

export const catLabel = (cat) => catById[cat]?.label || cat;
