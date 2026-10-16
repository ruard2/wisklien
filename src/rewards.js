// Beloning en weekplan per kind, door de ouder in te stellen (alles optioneel; anders de standaard).
// Bedragen in centen (of sent): 0 = geen geld, het kind oefent dan alleen voor badges en verrassingen.
import { getSetting } from './db.js';

export const REWARD_DEFAULTS = {
  dailyCents: 50, // voor een afgemaakte dagtaak (voor de moeite, niet per goed antwoord)
  intakeCents: 100, // voor de afgemaakte starttoets
  weekBonusCents: 25, // als alle dagtaken van de week af zijn
  dailyCount: 20, // sommen per dagtaak
  days: [1, 2, 3, 4, 5], // dagen met een dagtaak (0 = zondag … 6 = zaterdag)
  goalGift: '', // cadeau van de ouder als het kind een eigen oefendoel haalt (leeg = geen)
  levelEvery: 10, // om de hoeveel levels (van 20 sommen) een beloning (0 = geen)
  levelGift: '', // die beloning, door de ouder gekozen (leeg = alleen een feestje)
};
export const DAILY_COUNTS = [10, 15, 20, 25, 30];
export const LEVEL_EVERY = [0, 5, 10, 20];

export async function rewardCfg() {
  return { ...REWARD_DEFAULTS, ...(await getSetting('reward_cfg', {})) };
}

const cents = (v, max) => {
  const n = Math.round(Number(String(v ?? '').replace(',', '.')));
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
};
// Controleert wat de ouder invult. Ontbrekende velden houden de oude/standaard waarde.
export function cleanRewards(b = {}, base = REWARD_DEFAULTS) {
  const out = { ...base };
  for (const [k, max] of [['dailyCents', 1000], ['intakeCents', 2000], ['weekBonusCents', 2000]]) {
    if (b[k] == null || b[k] === '') continue;
    const v = cents(b[k], max);
    if (v == null) return { error: 'amount' };
    out[k] = v;
  }
  if (b.dailyCount != null && b.dailyCount !== '') {
    const n = Number(b.dailyCount);
    if (!DAILY_COUNTS.includes(n)) return { error: 'count' };
    out.dailyCount = n;
  }
  if (b.goalGift != null) out.goalGift = String(b.goalGift).trim().slice(0, 60);
  if (b.levelGift != null) out.levelGift = String(b.levelGift).trim().slice(0, 60);
  if (b.levelEvery != null && b.levelEvery !== '') {
    const n = Number(b.levelEvery);
    if (!LEVEL_EVERY.includes(n)) return { error: 'count' };
    out.levelEvery = n;
  }
  if (b.days != null) {
    const d = [...new Set((Array.isArray(b.days) ? b.days : []).map(Number))].filter((x) => Number.isInteger(x) && x >= 0 && x <= 6).sort();
    if (!d.length) return { error: 'days' };
    out.days = d;
  }
  return { cfg: out };
}

// ---------- weekplan ----------
const dow = (d) => new Date(d + 'T12:00:00Z').getUTCDay();
const addDays = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
export const isTaskDay = (cfg, d) => cfg.days.includes(dow(d));
// de dagtaak-dagen van de week (maandag t/m zondag) waarin d valt
export function taskWeek(cfg, d) {
  const w = dow(d), monday = addDays(d, w === 0 ? -6 : 1 - w);
  return [0, 1, 2, 3, 4, 5, 6].map((k) => addDays(monday, k)).filter((x) => isTaskDay(cfg, x));
}
export function nextTaskDay(cfg, d) {
  let x = addDays(d, 1);
  for (let i = 0; i < 7 && !isTaskDay(cfg, x); i++) x = addDays(x, 1);
  return x;
}
