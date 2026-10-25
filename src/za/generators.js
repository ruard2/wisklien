// Somgenerators vir Suid-Afrikaanse kinders (Afrikaans, KABV/CAPS), graad 4 tot 7.
// Dieselfde motor as die Nederlandse weergawe (vlakke, beloning, tussenstappe), maar met die metodes,
// woorde en notasie van die DBE-werkboeke: kolomme met oordra, uitgebreide notasie, langdeling met res,
// breuke van heelgetalle via groepe, persentasie as "uit 100", vloeidiagramme, ÷, R12,50 en ; in lyste.
//
// Vlakke: 0 = graad 4, 1 = graad 5, 2 = graad 6, 3 = graad 7.

import { algemeneDenkfouten } from '../denkfouten.js';
import { kaartVoor } from '../uitleg/index.js';
import { problemen } from '../kwaliteit.js';
import { improveTips } from '../tips.js';
import { rnd, pick, shuffle, gcd, lcm, round, fmt, fracStr, hhmm, enkelvoudSom, zonderEenKeer, vereenvoudigStap, stappenVolgenTussenstappen } from '../util.js';
import { DIDACTIEK, hintAanpak } from './didactiek.js';
import { mnemonicsFor } from './mnemonics.js';

export const LEVEL_NAMES = ['graad 4', 'graad 5', 'graad 6', 'graad 7'];
// By die begintoets: een graad laer as die kind se graad (graad 7 → graad 6-werk)
export const startLevelForGraad = (g) => Math.max(0, Math.min(3, Number(g) - 5));

// Volgorde en gewig volg die KABV: Getalle 50%, Patrone 10%, Ruimte en vorm 15%, Meting 15%, Data 10%
export const CATEGORIES = [
  { id: 'optel', label: 'Optel en aftrek', domain: 'Getalle', icon: '➕' },
  { id: 'vermenigvuldig', label: 'Vermenigvuldiging', domain: 'Getalle', icon: '✖️' },
  { id: 'deling', label: 'Deling', domain: 'Getalle', icon: '➗' },
  { id: 'getalbegrip', label: 'Plekwaarde, afronding en faktore', domain: 'Getalle', icon: '🧮' },
  { id: 'breuke', label: 'Gewone breuke', domain: 'Getalle', icon: '🍕' },
  { id: 'desimale', label: 'Desimale breuke', domain: 'Getalle', icon: '🔢' },
  { id: 'persentasie', label: 'Persentasies', domain: 'Getalle', icon: '💯' },
  { id: 'finansies', label: 'Geld, koers en verhouding', domain: 'Getalle', icon: '💰' },
  { id: 'patrone', label: 'Patrone en getallesinne', domain: 'Patrone, funksies en algebra', icon: '🔁' },
  { id: 'meetkunde', label: 'Vorms en hoeke', domain: 'Ruimte en vorm', icon: '📐' },
  { id: 'meting', label: 'Lengte, massa en kapasiteit', domain: 'Meting', icon: '📏' },
  { id: 'omtrek', label: 'Omtrek, oppervlakte en volume', domain: 'Meting', icon: '⬛' },
  { id: 'tyd', label: 'Tyd', domain: 'Meting', icon: '⏱️' },
  { id: 'data', label: 'Data en waarskynlikheid', domain: 'Datahantering', icon: '📊' },
];
export const CAT_IDS = CATEGORIES.map((c) => c.id);
export const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

const NAMES = ['Thabo', 'Lerato', 'Pieter', 'Anika', 'Sipho', 'Zanele', 'Johan', 'Marike', 'Kagiso', 'Elmarie', 'Riaan', 'Naledi', 'Liezel', 'Themba'];

// ---------- notasie ----------
// Suid-Afrikaans: spasie tussen duisende (ook by 4 syfers: 4 362), desimale komma, R12,50
export function f(n, d) {
  return fmt(n, d).replace(/^(−?)(\d)(\d{3})(?=,|$)/, '$1$2 $3');
}
export const R = (n) => (Number.isInteger(round(n)) ? 'R' + f(n) : 'R' + f(n, 2));
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const list = (a) => a.map((x) => f(x)).join('; ');

// ---------- vraagbouers ----------
function num(text, answer, steps, extra = {}) {
  const unit = extra.unit || '';
  return { type: 'number', text, answer: round(answer), steps, display: extra.display || (extra.money ? R(answer) : f(answer) + (unit ? ' ' + unit : '')), ...extra };
}
function frac(text, [n, d], steps, extra = {}) {
  return { type: 'fraction', text, answer: [n, d], steps, display: fracStr([n, d]), ...extra };
}
// Opsies sonder duplikate (die regte antwoord bly altyd in)
const uniq = (options, correctIdx) => { const c = options[correctIdx]; return [c, ...new Set(options.filter((o, i) => i !== correctIdx && o !== c))]; };
function choice(text, options, correctIdx, steps, extra = {}) {
  const correct = options[correctIdx];
  const opts = shuffle(uniq(options, correctIdx));
  return { type: 'choice', text, options: opts, answer: opts.indexOf(correct), steps, display: correct, ...extra };
}
function time(text, minutes, steps, extra = {}) {
  return { type: 'time', text, answer: ((minutes % 1440) + 1440) % 1440, steps, display: hhmm(minutes), ...extra };
}
const st = (ask, answer, tip, extra = {}) => ({ ask, type: 'number', answer: round(answer), display: extra.money ? R(answer) : f(answer), tip, ...extra });
const stF = (ask, [n, d], tip) => ({ ask, type: 'fraction', answer: [n, d], display: fracStr([n, d]), tip });
const stC = (ask, options, correctIdx, tip) => {
  const correct = options[correctIdx];
  const opts = shuffle(uniq(options, correctIdx));
  return { ask, type: 'choice', options: opts, answer: opts.indexOf(correct), display: correct, tip };
};
const W = (answer, label, fix) => ({ answer, label, fix });
const withGuide = (q, g) => ({ ...q, guide: g.guide, guideFinal: g.final });
// Vaste sjabloon-id per som-variant (soort som): daarmee hoort bij elke som een eigen uitlegkaart (src/uitleg/).
// De binnenste id wint (een hulpfunctie als klokLezen is specifieker dan de tak die hem aanroept).
const tpl = (id, q) => { if (q && typeof q === 'object' && q.text && !q.tpl) q.tpl = id; return q; };

// ---------- metodes uit die werkboeke ----------
const PL = ['ene', 'tiene', 'honderde', 'duisende', 'tienduisende', 'honderdduisende'];
const PL1 = ['een', 'tien', 'honderd', 'duisend', 'tienduisend', 'honderdduisend'];
const dig = (n, i) => Math.floor(n / 10 ** i) % 10;
const parts = (n) => String(n).split('').reverse().map((d, i) => Number(d) * 10 ** i).reverse();
const noZeroDigits = (len) => Number(Array.from({ length: len }, () => rnd(1, 9)).join(''));

// Opbou: tel per plekwaarde op (graad 4)
function opbou(a, b) {
  const pa = parts(a), pb = parts(b);
  while (pb.length < pa.length) pb.unshift(0);
  const len = pa.length, sums = pa.map((x, i) => x + pb[i]);
  const steps = [`Breek albei getalle op: ${pa.filter(Boolean).map((x) => f(x)).join(' + ')} en ${pb.filter(Boolean).map((x) => f(x)).join(' + ')}.`];
  const guide = [];
  sums.forEach((s, i) => {
    const pl = PL[len - 1 - i];
    steps.push(`${cap(pl)}: ${f(pa[i])} + ${f(pb[i])} = ${f(s)}`);
    if (i < len - 1) guide.push(st(`${cap(pl)}: ${f(pa[i])} + ${f(pb[i])} = ?`, s, `Tel net die ${pl} op.`));
  });
  steps.push(`Tel bymekaar: ${sums.map((x) => f(x)).join(' + ')} = ${f(a + b)}`);
  return { steps, guide, final: `Tel nou die ${PL[0]} op en tel dan alles bymekaar: ${sums.slice(0, -1).map((x) => f(x)).join(' + ')} + (${f(pa.at(-1))} + ${f(pb.at(-1))})` };
}
// Afbreek: trek die tweede getal stuk vir stuk af, op die getallelyn (graad 4)
function afbreek(a, b) {
  const pb = parts(b).filter(Boolean);
  const steps = [`Breek ${f(b)} op in ${pb.map((x) => f(x)).join(' + ')} en spring terug op die getallelyn.`];
  const guide = [];
  let cur = a;
  pb.forEach((p, i) => {
    steps.push(`${f(cur)} − ${f(p)} = ${f(cur - p)}`);
    if (i < pb.length - 1) guide.push(st(`${f(cur)} − ${f(p)} = ?`, cur - p, `Trek net die ${PL[String(p).length - 1]} af.`));
    cur -= p;
  });
  steps.push(`Kontroleer: ${f(a - b)} + ${f(b)} = ${f(a)} ✓`);
  return { steps, guide, final: `Laaste stuk: ${f(cur + pb.at(-1))} − ${f(pb.at(-1))}` };
}
// Kolomme met oordra (graad 5 en hoër): begin by die ene
function kolomOptel(a, b) {
  const len = String(Math.max(a, b)).length;
  const steps = ['Skryf die getalle onder mekaar: ene onder ene, tiene onder tiene. Begin by die ene.'];
  const guide = [];
  let carry = 0;
  for (let i = 0; i < len; i++) {
    const x = dig(a, i), y = dig(b, i), s = x + y + carry, last = i === len - 1;
    const expr = `${x} + ${y}${carry ? ' + 1 (oorgedra)' : ''}`;
    steps.push(`${cap(PL[i])}: ${expr} = ${s}${s >= 10 && !last ? ` → skryf ${s % 10}, dra 1 oor na die ${PL[i + 1]}` : ''}`);
    guide.push(st(`${cap(PL[i])}: ${expr} = ?`, s, s >= 10 && !last ? `Is dit 10 of meer? Dan skryf jy net die ene neer en dra 1 oor na die ${PL[i + 1]}.` : 'Tel die syfers in hierdie kolom op.'));
    carry = s >= 10 ? 1 : 0;
  }
  steps.push(`Antwoord: ${f(a + b)}`);
  return { steps, guide, final: 'Skryf die antwoord: lees die syfers wat jy onder neergeskryf het van links na regs.' };
}
// Kolomme aftrek met omruil (a sonder nulle, sodat omruil altyd uit die buurkolom kom)
function kolomAftrek(a, b) {
  const len = String(a).length;
  const steps = ['Skryf die getalle onder mekaar. Begin by die ene. Die onderste syfer word altyd afgetrek.'];
  const guide = [];
  let borrow = 0;
  for (let i = 0; i < len; i++) {
    const x = dig(a, i), y = dig(b, i), da = x - borrow;
    if (i >= String(b).length && !borrow) { steps.push(`${cap(PL[i])}: ${da} bly ${da}`); continue; }
    const pre = borrow ? ` (jy het 1 omgeruil: ${x} word ${da})` : '';
    if (da < y) {
      steps.push(`${cap(PL[i])}${pre}: ${da} − ${y} gaan nie. Ruil 1 ${PL1[i + 1]} om vir 10 ${PL[i]}: ${da + 10} − ${y} = ${da + 10 - y}`);
      guide.push(st(`${cap(PL[i])}${pre}: ${da} − ${y} gaan nie. Ruil 1 ${PL1[i + 1]} om vir 10 ${PL[i]}. ${da + 10} − ${y} = ?`, da + 10 - y, `Jy het nou ${da + 10} ${PL[i]}.`));
      borrow = 1;
    } else {
      steps.push(`${cap(PL[i])}${pre}: ${da} − ${y} = ${da - y}`);
      guide.push(st(`${cap(PL[i])}${pre}: ${da} − ${y} = ?`, da - y, 'Trek die onderste syfer van die boonste af.'));
      borrow = 0;
    }
  }
  steps.push(`Antwoord: ${f(a - b)}. Kontroleer: ${f(a - b)} + ${f(b)} = ${f(a)} ✓`);
  return { steps, guide, final: 'Skryf die antwoord: lees die syfers onder van links na regs.', wrong: [W(noBorrow(a, b), 'Jy het in elke kolom die kleiner syfer van die groter syfer afgetrek.', 'Die onderste syfer word altyd afgetrek. Gaan dit nie? Ruil 1 van die kolom links daarvan om.')] };
}
function noBorrow(a, b) {
  let out = 0;
  for (let i = 0; i < String(a).length; i++) out += Math.abs(dig(a, i) - dig(b, i)) * 10 ** i;
  return out;
}
const noCarry = (a, b) => { let out = 0; for (let i = 0; i < String(Math.max(a, b)).length; i++) out += ((dig(a, i) + dig(b, i)) % 10) * 10 ** i; return out; };
// Uitgebreide notasie / distributiewe eienskap: a × b, b een syfer
function uitgebreid(a, b) {
  const pa = parts(a).filter(Boolean);
  const steps = [`Skryf ${f(a)} in uitgebreide notasie: ${pa.map((x) => f(x)).join(' + ')}. Maal elke deel met ${f(b)}.`];
  const guide = [];
  for (const p of pa) {
    const z = String(p).length - 1;
    steps.push(`${f(p)} × ${b} = ${f(p * b)}`);
    guide.push(st(`${f(p)} × ${b} = ?`, p * b, z ? `Reken ${p / 10 ** z} × ${b} en sit ${z === 1 ? '\'n nul' : z + ' nulle'} agter.` : `Maaltafel van ${b}.`));
  }
  steps.push(`Tel die deelprodukte op: ${pa.map((p) => f(p * b)).join(' + ')} = ${f(a * b)}`);
  return { steps, guide, final: `Tel die deelprodukte op: ${pa.map((p) => f(p * b)).join(' + ')}` };
}
// Kolommetode met 'n 2-syfer getal: eers × die tiene, dan × die ene
function maalTweeSyfer(a, b) {
  const t = b - (b % 10), e = b % 10;
  const steps = [`Breek ${b} op: ${t} + ${e}.`, `${f(a)} × ${t} = ${f(a * t)}`, `${f(a)} × ${e} = ${f(a * e)}`, `Tel op: ${f(a * t)} + ${f(a * e)} = ${f(a * b)}`];
  const guide = [
    st(`Eers die tiene: ${f(a)} × ${t} = ?`, a * t, `Reken ${f(a)} × ${t / 10} en sit 'n nul agter.`),
    st(`Dan die ene: ${f(a)} × ${e} = ?`, a * e, a >= 100 ? (a % 100 ? `Breek ${f(a)} op in honderde, tiene en ene, maal elke deel met ${e} en tel op.` : `Reken ${a / 100} × ${e} en sit twee nulle agter.`) : `Breek ${a} op in tiene en ene, maal elke deel met ${e} en tel op.`),
  ];
  return { steps, guide, final: `Tel die deelprodukte op: ${f(a * t)} + ${f(a * e)}`, wrong: [W(a * t + e, `Jy het ${f(a)} net met die tiene gemaal en die ene bygetel.`, `Elke deel van ${b} moet met ${f(a)} gemaal word: × ${t} én × ${e}.`)] };
}
// Langdeling met deelprodukte en res (soos in die werkboek: 560 − 48 (24 × 2) …)
function langdeel(a, d) {
  const s = String(a);
  const steps = [`Langdeling: ${f(a)} ÷ ${d}. Werk van links na regs.`];
  const guide = [];
  let cur = 0, started = false;
  for (let i = 0; i < s.length; i++) {
    cur = cur * 10 + Number(s[i]);
    if (!started && cur < d && i < s.length - 1) continue;
    started = true;
    const k = Math.floor(cur / d), p = k * d, r = cur - p, next = i < s.length - 1 ? `; bring die ${s[i + 1]} af → ${r * 10 + Number(s[i + 1])}` : '';
    steps.push(`${d} in ${cur} gaan ${k} keer: ${cur} − ${p} (${d} × ${k}) = ${r}${next}.`);
    guide.push(st(`Hoeveel keer gaan ${d} in ${cur}?`, k, k === 0 ? `Vergelyk ${d} met ${cur}: is die deler groter? Dan gaan dit nie een keer in nie. Wat skryf jy dan in die antwoord?` : `Soek ${d} × ? so na as moontlik aan ${cur}, maar nie groter as ${cur} nie.`));
    if (k > 0 && (r > 0 || i < s.length - 1)) guide.push(st(`Trek die deelproduk af: ${cur} − ${p} (${d} × ${k}) = ?`, r, 'Wat oorbly, moet kleiner as die deler wees.'));
    cur = r;
  }
  const q = Math.floor(a / d), rest = a % d;
  steps.push(`Antwoord: ${f(q)}${rest ? ` res ${rest}` : ''}. Kontroleer: ${f(q)} × ${d}${rest ? ` + ${rest}` : ''} = ${f(a)} ✓`);
  return { steps, guide, final: 'Die antwoord is al die "hoeveel keer"-syfers na mekaar (sonder die res)', q, rest };
}

