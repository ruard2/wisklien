// Leerlogica: intake, beheersing per categorie, verdeling van de dagelijkse 20 sommen.
import { q, one } from './db.js';
import { CATEGORIES, CAT_IDS, generate } from './generators.js';
import { shuffle, todayNL } from './util.js';

export const INTAKE_POINTS = 100; // centen, alleen voor goede antwoorden
export const DAILY_POINTS = 50;
export const DAILY_COUNT = 20;
export const PRACTICE_COUNT = 10;

// ---------- score per categorie ----------
// level 1..3, mastery 0..100 op dat niveau → één score 0..100 voor de ranglijst
export const skillScore = (s) => Math.round(Math.min(100, (s.level - 1) * 33.34 + s.mastery / 3));
export function skillLabel(score) {
  if (score >= 85) return 'Sterk';
  if (score >= 60) return 'Goed';
  if (score >= 35) return 'Op weg';
  return 'Oefenen';
}

export async function getSkills() {
  const rows = (await q('SELECT * FROM skills')).rows;
  const byCat = Object.fromEntries(rows.map((r) => [r.cat, r]));
  return CAT_IDS.map((cat) => byCat[cat] || { cat, level: 1, mastery: 40, level_attempts: 0, attempts: 0, correct: 0 });
}

// Na elk antwoord: mastery schuift richting 100 (goed) of 0 (fout).
// Met hints goed telt minder zwaar. Genoeg goed op een niveau → niveau omhoog.
export function updateSkill(s, correct, hints) {
  const alpha = 0.2;
  const target = correct ? (hints > 0 ? 65 : 100) : 0;
  let { level, mastery, level_attempts } = s;
  mastery = mastery + alpha * (target - mastery);
  level_attempts += 1;
  let event = null;
  if (level < 3 && mastery >= 80 && level_attempts >= 6) {
    level += 1; mastery = 50; level_attempts = 0; event = 'up';
  } else if (level > 1 && mastery < 30 && level_attempts >= 5) {
    level -= 1; mastery = 55; level_attempts = 0; event = 'down';
  }
  return { ...s, level, mastery: Math.round(mastery * 10) / 10, level_attempts, attempts: s.attempts + 1, correct: s.correct + (correct ? 1 : 0), event };
}

export async function saveSkill(s) {
  await q(`INSERT INTO skills(cat, level, mastery, level_attempts, attempts, correct, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6, now())
           ON CONFLICT (cat) DO UPDATE SET level=$2, mastery=$3, level_attempts=$4, attempts=$5, correct=$6, updated_at=now()`,
  [s.cat, s.level, s.mastery, s.level_attempts, s.attempts, s.correct]);
}

// ---------- intake ----------
// 13 categorieën × 3 niveaus = 39 sommen. Eerst alle makkelijke, dan 1F, dan 1S.
export function buildIntake() {
  const out = [];
  for (const level of [1, 2, 3]) out.push(...shuffle(CAT_IDS).map((cat) => generate(cat, level)));
  return out;
}

// Startniveau per categorie uit de intake-resultaten.
export function skillFromIntake(cat, byLevel) {
  const [c1, c2, c3] = [1, 2, 3].map((l) => byLevel[l]);
  let level, mastery;
  if (c1 && c2 && c3) { level = 3; mastery = 70; }
  else if (c1 && c2) { level = 2; mastery = 55; }
  else if (c1) { level = 1; mastery = 60; }
  else if (c2 || c3) { level = 1; mastery = 45; }
  else { level = 1; mastery = 20; }
  return { cat, level, mastery, level_attempts: 0, attempts: 3, correct: [c1, c2, c3].filter(Boolean).length };
}

