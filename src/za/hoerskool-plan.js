// Persoonlike oefenplan vir die Afrikaanse Graad 8–12-ervaring.
// Hierdie module bereken volume en tempo. Dit voorspel nooit 'n skoolpunt nie:
// aantal pogings is nie dieselfde as bemeestering nie.

export const HOERSKOOL_DOELWITTE = Object.freeze(['bybly', 'gapings', 'toets', 'punt', 'jaarplan']);
export const HOERSKOOL_AFRIGTERMODUSSE = Object.freeze(['gesels', 'stil', 'toets']);
export const HOERSKOOL_TEMAS = Object.freeze(['donker', 'lig']);
export const HOERSKOOL_DAGDOELWITTE = Object.freeze([15, 20, 25, 30, 40]);

export const HOERSKOOL_PLAN_STANDAARD = Object.freeze({
  aim: 'bybly',
  targetDate: '',
  days: [1, 2, 3, 4, 5],
  dailyGoal: 30,
  startTarget: 15,
  gradualBuild: true,
  coachMode: 'gesels',
  theme: 'donker',
  createdAt: '',
});

const isoDate = (value) => {
  const raw = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(`${raw}T12:00:00Z`)) ? raw : '';
};
const uniqueDays = (value, fallback) => {
  const out = [...new Set((Array.isArray(value) ? value : []).map(Number))]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6).sort();
  return out.length ? out : [...fallback];
};

export function skoonHoerskoolPlan(value = {}, base = HOERSKOOL_PLAN_STANDAARD) {
  const old = { ...HOERSKOOL_PLAN_STANDAARD, ...(base || {}) };
  const aim = HOERSKOOL_DOELWITTE.includes(value.aim) ? value.aim : old.aim;
  const dailyGoal = HOERSKOOL_DAGDOELWITTE.includes(Number(value.dailyGoal)) ? Number(value.dailyGoal) : old.dailyGoal;
  const requestedStart = HOERSKOOL_DAGDOELWITTE.includes(Number(value.startTarget)) ? Number(value.startTarget) : old.startTarget;
  const created = isoDate(value.createdAt) || isoDate(old.createdAt) || new Date().toISOString().slice(0, 10);
  return {
    aim,
    targetDate: value.targetDate === undefined ? isoDate(old.targetDate) : isoDate(value.targetDate),
    days: uniqueDays(value.days, old.days),
    dailyGoal,
    startTarget: Math.min(requestedStart, dailyGoal),
    gradualBuild: value.gradualBuild === undefined ? old.gradualBuild !== false : value.gradualBuild !== false,
    coachMode: HOERSKOOL_AFRIGTERMODUSSE.includes(value.coachMode) ? value.coachMode : old.coachMode,
    theme: HOERSKOOL_TEMAS.includes(value.theme) ? value.theme : old.theme,
    createdAt: created,
  };
}

const daysBetween = (a, b) => Math.max(0, Math.floor((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5));
const mondayOf = (date) => {
  const d = new Date(`${date}T12:00:00Z`), dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return d.toISOString().slice(0, 10);
};

export function huidigeDagdoel(plan, today = new Date().toISOString().slice(0, 10)) {
  const p = skoonHoerskoolPlan(plan);
  if (!p.gradualBuild || p.startTarget >= p.dailyGoal) return p.dailyGoal;
  const week = Math.floor(daysBetween(p.createdAt, today) / 7);
  const ramp = [15, 20, 25, 30, 40].filter((n) => n >= p.startTarget && n <= p.dailyGoal);
  return ramp[Math.min(week, ramp.length - 1)] || p.dailyGoal;
}

const dateOfAttempt = (item) => {
  const raw = String(item?.at || '');
  if (!raw.includes('T')) return raw.slice(0, 10);
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw.slice(0, 10) : new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(parsed);
};
export function maakHoerskoolPaneel({ plan, progress = {}, nodes = [], today = new Date().toISOString().slice(0, 10) }) {
  const p = skoonHoerskoolPlan(plan);
  const all = Object.values(progress).flatMap((row) => Array.isArray(row?.history) ? row.history : []);
  const todayItems = all.filter((item) => dateOfAttempt(item) === today);
  const weekStart = mondayOf(today);
  const weekItems = all.filter((item) => dateOfAttempt(item) >= weekStart && dateOfAttempt(item) <= today);
  const targetToday = huidigeDagdoel(p, today);
  const targetWeek = targetToday * p.days.length;
  const attemptsToday = todayItems.length;
  const correctToday = todayItems.filter((item) => item.correct).length;
  const attemptsWeek = weekItems.length;
  const remainingToday = Math.max(0, targetToday - attemptsToday);
  const completeNodes = nodes.filter((node) => node.progress?.checkpointPassed).length;
  const plannedPerWeek = p.dailyGoal * p.days.length;
  const weeksToTarget = p.targetDate && p.targetDate >= today ? Math.max(1, Math.ceil(daysBetween(today, p.targetDate) / 7)) : null;
  const targetAttempts = weeksToTarget == null ? null : plannedPerWeek * weeksToTarget;
  const phase = attemptsToday < 5 ? 'herroep'
    : attemptsToday < Math.round(targetToday * 0.67) ? 'huidig'
      : attemptsToday < Math.round(targetToday * 0.84) ? 'herstel' : 'gemeng';
  return {
    today,
    targetToday,
    attemptsToday,
    correctToday,
    accuracyToday: attemptsToday ? Math.round((100 * correctToday) / attemptsToday) : null,
    remainingToday,
    targetWeek,
    attemptsWeek,
    plannedPerWeek,
    fourWeekAttempts: plannedPerWeek * 4,
    tenWeekAttempts: plannedPerWeek * 10,
    targetAttempts,
    weeksToTarget,
    phase,
    phaseLabel: { herroep: 'Herroep vorige werk', huidig: 'Bou die huidige onderwerp', herstel: 'Herstel onlangse foute', gemeng: 'Gemengde oordrag' }[phase],
    completeNodes,
    totalNodes: nodes.length,
    note: 'Oefenvolume is nie ’n voorspelling van ’n skoolpunt nie. Die app volg ook metodegebruik, korrektheid, onafhanklikheid en oordrag.',
  };
}

export function kiesVandagKnoop(nodes = [], progress = {}, panel = {}) {
  const unlocked = nodes.filter((node) => node.pathPrerequisiteIds
    .filter((id) => nodes.some((x) => x.id === id))
    .every((id) => nodes.find((x) => x.id === id)?.progress?.checkpointPassed));
  const unfinished = unlocked.filter((node) => !node.progress?.checkpointPassed);
  const completed = unlocked.filter((node) => node.progress?.checkpointPassed);
  const withErrors = unlocked.filter((node) => (progress[node.id]?.history || []).some((item) => !item.correct));
  const pool = panel.phase === 'herroep' && completed.length ? completed
    : panel.phase === 'herstel' && withErrors.length ? withErrors
      : panel.phase === 'gemeng' ? unlocked
        : unfinished.length ? unfinished : unlocked;
  if (!pool.length) return nodes[0] || null;
  return pool[Number(panel.attemptsToday || 0) % pool.length];
}

export function skoonHoerskoolBeloning(value = {}, base = {}) {
  const old = { enabled: false, condition: 'weekplan', description: '', ...(base || {}) };
  return {
    enabled: value.enabled === undefined ? old.enabled === true : value.enabled === true,
    condition: ['weekplan', 'konsekwentheid', 'herstel', 'toetsplan'].includes(value.condition) ? value.condition : old.condition,
    description: String(value.description === undefined ? old.description : value.description || '').trim().slice(0, 120),
  };
}