// =====================================================================
// GETALLE, BEWERKINGS EN VERWANTSKAPPE
// =====================================================================
const optel = {
  0() {
    const r = Math.random();
    if (r < 0.4) {
      const a = rnd(1, 6) * 100 + rnd(1, 8) * 10 + rnd(1, 9), b = rnd(1, 3) * 100 + rnd(1, 8) * 10 + rnd(1, 9), g = opbou(a, b);
      return tpl('optel.0a', withGuide(num(`${a} + ${b} =`, a + b, g.steps, { wrong: [W(noCarry(a, b), 'Jy het die tien van die ene vergeet.', 'Tel die ene apart op: as dit meer as 9 is, dra \'n tien oor na die tiene.')] }), g));
    }
    if (r < 0.75) {
      const a = rnd(5, 9) * 100 + rnd(1, 9) * 10 + rnd(1, 9), b = rnd(1, 3) * 100 + rnd(1, 9) * 10 + rnd(1, 9), g = afbreek(a, b);
      return tpl('optel.0b', withGuide(num(`${a} − ${b} =`, a - b, g.steps, { wrong: [W(noBorrow(a, b), 'Jy het in elke kolom die kleiner syfer van die groter syfer afgetrek.', `Breek ${b} op en spring terug op die getallelyn.`)] }), g));
    }
    const a = rnd(210, 480), b = rnd(150, 390), g = opbou(a, b), n = pick(NAMES);
    return tpl('optel.0c', withGuide(num(`By die skoolkermis verkoop ${n} se klas ${a} kaartjies op Vrydag en ${b} op Saterdag. Hoeveel kaartjies is altesaam verkoop?`, a + b, g.steps), g));
  },
  1() {
    const r = Math.random();
    if (r < 0.45) {
      const a = rnd(1200, 5999), b = rnd(1200, 3999), g = kolomOptel(a, b);
      return tpl('optel.1a', withGuide(num(`${f(a)} + ${f(b)} =`, a + b, g.steps, { wrong: [W(noCarry(a, b), 'Jy het vergeet om oor te dra.', 'Skryf die 1 wat jy oorgedra het, klein bo die volgende kolom.')] }), g));
    }
    if (r < 0.75) {
      const a = rnd(2, 9) * 1000 + rnd(1, 9) * 100 + rnd(10, 90) + rnd(1, 9), k = pick([99, 98, 199, 998, 999]), rk = Math.round(k / 100) * 100 || 100;
      return tpl('optel.1b', { ...num(`${f(a)} − ${k} =`, a - k, [`Kompensering: ${k} is amper ${f(rk)}.`, `${f(a)} − ${f(rk)} = ${f(a - rk)}`, `Jy het ${rk - k} te veel afgetrek, tel dit weer by: ${f(a - rk)} + ${rk - k} = ${f(a - k)}`]),
        guide: [st(`Trek eers ${f(rk)} af: ${f(a)} − ${f(rk)} = ?`, a - rk, `${k} is amper ${f(rk)}: reken met die ronde getal.`), st(`Hoeveel het jy te veel afgetrek? ${f(rk)} − ${k} = ?`, rk - k, `${f(rk)} is meer as ${k}.`)],
        guideFinal: `Tel dit weer by: ${f(a - rk)} + ${rk - k}` });
    }
    const a = rnd(1, 8) * 1000 + rnd(1, 9) * 100 + rnd(1, 9) * 10, top = Math.ceil((a + 1) / 1000) * 1000, h = Math.ceil(a / 100) * 100;
    return tpl('optel.1c', { ...num(`Voltooi tot die volgende 1 000: ${f(a)} + … = ${f(top)}`, top - a, [`Spring eers na die volgende honderd: ${f(a)} + ${h - a} = ${f(h)}.`, `Dan na ${f(top)}: ${f(h)} + ${top - h} = ${f(top)}.`, `Saam: ${h - a} + ${top - h} = ${top - a}.`]),
      guide: [st(`Hoeveel tot by die volgende honderd? ${f(a)} + ? = ${f(h)}`, h - a, 'Kyk na die tiene.'), st(`En van ${f(h)} tot ${f(top)}? `, top - h, 'Tel in honderde.')], guideFinal: `Tel die twee spronge op: ${h - a} + ${top - h}` });
  },
  2() {
    const r = Math.random();
    if (r < 0.35) {
      const a = rnd(12000, 68000), b = rnd(8000, 29000), g = kolomOptel(a, b), sport = pick(['atletiek', 'swem', 'sokker', 'rugby']);
      return tpl('optel.2a', withGuide(num(`By die Olimpiese Spele kyk ${f(a)} mense op die eerste dag na die ${sport} en ${f(b)} op die tweede dag. Hoeveel toeskouers is dit altesaam?`, a + b, g.steps), g));
    }
    if (r < 0.7) {
      const a = noZeroDigits(5), b = rnd(10000, a - 1000), g = kolomAftrek(a, b);
      return tpl('optel.2b', { ...withGuide(num(`${f(a)} − ${f(b)} =`, a - b, g.steps), g), wrong: g.wrong });
    }
    const a = noZeroDigits(4) + rnd(2, 6) * 10000, b = rnd(1000, 9999), g = kolomOptel(a, b);
    return tpl('optel.2c', withGuide(num(`${f(a)} + ${f(b)} =`, a + b, g.steps, { wrong: [W(noCarry(a, b), 'Jy het vergeet om oor te dra.', 'Skryf die 1 wat jy oorgedra het, klein bo die volgende kolom.')] }), g));
  },
  3() {
    const t = pick(['boer', 'begroting', 'kolom']);
    if (t === 'boer') {
      const n = pick(NAMES), had = rnd(2100, 4800), verkoop = rnd(600, 1400), koop = rnd(300, 900);
      return tpl('optel.3a', { ...num(`'n Skaapboer, oom ${pick(['Koos', 'Gert', 'Sakkie', 'Frikkie'])}, het ${f(had)} skape. Hy verkoop ${f(verkoop)} skape en koop later ${f(koop)} lammers by. Hoeveel skape het hy nou?`, had - verkoop + koop,
        [`Getallesin: ${f(had)} − ${f(verkoop)} + ${f(koop)} = □`, `${f(had)} − ${f(verkoop)} = ${f(had - verkoop)}`, `${f(had - verkoop)} + ${f(koop)} = ${f(had - verkoop + koop)}`]),
      guide: [st(`Na die verkoping: ${f(had)} − ${f(verkoop)} = ?`, had - verkoop, 'Trek in kolomme af.')], guideFinal: `Tel die lammers by: ${f(had - verkoop)} + ${f(koop)}` });
    }
    if (t === 'begroting') {
      const totaal = rnd(25, 60) * 100, a = rnd(600, 1400), b = rnd(500, 1200), wat = pick([['kos', 'vervoer'], ['skoolklere', 'boeke'], ['krag', 'water']]);
      return tpl('optel.3b', { ...num(`Die gesin het ${R(totaal)} vir die maand. Hulle spandeer ${R(a)} aan ${wat[0]} en ${R(b)} aan ${wat[1]}. Hoeveel geld bly oor?`, totaal - a - b,
        [`Wat is die vraag? Hoeveel bly oor.`, `Uitgawes: ${R(a)} + ${R(b)} = ${R(a + b)}`, `Oor: ${R(totaal)} − ${R(a + b)} = ${R(totaal - a - b)}`], { money: true, wrong: [W(totaal - a, 'Jy het net een uitgawe afgetrek.', 'Daar is twee uitgawes. Tel hulle eers bymekaar.'), W(a + b, 'Jy het die uitgawes bymekaargetel, maar nie van die totaal afgetrek nie.', 'Goeie begin! Trek dit nou van die totaal af.')] }),
      guide: [st(`Hoeveel spandeer hulle altesaam? ${R(a)} + ${R(b)} = ?`, a + b, 'Tel die twee uitgawes op.', { money: true })], guideFinal: `Hoeveel bly oor? ${R(totaal)} − ${R(a + b)}` });
    }
    const a = noZeroDigits(6), b = rnd(100000, a - 10000), g = kolomAftrek(a, b);
    return tpl('optel.3c', { ...withGuide(num(`${f(a)} − ${f(b)} =`, a - b, g.steps), g), wrong: g.wrong });
  },
};

const DOUBLES = {
  4: (b) => [[`2 × ${b} = ?`, 2 * b, `Verdubbel ${b}.`], `4 × ${b} is die dubbel van 2 × ${b}: ${2 * b} + ${2 * b}`],
  8: (b) => [[`4 × ${b} = ?`, 4 * b, `Verdubbel ${b}, en verdubbel die antwoord weer.`], `8 × ${b} is die dubbel van 4 × ${b}: ${4 * b} + ${4 * b}`],
  6: (b) => [[`3 × ${b} = ?`, 3 * b, `${b} + ${b} + ${b}.`], `6 × ${b} is die dubbel van 3 × ${b}: ${3 * b} + ${3 * b}`],
  9: (b) => [[`10 × ${b} = ?`, 10 * b, 'Sit \'n nul agter.'], `9 × ${b} is een ${b} minder: ${10 * b} − ${b}`],
  7: (b) => [[`5 × ${b} = ?`, 5 * b, `Neem die helfte van 10 × ${b}.`], `Tel nog 2 × ${b} = ${2 * b} by: ${5 * b} + ${2 * b}`],
};
const vermenigvuldig = {
  0() {
    if (Math.random() < 0.5) {
      const a = pick([4, 6, 7, 8, 9]), b = rnd(3, 9), [g, final] = DOUBLES[a](b);
      return tpl('vermenigvuldig.0a', { ...num(`${a} × ${b} =`, a * b, [`Gebruik 'n maaltafel wat jy ken (verdubbel of halveer).`, `${g[0].replace('?', g[1])}`, `${final} = ${a * b}`]), guide: [st(g[0], g[1], g[2])], guideFinal: final });
    }
    const a = rnd(2, 9) * 10 + rnd(1, 9), b = rnd(3, 9), g = uitgebreid(a, b);
    if (Math.random() < 0.4) {
      const ding = pick([['pakkies Smarties', 'pakkies'], ['eiers', 'bokse'], ['potlode', 'dosies']]);
      return tpl('vermenigvuldig.0b', withGuide(num(`In een van die ${ding[1]} is daar ${b} ${ding[0]}. Hoeveel ${ding[0]} is daar in ${a} ${ding[1]}?`, a * b, g.steps), g));
    }
    return tpl('vermenigvuldig.0c', withGuide(num(`${a} × ${b} =`, a * b, g.steps), g));
  },
  1() {
    const r = Math.random();
    if (r < 0.45) {
      const a = rnd(1, 9) * 100 + rnd(1, 9) * 10 + rnd(1, 9), b = rnd(3, 9), g = uitgebreid(a, b);
      return tpl('vermenigvuldig.1a', withGuide(num(`${a} × ${b} =`, a * b, g.steps), g));
    }
    if (r < 0.75) {
      const a = rnd(12, 39), b = rnd(12, 29), g = maalTweeSyfer(a, b);
      return tpl('vermenigvuldig.1b', { ...withGuide(num(`${a} × ${b} =`, a * b, g.steps), g), wrong: g.wrong });
    }
    const a = rnd(13, 99), m = pick([10, 100]);
    return tpl('vermenigvuldig.1c', { ...num(`${a} × ${m} =`, a * m, [`× ${m}: elke syfer skuif ${m === 10 ? 'een plek' : 'twee plekke'} na links in die plekwaardetabel (na die groter plekke); daar kom ${m === 10 ? '\'n nul' : 'twee nulle'} agter.`, `${a} × ${m} = ${f(a * m)}`]),
      guide: [stC(`Hoeveel nulle kom agter ${a}?`, ['1', '2', '3'], m === 10 ? 0 : 1, `${m} het ${m === 10 ? 'een nul' : 'twee nulle'}.`)], guideFinal: `${a} met ${m === 10 ? '\'n nul' : 'twee nulle'} agter` });
  },
  2() {
    const r = Math.random();
    if (r < 0.4) {
      const a = noZeroDigits(4), b = rnd(3, 9), g = uitgebreid(a, b);
      return tpl('vermenigvuldig.2a', withGuide(num(`${b} × ${f(a)} =`, a * b, g.steps), g));
    }
    if (r < 0.7) {
      const a = rnd(110, 489), b = rnd(21, 49), g = maalTweeSyfer(a, b);
      return tpl('vermenigvuldig.2b', { ...withGuide(num(`${a} × ${b} =`, a * b, g.steps), g), wrong: g.wrong });
    }
    const per = pick([24, 36, 48]), bokse = rnd(115, 340), g = maalTweeSyfer(bokse, per);
    return tpl('vermenigvuldig.2c', { ...withGuide(num(`'n Tamatieboer pak ${per} tamaties in elke boks. Hy vul ${bokse} bokse. Hoeveel tamaties is dit?`, per * bokse, g.steps), g), wrong: g.wrong });
  },
  3() {
    const a = rnd(210, 890), b = rnd(23, 79), ra = Math.round(a / 100) * 100, rb = Math.round(b / 10) * 10, g = maalTweeSyfer(a, b);
    const skat = ra * rb, opts = [skat, skat * 10, skat / 10].map((x) => f(x));
    const ctx = Math.random() < 0.5;
    const text = ctx ? `'n Stadion vir die Olimpiese Spele het ${b} rye met ${a} sitplekke in elke ry. Hoeveel sitplekke is daar?` : `${a} × ${b} =`;
    return tpl('vermenigvuldig.3a', { ...num(text, a * b, [`Beraam eers: rond ${a} af na ${ra} en ${b} na ${rb}. Dan is ${ra} × ${rb} = ${f(skat)}.`, ...g.steps, `Vergelyk jou antwoord met jou skatting (${f(skat)}): dit is ongeveer dieselfde ✓`]),
      guide: [stC(`Beraam eers: rond ${a} af tot die naaste 100 en ${b} tot die naaste 10. Hoeveel is ${ra} × ${rb}?`, opts, 0, `Reken ${ra / 100} × ${rb / 10} en sit drie nulle agter.`), ...g.guide], guideFinal: g.final, wrong: g.wrong });
  },
};

const deling = {
  0() {
    const r = Math.random();
    const d = rnd(3, 9), q = rnd(4, 9);
    if (r < 0.5) {
      const half = Math.min(5, q - 1);
      return tpl('deling.0a', { ...num(`${d * q} ÷ ${d} =`, q, [`Dink aan die maaltafel van ${d}: ${d} × ? = ${d * q}.`, `${d} × ${q} = ${d * q}, dus ${d * q} ÷ ${d} = ${q}.`]),
        guide: [st(`Begin met 'n maklike een: ${d} × ${half} = ?`, d * half, `Tafel van ${d}.`), st(`Hoeveel bly oor? ${d * q} − ${d * half} = ?`, d * q - d * half, 'Trek af.')],
        guideFinal: `Hoeveel keer gaan ${d} in ${d * q - d * half}? Tel dit by jou ${half} keer` });
    }
    const rest = rnd(1, d - 1), a = d * q + rest, n = pick(NAMES);
    if (r < 0.75) return tpl('deling.0b', { ...num(`${n} het ${a} lekkers en deel dit gelyk uit aan ${d} maats. Wat oorbly, hou ${n}. Hoeveel lekkers kry elke maat?`, q,
      [`${a} ÷ ${d}: dink aan die tafel van ${d}.`, `${d} × ${q} = ${d * q}, en ${d} × ${q + 1} = ${d * (q + 1)} is te veel.`, `Wat oorbly: ${a} − ${d * q} = ${rest}.`, `Elke maat kry ${q}, res ${rest}.`], { wrong: [W(rest, 'Dit is die res: wat oorbly.', 'Die vraag is hoeveel elkeen kry.')] }),
      guide: [st(`Watter getal in die tafel van ${d} is die naaste aan ${a}, maar nie meer nie?`, d * q, `Sê die tafel van ${d} op.`)], guideFinal: `Hoeveel keer ${d} is ${d * q}?` });
    return tpl('deling.0c', { ...num(`${a} ÷ ${d} = ${q} res □. Wat is die res?`, rest, [`${d} × ${q} = ${d * q}.`, `${a} − ${d * q} = ${rest}. Die res is ${rest}.`]),
      guide: [st(`${d} × ${q} = ?`, d * q, `Tafel van ${d}.`)], guideFinal: `Wat bly oor? ${a} − ${d * q}` });
  },
  1() {
    if (Math.random() < 0.25) {
      const dd = pick([2, 5, 10]), n = rnd(1000, 9999), ja = n % dd === 0, rule = { 2: 'die laaste syfer ewe is (0, 2, 4, 6, 8)', 5: 'die laaste syfer 0 of 5 is', 10: 'die laaste syfer 0 is' }[dd];
      return tpl('deling.1a', { ...choice(`Is ${f(n)} deelbaar deur ${dd}?`, ['ja', 'nee'], ja ? 0 : 1, [`Deelbaarheidsreël: 'n getal is deelbaar deur ${dd} as ${rule}.`, `Die laaste syfer is ${n % 10}, dus ${ja ? 'ja' : 'nee'}.`]),
        guide: [st(`Wat is die laaste syfer van ${f(n)}?`, n % 10, 'Kyk na die syfer heel regs: dit is die ene.')], guideFinal: { 2: 'Is die laaste syfer ewe (0, 2, 4, 6 of 8)?', 5: 'Is die laaste syfer 0 of 5?', 10: 'Is die laaste syfer 0?' }[dd] });
    }
    const d = rnd(3, 9), q = rnd(21, 99), a = d * q, big = d * (q - (q % 10)), small = a - big;
    return tpl('deling.1b', { ...num(`${a} ÷ ${d} =`, q, [`Breek ${a} op in dele wat maklik deur ${d} gedeel kan word: ${big} + ${small}.`, `${big} ÷ ${d} = ${big / d}`, `${small} ÷ ${d} = ${small / d}`, `Tel op: ${big / d} + ${small / d} = ${q}`]),
      guide: [st(`${big} ÷ ${d} = ?`, big / d, `Dink aan ${big / 10} ÷ ${d} en sit 'n nul agter.`), st(`${small} ÷ ${d} = ?`, small / d, `Tafel van ${d}.`)], guideFinal: `Tel op: ${big / d} + ${small / d}` });
  },
  2() {
    const r = Math.random();
    if (r < 0.2) {
      const dd = pick([3, 9]), n = rnd(1000, 9999), sum = String(n).split('').reduce((x, y) => x + Number(y), 0), ja = sum % dd === 0;
      return tpl('deling.2a', { ...choice(`Is ${f(n)} deelbaar deur ${dd}?`, ['ja', 'nee'], ja ? 0 : 1, [`Reël vir ${dd}: tel die syfers op.`, `${String(n).split('').join(' + ')} = ${sum}.`, `Is ${sum} deelbaar deur ${dd}? ${ja ? 'Ja' : 'Nee'}.`]),
        guide: [st(`Tel die syfers op: ${String(n).split('').join(' + ')} = ?`, sum, 'Tel twee syfers bymekaar en tel dan die volgende syfer by, een vir een.')], guideFinal: `Is ${sum} in die tafel van ${dd}?` });
    }
    const d = rnd(12, 32), q = rnd(12, 39), rest = r < 0.6 ? 0 : rnd(1, d - 1), a = d * q + rest, g = langdeel(a, d);
    if (!rest) return tpl('deling.2b', withGuide(num(`${f(a)} ÷ ${d} =`, q, g.steps), g));
    const ding = pick([['eiers', 'eierbokse'], ['lekkers', 'pakkies'], ['appels', 'sakke']]);
    return tpl('deling.2c', withGuide(num(`'n Winkel pak ${f(a)} ${ding[0]} in ${ding[1]} van ${d}. Hoeveel vol ${ding[1]} is daar?`, q, [...g.steps, `Net vol ${ding[1]} tel: die res (${rest}) tel nie.`], { wrong: [W(q + 1, 'Jy het opgerond.', `Net vol ${ding[1]} tel. Die res bly oor.`)] }), { ...g, final: g.final }));
  },
  3() {
    const d = rnd(24, 52), q = rnd(6, 19), rest = rnd(1, d - 1), a = d * q + rest, g = langdeel(a, d);
    if (Math.random() < 0.5) {
      return tpl('deling.3a', withGuide(num(`${f(a)} leerders gaan op 'n uitstappie. In elke bus is plek vir ${d} leerders. Hoeveel busse is nodig?`, q + 1,
        [...g.steps, `Daar bly ${rest} leerders oor: hulle moet ook saam, dus nog 'n bus. ${q} + 1 = ${q + 1}.`], { wrong: [W(q, 'Jy het die leerders wat oorbly, vergeet.', 'Die leerders wat oorbly, moet ook saam: dus is nog \'n bus nodig.')] }), { ...g, final: 'Hoeveel busse vol, en is daar nog leerders oor?' }));
    }
    const d2 = rnd(13, 29), q2 = rnd(105, 389), g2 = langdeel(d2 * q2, d2);
    return tpl('deling.3b', withGuide(num(`${f(d2 * q2)} ÷ ${d2} =`, q2, g2.steps), g2));
  },
};