// ---------- probleemcategorieën ----------
// "Blijft hij slecht gaan": score laag én geen vooruitgang over 3 oefendagen,
// of de laatste 8 pogingen bijna allemaal fout.
export async function getStruggling(skills) {
  const out = [];
  for (const s of skills) {
    const score = skillScore(s);
    if (score >= 50) continue;
    const snaps = (await q('SELECT score FROM skill_snapshots WHERE cat=$1 ORDER BY day DESC LIMIT 4', [s.cat])).rows.map((r) => r.score);
    const recent = (await q('SELECT correct FROM attempts WHERE cat=$1 ORDER BY id DESC LIMIT 8', [s.cat])).rows;
    const stuck = snaps.length >= 4 && snaps[0] - snaps[3] < 5;
    const failing = recent.length >= 8 && recent.filter((r) => r.correct).length <= 3;
    if (stuck || failing) out.push(s.cat);
  }
  return out;
}

export async function snapshotSkills() {
  const day = todayNL();
  for (const s of await getSkills()) {
    await q(`INSERT INTO skill_snapshots(day, cat, score) VALUES ($1,$2,$3)
             ON CONFLICT (day, cat) DO UPDATE SET score = $3`, [day, s.cat, skillScore(s)]);
  }
}

// ---------- verdeling van de dagelijkse sommen ----------
// Zwakke categorieën krijgen meer sommen; sterke krijgen er minder (soms 0, ter onderhoud af en toe 1).
export function allocate(skills, n, struggling = []) {
  const weights = skills.map((s) => {
    const score = skillScore(s);
    let w = Math.pow((100 - score) / 100, 1.5) + 0.03;
    if (struggling.includes(s.cat)) w *= 1.3;
    return { cat: s.cat, w, score };
  });
  const sum = weights.reduce((a, b) => a + b.w, 0);
  const CAP = Math.max(3, Math.ceil(n * 0.3));
  let alloc = weights.map((x) => ({ ...x, n: Math.min(CAP, Math.floor((n * x.w) / sum)), rem: ((n * x.w) / sum) % 1 }));
  let left = n - alloc.reduce((a, b) => a + b.n, 0);
  // restplekken: eerst grootste rest, dan zwakste categorie
  const order = [...alloc].sort((a, b) => b.rem - a.rem || a.score - b.score);
  let guard = 0;
  while (left > 0 && guard++ < 500) {
    for (const x of order) {
      if (left <= 0) break;
      if (x.n < CAP) { x.n++; left--; }
    }
  }
  // onderhoud: zorg dat minstens 2 sterke categorieën af en toe langskomen
  const zero = alloc.filter((x) => x.n === 0);
  if (zero.length && n >= 10) {
    for (const z of shuffle(zero).slice(0, 2)) {
      const donor = [...alloc].sort((a, b) => b.n - a.n)[0];
      if (donor.n > 2) { donor.n--; z.n++; }
    }
  }
  return Object.fromEntries(alloc.filter((x) => x.n > 0).map((x) => [x.cat, x.n]));
}

// Sommen maken op het niveau van elke categorie, door elkaar (interleaving),
// en beginnen met een sterke categorie voor een goed gevoel.
export function buildSession(skills, alloc) {
  const byCat = Object.fromEntries(skills.map((s) => [s.cat, s]));
  const buckets = Object.entries(alloc).map(([cat, k]) => {
    const s = byCat[cat];
    return Array.from({ length: k }, (_, i) => {
      // bij een zwakke categorie op niveau >1 af en toe een opstapje van een niveau lager
      const lvl = s.level > 1 && skillScore(s) < 45 && i % 3 === 0 ? s.level - 1 : s.level;
      return generate(cat, lvl);
    });
  });
  buckets.sort((a, b) => skillScore(byCat[b[0].cat]) - skillScore(byCat[a[0].cat]));
  const first = buckets[0].shift();
  const rest = [];
  const pool = shuffle(buckets.filter((b) => b.length));
  let last = first.cat;
  while (pool.some((b) => b.length)) {
    pool.sort((a, b) => b.length - a.length);
    const b = pool.find((x) => x.length && x[0].cat !== last) || pool.find((x) => x.length);
    const item = b.shift();
    rest.push(item);
    last = item.cat;
  }
  return [first, ...rest];
}

export function catMeta(cat) {
  return CATEGORIES.find((c) => c.id === cat);
}
