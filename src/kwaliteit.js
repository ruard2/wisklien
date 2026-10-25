// Kwaliteitspoort voor de vaste uitleg: regels die elke som moet halen (zonder AI, zonder database).
// Gebruikt door de generators (een som die niet door de poort komt, wordt opnieuw gemaakt), door de lint
// (scripts/lint-uitleg.mjs, in npm test) en door de Max-test (rekencontrole op de teksten van Max).
// Elke fout die je met code kunt vangen, hoort hier als regel, zodat hij nooit terugkomt.
import { isVagueTip } from './tips.js';

const fmtNum = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');

// ---------- rekencontrole (code): klopt elk "a op b = c" in een tekst? ----------
// getal: ook een breuk (3/4) of gemengd getal (2 1/4) als één geheel
const NUM = String.raw`(?:€\s?|R\s?)?(?:\d+ \d+/\d+|\d+/\d+|(?:\d{1,3}(?:[.\u00a0\u202f\u2009 ]\d{3})+|\d+)(?:,\d+)?)`;
const OP = String.raw`\s*(?:[+×x·*÷−–-]|\s[:/]\s|\s(?:keer|maal)\s)\s*`;
const EXPR = `${NUM}(?:${OP}${NUM})*`;
const EQ_RE = new RegExp(String.raw`(?<![\d,./€R+×x·*÷−–-]\s?)(?<![\d,.:/])(?<!\s:\s)${EXPR}(?:\s*=\s*${EXPR})+(?![\d:,/]|\s?%|\s+(?:rest|res)\b)`, 'g');
function toNumber(tok) {
  const t = tok.replace(/[€R]/g, '').trim();
  let m;
  if ((m = t.match(/^(\d+) (\d+)\/(\d+)$/))) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  if ((m = t.match(/^(\d+)\/(\d+)$/))) return Number(m[1]) / Number(m[2]);
  let s = t.replace(/[\s\u00a0\u202f\u2009]/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
  return Number(s.replace(',', '.'));
}
function evalExpr(e) {
  const toks = [];
  const re = new RegExp(`(${NUM})|(\\s[:/]\\s|\\s(?:keer|maal)\\s|[+×x·*÷−–-])`, 'g');
  let m;
  while ((m = re.exec(e))) toks.push(m[1] ? { n: toNumber(m[1]) } : { op: m[2].trim() });
  if (!toks.length || toks[0].op) return null;
  const ops = toks.filter((t) => t.op).length + (/\d\/\d/.test(e) ? 1 : 0), opsNoFrac = toks.filter((t) => t.op).length;
  // × en : eerst, dan + en −
  const terms = [];
  let cur = toks[0].n, sign = 1;
  for (let i = 1; i < toks.length; i += 2) {
    const op = toks[i]?.op, n = toks[i + 1]?.n;
    if (op == null || n == null || !Number.isFinite(n)) return null;
    if (['×', 'x', '·', '*', 'keer', 'maal'].includes(op)) cur *= n;
    else if ([':', '÷', '/'].includes(op)) { if (n === 0) return null; cur /= n; }
    else { terms.push(sign * cur); sign = op === '+' ? 1 : -1; cur = n; }
  }
  terms.push(sign * cur);
  return { v: terms.reduce((a, b) => a + b, 0), ops, opsNoFrac };
}
const decimalsOf = (e) => Math.max(0, ...[...e.matchAll(/,(\d+)/g)].map((m) => m[1].length));
export function checkArithmetic(text) {
  const found = [];
  for (const m of String(text || '').matchAll(EQ_RE)) {
    const parts = m[0].split(/\s*=\s*/);
    for (let i = 0; i + 1 < parts.length; i++) {
      const L = evalExpr(parts[i]), R = evalExpr(parts[i + 1]);
      if (!L || !R || (L.ops === 0 && R.ops === 0) || (L.ops === 0 && R.ops > 0)) continue;
      const d = decimalsOf(parts[i + 1]);
      const tol = R.ops === 0 && d > 0 ? 0.5 * 10 ** -d + 1e-9 : 1e-6 * Math.max(1, Math.abs(R.v));
      if (Math.abs(L.v - R.v) > tol) found.push({ expr: `${parts[i]} = ${parts[i + 1]}`, verwacht: fmtNum(L.v), keten: R.opsNoFrac > 0 });
    }
  }
  return found;
}


// ---------- de regels ----------
export const REGELS = {
  reken: 'sommetje in de uitleg klopt niet',
  'tip-verklapt': 'tip noemt de uitkomst van de tussenstap',
  'tip-vaag': 'tip is te vaag (zegt niet HOE)',
  'nul-stap': 'stap met + 0, − 0 of "van X naar X" (zinloos)',
  'dubbele-stap': 'twee keer dezelfde stap achter elkaar',
  'hint-verklapt': 'hint noemt het eindantwoord',
};
const strip = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const esc = (d) => String(d).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const numRe = (d) => new RegExp(`(?<![\\d,.])${esc(d)}(?![\\d,])`);
// "verklapt" = de uitkomst staat er als uitkomst in: "= 1000", ": R40", "tot 14:00", of aan het eind van een korte tip ("1 tot 6.")
function zegtUitkomst(t, d, eind = true) {
  t = String(t).trim();
  if (new RegExp(`(?:=|(?<!\\d\\s):|\\btot|\\bnaar)\\s*(?:€\\s?|R\\s?)?${esc(d)}(?![\\d,:%])`, 'i').test(t)) return true;
  return eind && t.length < 25 && new RegExp(`(?<![\\d,.])${esc(d)}\\s*[a-z°²³ℓ]{0,8}\\.?$`, 'i').test(t);
}
// Kolomsgewijs ("Tientallen: 20 + 0", "Ene: 0 + 0") en staartdelen ("gaan 0 keer") horen bij de methode; die mogen.
const KOLOM = /^(Eenheden|Tientallen|Honderdtallen|Duizendtallen|Tienduizendtallen|Ene|Tiene|Honderde|Duisende|Tienduisende|Honderdduisende)\b|gaan 0 keer|\d \+ \d+ \+ \d/;

// Alle problemen van één som: [{ regel, detail }]. hints = hintsFor van het curriculum.
export function problemen(q, { hints = null } = {}) {
  const out = [];
  const add = (regel, detail) => out.push({ regel, detail });
  const texts = [
    ...(q.steps || []).map((s) => ['stappenplan', s]),
    ...(q.guide || []).flatMap((s) => [['tussenstap', s.type === 'number' ? `${String(s.ask).replace(/=\s*\?\s*$/, '')}= ${s.display}` : ''], ['tip', s.tip || '']]),
    ['slot', q.guideFinal || ''],
    ...(q.wrong || []).map((w) => ['denkfout', w.fix || '']),
  ];
  for (const [waar, t] of texts) for (const f of checkArithmetic(t)) add('reken', `[${waar}] ${f.expr} (links is ${f.verwacht})`);
  for (const s of q.guide || []) {
    const d = String(s.display).replace(/^(€\s?|R)/, '');
    if (s.type !== 'choice' && s.tip && !s.tipAuto && zegtUitkomst(s.tip, d) && !numRe(d).test(s.ask)) add('tip-verklapt', `"${s.ask}" → tip "${s.tip}"`);
    if (isVagueTip(s.tip)) add('tip-vaag', `"${s.ask}" → tip "${s.tip}"`);
  }
  for (const [waar, t] of [...(q.steps || []).map((s) => ['stappenplan', s]), ...(q.guide || []).map((s) => ['tussenstap', s.ask]), ['slot', q.guideFinal || '']]) {
    const s = String(t);
    if (!KOLOM.test(s) && /(?<![\d,.])\d[\d.\s]*\s[+−-]\s0(?![\d,])|(?:in|op:?) (\d[\d ]*) \+ 0\b|\+ 0 (cent|minuten|minute|sent)\b/.test(s)) add('nul-stap', `[${waar}] ${strip(s)}`);
    const m = s.match(/van (€\s?|R\s?)?([\d.,: ]+?) (?:naar|tot) (€\s?|R\s?)?([\d.,: ]+?)(?=[ =?,.]|$)/);
    if (/\((deel deur|gedeeld door|delen door) 1\)|[+−-] (R|€ ?)0(?![\d,])/.test(s)) add('nul-stap', `[${waar}] ${strip(s)}`);
    if (m && m[2].trim() === m[4].trim()) add('nul-stap', `[${waar}] ${strip(s)}`);
  }
  const st = (q.steps || []).map(strip);
  for (let i = 1; i < st.length; i++) if (st[i] && st[i] === st[i - 1]) add('dubbele-stap', st[i]);
  const eind = String(q.display).replace(/\s*(euro|cm²|m²|cm|m|km|°C|°|%|minuten|minute|liter|gram|kilo)$/, '');
  if (hints && q.type !== 'choice' && eind.length >= 2) for (const h of hints(q) || []) {
    const zonderKeuzes = String(h).replace(/\([^)]*\/[^)]*\)\s*$/, '');
    if (!/^Hap:/.test(zonderKeuzes) && zegtUitkomst(zonderKeuzes, eind, false) && !numRe(eind).test(q.text)) add('hint-verklapt', `hint "${strip(h).slice(0, 80)}"`);
  }
  return out;
}