const PRIEM = [23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
const SAAMGESTEL = [21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91, 93];
const factors = (n) => Array.from({ length: n }, (_, i) => i + 1).filter((i) => n % i === 0);
const getalbegrip = {
  0() {
    const r = Math.random();
    if (r < 0.4) {
      const n = noZeroDigits(4), i = rnd(1, 3), d = dig(n, i);
      if (String(n).split(String(d)).length > 2) return tpl('getalbegrip.0a', getalbegrip[0]());
      return tpl('getalbegrip.0b', { ...num(`Wat is die waarde van die ${d} in ${f(n)}?`, d * 10 ** i, [`Skryf ${f(n)} in 'n plekwaardetabel: D H T E.`, `Die ${d} staan by die ${PL[i]}.`, `Dus is dit ${f(d * 10 ** i)} werd.`], { wrong: [W(d, 'Jy het net die syfer gegee, nie sy waarde nie.', `Die ${d} staan by die ${PL[i]}: dit is ${d} ${PL[i]}.`)] }),
        guide: [stC(`In watter plek staan die ${d}?`, PL.slice(0, 4), i, 'Tel van regs: ene, tiene, honderde, duisende.')], guideFinal: `Hoeveel is ${d} ${PL[i]}?` });
    }
    if (r < 0.8) {
      let n = rnd(110, 990) + (Math.random() < 0.3 ? 5 - (rnd(110, 990) % 10) : 0); if (n % 10 === 0) n += rnd(1, 9); const lo = Math.floor(n / 10) * 10;
      const ans = n % 10 >= 5 ? lo + 10 : lo;
      return tpl('getalbegrip.0c', { ...num(`Rond ${n} af tot die naaste 10.`, ans, [`${n} lê tussen ${lo} en ${lo + 10}.`, `Kyk na die ene: ${n % 10}. ${n % 10 >= 5 ? '5 of meer: rond op' : 'Minder as 5: rond af'}.`, `Antwoord: ${ans}.`], { visual: { kind: 'line', from: lo, to: lo + 10, mark: n, ticks: [lo, lo + 5, lo + 10] } }),
        guide: [st(`Tussen watter tiene lê ${n}? Die kleinste is …`, lo, 'Vervang die ene met 0.')], guideFinal: `Is die ene (${n % 10}) 5 of meer? Dan op na ${lo + 10}, anders af na ${lo}` });
    }
    const base = rnd(2, 8) * 1000 + rnd(1, 8) * 100, opts = shuffle([base + rnd(10, 99), base + rnd(1, 9), base - 100 + rnd(10, 99), base + 100 + rnd(1, 9)]);
    const mx = Math.max(...opts);
    return tpl('getalbegrip.0d', { ...choice(`Watter getal is die grootste? ${list(opts)}`, opts.map((x) => f(x)), opts.indexOf(mx), ['Vergelyk eers die duisende, dan die honderde, dan die tiene.', `${f(mx)} is die grootste.`]),
      guide: [st(`Hoeveel duisende het al die getalle?`, Math.floor(base / 1000), 'Kyk na die eerste syfer.')], guideFinal: 'Vergelyk nou die honderde' });
  },
  1() {
    const r = Math.random();
    if (r < 0.35) {
      const to = pick([5, 100, 1000]), n = to === 5 ? rnd(101, 999) : to === 100 ? rnd(1001, 9999) : rnd(10001, 99999);
      const ans = Math.round(n / to) * to, lo = Math.floor(n / to) * to;
      const word = to === 5 ? '5' : f(to);
      return tpl('getalbegrip.1a', { ...num(`Rond ${f(n)} af tot die naaste ${word}.`, ans, [`${f(n)} lê tussen ${f(lo)} en ${f(lo + to)}.`, `Die middel is ${f(lo + to / 2)}. ${n >= lo + to / 2 ? 'Op of verby die middel: rond op' : 'Voor die middel: rond af'}.`, `Antwoord: ${f(ans)}.`], { visual: { kind: 'line', from: lo, to: lo + to, mark: n, ticks: [lo, lo + to / 2, lo + to] } }),
        guide: [st(`Tussen watter twee veelvoude van ${word} lê ${f(n)}? Die kleinste is …`, lo, to === 5 ? 'Tel terug na die naaste 0 of 5.' : 'Vervang die syfers regs met nulle.')], guideFinal: `Is ${f(n)} nader aan ${f(lo)} of aan ${f(lo + to)}?` });
    }
    if (r < 0.7) {
      const n = pick([12, 16, 18, 20, 24, 30, 36]), fs = factors(n);
      return tpl('getalbegrip.1b', { ...num(`Hoeveel faktore het ${n}?`, fs.length, [`Soek pare wat saam ${n} gee: ${fs.filter((x) => x * x <= n).map((x) => `${x} × ${n / x}`).join('; ')}.`, `Die faktore: ${list(fs)}. Dit is ${fs.length}.`], { wrong: [W(fs.length - 2, 'Jy het 1 en die getal self vergeet.', `1 en ${n} is ook faktore: 1 × ${n} = ${n}.`)] }),
        guide: [stC(`Is 1 'n faktor van ${n}?`, ['ja', 'nee'], 0, `1 × ${n} = ${n}.`), st(`Watter getal × 2 = ${n}?`, n / 2, `Die helfte van ${n}.`)], guideFinal: 'Skryf al die pare neer en tel die faktore' });
    }
    const th = rnd(2, 9), h = rnd(1, 9), e = rnd(1, 9), n = th * 1000 + h * 100 + e;
    return tpl('getalbegrip.1c', { ...num(`Skryf die getal: ${th} duisende, ${h} honderde, 0 tiene en ${e} ene.`, n, [`Plekwaardetabel: D = ${th}, H = ${h}, T = 0, E = ${e}.`, `${th * 1000} + ${h * 100} + ${e} = ${f(n)}.`], { wrong: [W(th * 100 + h * 10 + e, 'Jy het die 0 by die tiene vergeet.', 'Elke plek kry \'n syfer, ook as dit 0 is.')] }),
      guide: [st(`${th} duisende + ${h} honderde = ?`, th * 1000 + h * 100, 'Skryf albei as getalle (bv. 3 duisende = 3 000, 4 honderde = 400) en tel hulle op.')], guideFinal: `Tel nou die tiene (0) en ene (${e}) by` });
  },
  2() {
    const r = Math.random();
    if (r < 0.35) {
      const p = pick(PRIEM), others = shuffle(SAAMGESTEL).slice(0, 3);
      return tpl('getalbegrip.2a', { ...choice('Watter getal is \'n priemgetal?', [p, ...others].map(String), 0, ['\'n Priemgetal het net twee faktore: 1 en homself.', ...others.map((x) => { const d = factors(x).find((k) => k > 1); return `${x} = ${d} × ${x / d}: nie \'n priemgetal nie.`; }), `${p} het net 1 en ${p} as faktore.`]),
        guide: [stC(`Is ${others[0]} deelbaar deur 3, 7 of 9? (Probeer.)`, ['ja', 'nee'], 0, 'Gebruik die deelbaarheidsreëls.')], guideFinal: 'Watter getal het net 1 en homself as faktore?' });
    }
    if (r < 0.7) {
      const n = rnd(120000, 989999), ans = Math.round(n / 1000) * 1000, lo = Math.floor(n / 1000) * 1000;
      return tpl('getalbegrip.2b', { ...num(`Rond ${f(n)} af tot die naaste 1 000.`, ans, [`Onderstreep die duisende. Kyk na die honderde: ${dig(n, 2)}.`, `${dig(n, 2) >= 5 ? '5 of meer: rond op' : 'Minder as 5: rond af'}: ${f(ans)}.`]),
        guide: [st(`Wat is die syfer by die honderde in ${f(n)}?`, dig(n, 2), 'Die derde syfer van regs.')], guideFinal: `${dig(n, 2) >= 5 ? 'Op' : 'Af'}: ${f(lo)} of ${f(lo + 1000)}?` });
    }
    const k = rnd(6, 9), above = rnd(40, 90), ans = Math.ceil((above + 1) / k) * k;
    return tpl('getalbegrip.2c', { ...num(`Wat is die kleinste veelvoud van ${k} wat groter as ${above} is?`, ans, [`Die veelvoude van ${k} is die getalle in die maaltafel van ${k}.`, `${k} × ${ans / k - 1} = ${ans - k} (nie groter nie), ${k} × ${ans / k} = ${ans}.`]),
      guide: [st(`${k} × ${Math.floor(above / k)} = ?`, k * Math.floor(above / k), `Tafel van ${k}.`)], guideFinal: `Die volgende veelvoud: ${k * Math.floor(above / k)} + ${k}` });
  },
  3() {
    const r = Math.random();
    if (r < 0.3) {
      const g0 = rnd(2, 15), [ka, kb] = pick([[2, 5], [2, 7], [2, 9], [3, 5], [3, 7], [4, 5], [4, 7], [4, 9], [3, 4], [5, 6]]), a = g0 * ka, b = g0 * kb;
      const G = gcd(a, b);
      return tpl('getalbegrip.3a', { ...num(`Wat is die GGF (grootste gemene faktor) van ${a} en ${b}?`, G, [`Faktore van ${a}: ${list(factors(a))}.`, `Faktore van ${b}: ${list(factors(b))}.`, `Die grootste faktor wat in albei lyste voorkom: ${G}.`]),
        guide: [stC(`Is ${[2, 3, 5, 7, 11, 13].find((p) => G % p === 0) || G} 'n faktor van albei?`, ['ja', 'nee'], 0, 'Kyk of dit sonder res in albei deel.')], guideFinal: 'Skryf die faktore van albei neer; watter is die grootste wat in albei voorkom?' });
    }
    if (r < 0.55) {
      const [a, b] = pick([[4, 6], [6, 8], [6, 9], [8, 12], [10, 15], [9, 12], [4, 10], [6, 10], [8, 10], [12, 18], [6, 15], [4, 14], [10, 12], [8, 14], [9, 15], [12, 16], [3, 4], [5, 6], [6, 14], [15, 20]]), L = lcm(a, b);
      return tpl('getalbegrip.3b', { ...num(`Wat is die KGV (kleinste gemene veelvoud) van ${a} en ${b}?`, L, [`Veelvoude van ${a}: ${list(Array.from({ length: L / a }, (_, i) => a * (i + 1)))} …`, `Veelvoude van ${b}: ${list(Array.from({ length: L / b }, (_, i) => b * (i + 1)))} …`, `Die kleinste veelvoud wat in albei lyste voorkom: ${L}.`], { wrong: [W(a * b, 'Jy het die getalle net met mekaar gemaal: dit is wel \'n gemene veelvoud, maar nie die kleinste nie.', 'Skryf die veelvoude van albei uit en soek die eerste een wat in albei voorkom.')] }),
        guide: [st(`Begin by die groter getal. Die tweede veelvoud van ${b}: 2 × ${b} = ?`, 2 * b, `${b} + ${b}.`)], guideFinal: `Gaan verder in die tafel van ${b} (${b}; ${2 * b}; ${3 * b} …): watter een is die eerste wat ook in die tafel van ${a} is?` });
    }
    if (r < 0.8) {
      const sq = Math.random() < 0.6, n = sq ? rnd(2, 15) : rnd(2, 6);
      return tpl('getalbegrip.3c', { ...num(`${n}${sq ? '²' : '³'} =`, sq ? n * n : n ** 3, [sq ? `${n}² beteken ${n} × ${n}.` : `${n}³ beteken ${n} × ${n} × ${n}.`, `= ${sq ? n * n : n ** 3}`], { wrong: [W(sq ? n * 2 : n * 3, `Jy het ${n} × ${sq ? 2 : 3} gereken.`, `Die klein getalletjie sê hoeveel keer ${n} met homself gemaal word.`)] }),
        guide: sq ? [] : [st(`${n} × ${n} = ?`, n * n, 'Eers twee.')], guideFinal: sq ? `${n} × ${n}` : `${n * n} × ${n}` });
    }
    const t0 = -rnd(1, 9), up = rnd(5, 18), dorp = pick(['Sutherland', 'Fraserburg', 'Molteno', 'Barkly-Oos', 'Bethlehem', 'Hogsback']), uur = pick([5, 6, 7]);
    return tpl('getalbegrip.3d', { ...num(`Om ${uur} uur die oggend is dit ${f(t0)} °C in ${dorp}. Teen middag het die temperatuur met ${up} grade gestyg. Wat is die temperatuur nou?`, t0 + up, t0 + up >= 0 ? [`Begin by ${f(t0)} op die getallelyn.`, `${-t0} grade tot by 0, dan nog ${up + t0} grade: ${t0 + up} °C.`] : [`Begin by ${f(t0)} op die getallelyn.`, `Tot by 0 is ${-t0} grade, maar dit styg net ${up} grade: dit bly onder 0.`, `${-t0} − ${up} = ${-(t0 + up)}, dus ${f(t0 + up)} °C.`], { unit: '°C', visual: { kind: 'line', from: t0, to: t0 + up + 2, ticks: [t0, 0, t0 + up + 2], unit: '°C' } }),
      guide: [st(`Hoeveel grade is dit van ${f(t0)} tot 0?`, -t0, 'Tel op die getallelyn.')], guideFinal: t0 + up >= 0 ? `En dan nog ${up} − ${-t0} grade bo 0` : `Die styging (${up}) is kleiner as ${-t0}: hoeveel grade bly dit onder 0?` });
  },
};

const breuke = {
  0() {
    const r = Math.random();
    if (r < 0.5) {
      const d = pick([2, 3, 4, 5, 10]), q = rnd(2, 9), m = d * q;
      return tpl('breuke.0a', { ...num(`Wat is 1/${d} van ${m}?`, q, [`Verdeel ${m} in ${d} ewe groot groepe.`, `${m} ÷ ${d} = ${q}.`]),
        guide: [stC(`In hoeveel ewe groot groepe verdeel jy ${m}?`, [String(d), String(m), String(d + 1)], 0, 'Die noemer sê in hoeveel groepe.')], guideFinal: `${m} ÷ ${d}` });
    }
    if (r < 0.75) {
      const d = pick([3, 4, 5, 6, 8]), n = rnd(1, d - 1);
      return tpl('breuke.0b', { ...frac('Watter breuk van die sirkel is ingekleur?', [n, d], [`Die sirkel is in ${d} ewe groot dele verdeel: die noemer is ${d}.`, `${n} dele is ingekleur: die teller is ${n}.`, `Dus ${n}/${d}.`, ...(gcd(n, d) > 1 ? [`Dit is dieselfde as ${fracStr([n, d])} (albei gedeel deur ${gcd(n, d)}). Albei is reg!`] : [])], { visual: { kind: 'pizza', parts: d, eaten: n } }),
        guide: [st('In hoeveel ewe groot dele is die sirkel verdeel?', d, 'Tel al die stukke.')], guideFinal: 'Hoeveel dele is ingekleur? Skryf dit bo die streep' });
    }
    const d = pick([5, 6, 8, 10]), a = rnd(1, d - 1); let b = rnd(1, d - 1); if (b === a) b = a === 1 ? 2 : a - 1;
    return tpl('breuke.0c', { ...choice(`Watter breuk is die grootste: ${a}/${d} of ${b}/${d}?`, [`${a}/${d}`, `${b}/${d}`], a > b ? 0 : 1, [`Die noemer is dieselfde: die dele is ewe groot.`, `Meer dele = groter: ${Math.max(a, b)}/${d}.`]),
      guide: [stC('Is die dele ewe groot?', ['ja', 'nee'], 0, 'Kyk na die noemer.')], guideFinal: 'Watter breuk het meer dele?' });
  },
  1() {
    const r = Math.random();
    if (r < 0.4) {
      const d = pick([3, 4, 5, 8, 10]), n = rnd(2, d - 1), q = rnd(3, 12), m = d * q;
      return tpl('breuke.1a', { ...num(`Wat is ${n}/${d} van ${m}?`, n * q, [`Eers 1/${d} van ${m}: ${m} ÷ ${d} = ${q}.`, `Dan ${n}/${d}: ${q} × ${n} = ${n * q}.`], { wrong: [W(q, `Jy het net 1/${d} uitgereken.`, `Jy wil ${n} van die ${d} dele hê: maal met ${n}.`)] }),
        guide: [st(`Eers 1/${d} van ${m}: ${m} ÷ ${d} = ?`, q, `Verdeel ${m} in ${d} groepe.`)], guideFinal: `Neem nou ${n} van daardie groepe: ${q} × ${n}` });
    }
    if (r < 0.7) {
      const [a, b] = pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5]]), k = rnd(2, 4);
      return tpl('breuke.1b', { ...num(`${a}/${b} = □/${b * k}. Watter getal hoort in die □?`, a * k, [`${b} × ${k} = ${b * k}: die noemer is met ${k} gemaal.`, `Maal die teller ook met ${k}: ${a} × ${k} = ${a * k}.`], { wrong: [W(a + (b * k - b), 'Jy het iets bygetel in plaas van gemaal.', 'Ekwivalente breuke: maal teller én noemer met dieselfde getal.')] }),
        guide: [st(`Met hoeveel is die noemer gemaal? ${b} × ? = ${b * k}`, k, `Tafel van ${b}.`)], guideFinal: `Maal die teller met dieselfde getal: ${a} × ${k}` });
    }
    const d = pick([5, 7, 8, 9]), a = rnd(1, d - 3), b = rnd(1, d - a - 1);
    return tpl('breuke.1c', { ...frac(`${a}/${d} + ${b}/${d} =`, [a + b, d], [`Die noemer is dieselfde (${d}): die dele is ewe groot.`, `Tel net die tellers op: ${a} + ${b} = ${a + b}.`, `${a + b}/${d}.`], { visual: { kind: 'strips', fracs: [[a, d], [b, d]] }, wrong: [W([a + b, 2 * d], 'Jy het die noemers ook opgetel.', 'Die dele bly ewe groot: die noemer bly dieselfde.')] }),
      guide: [st('Tel die tellers op: ' + `${a} + ${b} = ?`, a + b, 'Net die getalle bo die streep.')], guideFinal: `Skryf die breuk met noemer ${d}` });
  },
  2() {
    const r = Math.random();
    if (r < 0.4) {
      const [b, k] = pick([[2, 2], [2, 3], [3, 2], [4, 2], [2, 4], [3, 3], [5, 2]]), D = b * k, a = rnd(1, b - 1), c = rnd(1, D - 1 - a * k > 0 ? D - 1 - a * k : 1), plus = a * k + c < D || Math.random() < 0.3;
      if (plus) return tpl('breuke.2a', { ...frac(`${a}/${b} + ${c}/${D} =`, [a * k + c, D], [`Maak die noemers dieselfde: ${a}/${b} = ${a * k}/${D}.`, `${a * k}/${D} + ${c}/${D} = ${a * k + c}/${D}.`], { visual: { kind: 'strips', fracs: [[a, b], [c, D]] }, wrong: [W([a + c, b + D], 'Jy het tellers én noemers opgetel.', 'Maak eers die noemers dieselfde; tel dan net die tellers op.')] }),
        guide: [st(`${a}/${b} = □/${D}. Wat is die □?`, a * k, a === 1 ? `Met watter getal kom jy van ${b} by ${D}? Maal die teller met dieselfde getal.` : `${b} × ${k} = ${D}, dus maal die teller ook met ${k}.`)], guideFinal: `Tel nou die tellers op: ${a * k}/${D} + ${c}/${D}` });
      const bigger = a * k > c ? [a * k, c] : null;
      if (bigger) return tpl('breuke.2b', { ...frac(`${a}/${b} − ${c}/${D} =`, [a * k - c, D], [`Maak die noemers dieselfde: ${a}/${b} = ${a * k}/${D}.`, `${a * k}/${D} − ${c}/${D} = ${a * k - c}/${D}.`], { visual: { kind: 'strips', fracs: [[a, b], [c, D]] } }),
        guide: [st(`${a}/${b} = □/${D}. Wat is die □?`, a * k, a === 1 ? `Met watter getal kom jy van ${b} by ${D}? Maal die teller met dieselfde getal.` : `Maal teller en noemer met ${k}.`)], guideFinal: `Trek die tellers af: ${a * k}/${D} − ${c}/${D}` });
    }
    if (r < 0.7) {
      const d = pick([3, 4, 5]), w1 = rnd(1, 4), w2 = rnd(1, 3), a = rnd(1, d - 2), b = rnd(1, d - 1 - a);
      return tpl('breuke.2c', { ...frac(`${w1} ${a}/${d} + ${w2} ${b}/${d} =`, [(w1 + w2) * d + a + b, d], [`Tel eers die heelgetalle: ${w1} + ${w2} = ${w1 + w2}.`, `Dan die breuke: ${a}/${d} + ${b}/${d} = ${a + b}/${d}.`, `Saam: ${w1 + w2} ${a + b}/${d}.`]),
        guide: [st(`Tel eers die heelgetalle: ${w1} + ${w2} = ?`, w1 + w2, 'Net die heelgetalle.'), stF(`Dan die breuke: ${a}/${d} + ${b}/${d} = ?`, [a + b, d], 'Die noemer bly dieselfde.')], guideFinal: 'Sit die heelgetal en die breuk saam' });
    }
    const d = pick([4, 5, 8, 10]), n = rnd(2, d - 1), m = d * rnd(10, 60);
    return tpl('breuke.2d', { ...num(`${pick(NAMES)} kry ${R(m)} vir 'n verjaardag en spaar ${n}/${d} daarvan. Hoeveel geld word gespaar?`, n * m / d,
      [`1/${d} van ${R(m)}: ${m} ÷ ${d} = ${m / d}.`, `${n}/${d}: ${m / d} × ${n} = ${R(n * m / d)}.`], { money: true, wrong: [W(m / d, `Jy het net 1/${d} uitgereken.`, `Maal nog met ${n}.`)] }),
      guide: [st(`Eers 1/${d}: ${m} ÷ ${d} = ?`, m / d, `Deel in ${d} ewe groot dele.`, { money: true })], guideFinal: `Maal dan met ${n}` });
  },
  3() {
    const r = Math.random();
    if (r < 0.35) {
      const [b, d] = pick([[3, 4], [2, 5], [3, 5], [4, 6], [6, 8], [3, 8]]), a = pick([1, 2, 3, 4, 5].filter((x) => x < b && gcd(x, b) === 1)), c = pick([1, 2, 3, 4, 5, 7].filter((x) => x < d && gcd(x, d) === 1)), L = lcm(b, d);
      return tpl('breuke.3a', { ...frac(`${a}/${b} + ${c}/${d} =`, [a * (L / b) + c * (L / d), L], [`KGV van ${b} en ${d} is ${L}.`, `${a}/${b} = ${a * (L / b)}/${L} en ${c}/${d} = ${c * (L / d)}/${L}.`, `Saam: ${a * (L / b) + c * (L / d)}/${L} = ${fracStr([a * (L / b) + c * (L / d), L])}.`], { wrong: [W([a + c, b + d], 'Jy het tellers én noemers opgetel.', 'Soek eers \'n gemene noemer: die KGV van die noemers.')] }),
        guide: [{ ...st(`Wat is die KGV (kleinste gemene veelvoud) van ${b} en ${d}?`, L, `Skryf die veelvoude van ${Math.max(b, d)} uit; watter een is ook deelbaar deur ${Math.min(b, d)}?`), commonMultipleOf: [b, d] }, st(`${a}/${b} = □/${L}. Wat is die □?`, a * (L / b), a === 1 ? `Met watter getal kom jy van ${b} by ${L}? Maal die teller met dieselfde getal.` : `Maal teller en noemer met ${L / b}.`), st(`${c}/${d} = □/${L}. Wat is die □?`, c * (L / d), c === 1 ? `Met watter getal kom jy van ${d} by ${L}? Maal die teller met dieselfde getal.` : `Maal teller en noemer met ${L / d}.`)], guideFinal: 'Tel die tellers op en vereenvoudig as dit kan' });
    }
    if (r < 0.65) {
      const [a, b] = pick([[2, 3], [3, 4], [1, 2], [2, 5], [3, 5]]), [c, d] = pick([[3, 4], [2, 3], [5, 6], [1, 2], [4, 5]]);
      const ans = [a * c / gcd(a * c, b * d), b * d / gcd(a * c, b * d)];
      return tpl('breuke.3b', { ...frac(`${a}/${b} × ${c}/${d} = (eenvoudigste vorm)`, ans, [`Teller × teller: ${a} × ${c} = ${a * c}.`, `Noemer × noemer: ${b} × ${d} = ${b * d}.`, (gcd(a * c, b * d) > 1 ? `${a * c}/${b * d} = ${fracStr(ans)} (deel deur ${gcd(a * c, b * d)}).` : `${a * c}/${b * d} kan nie verder vereenvoudig word nie.`)], { requireSimplest: true }),
        guide: [st(`Teller × teller: ${a} × ${c} = ?`, a * c, 'Die getalle bo die streep.'), st(`Noemer × noemer: ${b} × ${d} = ?`, b * d, 'Die getalle onder die streep.')], guideFinal: `Vereenvoudig ${a * c}/${b * d}: deel teller en noemer deur dieselfde getal` });
    }
    if (r < 0.85) {
      const [n0, d0] = pick([[3, 4], [2, 3], [3, 5], [5, 6], [4, 5], [2, 7], [1, 3], [1, 4], [3, 7], [5, 8], [7, 9], [3, 10], [4, 9], [5, 7]]), k = rnd(2, 9), n = n0 * k, d = d0 * k;
      return tpl('breuke.3c', { ...frac(`Skryf ${n}/${d} in die eenvoudigste vorm.`, [n0, d0], [`Die GGF van ${n} en ${d} is ${k}.`, `${n} ÷ ${k} = ${n0} en ${d} ÷ ${k} = ${d0}.`, `${n0}/${d0}.`], { requireSimplest: true }),
        guide: [st(`Wat is die GGF van ${n} en ${d}?`, k, 'Die grootste getal wat in albei deel.')], guideFinal: `Deel teller en noemer deur ${k}` });
    }
    const d = pick([3, 4, 5, 6, 7, 8]), w = rnd(2, 9), rr = pick([1, 2, 3, 4, 5, 6, 7].filter((x) => x < d && gcd(x, d) === 1)), n = w * d + rr;
    return tpl('breuke.3d', { ...choice(`Skryf ${n}/${d} as 'n gemengde getal.`, [`${w} ${rr}/${d}`, `${w + 1} ${rr}/${d}`, `${rr} ${w}/${d}`, `${w} ${d - rr}/${d}`], 0, [`${n} ÷ ${d} = ${w} res ${rr}.`, `${w} heelgetalle en ${rr}/${d} oor: ${w} ${rr}/${d}.`]),
      guide: [st(`Hoeveel heelgetalle? ${n} ÷ ${d} = ? (sonder die res)`, w, `Hoeveel keer gaan ${d} in ${n}?`), st('En die res?', rr, `${n} − ${w * d}.`)], guideFinal: 'Kies die gemengde getal' });
  },
};

