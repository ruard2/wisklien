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

// Enkelvoud na "1" (meetlat #6/#7: "1 dele is ingekleur", "1 honderdtallen", "1 tiendes"). Op alle teksten van een som
// toegepast, zodat sjablonen gewoon `${n} tienden` mogen schrijven en het toch klopt bij n = 1.
const EV = {
  nl: { graden: 'graad', kwartslagen: 'kwartslag', stappen: 'stap', sprongen: 'sprong', minuten: 'minuut', uren: 'uur', meters: 'meter', tienden: 'tiende', honderdsten: 'honderdste', duizendsten: 'duizendste', delen: 'deel', stukken: 'stuk', kinderen: 'kind', groepjes: 'groepje', eenheden: 'eenheid', tientallen: 'tiental', honderdtallen: 'honderdtal', duizendtallen: 'duizendtal', tienduizendtallen: 'tienduizendtal' },
  af: { grade: 'graad', kwartdraaie: 'kwartdraai', stappe: 'stap', spronge: 'sprong', minute: 'minuut', ure: 'uur', heelgetalle: 'heelgetal', dele: 'deel', tiendes: 'tiende', honderdstes: 'honderdste', duisendstes: 'duisendste', tiene: 'tien', honderde: 'honderd', duisende: 'duisend', tienduisende: 'tienduisend', stukke: 'stuk', groepe: 'groep', kinders: 'kind' },
};
export function enkelvoud(text, lang = 'nl') {
  if (typeof text !== 'string') return text;
  const m = EV[lang] || EV.nl;
  return text.replace(new RegExp(`(?<![\\d,.])1 (${Object.keys(m).join('|')})\\b`, 'g'), (x, w) => `1 ${m[w]}`);
}
export function enkelvoudSom(q, lang = 'nl') {
  const f = (t) => enkelvoud(t, lang);
  q.text = f(q.text);
  q.steps = (q.steps || []).map(f);
  for (const s of q.guide || []) { s.ask = f(s.ask); s.tip = f(s.tip); if (s.options) s.options = s.options.map(f); }
  q.guideFinal = f(q.guideFinal);
  for (const w of q.wrong || []) { w.label = f(w.label); w.fix = f(w.fix); }
  return q;
}

// Zinloze "× 1"-stappen weghalen (meetlat #8: "Dan 1/8 deel: 1 × 11 = 11", "Sem krijgt 1 deel: 1 × 8 = 8"). Geldt voor
// alle sjablonen: "1 × 8 = 8" in een stap wordt gewoon "8"; een tussenstap die alleen "1 × 50 = ?" vraagt, valt weg als er
// nog andere tussenstappen zijn. Behalve als de som zelf over × 1 gaat (tafel van 1).
const G = String.raw`\d+(?:[  ]\d{3})*(?:,\d+)?`;
// Niet bij delen/keersommen/optellen/geld: daar is "1 × 7" een echte hap of het eenheden-stuk van een splitsing (kaartcheck #15).
const EEN_KEER_NIET = /^(delen|deling|vermenigvuldigen|vermenigvuldig|optellen|optel|kommagetallen|desimale|finansies)$/;
export function zonderEenKeer(q) {
  if (EEN_KEER_NIET.test(q.cat || '')) return q;
  const somGaatErOver = /(?<![\d,.])1 ×|× 1(?![\d,])/.test(q.text || '');
  if (somGaatErOver) return q;
  const weg = (t) => (typeof t !== 'string' ? t : t.replace(new RegExp(`(?<![\\d,.])1 × (${G}) = (${G})`, 'g'), (m, a, b) => (a === b ? b : m)).replace(new RegExp(`(?<![\\d,.])(${G}) × 1 = (${G})(?![\\d,])`, 'g'), (m, a, b) => (a === b ? b : m)));
  q.steps = (q.steps || []).map(weg).filter((s) => !/^\s*[\d  ,]+\s*(?:[a-zA-Z€°]*\.?)\s*$/.test(s) || (q.steps || []).length <= 1);
  const triviaal = (s) => s.type === 'number' && new RegExp(`(?<![\\d,.])1 × ${G}\\s*=\\s*\\?|(?<![\\d,.])${G} × 1\\s*=\\s*\\?`).test(s.ask);
  if ((q.guide || []).some(triviaal)) { q.guide = q.guide.filter((s) => !triviaal(s)); if (!q.guide.length) q.guideFinal = null; }
  if (typeof q.guideFinal === 'string') q.guideFinal = q.guideFinal.replace(new RegExp(`\\s*[:=]\\s*(?:1 × ${G}|${G} × 1)\\s*$`), '');
  return q;
}

// Breuk-sommen: eindigt het stappenplan op een breuk die nog kleiner kan, terwijl het antwoord vereenvoudigd is, dan komt
// er een stap "Vereenvoudig" bij (kaartcheck AF: "6/9" terwijl het antwoord 2/3 is). Gemengde getallen ook ("3 2/4").
export function vereenvoudigStap(q, lang = 'nl') {
  if (q.type !== 'fraction' || !(q.steps || []).length) return q;
  const last = q.steps.at(-1);
  if (/vereenvoudig|zo klein|eenvoudig|allebei goed|albei is reg|hetzelfde als|dieselfde as/i.test(last)) return q;
  const m = [...String(last).matchAll(/(?:(\d+)\s+)?(\d+)\/(\d+)/g)].at(-1);
  if (!m) return q;
  const w = m[1] ? Number(m[1]) : 0, a = Number(m[2]), b = Number(m[3]), g = gcd(a, b);
  if (g <= 1) return q;
  const kort = `${w ? `${w} ` : ''}${a / g}/${b / g}`.replace(/ 1\/1$/, '').replace(/^(\d+)\/1$/, '$1');
  q.steps.push(lang === 'af'
    ? `Vereenvoudig: deel teller en noemer deur ${g}: ${m[0]} = ${b / g === 1 ? w + a / g : kort}.`
    : `Maak de breuk zo klein mogelijk: deel boven en onder door ${g}: ${m[0]} = ${b / g === 1 ? w + a / g : kort}.`);
  return q;
}