// ---------- bewaking van Max: verklapt hij het antwoord? ----------
// Max-meetlat #3/#4: ondanks de regel "NIET VOORZEGGEN" noemt Max soms toch het antwoord ("Dan wordt het 560",
// "Kies maar: 2400 of 2500?"). Deze controle draait op elk bericht van Max vóór het naar het kind gaat (src/ai.js);
// bij een treffer schrijft Max zijn bericht één keer opnieuw.
// 'sterk' = het antwoord staat na =, "is", "dus" … of vetgedrukt; 'zwak' = het getal staat er gewoon (en niet al in de som).
const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function verklaptAntwoord(text, display, { som = '', kind = '' } = {}) {
  const a = String(display ?? '').replace(/\s*(°|cm²|m²|cm|km|kg|g|ℓ|mℓ|ml|liter|minuten|min|uur|dm|mm|m³|m)\s*$/, '').replace(/^(€|R)\s*/, '').trim();
  if (!a || !/^\d/.test(a)) return null; // keuze- of woordantwoorden: niet
  const getal = escRe(a).replace(/[  ]/g, '[  ]?');
  const los = new RegExp(`(^|[^\\d,./:])${getal}(?![\\d]|[,.:]\\d|/\\d)`);
  if (los.test(kind)) return null; // het kind zei het zelf al
  const sterk = new RegExp(`(=|≈|\\bis|\\bwordt|\\bzijn|krijg je|\\bdus|antwoord|\\bword|\\bis dit)\\s*\\**\\s*(€|R)?\\s*${getal}(?![\\d]|[,.:]\\d|/\\d)|\\*\\*\\s*(€|R)?\\s*${getal}(?![\\d]|[,.:]\\d|/\\d)[^*\\n]{0,8}\\*\\*`, 'i');
  if (sterk.test(text)) return 'sterk';
  if (a.replace(/\D/g, '').length >= 2 && !los.test(som) && los.test(text)) return 'zwak';
  return null;
}