const desimale = {
  0() {
    const r = Math.random();
    if (r < 0.5) {
      const rand = rnd(1, 9), c = rnd(5, 95);
      return tpl('desimale.0a', { ...num(`Hoeveel sent is R${rand},${String(c).padStart(2, '0')}?`, rand * 100 + c, [`R1 = 100 sent, dus R${rand} = ${rand * 100} sent.`, `${rand * 100} + ${c} = ${rand * 100 + c} sent.`], { unit: 'sent', wrong: [W(rand + c, 'Jy het net die rande en die sent bymekaargetel.', 'R1 is 100 sent.')] }),
        guide: [st(`Hoeveel sent is R${rand}?`, rand * 100, 'Elke rand is ewe veel sent. Hoeveel sent is een rand? Maal met die aantal rande.')], guideFinal: `Tel die ${c} sent by` });
    }
    const a = rnd(2, 15) * 100 + pick([25, 50, 75]), b = rnd(1, 9) * 100 + pick([25, 50, 75]);
    return tpl('desimale.0b', { ...num(`${R(a / 100)} + ${R(b / 100)} =`, (a + b) / 100, [`Rande: ${Math.floor(a / 100)} + ${Math.floor(b / 100)} = ${Math.floor(a / 100) + Math.floor(b / 100)}.`, `Sent: ${a % 100} + ${b % 100} = ${(a % 100) + (b % 100)}${(a % 100) + (b % 100) >= 100 ? ' = R1 en ' + ((a + b) % 100) + ' sent' : ''}.`, `Saam: ${R((a + b) / 100)}.`], { money: true }),
      guide: [st(`Tel die sent op: ${a % 100} + ${b % 100} = ?`, (a % 100) + (b % 100), 'Tel eers die tiene sent op, dan die ene sent.')], guideFinal: `Tel die rande by (plus R1 as die sent saam 100 of meer is)` });
  },
  1() {
    const r = Math.random();
    if (r < 0.4) {
      const n = rnd(1, 9);
      return tpl('desimale.1a', { ...num(`Skryf ${n}/10 as 'n desimale breuk.`, n / 10, [`${n}/10 is ${n} tiendes.`, `Tiendes staan op die eerste plek ná die komma: 0,${n}.`], { wrong: [W(n * 10, 'Jy het die getal groter gemaak.', 'Tiendes is kleiner as 1: dit kom ná die komma.')] }),
        guide: [stC('Is die antwoord groter of kleiner as 1?', ['kleiner', 'groter'], 0, `${n} uit 10 dele: minder as een geheel.`)], guideFinal: `Skryf ${n} tiendes as 'n desimale breuk` });
    }
    if (r < 0.75) {
      const w = rnd(1, 9), n = rnd(11, 99);
      return tpl('desimale.1b', { ...num(`Skryf ${w} ${n}/100 as 'n desimale breuk.`, w + n / 100, [`${w} is die heelgetal, en ${n}/100 is ${n} honderdstes.`, `${w},${n}`]),
        guide: [st(`Hoeveel heelgetalle?`, w, 'Die heelgetal is die getal vóór die breuk.')], guideFinal: `Skryf ${w}, en dan die ${n} honderdstes ná die komma` });
    }
    const base = rnd(1, 8), opts = [base + 0.3, base + 0.25, base + 0.05, base + 0.35];
    const mx = Math.max(...opts);
    return tpl('desimale.1c', { ...choice(`Watter getal is die grootste? ${opts.map((x) => f(x)).join('; ')}`, opts.map((x) => f(x)), opts.indexOf(mx), ['Maak die aantal syfers ná die komma gelyk: 0,30; 0,25; 0,05; 0,35.', `Dink aan geld: 35c is die meeste. ${f(mx)} is die grootste.`]),
      guide: [st(`Skryf ${f(base + 0.3)} met twee syfers ná die komma: hoeveel honderdstes is dit? (net die deel ná die komma)`, 30, 'Sit ’n 0 agter: dit verander nie die waarde nie. Lees dan net die deel ná die komma.')], guideFinal: 'Vergelyk nou die honderdstes' });
  },
  2() {
    const r = Math.random();
    if (r < 0.45) {
      const a = round(rnd(100, 2500) / 100), b = round(rnd(10, 990) / 100 + (Math.random() < 0.5 ? rnd(1, 9) : 0)), plus = Math.random() < 0.6 || b >= a;
      const A = Math.round(a * 100), B = Math.round(b * 100);
      if (plus) return tpl('desimale.2a', { ...num(`${f(a)} + ${f(b)} =`, (A + B) / 100, [`Skryf in kolomme met die kommas onder mekaar: ${f(a, 2)} + ${f(b, 2)}.`, `Tel op soos gewone getalle: ${A} + ${B} = ${A + B} honderdstes.`, `= ${f((A + B) / 100)}`], { wrong: [W(round(a + b / 10), 'Die kommas was nie onder mekaar nie.', 'Kommas presies onder mekaar; vul aan met 0.')] }),
        guide: [...(() => { const k = [a, b].find((v) => Math.round(v * 100) % 10 === 0); return k != null ? [stC(`Skryf ${f(k)} met twee syfers ná die komma.`, [f(k, 2), f(k * 10, 1), f(k / 10, 3)], 0, 'Sit \'n 0 agter: dit verander niks aan die getal nie.')] : []; })(), st(`Honderdstes: ${A % 10} + ${B % 10} = ?`, (A % 10) + (B % 10), 'Begin by die laaste kolom.')], guideFinal: 'Tel die res van die kolomme op en sit die komma onder die kommas' });
      return tpl('desimale.2b', { ...num(`${f(a)} − ${f(b)} =`, (A - B) / 100, [`Kommas onder mekaar: ${f(a, 2)} − ${f(b, 2)}.`, `${A} − ${B} = ${A - B} honderdstes = ${f((A - B) / 100)}.`]),
        guide: (() => { const k = [a, b].find((v) => Math.round(v * 100) % 10 === 0); return k != null ? [stC(`Skryf ${f(k)} met twee syfers ná die komma.`, [f(k, 2), f(k * 10, 1)], 0, 'Sit \'n 0 agter: dit verander niks aan die getal nie.')] : [st(`Reken sonder die kommas: ${A} − ${B} = ?`, A - B, 'Trek in kolomme af, van regs na links.')]; })(), guideFinal: 'Trek in kolomme af; skryf die komma onder die kommas' });
    }
    if (r < 0.75) {
      const a = round(rnd(101, 999) / 100), m = pick([10, 100]);
      return tpl('desimale.2c', { ...num(`${f(a)} × ${m} =`, a * m, [`× ${m}: elke syfer skuif ${m === 10 ? 'een plek' : 'twee plekke'} na links in die plekwaardetabel (na die groter plekke); die getal word ${m} keer groter.`, `${f(a)} × ${m} = ${f(a * m)}`], { wrong: [W(round(a / m), 'Jy het die getal kleiner gemaak.', `× ${m} maak die getal groter.`), W(round(a * (m === 10 ? 100 : 10)), `Jy het ${m === 10 ? 'twee plekke' : 'een plek'} geskuif.`, `× ${m}: elke syfer ${m === 10 ? 'een plek' : 'twee plekke'} na links (die getal word groter).`)] }),
        guide: [stC(`Hoeveel plekke skuif die syfers?`, ['1', '2', '3'], m === 10 ? 0 : 1, `${m} het ${m === 10 ? 'een nul' : 'twee nulle'}.`)], guideFinal: `Skuif die syfers en skryf die nuwe getal` });
    }
    const n = round(rnd(101, 999) / 100), i = pick([1, 2]), d = i === 1 ? Math.floor(n * 10) % 10 : Math.round(n * 100) % 10;
    if (!d || String(n).split(String(d)).length > 2) return tpl('desimale.2d', desimale[2]());
    return tpl('desimale.2e', { ...choice(`Wat is die waarde van die ${d} in ${f(n)}?`, [`${d} tiendes`, `${d} honderdstes`, `${d} ene`, `${d} tiene`], i === 1 ? 0 : 1, ['Die eerste plek ná die komma is tiendes, die tweede is honderdstes.', `Die ${d} staan op plek ${i} ná die komma.`]),
      guide: [st(`Op watter plek ná die komma staan die ${d}? (1 of 2)`, i, 'Tel die plekke van die komma af na regs: die eerste plek, dan die tweede plek.')], guideFinal: 'Plek 1 = tiendes, plek 2 = honderdstes' });
  },
  3() {
    const r = Math.random();
    if (r < 0.35) {
      const t = rnd(2, 9), k = rnd(3, 9);
      return tpl('desimale.3a', { ...num(`0,${t} × ${k} =`, (t * k) / 10, [`0,${t} is ${t} tiendes.`, `${t} tiendes × ${k} = ${t * k} tiendes.`, `${t * k} tiendes = ${f((t * k) / 10)}.`], { wrong: [W((t * k) / 100, 'Die komma staan een plek te ver.', `Dink in tiendes: ${t} tiendes × ${k} = ${t * k} tiendes.`)] }),
        guide: [st(`${t} tiendes × ${k} = ? tiendes`, t * k, `${t} × ${k}.`)], guideFinal: `Skryf ${t * k} tiendes as 'n desimale breuk` });
    }
    if (r < 0.65) {
      const w = rnd(2, 9), t = rnd(1, 9), h = rnd(1, 9), k = pick([20, 30, 40]), a = w + t / 10 + h / 100;
      return tpl('desimale.3b', { ...num(`${f(a)} × ${k} =`, a * k, [`Uitgebreide notasie: (${w} × ${k}) + (0,${t} × ${k}) + (0,0${h} × ${k}).`, `= ${w * k} + ${f((t * k) / 10)} + ${f((h * k) / 100)}`, `= ${f(a * k)}`]),
        guide: [st(`${w} × ${k} = ?`, w * k, 'Eers die heelgetal.'), st(`0,${t} × ${k} = ?`, (t * k) / 10, `0,${t} is ${t} tiendes: reken ${t} × ${k} tiendes en skryf dit as ’n desimale getal.`), st(`0,0${h} × ${k} = ?`, (h * k) / 100, `0,0${h} is ${h} honderdstes: reken ${h} × ${k} honderdstes en skryf dit as ’n desimale getal.`)], guideFinal: 'Tel die drie deelprodukte op' });
    }
    if (r < 0.85) {
      const k = rnd(3, 8), q = round(rnd(11, 49) / 10), a = round(q * k), mens = pick(NAMES);
      return tpl('desimale.3c', { ...num(`${mens} en ${k - 1} maats deel 'n ${f(a)} m lange tou gelyk. Hoe lank is elke stuk?`, q, [`${f(a)} ÷ ${k}: dink in tiendes: ${Math.round(a * 10)} tiendes ÷ ${k} = ${Math.round(q * 10)} tiendes.`, `= ${f(q)} m`], { unit: 'm', wrong: [W(a / (k - 1) === q ? -1 : round(a / (k - 1)), `Jy het deur ${k - 1} gedeel.`, `${mens} kry ook 'n stuk: dit is ${k} mense.`)].filter((w) => w.answer >= 0) }),
        guide: [st(`Hoeveel mense deel die tou?`, k, `${mens} plus ${k - 1} maats.`), st(`Hoeveel tiendes is ${f(a)}?`, Math.round(a * 10), '1 = 10 tiendes.')], guideFinal: `Deel die tiendes deur ${k} en skryf weer as desimaal` });
    }
    const a = round(rnd(1001, 9999) / 1000), ans = Math.round(a * 10) / 10;
    return tpl('desimale.3d', { ...num(`Rond ${f(a)} af tot een desimale plek.`, ans, [`Kyk na die tweede syfer ná die komma: ${Math.floor(a * 100) % 10}.`, `${Math.floor(a * 100) % 10 >= 5 ? '5 of meer: op' : 'Minder as 5: af'}: ${ans.toFixed(1).replace('.', ',')}.`], { display: ans.toFixed(1).replace('.', ',') }),
      guide: [st(`Wat is die tweede syfer ná die komma in ${f(a)}?`, Math.floor(a * 100) % 10, 'Die eerste syfer ná die komma is die tiendes, die tweede die honderdstes.')], guideFinal: 'Rond die tiendes op of af' });
  },
};

