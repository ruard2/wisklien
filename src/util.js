// Kleine hulpfuncties voor getallen, breuken en Nederlandse notatie.

export const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const gcd = (a, b) => {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
};
export const lcm = (a, b) => (a * b) / gcd(a, b);
export const round = (n, d = 6) => Number(Math.round(Number(n + 'e' + d)) + 'e-' + d);

// Nederlandse notatie: komma als decimaalteken, spatie als duizendtalscheiding (vanaf 10 000).
export function fmt(n, decimals) {
  let v = round(n, 6);
  let s = decimals != null ? v.toFixed(decimals) : String(v);
  if (s.includes('e')) s = v.toFixed(6).replace(/0+$/, '');
  let [int, dec] = s.split('.');
  const neg = int.startsWith('-');
  if (neg) int = int.slice(1);
  if (int.length > 4) int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg ? '−' : '') + int + (dec ? ',' + dec : '');
}
export const euro = (n) => '€ ' + fmt(n, 2);

// Breuken als [teller, noemer]
export const simplify = ([n, d]) => {
  const g = gcd(n, d);
  return [n / g, d / g];
};
export function fracStr([n, d], mixed = true) {
  [n, d] = simplify([n, d]);
  if (d === 1) return String(n);
  if (mixed && n > d) {
    const w = Math.floor(n / d);
    return `${w} ${n - w * d}/${d}`;
  }
  return `${n}/${d}`;
}

// Getallen in woorden (tot miljarden), voor opgaven als "schrijf in cijfers".
const ONES = ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien',
  'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien', 'achttien', 'negentien'];
const TENS = ['', '', 'twintig', 'dertig', 'veertig', 'vijftig', 'zestig', 'zeventig', 'tachtig', 'negentig'];
function words99(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10), u = n % 10;
  if (!u) return TENS[t];
  const unit = ONES[u];
  return unit + (unit.endsWith('e') ? 'ën' : 'en') + TENS[t];
}
function words999(n) {
  const h = Math.floor(n / 100), r = n % 100;
  let s = h === 0 ? '' : h === 1 ? 'honderd' : ONES[h] + 'honderd';
  if (r) s += words99(r);
  return s;
}
export function numberWords(n) {
  if (n === 0) return 'nul';
  const parts = [];
  const mld = Math.floor(n / 1e9), mln = Math.floor((n % 1e9) / 1e6), k = Math.floor((n % 1e6) / 1000), r = n % 1000;
  if (mld) parts.push((mld === 1 ? 'één' : words999(mld)) + ' miljard');
  if (mln) parts.push((mln === 1 ? 'één' : words999(mln)) + ' miljoen');
  let tail = '';
  if (k) tail += k === 1 ? 'duizend' : words999(k) + 'duizend';
  if (r) tail += words999(r);
  if (tail) parts.push(tail);
  return parts.join(' ');
}

// Datum/tijd in Nederland
const TZ = 'Europe/Amsterdam';
// Testklok (alleen met ALLOW_TEST_CLOCK=1): de app laten denken dat het een andere dag is, voor simulaties.
let clockOffsetDays = 0;
export const setTestClock = (days) => { clockOffsetDays = Number(days) || 0; };
const now = () => new Date(Date.now() + clockOffsetDays * 864e5);
export function todayNL(d = now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d); // YYYY-MM-DD
}
export function weekdayNL(d = now()) {
  const w = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(d);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(w); // 0 = zondag
}
export const isSchoolDay = (d = now()) => {
  const w = weekdayNL(d);
  return w >= 1 && w <= 5;
};
export const hhmm = (min) => {
  min = ((min % 1440) + 1440) % 1440;
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
};

// "Dezelfde som": zelfde tekst én zelfde plaatje (bij grafieken en klokken staat het getal vaak alleen in het plaatje)
// en zelfde keuzes. Gebruikt om sommen binnen een week niet te herhalen.
// (sleutels gesorteerd: de database bewaart JSON in een andere volgorde)
const stable = (v) => (Array.isArray(v) ? `[${v.map(stable).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${k}:${stable(v[k])}`).join(',')}}` : JSON.stringify(v ?? null));
export const sumKey = (q) => `${q.text}|${q.visual ? stable(q.visual) : ''}|${q.options ? [...q.options].sort().join('/') : ''}`;

// Herhaalbaar toeval: fn() draait met een vaste reeks "willekeurige" getallen (zaad). Zo maakt de meetlat elke keer
// dezelfde som, maar met de uitleg (stappen, tussenstappen, tips) van de huidige generator. Alles synchroon.
export function metZaad(seed, fn) {
  let a = (Number(seed) >>> 0) || 1;
  const rand = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const orig = Math.random;
  Math.random = rand;
  try { return fn(); } finally { Math.random = orig; }
}