const persentasie = {
  0() {
    const n = rnd(11, 89);
    if (Math.random() < 0.5) return tpl('persentasie.0a', { ...num(`Op 'n 100-blokkie is ${n} van die 100 blokkies ingekleur. Watter persentasie is dit?`, n, [`Persent beteken "uit 100".`, `${n} uit 100 = ${n}%.`], { unit: '%' }),
      guide: [stC('Wat beteken persent?', ['uit 100', 'uit 10', 'uit 1 000'], 0, 'Per honderd.')], guideFinal: `${n} uit 100 is hoeveel persent?` });
    return tpl('persentasie.0b', { ...num(`Op 'n 100-blokkie is ${n} blokkies ingekleur. Watter persentasie is NIE ingekleur nie?`, 100 - n, [`Altesaam 100 blokkies.`, `100 − ${n} = ${100 - n}, dus ${100 - n}%.`], { unit: '%', wrong: [W(n, 'Dit is die deel wat wel ingekleur is.', 'Die vraag is hoeveel NIE ingekleur is nie.')] }),
      guide: [st(`Hoeveel blokkies is nie ingekleur nie? 100 − ${n} = ?`, 100 - n, 'Trek af van 100.')], guideFinal: 'Skryf dit as persentasie' });
  },
  1() {
    const [p, fr, dd] = pick([[50, '1/2', 2], [25, '1/4', 4], [10, '1/10', 10], [20, '1/5', 5]]);
    if (Math.random() < 0.15) return tpl('persentasie.1a', { ...choice(`Watter breuk is dieselfde as ${p}%?`, ['1/2', '1/4', '1/10', '1/5'], ['1/2', '1/4', '1/10', '1/5'].indexOf(fr), [`${p}% = ${p}/100.`, `${p}/100 = ${fr}.`]),
      guide: [st(`${p}% = □/100. Wat is die □?`, p, 'Persent = uit 100.')], guideFinal: `Vereenvoudig ${p}/100` });
    const m = dd * rnd(4, 60);
    if (Math.random() < 0.35) {
      const [wat, wie] = pick([['leerders', 'het \'n troeteldier'], ['bome', 'is doringbome'], ['skape', 'is swart'], ['kinders', 'speel netbal'], ['motors', 'is wit']]);
      return tpl('persentasie.1b', { ...num(`Daar is ${m} ${wat}. ${p}% daarvan ${wie}. Hoeveel is dit?`, m / dd, [`${p}% = ${fr}.`, `${fr} van ${m}: ${m} ÷ ${dd} = ${m / dd}.`]),
        guide: [stC(`Watter breuk is ${p}%?`, ['1/2', '1/4', '1/10', '1/5'], ['1/2', '1/4', '1/10', '1/5'].indexOf(fr), `${p} uit 100.`)], guideFinal: `${fr} van ${m}: deel deur ${dd}` });
    }
    return tpl('persentasie.1c', { ...num(`Wat is ${p}% van ${R(m)}?`, m / dd, [`${p}% = ${fr}.`, `${fr} van ${m}: ${m} ÷ ${dd} = ${R(m / dd)}.`], { money: true, wrong: [W(p, 'Jy het die persentasie self neergeskryf.', `${p}% is ${fr} van die bedrag.`)] }),
      guide: [stC(`Watter breuk is ${p}%?`, ['1/2', '1/4', '1/10', '1/5'], ['1/2', '1/4', '1/10', '1/5'].indexOf(fr), `${p} uit 100.`)], guideFinal: `${fr} van ${m}: deel deur ${dd}` });
  },
  2() {
    const r = Math.random();
    const [p, n, d] = pick([[25, 1, 4], [75, 3, 4], [20, 1, 5], [40, 2, 5], [10, 1, 10], [30, 3, 10], [50, 1, 2]]);
    if (r < 0.3) return tpl('persentasie.2a', { ...choice(`Watter breuk is dieselfde as ${p}%?`, [`${n}/${d}`, `${p}/10`, `${n}/${d * 10}`, `${d}/${n}`], 0, [`${p}% = ${p}/100.`, `Vereenvoudig: ${p}/100 = ${n}/${d}.`]),
      guide: [st(`${p}% = □/100. Wat is die □?`, p, 'Persent = uit 100.')], guideFinal: `Vereenvoudig ${p}/100` });
    const m = d * rnd(5, 60) * (d === 10 ? 1 : 2);
    return tpl('persentasie.2b', { ...num(`Wat is ${p}% van ${R(m)}?`, (m * n) / d, [`${p}% = ${n}/${d}.`, `1/${d} van ${m} = ${m / d}.`, ...(n > 1 ? [`× ${n} = ${R((m * n) / d)}.`] : [])], { money: true, wrong: [W(m / d === (m * n) / d ? -1 : m / d, `Jy het net 1/${d} uitgereken.`, `Maal nog met ${n}.`), W(m - (m * n) / d, 'Jy het die persentasie afgetrek.', 'Die vraag is hoeveel rand die persentasie is.')].filter((w) => w.answer >= 0) }),
      guide: [stC(`Watter breuk is ${p}%?`, [`${n}/${d}`, `${p}/10`, `${n}/${d * 10}`], 0, `${p}/100 vereenvoudig.`), st(`1/${d} van ${m} = ?`, m / d, `${m} ÷ ${d}.`, { money: true })], guideFinal: n > 1 ? `Maal met ${n}` : 'Dit is die antwoord' });
  },
  3() {
    const r = Math.random();
    if (r < 0.45) {
      const p = pick([10, 20, 30, 25, 15]), P = pick([120, 240, 360, 450, 480, 600, 840]), item = pick(['skoene', 'n sokkerbal', 'n baadjie', 'n rugsak']);
      const af = (P * p) / 100;
      return tpl('persentasie.3a', { ...num(`${cap(item.replace(/^n /, '\'n '))} kos ${R(P)}. Die winkel gee ${p}% afslag. Wat is die nuwe prys?`, P - af,
        [`10% van ${R(P)} = ${R(P / 10)}.`, `${p}% = ${R(af)} afslag.`, `Nuwe prys: ${R(P)} − ${R(af)} = ${R(P - af)}.`], { money: true, wrong: [W(af, 'Dit is die afslag, nie die nuwe prys nie.', 'Goeie begin! Trek die afslag nou van die prys af.'), W(P - p, `Jy het ${p} rand afgetrek in plaas van ${p}%.`, `${p}% is \'n deel van die prys. Begin by 10%.`)] }),
        guide: [st(`10% van ${R(P)} = ?`, P / 10, 'Deel deur 10.', { money: true }), st(`${p}% afslag = ?`, af, p === 25 ? '25% = 1/4: deel deur 4.' : p === 15 ? '10% + 5% (die helfte van 10%).' : `${p / 10} × 10%.`, { money: true })], guideFinal: `Nuwe prys: ${R(P)} − ${R(af)}` });
    }
    if (r < 0.75) {
      const [a, b, p] = pick([[18, 24, 75], [12, 16, 75], [9, 12, 75], [6, 24, 25], [14, 20, 70], [36, 40, 90], [21, 30, 70], [8, 40, 20]]);
      return tpl('persentasie.3b', { ...num(`${pick(NAMES)} kry ${a} uit ${b} in 'n toets. Watter persentasie is dit?`, p, [`Skryf as breuk: ${a}/${b}.`, `Maak die noemer 100 (of vereenvoudig eers): ${a}/${b} = ${p}/100.`, `= ${p}%`], { unit: '%', wrong: [W(a, `Jy het net jou punte (${a}) neergeskryf, nie die persentasie nie.`, 'Persentasie = hoeveel uit 100: maak die noemer 100.')] }),
        guide: [stF(`Vereenvoudig ${a}/${b}.`, [a, b], 'Deel teller en noemer deur dieselfde getal.'), st(`${fracStr([a, b])} = □/100. Wat is die □?`, p, 'Maal teller en noemer sodat die noemer 100 word.')], guideFinal: 'Hoeveel persent is dit?' });
    }
    const P = pick([200, 400, 500, 800, 1200]), p = pick([10, 20, 5, 25]);
    return tpl('persentasie.3c', { ...num(`'n Fiets kos verlede jaar ${R(P)}. Die prys het met ${p}% toegeneem. Wat kos dit nou?`, P + (P * p) / 100, [`${p}% van ${R(P)} = ${R((P * p) / 100)}.`, `Toename: tel by: ${R(P)} + ${R((P * p) / 100)} = ${R(P + (P * p) / 100)}.`], { money: true, wrong: [W((P * p) / 100, 'Dit is net die toename.', 'Tel dit nou by die ou prys.')] }),
      guide: [st(`${p}% van ${R(P)} = ?`, (P * p) / 100, p === 5 ? 'Die helfte van 10%.' : p === 25 ? '1/4 van die prys.' : 'Begin by 10%: deel die prys deur 10.', { money: true })], guideFinal: `Tel die toename by: ${R(P)} + ${R((P * p) / 100)}` });
  },
};

const finansies = {
  0() {
    const pay = pick([20, 50, 100]), price = round(rnd(Math.round(pay * 0.3), pay * 2 - 2) / 2 * 1) + pick([0, 0.5]);
    const p = Math.min(price, pay - 1);
    if (Math.random() < 0.5) {
      const h = Math.ceil(p / 10) * 10;
      const n = pick(NAMES);
      // prys al ’n tiental (R30): dan sommer in een sprong tot by die noot
      if (h === p) return tpl('finansies.0a', { ...num(`${n} koop 'n brood by Pick n Pay vir ${R(p)} en betaal met 'n R${pay}-noot. Hoeveel kleingeld kry ${n} terug?`, pay - p,
        [`Tel op van ${R(p)} tot ${R(pay)}: spring in tiene.`, `${R(p)} + ${R(pay - p)} = ${R(pay)}.`, `Kleingeld: ${R(pay - p)}.`], { money: true }),
        guide: [st(`Hoeveel spronge van R10 van ${R(p)} tot ${R(pay)}?`, (pay - p) / 10, `Tel in tiene: ${R(p + 10)}, ${R(p + 20)}, …`, {})], guideFinal: `Soveel keer R10` });
      return tpl('finansies.0a', { ...num(`${n} koop 'n brood by Pick n Pay vir ${R(p)} en betaal met 'n R${pay}-noot. Hoeveel kleingeld kry ${n} terug?`, pay - p,
        [`Tel op van ${R(p)} tot ${R(pay)}.`, `${R(p)} + ${R(h - p)} = ${R(h)}.`, ...(h < pay ? [`${R(h)} + ${R(pay - h)} = ${R(pay)}.`] : []), `Kleingeld: ${R(pay - p)}.`], { money: true }),
        guide: [st(`Hoeveel van ${R(p)} tot ${R(h)}?`, h - p, 'Tel op tot die volgende tien.', { money: true })], guideFinal: h < pay ? `Tel by: ${R(h - p)} + ${R(pay - h)}` : 'Dit is al die kleingeld' });
    }
    const a = rnd(12, 45), b = rnd(8, 30) + 0.5;
    return tpl('finansies.0b', { ...num(`'n Koeldrank kos ${R(b)} en 'n pastei ${R(a)}. Hoeveel kos albei saam?`, a + b, [`${R(a)} + ${R(b)}: eers die rande: ${a} + ${Math.floor(b)} = ${a + Math.floor(b)}.`, `Dan die 50 sent: ${R(a + b)}.`], { money: true }),
      guide: [st(`Tel die rande op: ${a} + ${Math.floor(b)} = ?`, a + Math.floor(b), 'Net die rande.')], guideFinal: 'Tel die 50 sent by' });
  },
  1() {
    const k = rnd(2, 4), per = rnd(6, 18), want = rnd(5, 9), n = pick(NAMES);
    const ding = pick(['pakkies Smarties', 'roomyse', 'koeldrankblikkies', 'potlode']);
    return tpl('finansies.1a', { ...num(`${k} ${ding} kos ${R(k * per)}. Hoeveel kos ${want} ${ding}?`, want * per, [`Eers vir een: ${R(k * per)} ÷ ${k} = ${R(per)}.`, `Dan vir ${want}: ${want} × ${R(per)} = ${R(want * per)}.`], { money: true, visual: { kind: 'table', headers: null, rows: [['aantal', String(k), '1', String(want)], ['prys', R(k * per), '?', '?']] }, wrong: [W(k * per * want, `Jy het ${k} ${ding} se prys met ${want} gemaal.`, 'Kry eers die prys vir een.')] }),
      guide: [st(`Hoeveel kos een? ${R(k * per)} ÷ ${k} = ?`, per, 'Deel die prys.', { money: true })], guideFinal: `Maal met ${want}` });
  },
  2() {
    const r = Math.random();
    if (r < 0.4) {
      const kos = rnd(40, 180), wins = rnd(15, 90), item = pick(['tamaties', 'koekies', 'armbandjies']);
      return tpl('finansies.2a', { ...num(`Thabo koop ${item} vir ${R(kos)} en verkoop dit by die skoolmark vir ${R(kos + wins)}. Hoeveel wins maak hy?`, wins, [`Wins = verkoopprys − kosprys.`, `${R(kos + wins)} − ${R(kos)} = ${R(wins)}.`], { money: true }),
        guide: [stC('Wins is …', ['verkoopprys − kosprys', 'kosprys + verkoopprys', 'kosprys − verkoopprys'], 0, 'Hoeveel meer jy kry as wat jy self betaal het.')], guideFinal: `${R(kos + wins)} − ${R(kos)}` });
    }
    const [a, b] = pick([[2, 3], [1, 4], [3, 5], [2, 5], [1, 3], [3, 4]]), deel = rnd(10, 60), tot = (a + b) * deel, n1 = pick(NAMES), n2 = pick(NAMES.filter((x) => x !== n1));
    return tpl('finansies.2b', { ...num(`${n1} en ${n2} verdeel ${R(tot)} in die verhouding ${a} : ${b}. Hoeveel kry ${n2}?`, b * deel, [`Hoeveel dele altesaam? ${a} + ${b} = ${a + b}.`, `Een deel: ${R(tot)} ÷ ${a + b} = ${R(deel)}.`, `${n2} kry ${b} dele: ${b} × ${R(deel)} = ${R(b * deel)}.`], { money: true, wrong: [W(a * deel, `Dit is ${n1} se deel.`, `${n2} kry ${b} dele.`), W(tot / 2, 'Jy het dit net gehalveer.', `Die verhouding is ${a} : ${b}: die dele is nie ewe groot nie.`)] }),
      guide: [st(`Hoeveel dele altesaam? ${a} + ${b} = ?`, a + b, 'Tel die getalle in die verhouding op.'), st(`Een deel: ${R(tot)} ÷ ${a + b} = ?`, deel, 'Deel die bedrag deur die aantal dele.', { money: true })], guideFinal: `${n2} kry ${b} dele: ${b} × ${R(deel)}` });
  },
  3() {
    const r = Math.random();
    if (r < 0.4) {
      const P = pick([1000, 2000, 1500, 2500, 3000, 4000, 5000, 6000, 8000, 10000]), p = pick([5, 10, 8, 6, 4]), j = rnd(2, 6), per = (P * p) / 100;
      const [wie, hy] = pick([['Ouma', 'sy'], ['Oupa', 'hy'], ['Tannie Sannie', 'sy'], ['Oom Koos', 'hy'], ['Ma', 'sy'], ['Pa', 'hy']]);
      return tpl('finansies.3a', { ...num(`${wie} belê ${R(P)} teen ${p}% enkelvoudige rente per jaar. Hoeveel rente verdien ${hy} in ${j} jaar?`, per * j, [`Rente vir een jaar: ${p}% van ${R(P)} = ${R(per)}.`, `${j} jaar: ${j} × ${R(per)} = ${R(per * j)}.`], { money: true, wrong: [W(per, 'Dit is die rente vir net een jaar.', `Maal met die ${j} jaar.`), W(P + per * j, 'Dit is die totale bedrag, nie net die rente nie.', 'Die vraag is net die rente.')] }),
        guide: [st(`Rente vir een jaar: ${p}% van ${R(P)} = ?`, per, p === 5 ? 'Die helfte van 10%.' : 'Begin by 10%: deel die bedrag deur 10.', { money: true })], guideFinal: `Maal met ${j} (jaar)` });
    }
    if (r < 0.7) {
      const koers = pick([16, 17, 18, 19, 20, 21]), usd = rnd(3, 45);
      return tpl('finansies.3b', { ...num(`Die wisselkoers is $1 = R${koers}. Hoeveel rand is $${usd}?`, usd * koers, [`$1 = R${koers}, dus $${usd} = ${usd} × R${koers}.`, `= ${R(usd * koers)}`], { money: true }),
        guide: [st(`${usd} × ${koers - (koers % 10)} = ?`, usd * (koers - (koers % 10)), 'Maal eers met die tiene.'), ...(koers % 10 ? [st(`${usd} × ${koers % 10} = ?`, usd * (koers % 10), 'Dan met die ene.')] : [])], guideFinal: 'Tel die deelprodukte op' });
    }
    const km = pick([40, 50, 60, 70, 80, 90, 100, 110, 120]), h = rnd(2, 6);
    return tpl('finansies.3c', { ...num(`${pick(["'n Taxi", "'n Bus", "'n Bakkie", "'n Vragmotor", "'n Trein"])} ry teen 'n spoed van ${km} km per uur. Hoe ver ry dit in ${h} uur?`, km * h, [`Koers: ${km} km in 1 uur.`, `${h} uur: ${h} × ${km} = ${km * h} km.`], { unit: 'km' }),
      guide: [st(`Hoe ver in 1 uur?`, km, 'Die spoed in die som sê hoeveel km in 1 uur.')], guideFinal: `Maal met ${h}` });
  },
};

// =====================================================================
// PATRONE, FUNKSIES EN ALGEBRA
// =====================================================================
const patrone = {
  0() {
    if (Math.random() < 0.55) {
      const s = rnd(2, 30), k = rnd(3, 12), down = Math.random() < 0.3, seq = Array.from({ length: 4 }, (_, i) => (down ? s + 5 * k - i * k : s + i * k)), nx = down ? seq[3] - k : seq[3] + k;
      return tpl('patrone.0a', { ...num(`Wat is die volgende getal in die patroon? ${list(seq)}; …`, nx, [`Kyk na die verskil: van ${seq[0]} na ${seq[1]} is ${k} ${down ? 'minder' : 'meer'}; die patroon ${down ? 'daal' : 'styg'}.`, `Elke keer ${down ? '−' : '+'} ${k}: ${seq[3]} ${down ? '−' : '+'} ${k} = ${nx}.`]),
        guide: [st(`Wat is die verskil tussen ${seq[0]} en ${seq[1]}?`, k, 'Trek die kleinste van die grootste af. Kyk dan: word die getalle groter of kleiner?')], guideFinal: `${seq[3]} ${down ? '−' : '+'} ${k}` });
    }
    const k = rnd(3, 9), x = rnd(4, 12);
    return tpl('patrone.0b', { ...num(`Vloeidiagram: inset ${x} → × ${k} → uitset □. Wat is die uitset?`, x * k, [`Pas die reël toe: ${x} × ${k} = ${x * k}.`]),
      guide: [stC('Wat doen jy met die inset?', [`× ${k}`, `+ ${k}`, `÷ ${k}`], 0, 'Lees die reël in die vloeidiagram.')], guideFinal: `${x} × ${k}` });
  },
  1() {
    const r = Math.random();
    if (r < 0.35) {
      const a = rnd(10, 60), b = rnd(a + 20, 150);
      return tpl('patrone.1a', { ...num(`□ + ${a} = ${b}. Wat is □?`, b - a, ['Gebruik die omgekeerde bewerking: die omgekeerde van + is −.', `${b} − ${a} = ${b - a}.`, `Kontroleer: ${b - a} + ${a} = ${b} ✓`], { wrong: [W(a + b, 'Jy het opgetel in plaas van die omgekeerde bewerking.', 'Om □ te kry, trek jy af: ' + `${b} − ${a}.`)] }),
        guide: [stC('Wat is die omgekeerde van + ?', ['−', '×', '÷'], 0, 'Optel en aftrek maak mekaar ongedaan.')], guideFinal: `${b} − ${a}` });
    }
    if (r < 0.7) {
      const k = rnd(2, 5), c = rnd(1, 9), x = rnd(3, 12);
      return tpl('patrone.1b', { ...num(`Vloeidiagram: inset ${x} → × ${k} → + ${c} → uitset □. Wat is die uitset?`, x * k + c, [`Eers × ${k}: ${x} × ${k} = ${x * k}.`, `Dan + ${c}: ${x * k} + ${c} = ${x * k + c}.`], { wrong: [W((x + c) * k, `Jy het die reëls in die verkeerde volgorde gedoen (eers + ${c}, dan × ${k}).`, 'Doen die reëls van links na regs, een vir een: eers die eerste reël.'), W(x * (k + c), `Jy het die twee getalle van die reëls eers saamgetel (${k} + ${c}).`, `Elke reël is ’n eie stap: eers × ${k}, dan die antwoord + ${c}.`)] }),
        guide: [st(`Eerste reël: ${x} × ${k} = ?`, x * k, `Tafel van ${k}.`)], guideFinal: `Tweede reël: ${x * k} + ${c}` });
    }
    const s = rnd(1, 5), seq = [s, s * 2, s * 4, s * 8];
    return tpl('patrone.1c', { ...num(`Wat is die volgende getal? ${list(seq)}; …`, s * 16, ['Kyk hoe elke getal verander om die volgende te kry: dit verdubbel.', `${s * 8} × 2 = ${s * 16}.`], { wrong: [W(s * 8 + (s * 8 - s * 4), 'Jy het elke keer dieselfde getal bygetel.', 'Die verskil word elke keer groter: hier verdubbel die getal elke keer.')] }),
      guide: [stC(`Hoe kom jy van ${s * 2} na ${s * 4}?`, ['× 2', `+ ${s}`, `+ ${s * 2}`].filter((v, i, a) => a.indexOf(v) === i), 0, 'Is dit plus of maal? Kyk of dieselfde ook by die ander getalle in die patroon werk.')], guideFinal: `${s * 8} × 2` });
  },
  2() {
    const r = Math.random();
    if (r < 0.35) {
      const k = rnd(2, 6), c = rnd(2, 15), x = rnd(4, 15), out = x * k + c;
      return tpl('patrone.2a', { ...num(`Vloeidiagram: inset □ → × ${k} → + ${c} → uitset ${out}. Wat is die inset?`, x, ['Werk terug met die omgekeerde bewerkings, van agter na voor.', `${out} − ${c} = ${out - c}.`, `${out - c} ÷ ${k} = ${x}.`], { wrong: [W(out * k + c, 'Jy het vorentoe gewerk in plaas daarvan om terug te werk.', 'Begin by die uitset en doen die omgekeerde: eers − ' + c + ', dan ÷ ' + k + '.')] }),
        guide: [st(`Terug: die omgekeerde van + ${c}: ${out} − ${c} = ?`, out - c, 'Begin by die uitset.')], guideFinal: `Die omgekeerde van × ${k}: ${out - c} ÷ ${k}` });
    }
    if (r < 0.7) {
      const a = rnd(2, 20), b = rnd(2, 9), c = rnd(2, 9), hak = Math.random() < 0.4;
      if (hak) return tpl('patrone.2b', { ...num(`(${a} + ${b}) × ${c} =`, (a + b) * c, ['Hakies eerste.', `${a} + ${b} = ${a + b}.`, `${a + b} × ${c} = ${(a + b) * c}.`], { wrong: [W(a + b * c, 'Jy het die hakies geïgnoreer.', 'Hakies eerste!')] }),
        guide: [st(`Hakies eerste: ${a} + ${b} = ?`, a + b, 'Wat binne die hakies is.')], guideFinal: `${a + b} × ${c}` });
      return tpl('patrone.2c', { ...num(`${a} + ${b} × ${c} =`, a + b * c, ['Volgorde van bewerkings: × en ÷ voor + en −.', `${b} × ${c} = ${b * c}.`, `${a} + ${b * c} = ${a + b * c}.`], { wrong: [W((a + b) * c, 'Jy het van links na regs gereken.', 'Maal eers en tel dan op. Sit hakies om die maalsom.')] }),
        guide: [st(`Eers die maalsom: ${b} × ${c} = ?`, b * c, '× kom voor +.')], guideFinal: `${a} + ${b * c}` });
    }
    const s = rnd(2, 9), k = rnd(3, 8), pos = pick([10, 12, 15, 20]);
    return tpl('patrone.2d', { ...num(`Die patroon is ${list([s, s + k, s + 2 * k, s + 3 * k])}; … Wat is die ${pos}ste term?`, s + (pos - 1) * k, [`Elke term is ${k} meer as die vorige een.`, `Van term 1 tot term ${pos} is ${pos - 1} spronge van ${k}.`, `${s} + ${pos - 1} × ${k} = ${s + (pos - 1) * k}.`], { wrong: [W(s + pos * k, 'Een sprong te veel.', `Van term 1 na term ${pos} is net ${pos - 1} spronge.`)] }),
      guide: [st(`Hoeveel spronge van term 1 na term ${pos}?`, pos - 1, 'Tel die spronge, nie die terme nie.'), st(`${pos - 1} × ${k} = ?`, (pos - 1) * k, 'Die spronge saam.')], guideFinal: `Tel dit by die eerste term: ${s} + ${(pos - 1) * k}` });
  },
  3() {
    const r = Math.random();
    if (r < 0.35) {
      const a = rnd(2, 6), b = rnd(1, 9), n = pick([10, 15, 20, 25, 50]);
      return tpl('patrone.3a', { ...num(`Die reël van 'n patroon is ${a}n + ${b} (n is die posisie). Wat is term ${n}?`, a * n + b, [`Vervang n met ${n}: ${a} × ${n} + ${b}.`, `${a * n} + ${b} = ${a * n + b}.`], { wrong: [W(a * (n + b), 'Jy het eers opgetel.', 'Maal eers, dan optel.')] }),
        guide: [st(`${a} × ${n} = ?`, a * n, 'Vervang n met die posisie.')], guideFinal: `+ ${b}` });
    }
    if (r < 0.7) {
      const a = rnd(2, 9), x = rnd(2, 12), b = rnd(1, 15), plus = Math.random() < 0.5, rhs = plus ? a * x + b : a * x - b;
      return tpl('patrone.3b', { ...num(`Los op: ${a}x ${plus ? '+' : '−'} ${b} = ${rhs}`, x, ['Werk terug met omgekeerde bewerkings.', `${a}x = ${rhs} ${plus ? '−' : '+'} ${b} = ${a * x}.`, `x = ${a * x} ÷ ${a} = ${x}.`, `Kontroleer: ${a} × ${x} ${plus ? '+' : '−'} ${b} = ${rhs} ✓`]),
        guide: [st(`${a}x = ${rhs} ${plus ? '−' : '+'} ${b} = ?`, a * x, `Die omgekeerde van ${plus ? '+' : '−'} ${b}.`)], guideFinal: `x = ${a * x} ÷ ${a}` });
    }
    const a = rnd(2, 5), n = rnd(2, 5), c = rnd(1, 20);
    return tpl('patrone.3c', { ...num(`${a} × ${n}² + ${c} =`, a * n * n + c, [`Magte eerste: ${n}² = ${n * n}.`, `Dan maal: ${a} × ${n * n} = ${a * n * n}.`, `Dan optel: ${a * n * n} + ${c} = ${a * n * n + c}.`], { wrong: [W((a * n) ** 2 + c, `Jy het eers ${a} × ${n} gereken en toe gekwadreer.`, 'Magte kom voor maal (BODMAS).')] }),
      guide: [st(`Magte eerste: ${n}² = ?`, n * n, `${n} × ${n}.`), st(`${a} × ${n * n} = ?`, a * n * n, 'Dan maal.')], guideFinal: `+ ${c}` });
  },
};

// =====================================================================
// RUIMTE EN VORM
// =====================================================================
const VEELHOEK = [['driehoek', 3], ['vierhoek', 4], ['vyfhoek', 5], ['seshoek', 6], ['agthoek', 8]];
const SOLIEDE = [
  { n: 'kubus', v: 6, r: 12, h: 8 }, { n: 'reghoekige prisma', v: 6, r: 12, h: 8 }, { n: 'driehoekige prisma', v: 5, r: 9, h: 6 },
  { n: 'vierkantige piramide', v: 5, r: 8, h: 5 }, { n: 'driehoekige piramide', v: 4, r: 6, h: 4 },
];
const meetkunde = {
  0() {
    const r0 = Math.random();
    if (r0 < 0.4) {
      const [x, y] = shuffle(VEELHOEK).slice(0, 2), a = rnd(1, 6), b = rnd(1, 6), n = pick(NAMES), wat = pick(['hoekpunte', 'sye']);
      const va = a === 1 ? `'n ${x[0]}` : `${a} ${x[0]}e`, vb = b === 1 ? `'n ${y[0]}` : `${b} ${y[0]}e`;
      return tpl('meetkunde.0a', { ...num(`${n} teken ${va} en ${vb}. Hoeveel ${wat} teken ${n} altesaam?`, a * x[1] + b * y[1],
        [`'n ${cap(x[0])} het ${x[1]} ${wat}: ${a} × ${x[1]} = ${a * x[1]}.`, `'n ${cap(y[0])} het ${y[1]} ${wat}: ${b} × ${y[1]} = ${b * y[1]}.`, `Saam: ${a * x[1]} + ${b * y[1]} = ${a * x[1] + b * y[1]}.`]),
      guide: [st(`Hoeveel ${wat} het 'n ${x[0]}?`, x[1], 'Die naam sê dit.'), st(`${a} × ${x[1]} = ?`, a * x[1], 'Maal met die aantal.')], guideFinal: `Tel nog ${b} × ${y[1]} by` });
    }
    if (r0 < 0.55) {
      const k = rnd(2, 9), [w, nr] = pick([['vlakke', 6], ['rande', 12], ['hoekpunte', 8]]);
      return tpl('meetkunde.0b', { ...num(`Jy het ${k} kubusse. Hoeveel ${w} het hulle altesaam?`, k * nr, [`'n Kubus het 6 vlakke, 12 rande en 8 hoekpunte.`, `${k} × ${nr} = ${k * nr}.`]),
        guide: [st(`Hoeveel ${w} het een kubus?`, nr, 'Dink aan \'n dobbelsteen.')], guideFinal: `${k} × ${nr}` });
    }
    if (r0 < 0.8) {
      const [nm, k] = pick(VEELHOEK), wat = pick(['sye', 'hoekpunte']);
      return tpl('meetkunde.0c', { ...num(`Hoeveel ${wat} het 'n ${nm}?`, k, [`'n ${cap(nm)} het ${k} sye en ${k} hoekpunte.`]), guide: [stC(`Eers ’n voorbeeld: ’n driehoek (drie-hoek) het 3 hoeke. Hoeveel sye het ’n driehoek?`, ['3', '4', '5'], 0, 'Tel die hoeke: by ’n veelhoek is daar net soveel sye as hoeke.')], guideFinal: `Wat vertel die naam "${nm}" jou oor die ${wat}?` });
    }
    const s = SOLIEDE[0], wat = pick([['vlakke', s.v], ['hoekpunte', s.h]]);
    return tpl('meetkunde.0d', { ...num(`Hoeveel ${wat[0]} het 'n kubus?`, wat[1], wat[0] === 'vlakke' ? ['Dink aan ’n dobbelsteen: tel die plat vlakke (bo, onder en die 4 rondom).', `Dit is ${wat[1]} vlakke.`] : ['Tel die hoekpunte: 4 bo en 4 onder.', `Dit is ${wat[1]} hoekpunte.`]),
      guide: [wat[0] === 'vlakke' ? st('Hoeveel plat vlakke is daar rondom (sonder bo en onder)?', 4, 'Draai die dobbelsteen stadig om en tel die kante rondom.') : st('Hoeveel hoekpunte is daar bo?', 4, 'Kyk na die bovlak: dit is ’n vierkant. Hoeveel hoeke het ’n vierkant?')], guideFinal: wat[0] === 'vlakke' ? 'Tel nog die bo- en ondervlak by' : 'En nog net soveel onder' });
  },
  1() {
    if (Math.random() < 0.75) {
      const g = pick([rnd(10, 89), rnd(10, 89), 90, rnd(91, 179), rnd(91, 179)]), soort = g < 90 ? 0 : g === 90 ? 1 : 2;
      return tpl('meetkunde.1a', { ...choice(`'n Hoek is ${g}°. Watter soort hoek is dit?`, ['skerphoek', 'regte hoek', 'stomphoek'], soort, ['Skerphoek: kleiner as 90°. Regte hoek: presies 90°. Stomphoek: tussen 90° en 180°.', `${g}° is ${['\'n skerphoek', '\'n regte hoek', '\'n stomphoek'][soort]}.`]),
        guide: [st('Hoeveel grade is \'n regte hoek?', 90, 'Die hoek van \'n bladsy.', { unit: '°' })], guideFinal: `Is ${g}° kleiner as, gelyk aan of groter as 90°?` });
    }
    const [nm, k] = pick([['vierkant', 4], ['reghoek', 2], ['gelyksydige driehoek', 3]]);
    return tpl('meetkunde.1b', { ...num(`Hoeveel simmetrielyne het 'n ${nm}?`, k, [`'n Simmetrielyn deel die vorm in twee spieëlbeelde.`, `'n ${cap(nm)} het ${k}.`]),
      guide: [stC(nm === 'gelyksydige driehoek' ? `Is ’n lyn van ’n hoekpunt na die middel van die oorkantste sy ’n simmetrielyn?` : `Is ’n lyn van hoek tot hoek (die hoeklyn) in ’n ${nm} ’n simmetrielyn?`, ['ja', 'nee'], nm === 'reghoek' ? 1 : 0, 'Vou dit in gedagte: pas die twee helftes presies op mekaar?')], guideFinal: 'Tel al die simmetrielyne' });
  },
  2() {
    const r = Math.random();
    if (r < 0.4) {
      const s = pick(SOLIEDE.slice(2)), [w, k] = pick([['vlakke', 'v'], ['rande', 'r'], ['hoekpunte', 'h']]);
      return tpl('meetkunde.2a', { ...num(`Hoeveel ${w} het 'n ${s.n}?`, s[k], [`'n ${cap(s.n)} het ${s.v} vlakke, ${s.r} rande en ${s.h} hoekpunte.`, s.n.includes('prisma') ? 'Prisma: twee ewe groot eindvlakke en reghoeke tussenin.' : 'Piramide: een grondvlak en driehoeke wat in een punt bymekaarkom.']),
        guide: [stC(`Watter vorm is die grondvlak van 'n ${s.n}?`, ['driehoek', 'vierkant', 'sirkel'], s.n.includes('vierkantige') ? 1 : 0, 'Die naam sê dit.')], guideFinal: `Tel die ${w}` });
    }
    if (r < 0.7) {
      const a = rnd(25, 155);
      return tpl('meetkunde.2b', { ...num(`Twee hoeke lê saam op 'n reguit lyn. Een hoek is ${a}°. Hoe groot is die ander hoek?`, 180 - a, ['Hoeke op \'n reguit lyn is saam 180°.', `180° − ${a}° = ${180 - a}°.`], { unit: '°', wrong: [W(90 - a > 0 ? 90 - a : -1, 'Jy het van 90° afgetrek.', '\'n Reguit lyn is 180°, nie 90° nie.')].filter((w) => w.answer >= 0) }),
        guide: [st('Hoeveel grade is \'n reguit hoek?', 180, 'Twee regte hoeke.', { unit: '°' })], guideFinal: `180 − ${a}` });
    }
    const g = pick([rnd(200, 340), rnd(100, 170), rnd(20, 80)]), soort = g < 90 ? 0 : g < 180 ? 1 : 2;
    return tpl('meetkunde.2c', { ...choice(`'n Hoek is ${g}°. Watter soort hoek is dit?`, ['skerphoek', 'stomphoek', 'reflekshoek'], soort, ['Skerphoek < 90°; stomphoek tussen 90° en 180°; reflekshoek tussen 180° en 360°.']),
      guide: [st('Hoeveel grade is \'n reguit hoek?', 180, 'Twee regte hoeke.', { unit: '°' })], guideFinal: `Is ${g}° kleiner of groter as 90° en 180°?` });
  },
  3() {
    const r = Math.random();
    if (r < 0.45) {
      const a = rnd(30, 80), b = rnd(30, 140 - a);
      return tpl('meetkunde.3a', { ...num(`In 'n driehoek is twee hoeke ${a}° en ${b}°. Hoe groot is die derde hoek?`, 180 - a - b, ['Die hoeke van \'n driehoek is saam 180°.', `${a}° + ${b}° = ${a + b}°.`, `180° − ${a + b}° = ${180 - a - b}°.`], { unit: '°', wrong: [W(360 - a - b, 'Jy het van 360° afgetrek.', 'Die hoeke van \'n driehoek is saam 180°.')] }),
        guide: [st(`${a} + ${b} = ?`, a + b, 'Tel die bekende hoeke op.', { unit: '°' })], guideFinal: `180 − ${a + b}` });
    }
    if (r < 0.75) {
      const a = rnd(60, 150), b = rnd(60, 150);
      return tpl('meetkunde.3b', { ...num(`Drie hoeke lê om 'n punt. Twee is ${a}° en ${b}°. Hoe groot is die derde?`, 360 - a - b, ['Die hoeke om \'n punt is saam 360°.', `360° − ${a}° − ${b}° = ${360 - a - b}°.`], { unit: '°', wrong: [W(180 - a - b > 0 ? 180 - a - b : -1, 'Jy het 180° gebruik.', 'Om \'n punt is \'n hele draai: 360°.')].filter((w) => w.answer >= 0) }),
        guide: [st('Hoeveel grade is \'n hele draai?', 360, 'Vier regte hoeke.', { unit: '°' }), st(`${a} + ${b} = ?`, a + b, 'Tel op.')], guideFinal: `360 − ${a + b}` });
    }
    const top = pick([40, 50, 60, 70, 80, 100, 20]);
    return tpl('meetkunde.3c', { ...num(`'n Gelykbenige driehoek het 'n tophoek van ${top}°. Die twee basishoeke is ewe groot. Hoe groot is een basishoek?`, (180 - top) / 2, [`180° − ${top}° = ${180 - top}° vir die twee basishoeke saam.`, `${180 - top}° ÷ 2 = ${(180 - top) / 2}°.`], { unit: '°', wrong: [W(180 - top, 'Dit is die twee basishoeke saam.', 'Deel nog deur 2.')] }),
      guide: [st(`180 − ${top} = ?`, 180 - top, 'Wat oorbly vir die twee basishoeke.', { unit: '°' })], guideFinal: `Deel deur 2` });
  },
};

// =====================================================================
// METING
// =====================================================================
const EENHEDE = [['m', 'cm', 100], ['km', 'm', 1000], ['kg', 'g', 1000], ['ℓ', 'mℓ', 1000], ['cm', 'mm', 10]];
const meting = {
  0() {
    const [g, k, m] = pick(EENHEDE), n = rnd(2, 25);
    if (Math.random() < 0.35) return tpl('meting.0a', { ...num(`${f(n * m)} ${k} = … ${g}`, n, [`${f(m)} ${k} = 1 ${g}.`, `${f(n * m)} ÷ ${f(m)} = ${n} ${g}.`], { unit: g, wrong: [W(n * m * m, 'Jy het gemaal in plaas van gedeel.', 'Na \'n groter eenheid word die getal kleiner: deel.')] }),
      guide: [st(`1 ${g} = … ${k}`, m, 'Dink aan die voorvoegsel van die eenheid: wat beteken kilo, senti of milli (soos in kilometer, sentimeter, millimeter)?', { unit: k })], guideFinal: `Deel deur ${f(m)}` });
    return tpl('meting.0b', { ...num(`${n} ${g} = … ${k}`, n * m, [`1 ${g} = ${f(m)} ${k}.`, `${n} × ${f(m)} = ${f(n * m)} ${k}.`], { unit: k, wrong: [100, 1000, 10].filter((x) => x !== m).map((x) => W(n * x, `1 ${g} is nie ${f(x)} ${k} nie.`, `1 ${g} = ${f(m)} ${k}.`)) }),
      guide: [st(`1 ${g} = … ${k}`, m, 'Dink aan die voorvoegsel van die eenheid: wat beteken kilo, senti of milli (soos in kilometer, sentimeter, millimeter)?', { unit: k })], guideFinal: `Maal met ${n}` });
  },
  1() {
    const [g, k, m] = pick(EENHEDE.slice(1, 4)), n = rnd(2, 9), x = rnd(50, m - 50);
    if (Math.random() < 0.6) return tpl('meting.1a', { ...num(`${n} ${g} ${x} ${k} = … ${k}`, n * m + x, [`${n} ${g} = ${f(n * m)} ${k}.`, `${f(n * m)} + ${x} = ${f(n * m + x)} ${k}.`], { unit: k, wrong: [W(n + x, 'Jy het die getalle net bymekaargetel.', `Skakel eers ${n} ${g} om na ${k}.`)] }),
      guide: [st(`${n} ${g} = … ${k}`, n * m, `1 ${g} = ${f(m)} ${k}.`, { unit: k })], guideFinal: `Tel die ${x} ${k} by` });
    return tpl('meting.1b', { ...num(`${n} 1/2 ${g} = … ${k}`, n * m + m / 2, [`${n} ${g} = ${f(n * m)} ${k}.`, `1/2 ${g} = ${f(m / 2)} ${k}.`, `Saam: ${f(n * m + m / 2)} ${k}.`], { unit: k }),
      guide: [st(`1/2 ${g} = … ${k}`, m / 2, `Die helfte van ${f(m)}.`, { unit: k })], guideFinal: `${n} ${g} = ${f(n * m)} ${k}; tel die helfte by` });
  },
  2() {
    const r = Math.random();
    const [g, k, m] = pick(EENHEDE.slice(1, 4));
    if (r < 0.5) {
      const a = round(rnd(11, 99) / (m === 1000 ? 4 : 10) / 10 * 10) / 10 + rnd(1, 4), A = round(a);
      return tpl('meting.2a', { ...num(`${f(A)} ${g} = … ${k}`, A * m, [`1 ${g} = ${f(m)} ${k}.`, `${f(A)} × ${f(m)}: elke syfer skuif ${String(m).length - 1} plekke na links in die plekwaardetabel (die getal word groter): ${f(A * m)} ${k}.`], { unit: k, wrong: [W(round(A * m / 10), 'Een plek te min geskuif.', `× ${f(m)}: ${String(m).length - 1} plekke.`)] }),
        guide: [...(Math.floor(A) ? [st(`${Math.floor(A)} ${g} = … ${k}`, Math.floor(A) * m, `Eers die heelgetal: ${Math.floor(A)} × ${f(m)}.`, { unit: k })] : []), st(`${f(round(A - Math.floor(A)))} ${g} = … ${k}`, round((A - Math.floor(A)) * m), `${f(round(A - Math.floor(A)))} × ${f(m)}: elke syfer skuif ${String(m).length - 1} plekke na links.`, { unit: k })], guideFinal: 'Tel albei op' });
    }
    const x = rnd(1050, 9950) - (rnd(1050, 9950) % 50);
    return tpl('meting.2b', { ...num(`${f(x)} ${k} = … ${g}`, x / m, [`Klein na groot eenheid: deel deur ${f(m)}.`, `${f(x)} ÷ ${f(m)} = ${f(x / m)} ${g}.`], { unit: g, wrong: [W(x * m, 'Jy het gemaal in plaas van gedeel.', 'Na \'n groter eenheid word die getal kleiner: deel.')] }),
      guide: [st(`Hoeveel hele ${g} is ${f(x)} ${k}?`, Math.floor(x / m), `Hoeveel keer ${f(m)} pas in ${f(x)}?`, { unit: g })], guideFinal: `Die res (${x % m} ${k}) is ${x % m}/${f(m)} ${g}: skryf as desimaal` });
  },
  3() {
    const r = Math.random();
    if (r < 0.5) {
      const L = rnd(1, 10), gl = pick([100, 200, 250, 500]), houer = pick(["'n Bottel koeldrank", "'n Kan melk", "'n Bak vrugtesap", "'n Fles water", "'n Pot rooibostee"]);
      return tpl('meting.3a', { ...num(`${houer} bevat ${L} ℓ. Hoeveel glase van ${gl} mℓ kan jy daaruit skink?`, (L * 1000) / gl, [`Skakel om na dieselfde eenheid: ${L} ℓ = ${f(L * 1000)} mℓ.`, `${f(L * 1000)} ÷ ${gl} = ${(L * 1000) / gl} glase.`], { wrong: [W(L * 1000, 'Jy het net omgeskakel.', `Deel nou deur ${gl} mℓ per glas.`)] }),
        guide: [st(`${L} ℓ = … mℓ`, L * 1000, 'Milli beteken ’n duisendste: in 1 liter pas duisend milliliter.', { unit: 'mℓ' })], guideFinal: `Deel deur ${gl}` });
    }
    const tou = rnd(3, 25), stuk = pick([20, 25, 40, 50, 75, 100]), ok = tou, wat = pick(["'n Tou", "'n Lint", "'n Stuk draad", "'n Rol tou"]);
    return tpl('meting.3b', { ...num(`${wat} is ${ok} m lank. Jy sny dit in stukke van ${stuk} cm. Hoeveel stukke kry jy?`, Math.floor((ok * 100) / stuk), [`${ok} m = ${f(ok * 100)} cm.`, `${f(ok * 100)} ÷ ${stuk} = ${Math.floor((ok * 100) / stuk)} res ${(ok * 100) % stuk}: dus ${Math.floor((ok * 100) / stuk)} hele stukke.`]),
      guide: [st(`${ok} m = … cm`, ok * 100, '1 m = 100 cm.', { unit: 'cm' })], guideFinal: `Deel deur ${stuk}` });
  },
};

const omtrek = {
  0() {
    const w = rnd(2, 15), h = rnd(2, 10);
    if (Math.random() < 0.5) return tpl('omtrek.0a', { ...num(`Wat is die omtrek van hierdie reghoek?`, 2 * (w + h), [`Omtrek: tel al die sye op.`, `${w} + ${h} + ${w} + ${h} = ${2 * (w + h)} cm.`], { unit: 'cm', visual: { kind: 'rect', w, h, unit: 'cm' }, wrong: [W(w * h, 'Dit is die oppervlakte, nie die omtrek nie.', 'Omtrek is die lengte rondom: tel die vier sye op.'), W(w + h, 'Jy het net twee sye getel.', '\'n Reghoek het vier sye.')] }),
      guide: [st('Hoeveel sye het \'n reghoek?', 4, 'Tel hulle.'), st(`${w} + ${h} = ?`, w + h, 'Twee sye.')], guideFinal: `Verdubbel dit: ${w + h} + ${w + h}` });
    const a = rnd(2, 9), b = rnd(2, 7);
    return tpl('omtrek.0b', { ...num('Hoeveel vierkante pas in hierdie reghoek? (die oppervlakte)', a * b, [`Een ry: ${a} vierkante. Daar is ${b} rye.`, `${b} × ${a} = ${a * b}.`], { unit: 'vierkante', visual: { kind: 'grid', w: a, h: b } }),
      guide: [st('Hoeveel vierkante in een ry?', a, 'Tel die vierkante in die boonste ry, een vir een.')], guideFinal: `Hoeveel rye is daar? Maal met die vierkante in een ry` });
  },
  1() {
    const l = rnd(4, 20), b = rnd(3, 15);
    if (Math.random() < 0.6) return tpl('omtrek.1a', { ...num(`${pick(["'n Reghoek", "'n Foto", "'n Kaartjie", "'n Teël", "'n Boekie"])} is ${l} cm lank en ${b} cm breed. Wat is die oppervlakte?`, l * b, [`Oppervlakte = lengte × breedte.`, `${l} × ${b} = ${l * b} cm².`], { unit: 'cm²', visual: { kind: 'rect', w: l, h: b, unit: 'cm' }, wrong: [W(2 * (l + b), 'Dit is die omtrek.', 'Oppervlakte: hoeveel vierkante binne-in pas. Maal.')] }),
      guide: [stC('Die oppervlakte van \'n reghoek is …', ['lengte × breedte', 'lengte + breedte', 'alle sye opgetel'], 0, 'Aantal rye × aantal vierkante in elke ry.')], guideFinal: `${l} × ${b}` });
    const s = rnd(4, 45);
    return tpl('omtrek.1b', { ...num(`'n Vierkant het sye van ${s} cm. Wat is die omtrek?`, 4 * s, ['\'n Vierkant het 4 ewe lang sye.', `4 × ${s} = ${4 * s} cm.`], { unit: 'cm', wrong: [W(s * s, 'Dit is die oppervlakte.', 'Omtrek: tel die 4 sye op.')] }),
      guide: [st('Hoeveel sye het \'n vierkant?', 4, 'Almal ewe lank.')], guideFinal: `4 × ${s}` });
  },
  2() {
    const l = rnd(2, 12), b = rnd(2, 8), h = rnd(2, 6);
    return tpl('omtrek.2a', { ...num(`${pick(["'n Boks", "'n Kis", "'n Blok", "'n Kartondoos"])} (reghoekige prisma) is ${l} cm lank, ${b} cm breed en ${h} cm hoog. Wat is die volume?`, l * b * h, [`Een laag: ${l} × ${b} = ${l * b} kubusse.`, `${h} lae: ${l * b} × ${h} = ${l * b * h} cm³.`], { unit: 'cm³', wrong: [W(l * b, 'Dit is net een laag.', `Maal met die hoogte (${h} lae).`), W(l + b + h, 'Jy het opgetel.', 'Volume: lengte × breedte × hoogte.')] }),
      guide: [st(`Een laag: ${l} × ${b} = ?`, l * b, 'Hoeveel kubusse pas op die bodem?')], guideFinal: `Maal met ${h} lae` });
  },
  3() {
    const r = Math.random();
    if (r < 0.5) {
      const basis = 2 * rnd(3, 10), hoogte = rnd(3, 12);
      return tpl('omtrek.3a', { ...num(`'n Driehoek het 'n basis van ${basis} cm en 'n hoogte van ${hoogte} cm. Wat is die oppervlakte?`, (basis * hoogte) / 2, [`Die driehoek is die helfte van 'n reghoek van ${basis} × ${hoogte}.`, `½ × ${basis} × ${hoogte} = ${(basis * hoogte) / 2} cm².`], { unit: 'cm²', visual: { kind: 'tri', w: basis, h: hoogte, unit: 'cm' }, wrong: [W(basis * hoogte, 'Jy het vergeet om te halveer.', 'Die driehoek is net die helfte van die reghoek.')] }),
        guide: [st(`Die reghoek om die driehoek: ${basis} × ${hoogte} = ?`, basis * hoogte, 'Basis × hoogte.')], guideFinal: 'Die helfte daarvan' });
    }
    const s = rnd(5, 30), A = rnd(4, 12), B = rnd(3, 9);
    if (r < 0.75) return tpl('omtrek.3b', { ...num(`Die omtrek van 'n vierkant is ${4 * s} cm. Hoe lank is een sy?`, s, ['\'n Vierkant het 4 ewe lang sye.', `${4 * s} ÷ 4 = ${s} cm.`], { unit: 'cm' }),
      guide: [stC('Wat is die omgekeerde van × 4?', ['÷ 4', '− 4', '+ 4'], 0, 'Omtrek = 4 × sy.')], guideFinal: `${4 * s} ÷ 4` });
    return tpl('omtrek.3c', { ...num(`'n Reghoek het 'n oppervlakte van ${A * B} m². Die lengte is ${A} m. Hoe breed is dit?`, B, [`Oppervlakte = lengte × breedte, dus ${A} × □ = ${A * B}.`, `□ = ${A * B} ÷ ${A} = ${B} m.`], { unit: 'm' }),
      guide: [stC('Watter getallesin past?', [`${A} × □ = ${A * B}`, `${A} + □ = ${A * B}`], 0, 'Oppervlakte = lengte × breedte.')], guideFinal: `${A * B} ÷ ${A}` });
  },
};

// ---------- horlosies: kloklees, tyd in woorde, wekker, oond ----------
// So sê jy die tyd in Afrikaans (per 5 minute): tot half "oor" die uur wat verby is, ná half "voor" die volgende uur.
const URE = ['twaalf', 'een', 'twee', 'drie', 'vier', 'vyf', 'ses', 'sewe', 'agt', 'nege', 'tien', 'elf'];
const uurA = (h) => URE[((h % 12) + 12) % 12];
export function tydInWoorde(h, m) {
  const nu = uurA(h), straks = uurA(h + 1);
  return { 0: `${nu}uur`, 5: `vyf oor ${nu}`, 10: `tien oor ${nu}`, 15: `kwart oor ${nu}`, 20: `twintig oor ${nu}`, 25: `vyf-en-twintig oor ${nu}`,
    30: `half ${straks}`, 35: `vyf-en-twintig voor ${straks}`, 40: `twintig voor ${straks}`, 45: `kwart voor ${straks}`, 50: `tien voor ${straks}`, 55: `vyf voor ${straks}` }[m];
}
function tydAfleiers(h, m) {
  const ok = tydInWoorde(h, m), out = [];
  for (const w of [tydInWoorde(h - 1, m), tydInWoorde(h + 1, m), tydInWoorde(h, (60 - m) % 60), tydInWoorde(h - 1, (60 - m) % 60)]) if (w && w !== ok && !out.includes(w)) out.push(w);
  return out.slice(0, 3);
}
const VOORKOMS = ['wall', 'alarm', 'watch'];
const KLOKNAAM = { wall: 'die horlosie', alarm: 'die wekker', watch: 'die polshorlosie' };
const klok = (min, look, label) => ({ kind: 'clock', time: hhmm(min), look: look || pick(VOORKOMS), ...(label ? { label } : {}) });
const naMin = (t) => { const [a, b] = String(t).split(':').map(Number); return a * 60 + b; };
function klokLees(lv) {
  const h = rnd(7, 11), m = lv === 0 ? pick([0, 15, 30, 45]) : rnd(0, 11) * 5, look = pick(VOORKOMS);
  return tpl('klokLees.a', { ...time(`Hoe laat is dit op ${KLOKNAAM[look]}? Dit is oggend.`, h * 60 + m, [
    `Die lang wyser (minuutwyser) ${m === 0 ? 'wys na die 12: presies die heel uur' : `wys na die ${m / 5}: dit is ${m / 5} × 5 = ${m} minute`}.`,
    m === 0 ? `Die kort wyser (uurwyser) wys presies na die ${h}.` : `Die kort wyser (uurwyser) is tussen die ${h} en die ${h + 1}: dit is al ná ${h} uur.`,
    `Dit is ${hhmm(h * 60 + m)}. Jy sê: ${tydInWoorde(h, m)}.`], { twelve: true, visual: klok(h * 60 + m, look) }),
  guide: [st('Na watter getal wys die lang wyser?', m === 0 ? 12 : m / 5, 'Die lang wyser wys die minute.'),
    st('Hoeveel minute is dit? (elke getal is 5 minute)', m, m === 0 ? 'As die lang wyser op die 12 wys, is dit presies die heel uur. Hoeveel minute ná die uur is dit dan?' : 'Tel in spronge van 5 vanaf die 12: 5, 10, 15, …', { unit: 'minute' }),
    st('Watter uur is die kort wyser al verby (of wys hy na)?', h, 'Die kort wyser wys die ure.')],
  guideFinal: 'Skryf die tyd so: uur:minute' });
}
function klokWoorde(lv) {
  const h = rnd(1, 12), m = lv === 0 ? pick([15, 30, 45]) : pick([5, 10, 20, 25, 35, 40, 50, 55, 15, 45, 30]);
  const ok = tydInWoorde(h, m);
  return tpl('klokWoorde.a', { ...choice('Hoe sê jy hierdie tyd?', [ok, ...tydAfleiers(h, m)], 0, [
    `Die lang wyser ${m === 0 ? 'wys na die 12' : `wys na die ${m / 5}`}: ${m} minute. Die kort wyser: ná ${uurA(h)}uur.`,
    m <= 25 ? `Tot by half sê jy "oor" die uur wat verby is.` : m === 30 ? `Half is 30 minute: "half ${uurA(h + 1)}" (half op pad na ${uurA(h + 1)}uur).` : `Ná half sê jy "voor" die volgende uur.`,
    `Dus: ${ok}.`], { visual: klok(h * 60 + m) }),
  guide: [st('Hoeveel minute ná die heel uur is dit?', m, `Die lang wyser by die ${m / 5 || 12}: elke getal is 5 minute.`, { unit: 'minute' }),
    stC('Is dit voor of ná half?', ['voor half', 'presies half', 'ná half'], m < 30 ? 0 : m === 30 ? 1 : 2, 'Half is 30 minute ná die heel uur.')],
  guideFinal: 'Kies hoe jy dit sê' });
}
function digiWoorde() {
  const h = rnd(13, 22), m = pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  const ok = `${tydInWoorde(h, m)} nm`;
  return tpl('digiWoorde.a', { ...choice(`Op die digitale wekker staan ${hhmm(h * 60 + m)}. Hoe sê jy hierdie tyd?`, [ok, `${tydInWoorde(h, m)} vm`, ...tydAfleiers(h, m).map((w) => `${w} nm`)].slice(0, 4), 0, [
    `${h} uur is ná 12 uur in die middag: trek 12 af. ${h} − 12 = ${h - 12}.`, `${h - 12}:${String(m).padStart(2, '0')} nm = ${ok}.`],
  { visual: { kind: 'digital', time: hhmm(h * 60 + m), look: 'alarm' } }),
  guide: [st(`Trek 12 af: ${h} − 12 = ?`, h - 12, '’n Digitale horlosie tel deur tot 24 uur.')], guideFinal: `Hoe sê jy ${h - 12}:${String(m).padStart(2, '0')}?` });
}
function oondSom(lank) {
  // regte baktye per gereg
  const [wat, tye] = pick([['’n pizza', [15, 20, 25]], ['’n bobotie', [40, 45, 50, 55, 60]], ['’n melktert', [25, 30, 35, 40]], ['’n hoender', [60, 70, 75, 80, 90]]]);
  const d = lank ? tye.at(-1 - rnd(0, 1)) : pick(tye);
  const s = rnd(15, 18) * 60 + rnd(0, 11) * 5, heel = Math.floor(s / 60) * 60 + 60;
  const oor = s + d >= heel;
  return tpl('oondSom.a', { ...time(`Jy sit om ${hhmm(s)} ${wat} in die oond (kyk na die oond se horlosie). Dit moet ${d} minute bak. Hoe laat is dit klaar?`, s + d,
    oor ? [`Tel eers tot by die heel uur: ${hhmm(s)} → ${hhmm(heel)} = ${heel - s} minute.`, `Dan nog ${d} − ${heel - s} = ${s + d - heel} minute: ${hhmm(s + d)}.`]
      : [`${hhmm(s)} + ${d} minute = ${hhmm(s + d)} (die uur bly dieselfde).`],
    { visual: { kind: 'digital', time: hhmm(s), look: 'oven' } }),
  guide: oor ? [st(`Hoeveel minute van ${hhmm(s)} tot ${hhmm(heel)}?`, heel - s, 'Tel tot by die heel uur (60 minute).', { unit: 'minute' }),
    st(`Hoeveel minute moet dit daarna nog bak? ${d} − ${heel - s} = ?`, d - (heel - s), 'Wat van die baktyd oorbly.', { unit: 'minute' })] : [],
  guideFinal: oor ? `${hhmm(heel)} + ${s + d - heel} minute` : null });
}
function metKlok(q) {
  let m;
  if ((m = q.text.match(/^Hoe laat is dit \d+ minute ná (\d{1,2}:\d{2})\?/))) q.visual = klok(naMin(m[1]), 'wall');
  else if ((m = q.text.match(/begin om (\d{1,2}:\d{2}) en pouse is om (\d{1,2}:\d{2})/))) q.visual = { kind: 'clocks', items: [{ time: m[1], look: 'wall', label: 'begin' }, { time: m[2], look: 'wall', label: 'pouse' }] };
  else if ((m = q.text.match(/werk van (\d{1,2}:\d{2}) tot (\d{1,2}:\d{2})/))) q.visual = { kind: 'clocks', items: [{ time: m[1], look: 'watch', label: 'begin' }, { time: m[2], look: 'watch', label: 'klaar' }] };
  else if ((m = q.text.match(/^Skryf (\d{1,2}:\d{2}) nm in 24-uur-tyd/))) q.visual = klok(naMin(m[1]), 'wall', 'nm');
  else if ((m = q.text.match(/Marathon .* begin om (\d{1,2}:\d{2})\./))) q.visual = klok(naMin(m[1]), 'watch', 'begin');
  return q;
}

const tydBasis = {
  0() {
    if (Math.random() < 0.5) {
      const h = rnd(7, 15), m = pick([0, 15, 30, 45]), d = pick([15, 30, 45, 50, 40]);
      return tpl('tydBasis.0a', { ...time(`Hoe laat is dit ${d} minute ná ${hhmm(h * 60 + m)}?`, h * 60 + m + d, [`Tel ${d} minute by ${hhmm(h * 60 + m)}.`, m + d >= 60 ? `Tot by ${hhmm((h + 1) * 60)} is ${60 - m} minute${m + d - 60 ? `, dan nog ${m + d - 60} minute` : ''}: ${hhmm(h * 60 + m + d)}.` : `${hhmm(h * 60 + m + d)}`]),
        guide: m + d >= 60 ? [st(`Hoeveel minute van ${hhmm(h * 60 + m)} tot ${hhmm((h + 1) * 60)}?`, 60 - m, 'Tel aan tot by die heel uur: die lang wyser gaan tot by die 12.', { unit: 'min' })] : [st(`Die minute: ${m} + ${d} = ?`, m + d, 'Dit bly in dieselfde uur: tel net die minute bymekaar.', { unit: 'min' })], guideFinal: m + d >= 60 ? `Tel die minute wat nog oorbly van die ${d} minute by` : `Skryf die tyd: die uur bly ${h}` });
    }
    const u = rnd(2, 6);
    return tpl('tydBasis.0b', { ...num(`Hoeveel minute is ${u} uur?`, u * 60, ['1 uur = 60 minute.', `${u} × 60 = ${u * 60}.`], { unit: 'minute', wrong: [W(u * 100, 'Jy het gereken asof \'n uur 100 minute het.', '1 uur = 60 minute.')] }),
      guide: [st('Hoeveel minute in 1 uur?', 60, 'In een uur gaan die lang wyser een keer heeltemal om: tel die minute op die horlosie.')], guideFinal: `${u} × 60` });
  },
  1() {
    if (Math.random() < 0.5) {
      const h = rnd(1, 11), m = pick([5, 10, 20, 25, 35, 40, 50, 55]);
      return tpl('tydBasis.1a', { ...time(`Skryf ${h}:${String(m).padStart(2, '0')} nm in 24-uur-tyd.`, (h + 12) * 60 + m, ['nm = namiddag: ná 12 uur in die middag.', `Tel 12 by die uur: ${h} + 12 = ${h + 12}.`, `${h + 12}:${String(m).padStart(2, '0')}`]),
        guide: [st(`${h} + 12 = ?`, h + 12, 'Ná 12 uur in die middag tel jy 12 by die uur.')], guideFinal: 'Skryf die tyd met die minute' });
    }
    const s = rnd(7, 10) * 60 + pick([10, 15, 20, 40, 45]), e = s + rnd(70, 200);
    const nextH = Math.ceil(s / 60) * 60;
    return tpl('tydBasis.1b', { ...num(`Die skooldag begin om ${hhmm(s)} en pouse is om ${hhmm(e)}. Hoeveel minute duur dit?`, e - s, [`Tydlyn: ${hhmm(s)} → ${hhmm(nextH)} = ${nextH - s} min.`, `${hhmm(nextH)} → ${hhmm(e)} = ${e - nextH} min.`, `Saam: ${e - s} minute.`], { unit: 'minute', wrong: [W(Number(hhmm(e).replace(':', '')) - Number(hhmm(s).replace(':', '')), 'Jy het die tye as gewone getalle afgetrek.', 'Gebruik die tydlyn: spring eers na die heel uur.')].filter((w) => w.answer !== e - s) }),
      guide: [st(`Van ${hhmm(s)} tot ${hhmm(nextH)} = ? minute`, nextH - s, 'Tot by die volgende heel uur.', { unit: 'min' }), st(`Van ${hhmm(nextH)} tot ${hhmm(e)} = ? minute`, e - nextH, '1 uur = 60 minute.', { unit: 'min' })], guideFinal: 'Tel die spronge op' });
  },
  2() {
    if (Math.random() < 0.5) {
      const mi = rnd(2, 9), s = rnd(5, 55);
      return tpl('tydBasis.2a', { ...num(`${mi} minute ${s} sekondes = … sekondes`, mi * 60 + s, [`1 minuut = 60 sekondes.`, `${mi} × 60 = ${mi * 60}; + ${s} = ${mi * 60 + s}.`], { unit: 'sekondes', wrong: [W(mi * 100 + s, 'Jy het gereken asof \'n minuut 100 sekondes het.', '1 minuut = 60 sekondes.')] }),
        guide: [st(`${mi} minute = … sekondes`, mi * 60, '1 minuut = 60 sekondes.')], guideFinal: `Tel ${s} sekondes by` });
    }
    const s = rnd(6, 9) * 60 + pick([15, 20, 30, 45, 50]), e = rnd(13, 17) * 60 + pick([5, 10, 25, 40]), nextH = Math.ceil(s / 60) * 60, lastH = Math.floor(e / 60) * 60;
    return tpl('tydBasis.2b', { ...num(`Ma werk van ${hhmm(s)} tot ${hhmm(e)}. Hoeveel minute werk sy?`, e - s, [`${hhmm(s)} → ${hhmm(nextH)}: ${nextH - s} min.`, `${hhmm(nextH)} → ${hhmm(lastH)}: ${(lastH - nextH) / 60} uur = ${lastH - nextH} min.`, `${hhmm(lastH)} → ${hhmm(e)}: ${e - lastH} min.`, `Saam: ${e - s} minute (${Math.floor((e - s) / 60)} uur ${(e - s) % 60} min).`], { unit: 'minute' }),
      guide: [st(`${hhmm(s)} → ${hhmm(nextH)} = ? min`, nextH - s, 'Hoeveel minute is dit nog tot by die volgende heel uur?'), st(`${hhmm(nextH)} → ${hhmm(lastH)} = ? uur`, (lastH - nextH) / 60, 'Tel die heel ure van die een tyd tot by die ander.'), st(`${hhmm(lastH)} → ${hhmm(e)} = ? min`, e - lastH, 'Die laaste minute.')], guideFinal: 'Skakel alles om na minute en tel op' });
  },
  3() {
    if (Math.random() < 0.5) {
      const [u, m] = pick([[1.5, 90], [2.5, 150], [0.25, 15], [1.25, 75], [0.75, 45], [3.5, 210], [0.1, 6]]);
      return tpl('tydBasis.3a', { ...num(`${f(u)} uur = … minute`, m, [`1 uur = 60 minute. ${f(u - Math.floor(u))} uur = ${f(u - Math.floor(u))} × 60 = ${round((u - Math.floor(u)) * 60)} minute.`, `${Math.floor(u)} × 60 + ${round((u - Math.floor(u)) * 60)} = ${m}.`], { unit: 'minute', wrong: [W(Math.floor(u) * 60 + Math.round((u - Math.floor(u)) * 100), 'Jy het die syfers ná die komma as minute gelees.', `0,5 uur is \'n halfuur = 30 minute, nie 50 nie.`)] }),
        guide: [st(`${f(round(u - Math.floor(u)))} uur = … minute`, round((u - Math.floor(u)) * 60), 'Maal met 60, want ’n uur het 60 minute. Of dink: ’n halfuur is die helfte van 60.')], guideFinal: `Tel ${Math.floor(u)} × 60 by` });
    }
    const s = rnd(5, 7) * 60 + pick([0, 15, 30]), d = rnd(2, 4) * 60 + rnd(5, 55);
    return tpl('tydBasis.3b', { ...time(`'n Marathon by die Olimpiese Spele begin om ${hhmm(s)}. Die wenner hardloop ${Math.floor(d / 60)} uur ${d % 60} minute. Hoe laat kom die wenner oor die wenstreep?`, s + d,
      [`Tel eers die ure by: ${hhmm(s)} + ${Math.floor(d / 60)} uur = ${hhmm(s + Math.floor(d / 60) * 60)}.`, ...((s % 60) + (d % 60) >= 60 ? [`Dan die minute: ${s % 60} + ${d % 60} = ${(s % 60) + (d % 60)} minute. Dit is ${(s % 60) + (d % 60) === 60 ? 'presies 1 uur' : `1 uur en ${(s % 60) + (d % 60) - 60} minute`}.`, `Dus ${hhmm(s + d)}.`] : [`Dan die minute: + ${d % 60} min = ${hhmm(s + d)}.`])]),
    guide: [st(`Hoe laat is dit ${Math.floor(d / 60)} uur ná ${hhmm(s)}? (skryf net die uur)`, Math.floor((s + Math.floor(d / 60) * 60) / 60), `${Math.floor(s / 60)} + ${Math.floor(d / 60)}.`)], guideFinal: (s % 60) + (d % 60) >= 60 ? `Tel nou ${d % 60} minute by. 60 of meer minute? Dan kom daar ’n uur by` : `Tel nou ${d % 60} minute by` });
  },
};

// Tyd: kloklees en die tyd in woorde hoort by, met regte horlosies
const tyd = {
  0() { const r = Math.random(); if (r < 0.3) return tpl('tyd.0a', klokLees(0)); if (r < 0.5) return tpl('tyd.0b', klokWoorde(0)); return tpl('tyd.0c', metKlok(tydBasis[0]())); },
  1() { const r = Math.random(); if (r < 0.15) return tpl('tyd.1a', klokLees(1)); if (r < 0.3) return tpl('tyd.1b', klokWoorde(1)); if (r < 0.42) return tpl('tyd.1c', digiWoorde()); if (r < 0.55) return tpl('tyd.1d', oondSom(false)); return tpl('tyd.1e', metKlok(tydBasis[1]())); },
  2() { return tpl('tyd.2a', Math.random() < 0.25 ? oondSom(true) : metKlok(tydBasis[2]())); },
  3() { return tpl('tyd.3a', metKlok(tydBasis[3]())); },
};

// =====================================================================
// DATAHANTERING
// =====================================================================
const SPORTE = ['sokker', 'netbal', 'rugby', 'krieket', 'swem'];
const data = {
  0() {
    const labels = shuffle(SPORTE).slice(0, 4), vals = labels.map(() => rnd(3, 15));
    const i = vals.indexOf(Math.max(...vals)), j = vals.indexOf(Math.min(...vals));
    if (i === j) return tpl('data.0a', data[0]());
    return tpl('data.0b', { ...num(`Die staafgrafiek wys watter sport die kinders in graad ${rnd(4, 6)} die liefste speel. Hoeveel meer kinders kies ${labels[i]} as ${labels[j]}?`, vals[i] - vals[j], [`${labels[i]}: ${vals[i]}; ${labels[j]}: ${vals[j]}.`, `${vals[i]} − ${vals[j]} = ${vals[i] - vals[j]}.`], { visual: { kind: 'bar', title: 'Gunstelingsport', labels, values: vals, step: 1 }, wrong: [W(vals[i] + vals[j], 'Jy het opgetel.', '"Hoeveel meer" beteken die verskil: trek af.')] }),
      guide: [st(`Hoeveel kinders kies ${labels[i]}?`, vals[i], 'Lees die hoogte van die staaf.')], guideFinal: `Trek die getal vir ${labels[j]} af` });
  },
  1() {
    const mod = rnd(2, 9), others = Array.from({ length: 5 }, () => rnd(1, 9)).filter((x) => x !== mod).slice(0, 4), d = shuffle([mod, mod, mod, ...others]);
    const counts = d.reduce((a, x) => ({ ...a, [x]: (a[x] || 0) + 1 }), {});
    if (Object.values(counts).filter((c) => c >= 3).length > 1) return tpl('data.1a', data[1]());
    return tpl('data.1b', { ...num(`Die span se doele in elke wedstryd: ${list(d)}. Wat is die modus?`, mod, ['Die modus is die waarde wat die meeste voorkom.', `${mod} kom ${counts[mod]} keer voor.`], { wrong: [W(Math.max(...d) === mod ? -1 : Math.max(...d), 'Dit is die grootste getal, nie die modus nie.', 'Modus = die getal wat die meeste kere voorkom.')].filter((w) => w.answer >= 0) }),
      guide: [st(`Hoeveel keer kom ${mod} voor?`, counts[mod], `Gaan die lys van links na regs deur en tik elke ${mod} af terwyl jy tel.`)], guideFinal: 'Watter getal kom die meeste voor?' });
  },
  2() {
    if (Math.random() < 0.55) {
      const d = Array.from({ length: pick([5, 7]) }, () => rnd(10, 60)), s = [...d].sort((a, b) => a - b), med = s[(s.length - 1) / 2];
      return tpl('data.2a', { ...num(`Die lengtes van die sonneblomme (cm): ${list(d)}. Wat is die mediaan?`, med, [`Sorteer: ${list(s)}.`, `Die middelste getal: ${med}.`], { wrong: [W(d[(d.length - 1) / 2] === med ? -1 : d[(d.length - 1) / 2], 'Jy het nie eers gesorteer nie.', 'Sorteer eers van klein na groot.')].filter((w) => w.answer >= 0) }),
        guide: [st(`Hoeveel getalle is daar?`, d.length, 'Tel die getalle een vir een en tik elkeen af.'), st('Wat is die kleinste getal?', s[0], 'Begin by die kleinste getal.')], guideFinal: `Sorteer en kies die ${(d.length + 1) / 2}de getal` });
    }
    const [wat, n] = pick([['\'n dobbelsteen gooi', 6], ['\'n muntstuk opgooi', 2], ['\'n muntstuk opskiet én \'n dobbelsteen gooi', 12]]);
    return tpl('data.2b', { ...num(`Hoeveel moontlike uitkomste is daar as jy ${wat}?`, n, [n === 12 ? 'Muntstuk: 2 uitkomste (kop, stert). Dobbelsteen: 6. Lys dit: kop-1, kop-2, … kop-6 en stert-1, … stert-6. Dit is 2 × 6 = 12.' : n === 6 ? 'Die dobbelsteen kan 1, 2, 3, 4, 5 of 6 wys.' : 'Kop of stert.']), guide: n === 12 ? [st('Hoeveel uitkomste het \'n dobbelsteen?', 6, 'Tel die kante van die dobbelsteen.')] : [], guideFinal: n === 12 ? 'Maal met die 2 uitkomste van die munt' : 'Lys al die uitkomste' });
  },
  3() {
    const r = Math.random();
    if (r < 0.4) {
      const k = pick([4, 5]), avg = rnd(8, 30), d = Array.from({ length: k - 1 }, () => avg + rnd(-6, 6)); d.push(avg * k - d.reduce((a, b) => a + b, 0));
      if (d.at(-1) < 1) return tpl('data.3a', data[3]());
      return tpl('data.3b', { ...num(`${pick(NAMES)} se punte vir ${k} toetse: ${list(d)}. Wat is die gemiddelde?`, avg, [`Tel op: ${d.join(' + ')} = ${avg * k}.`, `Deel deur ${k}: ${avg * k} ÷ ${k} = ${avg}.`], { wrong: [W(avg * k, 'Jy het vergeet om te deel.', `Deel die totaal deur die aantal toetse (${k}).`)] }),
        guide: [st(`Tel al die punte op: ${d.join(' + ')} = ?`, avg * k, 'Totaal.')], guideFinal: `Deel deur ${k}` });
    }
    if (r < 0.65) {
      const d = Array.from({ length: 6 }, () => rnd(12, 38));
      return tpl('data.3c', { ...num(`Die temperature vir 'n week in Upington (°C): ${list(d)}. Wat is die omvang?`, Math.max(...d) - Math.min(...d), ['Omvang = grootste − kleinste.', `${Math.max(...d)} − ${Math.min(...d)} = ${Math.max(...d) - Math.min(...d)}.`], { unit: '°C' }),
        guide: [st('Wat is die grootste waarde?', Math.max(...d), 'Gaan die getalle een vir een deur en onthou elke keer die grootste een tot dusver.'), st('Wat is die kleinste?', Math.min(...d), 'Gaan weer die lys deur, nou op soek na die kleinste getal.')], guideFinal: 'Trek af' });
    }
    const [wat, g, tot] = pick([['\'n ewe getal', 3, 6], ['\'n getal groter as 4', 2, 6], ['\'n 6', 1, 6], ['\'n priemgetal', 3, 6]]);
    return tpl('data.3d', { ...frac(`Jy gooi 'n dobbelsteen een keer. Wat is die waarskynlikheid dat jy ${wat} gooi? (Skryf as 'n breuk.)`, [g, tot], [`Alle uitkomste: 1; 2; 3; 4; 5; 6 → ${tot}.`, `Gunstige uitkomste: ${g}.`, `Waarskynlikheid = ${g}/${tot}${gcd(g, tot) > 1 ? ` = ${fracStr([g, tot])}` : ''}.`]),
      guide: [st('Hoeveel uitkomste is daar altesaam?', tot, 'Tel die vlakke van ’n dobbelsteen: elke vlak het ’n ander getal oë.'), st(`Hoeveel daarvan is ${wat}?`, g, 'Skryf al die uitkomste van die dobbelsteen neer en trek ’n kring om dié wat pas.')], guideFinal: 'Gunstige uitkomste / al die uitkomste' });
  },
};

export const GENERATORS = { optel, vermenigvuldig, deling, getalbegrip, breuke, desimale, persentasie, finansies, patrone, meetkunde, meting, omtrek, tyd, data };

// ---------- kindertaal ----------
const KIDWORDS = [
  ['noemer', /\b[Nn]oemers?\b/, 'die getal onder die streep'],
  ['teller', /\b[Tt]ellers?\b/, 'die getal bo die streep'],
  ['omtrek', /\b[Oo]mtrek\b/, 'die lengte rondom'],
  ['oppervlakte', /\b[Oo]ppervlakte\b/, 'hoeveel vierkante binne-in pas'],
  ['res', /\bres\b(?! □)/, 'wat oorbly'],
  ['faktor', /\b[Ff]aktore\b/, 'getalle wat sonder res in die getal deel'],
  ['veelvoud', /\b[Vv]eelvoud\b/, '\'n antwoord in die maaltafel'],
  ['priemgetal', /\b[Pp]riemgetal\b/, '\'n getal met net twee faktore: 1 en homself'],
  ['deelbaar', /\bdeelbaar\b/, 'kan sonder res gedeel word'],
  ['uitset', /\buitset\b/, 'wat uitkom'],
  ['inset', /\binset\b/, 'wat ingaan'],
];
export function kid(text, done = new Set()) {
  if (!text || typeof text !== 'string') return text;
  const out = [];
  let s = text;
  for (const [fam, re, uitleg] of KIDWORDS) {
    if (done.has(fam) || s.includes(uitleg)) continue;
    const g = new RegExp(re.source, 'g');
    s = s.replace(g, (m, ...rest) => {
      const at = rest[rest.length - 2], str = rest[rest.length - 1], after = str.slice(at + m.length);
      if (done.has(fam) || /^\s?[/()]/.test(after) || str[at - 1] === '(' || str[at - 1] === '/') return m;
      done.add(fam);
      out.push(`${m} (${uitleg})`);
      return `⟦${out.length - 1}⟧`;
    });
  }
  return s.replace(/⟦(\d+)⟧/g, (_, i) => out[Number(i)]);
}
function kidify(q) {
  const seen = new Set();
  q.text = kid(q.text, seen);
  const gs = new Set(seen), ss = new Set(seen);
  q.guide = (q.guide || []).map((g) => ({ ...g, ask: kid(g.ask, gs), tip: kid(g.tip, gs) }));
  q.guideFinal = kid(q.guideFinal, gs);
  q.steps = (q.steps || []).map((t) => kid(t, ss));
  return q;
}

const NAME_RE = new RegExp(`\\b(${NAMES.join('|')}|Koos|Gert|Sakkie|Frikkie)\\b`, 'g');
export const shapeOf = (text) => String(text).replace(NAME_RE, 'N').replace(/\bR\s?(?=\d)/g, 'R').replace(/\$/g, '$').replace(/\d+([.,\s ]\d+)*/g, '#')
  .replace(/\b(sokker|netbal|rugby|krieket|swem|atletiek|tamaties|koekies|armbandjies|eiers|lekkers|appels|Smarties|roomyse|koeldrankblikkies|potlode|skoene|sokkerbal|baadjie|rugsak|kos|vervoer|skoolklere|boeke|krag|water|vlakke|hoekpunte|rande|sye|driehoek|vierhoek|vyfhoek|seshoek|agthoek|m|cm|mm|km|kg|g|ℓ|mℓ)\b/g, 'X');

let counter = 0;
// Kwaliteitspoort: een som met een fout in de vaste uitleg (rekenfout, "+ 0"-stap, tip die het antwoord verklapt, …)
// wordt opnieuw gemaakt; zo ziet een kind hem nooit. De lint (scripts/lint-uitleg.mjs) laat per sjabloon zien hoe vaak dat gebeurt.
export function generate(cat, level) {
  let q;
  for (let i = 0; i < 30; i++) {
    q = generateRaw(cat, level);
    if (!problemen(q, { hints: hintsFor }).length) return q;
  }
  return q;
}
// De som zoals de generator hem maakt, zonder poort (voor de lint)
export function generateRaw(cat, level) {
  const g = GENERATORS[cat] || GENERATORS.optel;
  const lv = Math.max(0, Math.min(3, level));
  const q = g[lv]();
  q.cat = GENERATORS[cat] ? cat : 'optel';
  q.level = lv;
  q.id = `${Date.now().toString(36)}z${(counter++).toString(36)}`;
  if (!q.guide || !q.guide.length) { q.guide = []; q.guideFinal = null; }
  q.shape = shapeOf(q.text);
  improveTips(q, 'af'); // vage tips ("Tafel van 3.") → concrete aanpak
  q.wrong = (q.wrong || []).filter((w) => w && w.label && w.answer != null && !(typeof w.answer === 'number' && (Number.isNaN(w.answer) || Math.abs(w.answer - q.answer) < 1e-9)));
  q.wrong = [...q.wrong, ...algemeneDenkfouten(q, 'af')]; // kale sommen: onthouden vergeten, ernaast in de tafel, … (src/denkfouten.js)
  return enkelvoudSom(vereenvoudigStap(stappenVolgenTussenstappen(zonderEenKeer(kidify(q)), 'af'), 'af'), 'af');
}
export function generateLike(cat, level, shape, notText) {
  let last = null;
  for (let i = 0; i < 120; i++) {
    const q = generate(cat, level);
    if (q.shape === shape && q.text !== notText) return q;
    last = q;
  }
  return last;
}

export function hintsFor(q) {
  const m = mnemonicsFor(q.cat)[0];
  // Hints gaan over déze som: de tussenstappen. De algemene aanpak van het onderdeel (en een ezelsbruggetje) alleen als er
  // geen tussenstappen zijn; die paste vaak niet bij de somvorm (Max-test: bv. afronden-uitleg bij een plaatswaardevraag).
  const steps = (q.guide || []).map((g) => g.ask + (g.type === 'choice' ? ` (${g.options.join(' / ')})` : ''));
  if (steps.length) return steps;
  // Geen tussenstappen: de aanpak van de uitlegkaart van déze soort som (Max-meetlat #4: de algemene onderdeel-hint ging
  // over hoeken of gemiddelde bij een balk- of staafgrafieksom). Alleen als er geen kaart is de algemene aanpak.
  const kaart = kaartVoor('af', q.tpl);
  if (kaart?.aanpak?.length) return [kid(kaart.aanpak.slice(0, 2).join(' '))];
  return [kid(hintAanpak(q.cat, q.level ?? 2)) + (m ? `\n🧠 Onthou: ${m.kort}` : '')].filter(Boolean);
}
export const STRATEGY = Object.fromEntries(Object.keys(DIDACTIEK).map((c) => [c, hintAanpak(c, 2)]));
