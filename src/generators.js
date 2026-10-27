// Sommengeneratoren voor groep 8, gebaseerd op de referentieniveaus 1F/1S
// (domeinen Getallen, Verhoudingen, Meten & meetkunde, Verbanden) en de
// leerlijn groep 8 van de gangbare methodes (o.a. Pluspunt 4, Wereld in getallen 5).
//
// Elke categorie heeft 4 niveaus:
//   0 = opstap (stof groep 5/6 — als groep 8 nog echt te moeilijk is)
//   1 = basis  (stof groep 6/7, moet vlot gaan)
//   2 = 1F     (fundamenteel niveau eind groep 8)
//   3 = 1S     (streefniveau eind groep 8)
//
// Elke som heeft:
//   steps — stappenplan als tekst (voor hints en uitleg na een fout)
//   guide — invulbare tussenstappen ("samen stap voor stap"): het kind rekent
//           elke tussenstap zelf uit, daarna het eindantwoord.

import { algemeneDenkfouten } from './denkfouten.js';
import { kaartVoor } from './uitleg/index.js';
import { problemen } from './kwaliteit.js';
import { improveTips } from './tips.js';
import { rnd, pick, shuffle, gcd, lcm, round, fmt, euro, fracStr, numberWords, hhmm, enkelvoudSom, zonderEenKeer, vereenvoudigStap, stappenVolgenTussenstappen } from './util.js';
import { misconceptionsFor } from './misconceptions.js';
import { mnemonicsFor } from './mnemonics.js';
import { DIDACTIEK, hintAanpak } from './didactiek.js';
import { ts } from './i18n.js';

export const LEVELS = [0, 1, 2, 3];
// Niveaus als groep: groep 7 bevat de meeste 1F-stof (breuken, procenten, schaal),
// groep 8 is het eindniveau van de basisschool (1F/1S, doorstroomtoets).
export const LEVEL_NAMES = ['groep 5', 'groep 6', 'groep 7', 'groep 8'];
// Bij de starttoets: begin één groep lager dan de groep van het kind.
export const startLevelForGroep = (groep) => Math.max(0, Math.min(3, Number(groep) - 6));

export const CATEGORIES = [
  { id: 'optellen', label: 'Optellen & aftrekken', domain: 'Getallen', icon: '➕' },
  { id: 'vermenigvuldigen', label: 'Vermenigvuldigen', domain: 'Getallen', icon: '✖️' },
  { id: 'delen', label: 'Delen', domain: 'Getallen', icon: '➗' },
  { id: 'kommagetallen', label: 'Kommagetallen', domain: 'Getallen', icon: '🔢' },
  { id: 'getalbegrip', label: 'Grote getallen & afronden', domain: 'Getallen', icon: '🧮' },
  { id: 'breuken', label: 'Breuken', domain: 'Verhoudingen', icon: '🍕' },
  { id: 'procenten', label: 'Procenten', domain: 'Verhoudingen', icon: '💯' },
  { id: 'verhoudingen', label: 'Verhoudingen', domain: 'Verhoudingen', icon: '⚖️' },
  { id: 'schaal', label: 'Schaal & kaarten', domain: 'Verhoudingen', icon: '🗺️' },
  { id: 'metriek', label: 'Maten omrekenen', domain: 'Meten & meetkunde', icon: '📏' },
  { id: 'oppervlakte', label: 'Omtrek, oppervlakte & inhoud', domain: 'Meten & meetkunde', icon: '📐' },
  { id: 'tijd', label: 'Tijd & snelheid', domain: 'Meten & meetkunde', icon: '⏱️' },
  { id: 'meetkunde', label: 'Meetkunde: hoeken, figuren & richting', domain: 'Meten & meetkunde', icon: '🧭' },
  { id: 'grafieken', label: 'Grafieken, patronen & combinaties', domain: 'Verbanden', icon: '📊' },
];
export const CAT_IDS = CATEGORIES.map((c) => c.id);
export const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

const NAMES = ['Sem', 'Noah', 'Emma', 'Julia', 'Daan', 'Lotte', 'Finn', 'Sara', 'Liam', 'Tess', 'Mila', 'Jesse', 'Zoë', 'Milan'];

// ---------- vraag-bouwers ----------
function num(text, answer, steps, extra = {}) {
  const unit = extra.unit || '';
  return {
    type: 'number', text, answer: round(answer), steps,
    display: extra.display || (extra.money ? euro(answer) : fmt(answer) + (unit ? ' ' + unit : '')),
    ...extra,
  };
}
function frac(text, [n, d], steps, extra = {}) {
  return { type: 'fraction', text, answer: [n, d], steps, display: fracStr([n, d]), ...extra };
}
function choice(text, options, correctIdx, steps, extra = {}) {
  const correct = options[correctIdx];
  const opts = shuffle(options);
  return { type: 'choice', text, options: opts, answer: opts.indexOf(correct), steps, display: correct, ...extra };
}
function time(text, minutes, steps, extra = {}) {
  return { type: 'time', text, answer: ((minutes % 1440) + 1440) % 1440, steps, display: hhmm(minutes), ...extra };
}

// ---------- tussenstappen ----------
// st(): een invulbare tussenstap met een getal als antwoord
const st = (ask, answer, tip, extra = {}) => ({ ask, type: 'number', answer: round(answer), display: extra.money ? euro(answer) : fmt(answer), tip, ...extra });
const stF = (ask, [n, d], tip, extra = {}) => ({ ask, type: 'fraction', answer: [n, d], display: fracStr([n, d]), tip, ...extra });
const stC = (ask, options, correctIdx, tip) => {
  const correct = options[correctIdx];
  const opts = shuffle(options);
  return { ask, type: 'choice', options: opts, answer: opts.indexOf(correct), display: correct, tip };
};

const PLACE = ['eenheden', 'tientallen', 'honderdtallen', 'duizendtallen', 'tienduizendtallen', 'honderdduizendtallen'];
const placeParts = (n) => String(n).split('').reverse().map((d, i) => Number(d) * 10 ** i).reverse();

// Kolomsgewijs optellen (van links naar rechts, zoals in de methodes)
function colAdd(a, b) {
  const pa = placeParts(a), pb = placeParts(b);
  const len = Math.max(pa.length, pb.length);
  while (pa.length < len) pa.unshift(0);
  while (pb.length < len) pb.unshift(0);
  const steps = [`Kolomsgewijs: tel per plek op, begin bij de grootste.`];
  const guide = [];
  const partial = [];
  for (let i = 0; i < len; i++) {
    const s = pa[i] + pb[i];
    if (!s) continue;
    partial.push(s);
    const place = PLACE[len - 1 - i];
    steps.push(`${cap(place)}: ${fmt(pa[i])} + ${fmt(pb[i])} = ${fmt(s)}`);
    guide.push(st(`${cap(place)}: ${fmt(pa[i])} + ${fmt(pb[i])} = ?`, s, `Tel alleen de ${place} op.`));
  }
  steps.push(`Tel alles op: ${partial.map((p) => fmt(p)).join(' + ')} = ${fmt(a + b)}`);
  return { steps, guide, final: `Tel nu alles op: ${partial.map((p) => fmt(p)).join(' + ')}` };
}
// Aftrekken door te "rijgen": haal het tweede getal er in stukken af
function rijgSub(a, b) {
  const parts = placeParts(b).filter(Boolean);
  const steps = [`Haal ${fmt(b)} er in stukjes af: ${parts.map((p) => fmt(p)).join(', ')}.`];
  const guide = [];
  let cur = a;
  parts.forEach((p, i) => {
    if (i === parts.length - 1) { steps.push(`${fmt(cur)} − ${fmt(p)} = ${fmt(cur - p)}`); return; }
    guide.push(st(`${fmt(cur)} − ${fmt(p)} = ?`, cur - p, `Haal alleen ${fmt(p)} eraf. Kijk naar de ${PLACE[String(p).length - 1]}.`));
    steps.push(`${fmt(cur)} − ${fmt(p)} = ${fmt(cur - p)}`);
    cur -= p;
  });
  steps.push(`Controle: ${fmt(a - b)} + ${fmt(b)} = ${fmt(a)} ✓`);
  return { steps, guide, final: `Nu het laatste stukje: ${fmt(cur)} − ${fmt(parts.at(-1))}` };
}
// Vermenigvuldigen door te splitsen
function splitMul(a, b) {
  const parts = placeParts(b).filter(Boolean);
  if (parts.length === 1 && b >= 10) {
    // bv. 24 × 20: geen splitsing nodig, alleen "zonder de nul" rekenen
    const z = String(b).length - String(b).replace(/0+$/, '').length, kern = b / 10 ** z, nul = z === 1 ? 'een nul' : `${z} nullen`;
    return { steps: [`Reken eerst zonder de nul${z > 1 ? 'len' : ''}: ${fmt(a)} × ${kern} = ${fmt(a * kern)}.`, `Zet er ${nul} achter: ${fmt(a * b)}.`],
      guide: [st(`Zonder de nul${z > 1 ? 'len' : ''}: ${fmt(a)} × ${kern} = ?`, a * kern, a >= 10 ? `Splits ${fmt(a)} als dat makkelijker is.` : 'Een tafelsom.')],
      final: `Zet er ${nul} achter` };
  }
  const steps = [`Splits ${fmt(b)} in ${parts.map((p) => fmt(p)).join(' + ')}.`];
  const guide = [];
  for (const p of parts) {
    steps.push(`${fmt(a)} × ${fmt(p)} = ${fmt(a * p)}`);
    guide.push(st(`${fmt(a)} × ${fmt(p)} = ?`, a * p, p >= 10 && p % 10 === 0 ? `Reken ${fmt(a)} × ${fmt(p / 10 ** (String(p).length - 1))} en zet er ${String(p).length - 1 === 1 ? 'een nul' : String(p).length - 1 + ' nullen'} achter.` : `Tafelsom of splitsen: ${fmt(a)} × ${p}.`));
  }
  steps.push(`Tel op: ${parts.map((p) => fmt(a * p)).join(' + ')} = ${fmt(a * b)}`);
  return { steps, guide, final: `Tel op: ${parts.map((p) => fmt(a * p)).join(' + ')}` };
}
// Kolomsgewijs delen: "happen"
function happen(a, d) {
  const steps = [`Delen met happen: haal steeds een handige grote hap eraf: een makkelijke keersom met ${fmt(d)} (10 ×, 50 ×, 100 × …) die nog past.`];
  const guide = [];
  let rest = a, total = 0;
  const haps = [];
  for (let p = String(a).length; p >= 0; p--) {
    const k = Math.floor(rest / (d * 10 ** p));
    if (k > 0) {
      const hap = k * 10 ** p;
      steps.push(`${fmt(hap)} × ${fmt(d)} = ${fmt(hap * d)} → er blijft ${fmt(rest - hap * d)} over.`);
      guide.push(st(`Hap: ${fmt(hap)} × ${fmt(d)} = ?`, hap * d, p ? `Reken ${fmt(k)} × ${fmt(d)} en zet er ${p === 1 ? 'een nul' : p + ' nullen'} achter.` : d <= 10 ? `De tafel van ${d}.` : `Splits ${fmt(d)}: ${k} × ${d - (d % 10)} en ${k} × ${d % 10}, en tel op.`));
      guide.push(st(`Wat blijft er over? ${fmt(rest)} − ${fmt(hap * d)} = ?`, rest - hap * d, 'Haal de hap eraf.'));
      rest -= hap * d; total += hap; haps.push(hap);
    }
  }
  steps.push(`Tel de happen op: ${haps.map((h) => fmt(h)).join(' + ')} = ${fmt(total)}${rest ? `, rest ${rest}` : ''}.`);
  return { steps, guide, final: `Tel de happen op: ${haps.map((h) => fmt(h)).join(' + ')}`, total, rest };
}
// Tafelsommen via een bekende tafel
function tafel(a, b) {
  // a × b met b de "tafel"
  const routes = {
    2: [[`1 × ${b} = ?`, b, '1 keer een getal is het getal zelf.'], `Verdubbel ${b}: ${b} + ${b}`],
    3: [[`2 × ${b} = ?`, 2 * b, `Het dubbele van ${b}.`], `Nog één ${b} erbij: ${2 * b} + ${b}`],
    4: [[`2 × ${b} = ?`, 2 * b, `Het dubbele van ${b}.`], `4 keer is het dubbele daarvan: ${2 * b} + ${2 * b}`],
    5: [[`10 × ${b} = ?`, 10 * b, 'Zet een nul erachter.'], `5 keer is de helft daarvan: de helft van ${10 * b}`],
    6: [[`5 × ${b} = ?`, 5 * b, `De helft van 10 × ${b}.`], `Nog één ${b} erbij: ${5 * b} + ${b}`],
    7: [[`5 × ${b} = ?`, 5 * b, `De helft van 10 × ${b}.`], `Nog 2 × ${b} = ${2 * b} erbij: ${5 * b} + ${2 * b}`],
    8: [[`4 × ${b} = ?`, 4 * b, `4 × ${b} is het dubbele van het dubbele: eerst ${b} + ${b} = ${2 * b}, en dat dan nog eens dubbel.`], `8 keer is het dubbele: ${4 * b} + ${4 * b}`],
    9: [[`10 × ${b} = ?`, 10 * b, 'Zet een nul erachter.'], `9 keer is één ${b} minder: ${10 * b} − ${b}`],
    10: [[`1 × ${b} = ?`, b, '1 keer een getal is het getal zelf.'], `Zet er een nul achter`],
  };
  const [g, final] = routes[a];
  return {
    steps: [`Gebruik een tafel die je wél kent.`, `${g[0].replace('?', String(g[1]))}`, `${final} = ${a * b}`],
    guide: [st(g[0], g[1], g[2])],
    final,
  };
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const withGuide = (q, g) => ({ ...q, guide: g.guide, guideFinal: g.final });
// Vaste sjabloon-id per som-variant (soort som): daarmee hoort bij elke som een eigen uitlegkaart (src/uitleg/).
// De binnenste id wint (een hulpfunctie als klokLezen is specifieker dan de tak die hem aanroept).
const tpl = (id, q) => { if (q && typeof q === 'object' && q.text && !q.tpl) q.tpl = id; return q; };

// =====================================================================
// GETALLEN
// =====================================================================
const optellen = {
  0() {
    if (Math.random() < 0.5) {
      const a = rnd(15, 68), b = rnd(12, 29);
      const t = b - (b % 10);
      return tpl('optellen.0a', { ...num(`${a} + ${b} =`, a + b, [`Splits ${b} in ${t} + ${b % 10}.`, `${a} + ${t} = ${a + t}`, ...(((a + t) % 10) + (b % 10) > 10 ? [`${a + t} + ${b % 10} gaat over het tiental: ${a + t} + ${10 - ((a + t) % 10)} = ${a + t + 10 - ((a + t) % 10)}, dan nog ${(b % 10) - (10 - ((a + t) % 10))} erbij: ${a + b}`] : [`${a + t} + ${b % 10} = ${a + b}`])]),
        guide: [st(`Eerst de tientallen: ${a} + ${t} = ?`, a + t, `Tel ${t / 10} ${t === 10 ? 'tiental' : 'tientallen'} erbij.`)], guideFinal: `Dan de eenheden: ${a + t} + ${b % 10}` });
    }
    const a = rnd(41, 95), b = rnd(12, a - 10);
    const t = b - (b % 10);
    return tpl('optellen.0b', { ...num(`${a} − ${b} =`, a - b, [`Splits ${b} in ${t} + ${b % 10}.`, `${a} − ${t} = ${a - t}`, `${a - t} − ${b % 10} = ${a - b}`]),
      guide: [st(`Eerst de tientallen eraf: ${a} − ${t} = ?`, a - t, `Haal ${t / 10} ${t === 10 ? 'tiental' : 'tientallen'} weg.`)], guideFinal: `Dan de eenheden eraf: ${a - t} − ${b % 10}` });
  },
  1() {
    if (Math.random() < 0.5) {
      const a = rnd(120, 880), b = rnd(12, 98), t = b - (b % 10);
      return tpl('optellen.1a', { ...num(`${a} + ${b} =`, a + b, [`Splits ${b} in ${t} + ${b % 10}.`, `${a} + ${t} = ${a + t}`, ...(((a + t) % 10) + (b % 10) > 10 ? [`${a + t} + ${b % 10} gaat over het tiental: ${a + t} + ${10 - ((a + t) % 10)} = ${a + t + 10 - ((a + t) % 10)}, dan nog ${(b % 10) - (10 - ((a + t) % 10))} erbij: ${a + b}`] : [`${a + t} + ${b % 10} = ${a + b}`])]),
        guide: [st(`${a} + ${t} = ?`, a + t, 'Tel eerst de tientallen erbij.')], guideFinal: `${a + t} + ${b % 10}` });
    }
    const a = rnd(300, 990), b = rnd(15, 99), r = Math.ceil(b / 10) * 10;
    return tpl('optellen.1b', { ...num(`${a} − ${b} =`, a - b, [`Handig: ${b} is bijna ${r}.`, `${a} − ${r} = ${a - r}`, `Je hebt ${r - b} te veel afgehaald, dus tel dat er weer bij: ${a - b}`]),
      guide: [st(`Handig rekenen: ${a} − ${r} = ?`, a - r, `${b} is bijna ${r}. Haal eerst ${r} eraf.`), st(`Hoeveel heb je te veel afgehaald? ${r} − ${b} = ?`, r - b, `${r} is meer dan ${b}.`)],
      guideFinal: `Tel dat er weer bij: ${a - r} + ${r - b}` });
  },
  2() {
    const r = Math.random();
    if (r < 0.25) {
      const a = rnd(1200, 4999), b = rnd(1200, 4999), g = colAdd(a, b), plek = pick(['Het museum', 'Het zwembad', 'De dierentuin', 'De bibliotheek']);
      return tpl('optellen.2a', withGuide(num(`${plek} had zaterdag ${fmt(a)} bezoekers en zondag ${fmt(b)}. Hoeveel bezoekers waren er dat weekend samen?`, a + b, g.steps), g));
    }
    if (r < 0.55) {
      const a = rnd(1200, 6999), b = rnd(1200, 2999);
      const g = colAdd(a, b);
      return tpl('optellen.2b', withGuide(num(`${fmt(a)} + ${fmt(b)} =`, a + b, g.steps), g));
    }
    const a = rnd(3, 9) * 1000 + pick([0, rnd(1, 9) * 100]) + rnd(0, 9) * 10 + rnd(0, 4), b = rnd(1100, a - 400);
    const g = rijgSub(a, b);
    return tpl('optellen.2c', withGuide(num(`${fmt(a)} − ${fmt(b)} =`, a - b, g.steps), g));
  },
  3() {
    const n = pick(NAMES);
    const t = pick(['bike', 'school', 'big']);
    if (t === 'bike') {
      const spaar = rnd(180, 420), krijgt = rnd(45, 95), fiets = rnd(spaar + krijgt + 40, 649);
      return tpl('optellen.3a', { ...num(`${n} heeft € ${spaar} gespaard en krijgt € ${krijgt} cadeau voor de verjaardag. De nieuwe fiets kost € ${fiets}. Hoeveel euro komt ${n} nog tekort?`,
        fiets - spaar - krijgt, [`Eerst wat ${n} heeft: ${spaar} + ${krijgt} = ${spaar + krijgt}.`, `Dan het verschil met de prijs: ${fiets} − ${spaar + krijgt} = ${fiets - spaar - krijgt}.`], { unit: 'euro' }),
      guide: [st(`Hoeveel geld heeft ${n} in totaal? ${spaar} + ${krijgt} = ?`, spaar + krijgt, krijgt % 10 && krijgt > 10 ? `Tel het in stukjes op: eerst ${spaar} + ${krijgt - (krijgt % 10)}, dan nog ${krijgt % 10} erbij.` : `Tel vanaf ${spaar} verder: ${krijgt} erbij.`)], guideFinal: `Hoeveel komt ${n} tekort? ${fiets} − ${spaar + krijgt}` });
    }
    if (t === 'school') {
      const totaal = rnd(12, 18) * 1000 + rnd(1, 9) * 100 + rnd(10, 90), a = rnd(2500, 4500), b = rnd(1800, 3900);
      return tpl('optellen.3b', { ...num(`De school heeft € ${fmt(totaal)} te besteden. Ze kopen boeken voor € ${fmt(a)} en gaan op schoolreis voor € ${fmt(b)}. Hoeveel euro blijft er over?`,
        totaal - a - b, [`Wat ze uitgeven: ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}.`, `Wat overblijft: ${fmt(totaal)} − ${fmt(a + b)} = ${fmt(totaal - a - b)}.`], { unit: 'euro' }),
      guide: [st(`Hoeveel geven ze samen uit? ${fmt(a)} + ${fmt(b)} = ?`, a + b, Number.isInteger(a) && Number.isInteger(b) ? 'Splits het tweede bedrag in duizendtallen, honderdtallen, tientallen en eenheden, en tel ze één voor één bij het eerste op.' : 'Tel eerst de hele euro’s op, dan de centen.')], guideFinal: `Wat blijft over? ${fmt(totaal)} − ${fmt(a + b)}` });
    }
    const a = rnd(40, 90) * 1000 + rnd(0, 9) * 10, b = rnd(12000, 38999);
    const g = rijgSub(a, b);
    return tpl('optellen.3c', withGuide(num(`${fmt(a)} − ${fmt(b)} =`, a - b, g.steps), g));
  },
};

// Ankerstap bij delen / ontbrekende factor: een keersom die je kent (10×, 5×, 2× of 1× de deler), zo dicht mogelijk onder
// het antwoord maar er niet gelijk aan (dan zou de stap het antwoord verklappen). Max-meetlat #4: "1/3 van 33 → 5 × 3?"
// was een omweg; bij 33 is 10 × 3 het logische anker.
function anker(d, q) {
  const c = [10, 5, 2].find((k) => k < q) ?? null; // geen 1 × : dat is geen hulp
  if (!c) return { guide: [], guideFinal: null };
  const tip = { 10: `Zet een nul achter ${d}.`, 5: `De helft van 10 × ${d}.`, 2: `Het dubbele van ${d}.`, 1: `1 keer ${d} is ${d} zelf.` }[c];
  return { guide: [st(`${c} × ${d} = ?`, c * d, tip)], guideFinal: `${d * q} is meer dan ${c * d}. Hoe vaak past ${d} in ${d * q}` };
}
const vermenigvuldigen = {
  0() {
    const a = pick([2, 3, 4, 5, 10]), b = rnd(1, 10), vorm = Math.random();
    if (vorm < 0.55) return tpl('vermenigvuldigen.0a', withGuide(num(`${a} × ${b} =`, a * b, tafel(a, b).steps), tafel(a, b)));
    if (vorm < 0.7) return tpl('vermenigvuldigen.0b', withGuide(num(`Hoeveel is ${a} keer ${b}?`, a * b, tafel(a, b).steps), tafel(a, b)));
    if (vorm < 0.82) return tpl('vermenigvuldigen.0c', { ...num(`${a} × ... = ${a * b}`, b, [`Welk getal keer ${a} is ${a * b}?`, `${a} × ${b} = ${a * b}, dus ${b}.`]),
      ...anker(a, b) });
    const n = pick(NAMES), [bak, ding] = pick([['zakjes', 'knikkers'], ['doosjes', 'krijtjes'], ['bekers', 'rietjes'], ['bordjes', 'koekjes'], ['vazen', 'bloemen'], ['emmers', 'schelpen'], ['potjes', 'stiften']]);
    return tpl('vermenigvuldigen.0d', withGuide(num(`${n} heeft ${a} ${bak} met in elk ${b} ${ding}. Hoeveel ${ding} zijn dat samen?`, a * b, tafel(a, b).steps), tafel(a, b)));
  },
  1() {
    const t = pick(['tafel', 'tafel', 'nul', 'handig']);
    if (t === 'tafel') {
      const a = rnd(6, 9), b = rnd(4, 9);
      if (Math.random() < 0.3) {
        const [wie, wat] = pick([['Een alpaca', 'kilo hooi'], ['Een hamster', 'zonnebloempitten'], ['De kat van Zoë', 'uurtjes slaap'], ['Een olifant', 'emmers water'], ['Een papegaai', 'nieuwe woordjes'], ['Een pony', 'wortels']]);
        return tpl('vermenigvuldigen.1a', withGuide(num(`${wie} krijgt elke dag ${a} ${wat}. Hoeveel ${wat} is dat in ${b} dagen?`, a * b, tafel(a, b).steps), tafel(a, b)));
      }
      return tpl('vermenigvuldigen.1b', withGuide(num(`${a} × ${b} =`, a * b, tafel(a, b).steps), tafel(a, b)));
    }
    if (t === 'nul') {
      const a = rnd(3, 9), b = rnd(3, 9) * 10;
      return tpl('vermenigvuldigen.1c', { ...num(`${a} × ${b} =`, a * b, [`Reken eerst zonder de nul: ${a} × ${b / 10} = ${a * b / 10}.`, `Er hoort nog een nul achter: ${a * b}.`]),
        guide: [st(`Zonder de nul: ${a} × ${b / 10} = ?`, (a * b) / 10, 'Een gewone tafelsom.')], guideFinal: `Zet de nul er weer achter: ${(a * b) / 10} → ...` });
    }
    const a = pick([25, 15, 12, 11, 13, 14, 16, 21, 24, 35, 45]), b = pick([3, 4, 5, 6, 7, 8, 9]);
    const g = splitMul(b, a);
    return tpl('vermenigvuldigen.1d', withGuide(num(`${a} × ${b} =`, a * b, g.steps), g));
  },
  2() {
    const r = Math.random();
    if (r < 0.3) {
      const per = pick([12, 18, 24, 36, 48]), dozen = rnd(13, 29), ding = pick(['pakjes drinken', 'potloden', 'eieren', 'blikjes']), g = splitMul(per, dozen);
      return tpl('vermenigvuldigen.2a', withGuide(num(`In één doos zitten ${per} ${ding}. De school bestelt ${dozen} dozen. Hoeveel ${ding} zijn dat?`, per * dozen, g.steps), g));
    }
    if (r < 0.65) {
      const a = rnd(6, 9), b = rnd(140, 480), g = splitMul(a, b);
      return tpl('vermenigvuldigen.2b', withGuide(num(`${a} × ${b} =`, a * b, g.steps), g));
    }
    const a = rnd(21, 29), b = rnd(31, 79), g = splitMul(b, a);
    return tpl('vermenigvuldigen.2c', withGuide(num(`${a} × ${b} =`, a * b, g.steps), g));
  },
  3() {
    if (Math.random() < 0.5) {
      const a = rnd(112, 389), b = rnd(23, 68), g = splitMul(a, b);
      return tpl('vermenigvuldigen.3a', withGuide(num(`${a} × ${b} =`, a * b, g.steps), g));
    }
    const prijs = rnd(14, 38), aantal = rnd(24, 36), g = splitMul(prijs, aantal);
    return tpl('vermenigvuldigen.3b', withGuide(num(`Groep 8 gaat naar een pretpark. Een kaartje kost € ${prijs}. Er gaan ${aantal} kinderen mee. Hoeveel euro kost dat samen?`,
      prijs * aantal, g.steps, { unit: 'euro' }), g));
  },
};

const delen = {
  0() {
    const b = pick([2, 3, 4, 5, 10]), q = rnd(2, 10), a = b * q;
    const half = Math.min(5, q - 1);
    const vorm = Math.random(), n = pick(NAMES);
    const [ding, wie] = pick([['snoepjes', 'kinderen'], ['stickers', 'vriendjes'], ['knikkers', 'zakjes'], ['appels', 'manden'], ['kaartjes', 'stapels'], ['koekjes', 'bordjes'], ['potloden', 'bekers']]);
    const text = vorm < 0.5 ? `${a} : ${b} =` : vorm < 0.7 ? `Hoe vaak past ${b} in ${a}?` : `${n} verdeelt ${a} ${ding} eerlijk over ${b} ${wie}. Hoeveel ${ding} per ${wie === 'kinderen' ? 'kind' : wie === 'vriendjes' ? 'vriendje' : wie.replace(/s$/, '').replace(/en$/, '')}?`;
    return tpl('delen.0a', { ...num(text, q, [`Welke keersom uit de tafel van ${b} heeft als antwoord ${a}?`, `${q} × ${b} = ${a}, dus ${a} : ${b} = ${q}.`]),
      guide: [st(`Begin met een makkelijke som: ${half} × ${b} = ?`, half * b, `Tafel van ${b}.`), st(`Hoeveel blijft er over? ${a} − ${half * b} = ?`, a - half * b, 'Trek het eraf.')],
      guideFinal: `Hoe vaak past ${b} in ${a}? Je had al ${half} keer, en dan nog: hoe vaak past ${b} in ${a - half * b}?` });
  },
  1() {
    const t = pick(['tafel', 'tafel', 'nullen', 'nullen2']);
    const b = rnd(3, 9), q = rnd(3, 12);
    if (t === 'tafel') return tpl('delen.1a', { ...num(Math.random() < 0.6 ? `${b * q} : ${b} =` : `${pick(NAMES)} deelt ${b * q} ${pick(['stickers', 'knikkers', 'snoepjes', 'kaartjes', 'flippo\'s'])} eerlijk met ${b - 1} vriendjes (en zichzelf). Hoeveel krijgt ieder?`, q, [`Welke som uit de tafel van ${b} geeft ${b * q}?`, `${q} × ${b} = ${b * q}, dus ${b * q} : ${b} = ${q}.`]),
      ...anker(b, q) });
    if (t === 'nullen') return tpl('delen.1b', { ...num(`${b * q * 10} : ${b} =`, q * 10, [`Denk aan ${b * q} : ${b} = ${q}.`, `${b * q * 10} is 10 keer zo groot, dus het antwoord ook: ${q * 10}.`]),
      guide: [st(`Zonder de nul: ${b * q} : ${b} = ?`, q, `Tafel van ${b}.`)], guideFinal: `Het getal was 10 keer zo groot, dus het antwoord ook` });
    return tpl('delen.1c', { ...num(`${fmt(b * q * 100)} : ${b * 10} =`, q * 10, [`Streep aan beide kanten een nul weg: ${b * q * 10} : ${b}.`, `${b * q} : ${b} = ${q}, dus ${b * q * 10} : ${b} = ${q * 10}.`]),
      guide: [st(`Streep aan beide kanten een nul weg. Wat staat er links? ${fmt(b * q * 100)} → ?`, b * q * 10, 'Haal één nul weg.'), st(`${b * q} : ${b} = ?`, q, `Tafel van ${b}.`)],
      guideFinal: `${b * q * 10} : ${b}` });
  },
  2() {
    if (Math.random() < 0.2) {
      const d = pick([3, 9]), n = rnd(1000, 9999), sum = String(n).split('').reduce((a, b) => a + Number(b), 0), ja = sum % d === 0;
      return tpl('delen.2a', { ...choice(`Is ${fmt(n)} deelbaar door ${d}? `, ['ja', 'nee'], ja ? 0 : 1, [
        `Truc voor ${d}: tel de cijfers op.`, `${String(n).split('').join(' + ')} = ${sum}.`, `Zit ${sum} in de tafel van ${d}? ${ja ? 'Ja' : 'Nee'}, dus ${fmt(n)} is ${ja ? '' : 'niet '}deelbaar door ${d}.`]),
      guide: [st(`Tel de cijfers op: ${String(n).split('').join(' + ')} = ?`, sum, 'Tel elk cijfer los op.')], guideFinal: `Zit ${sum} in de tafel van ${d}?` });
    }
    if (Math.random() < 0.6) {
      const d = rnd(3, 9), q = rnd(112, 289), g = happen(d * q, d);
      return tpl('delen.2b', withGuide(num(`${d * q} : ${d} =`, q, g.steps), g));
    }
    const d = rnd(6, 8), q = rnd(28, 46), r = rnd(1, d - 1), n = pick(NAMES), total = d * q + r, g = happen(total, d);
    if (Math.random() < 0.4) return tpl('delen.2c', withGuide(num(`Meester Bram verdeelt ${total} snoepjes in zakjes van ${d}. Wat overblijft eet hij zelf op (dat zegt hij niet hardop 🤫). Hoeveel volle zakjes zijn er?`,
      q, [...g.steps, `De rest (${r}) gaat in de mond van meester Bram.`]), { ...g, final: g.final + ' (de rest telt niet mee)' }));
    return tpl('delen.2d', withGuide(num(`${n} verdeelt ${total} kaarten in stapels van ${d}. Hoeveel volle stapels kan ${n} maken?`,
      q, [...g.steps, `Alleen volle stapels tellen, de rest (${r}) telt niet mee.`]), { ...g, final: g.final + ' (de rest telt niet mee)' }));
  },
  3() {
    const r = Math.random();
    if (r < 0.3) {
      const d = rnd(14, 28), q = rnd(35, 95), g = happen(d * q, d);
      return tpl('delen.3a', withGuide(num(`Groep 8 heeft met een sponsorloop € ${fmt(d * q)} opgehaald. Dat wordt eerlijk verdeeld over ${d} goede doelen. Hoeveel euro krijgt elk doel?`, q, g.steps, { unit: 'euro' }), g));
    }
    if (r < 0.65) {
      const d = rnd(13, 29), q = rnd(112, 389), g = happen(d * q, d);
      return tpl('delen.3b', withGuide(num(`${fmt(d * q)} : ${d} =`, q, g.steps), g));
    }
    const plaatsen = pick([48, 52, 56, 60]), kinderen = rnd(4, 7) * plaatsen + rnd(5, plaatsen - 5);
    const bussen = Math.ceil(kinderen / plaatsen), vol = Math.floor(kinderen / plaatsen);
    return tpl('delen.3c', { ...num(`Er gaan ${kinderen} kinderen op schoolreis. In één bus passen ${plaatsen} kinderen. Hoeveel bussen zijn er nodig?`,
      bussen, [`${kinderen} : ${plaatsen} = ${vol} rest ${kinderen % plaatsen}.`, `Die ${kinderen % plaatsen} kinderen moeten ook mee! Dus nog één bus extra: ${bussen}.`, `Let op: hier rond je naar boven af.`]),
    guide: [st(`Hoeveel kinderen passen er in ${vol} volle bussen? ${vol} × ${plaatsen} = ?`, vol * plaatsen, 'Reken de keersom uit.'), st(`Hoeveel kinderen hebben dan nog geen plek? ${kinderen} − ${vol * plaatsen} = ?`, kinderen % plaatsen, 'Trek het eraf.')],
    guideFinal: `Die kinderen moeten ook mee. Hoeveel bussen heb je dus nodig` });
  },
};

// ---------- de rekenmachine (zoals de methode): eerst schatten, dan intoetsen, dan kijken of het kan kloppen ----------
// De app toont bij deze sommen een rekenmachine (q.rekenmachine). Die schrijft een punt waar wij een komma schrijven.
function kassabon() {
  const n = rnd(2, 3);
  let bedragen; do { bedragen = Array.from({ length: n }, () => rnd(150, 1499)); } while (bedragen.some((c) => [0, 50].includes(c % 100) || Math.abs((c % 100) - 50) < 8));
  const tot = bedragen.reduce((a, b) => a + b, 0), schat = bedragen.reduce((a, c) => a + Math.round(c / 100), 0);
  const opts = [`€ ${schat}`, `€ ${fmt(schat / 10, 2)}`, `€ ${schat * 10}`];
  return tpl('kommagetallen.2k', { ...num(`Op de kassabon staan: ${bedragen.slice(0, -1).map((c) => euro(c / 100)).join(', ')} en ${euro(bedragen[n - 1] / 100)}. Hoeveel moet je samen betalen?`, tot / 100, [
    `Schat eerst: rond af op hele euro's: ${bedragen.map((c) => Math.round(c / 100)).join(' + ')} = € ${schat}.`, `Reken precies uit (mag met de rekenmachine): ${bedragen.map((c) => fmt(c / 100, 2)).join(' + ')} = ${fmt(tot / 100, 2)}.`, `Kan het kloppen? ${euro(tot / 100)} ligt dicht bij € ${schat}.`],
  { money: true, rekenmachine: true }),
  guide: [stC(`Schat eerst (rond af op hele euro's). Welk bedrag past?`, opts, 0, 'Rond elk bedrag af op hele euro’s en tel die op.')],
  guideFinal: `Reken nu precies uit (mag met de rekenmachine; die schrijft een punt in plaats van een komma). Klopt het met je schatting?` });
}
// Contextsom met meer stappen (de methode): wat weet je, wat reken je eerst uit, welke bewerking?
function kassabonTerug() {
  const [a, b, b1] = pick([['pennen', 'tassen', 'tas'], ['schriften', 'mappen', 'map'], ['broodjes', 'pakken sap', 'pak sap'], ['tennisballen', 'petten', 'pet']]);
  const ka = rnd(3, 5), pa = rnd(9, 49) * 10 + 5, kb = rnd(2, 4), pb = rnd(25, 120) * 5, tot = ka * pa + kb * pb;
  return tpl('kommagetallen.3k', { ...num(`Je koopt ${ka} ${a} van ${euro(pa / 100)} per stuk en ${kb} ${b}. Je betaalt samen ${euro(tot / 100)}. Wat kost 1 ${b1}?`, pb / 100, [
    `Wat weet je? De prijs van de ${a} en het totaal.`, `Eerst de ${a}: ${ka} × ${fmt(pa / 100, 2)} = ${fmt((ka * pa) / 100, 2)}.`, `Dan de ${b} samen: ${fmt(tot / 100, 2)} − ${fmt((ka * pa) / 100, 2)} = ${fmt((kb * pb) / 100, 2)}.`, `Eén: ${fmt((kb * pb) / 100, 2)} : ${kb} = ${fmt(pb / 100, 2)}.`],
  { money: true, rekenmachine: true }),
  guide: [st(`Wat kosten de ${ka} ${a} samen? ${ka} × ${euro(pa / 100)} = ?`, (ka * pa) / 100, 'Keer (mag met de rekenmachine).', { money: true }),
    st(`Wat kosten de ${kb} ${b} samen? Haal de ${a} van het totaal af.`, (kb * pb) / 100, 'Totaal min de ' + a + '.', { money: true })],
  guideFinal: `Wat kost er één? Deel door ${kb}` });
}
// Gemiddelde met de rekenmachine (de methode): alles optellen, dan delen door het aantal.
function gemiddeldeRekenmachine() {
  const n = pick([4, 5]), vals = Array.from({ length: n }, () => rnd(130, 162)), som = vals.reduce((a, b) => a + b, 0);
  const namen = shuffle(NAMES).slice(0, n);
  return tpl('grafieken.3e', { ...num(`Hoe lang zijn deze kinderen gemiddeld? ${namen.map((x, i) => `${x}: ${vals[i]} cm`).join(', ')}.`, som / n, [
    `Tel alle lengtes op: ${vals.join(' + ')} = ${som}.`, `Deel door het aantal kinderen: ${som} : ${n} = ${fmt(som / n)} cm.`, 'Kan het kloppen? Het gemiddelde ligt tussen de kleinste en de grootste lengte.'],
  { unit: 'cm', rekenmachine: true, visual: { kind: 'table', headers: ['naam', 'lengte (cm)'], rows: namen.map((x, i) => [x, vals[i]]) } }),
  guide: [st(`Tel alle lengtes op (mag met de rekenmachine): ${vals.join(' + ')} = ?`, som, 'Toets ze één voor één in, met + ertussen.', { unit: 'cm' })], guideFinal: `Deel door het aantal kinderen: ${som} : ${n}` });
}

const kommagetallen = {
  0() {
    if (Math.random() < 0.5) {
      const e1 = rnd(1, 6), c1 = pick([25, 50, 75, 10, 20, 40]), e2 = rnd(1, 4), c2 = pick([25, 50, 20, 30]);
      const tot = e1 + e2 + (c1 + c2) / 100;
      return tpl('kommagetallen.0a', { ...num(`Je koopt een tijdschrift van ${euro(e1 + c1 / 100)} en een snoepzak van ${euro(e2 + c2 / 100)}. Hoeveel betaal je samen?`, tot,
        [`Eerst de hele euro's: ${e1} + ${e2} = ${e1 + e2}.`, `Dan de centen: ${c1} + ${c2} = ${c1 + c2} cent${c1 + c2 >= 100 ? ` = € 1 en ${c1 + c2 - 100} cent` : ''}.`, `Samen: ${euro(tot)}.`], { money: true }),
      guide: [st(`Eerst de hele euro's: ${e1} + ${e2} = ?`, e1 + e2, 'Alleen de cijfers vóór de komma.'), st(`Dan de centen: ${c1} + ${c2} = ? cent`, c1 + c2, 'De cijfers achter de komma zijn de centen.', { unit: 'cent' })],
      guideFinal: c1 + c2 >= 100 ? `Samen: € ${e1 + e2} en ${c1 + c2} cent. Wissel 100 cent om voor € 1: hoeveel euro en cent is dat?` : `Samen: € ${e1 + e2} en ${c1 + c2} cent` });
    }
    const a = rnd(1, 6), b = rnd(1, 9 - a), w = rnd(0, 3);
    return tpl('kommagetallen.0b', { ...num(`${fmt(w + a / 10)} + 0,${b} =`, w + (a + b) / 10, [`0,${b} is ${b} tienden.`, `${a} tienden + ${b} tienden = ${a + b} tienden.`, `Dus ${fmt(w + (a + b) / 10)}.`]),
      guide: [st(`Tienden: ${a} + ${b} = ? tienden`, a + b, 'Het eerste cijfer achter de komma zijn de tienden.')], guideFinal: `${w} helen en ${a + b} tienden` });
  },
  1() {
    if (Math.random() < 0.3) {
      const prijs = rnd(105, 1795) / 100, briefje = prijs < 5 ? 5 : prijs < 10 ? 10 : 20, heel = Math.ceil(prijs);
      return tpl('kommagetallen.1a', { ...num(`Je koopt iets van ${euro(prijs)} en betaalt met een briefje van € ${briefje}. Hoeveel geld krijg je terug?`, briefje - prijs, [
        `Vul aan tot een hele euro: ${euro(prijs)} → € ${heel} = ${euro(heel - prijs)}.`, ...(briefje > heel ? [`Dan verder tot € ${briefje}: € ${briefje - heel}.`] : []), `Samen terug: ${euro(briefje - prijs)}.`], { money: true }),
      guide: heel === prijs ? [st(`${briefje} − ${fmt(prijs)} = ?`, briefje - prijs, 'Gewoon aftrekken.', { money: true })]
        : [st(`Aanvullen tot een hele euro: van ${euro(prijs)} naar € ${heel} = ?`, heel - prijs, 'Hoeveel cent mist er tot de hele euro?', { money: true }), st(`En van € ${heel} naar € ${briefje} = ?`, briefje - heel, `Hele euro’s tellen: van € ${heel} verder tot € ${briefje}.`, { money: true })],
      guideFinal: heel === prijs ? 'Dat krijg je terug' : `Tel op: ${euro(heel - prijs)} + € ${briefje - heel}` });
    }
    if (Math.random() < 0.5) {
      const a = rnd(11, 89) / 10, b = rnd(105, 495) / 100;
      const ha = Math.floor(a), hb = Math.floor(b);
      return tpl('kommagetallen.1b', { ...num(`${fmt(a)} + ${fmt(b)} =`, a + b, [`Zet de komma's onder elkaar. Maak ${fmt(a)} even lang: ${fmt(a, 2)}.`, `${fmt(a, 2)} + ${fmt(b, 2)} = ${fmt(a + b, 2)}`]),
        guide: [st(`Eerst de helen: ${ha} + ${hb} = ?`, ha + hb, 'Alleen de cijfers vóór de komma.'), st(`Dan achter de komma: ${fmt(a - ha, 2)} + ${fmt(b - hb, 2)} = ?`, a - ha + b - hb, 'Een nul achteraan verandert niets: 0,3 is hetzelfde als 0,30.')],
        guideFinal: `Tel samen: ${ha + hb} + ${fmt(a - ha + b - hb)}` });
    }
    const a = rnd(5, 20), b = rnd(105, 495) / 100, hb = Math.floor(b);
    return tpl('kommagetallen.1c', { ...num(`${a} − ${fmt(b)} =`, a - b, [`Schrijf ${a} als ${fmt(a, 2)}.`, `${fmt(a, 2)} − ${fmt(b, 2)} = ${fmt(a - b, 2)}`, `Controle: ${fmt(a - b, 2)} + ${fmt(b, 2)} = ${a}`]),
      guide: [st(`Eerst de helen eraf: ${a} − ${hb} = ?`, a - hb, 'Alleen het getal vóór de komma.')], guideFinal: `Nu nog ${fmt(b - hb, 2)} eraf: ${a - hb} − ${fmt(b - hb, 2)}` });
  },
  2() {
    const t = pick(['tien', 'geld', 'deel', 'bon']);
    if (t === 'bon') return kassabon();
    if (t === 'tien') {
      const m = pick([10, 100, 1000]), z = String(m).length - 1;
      if (Math.random() < 0.5) {
        const a = rnd(1001, 9999) / 1000;
        return tpl('kommagetallen.2a', { ...num(`${fmt(a)} × ${fmt(m)} =`, a * m, [
          `× ${fmt(m)} betekent: het getal wordt ${fmt(m)} keer zo groot.`,
          `In het positieschema schuift elk cijfer ${z} plek${z > 1 ? 'ken' : ''} op naar de grotere kant (links). Het lijkt alsof de komma ${z} plek${z > 1 ? 'ken' : ''} naar rechts gaat.`,
          `${fmt(a)} wordt ${fmt(a * m)}.`]),
          guide: [st(`Hoeveel nullen heeft ${fmt(m)}? (zoveel plekken schuiven de cijfers op)`, z, `Tel de nullen van ${fmt(m)}.`)],
          guideFinal: `Het getal wordt ${fmt(m)} keer zo groot: elk cijfer schuift ${z} plek${z > 1 ? 'ken' : ''} naar links (de komma ${z} naar rechts)` });
      }
      const b = rnd(12, 980);
      return tpl('kommagetallen.2b', { ...num(`${b} : ${m} =`, b / m, [
        `: ${fmt(m)} betekent: het getal wordt ${fmt(m)} keer zo klein.`,
        `In het positieschema schuift elk cijfer ${z} plek${z > 1 ? 'ken' : ''} op naar de kleinere kant (rechts). Het lijkt alsof de komma ${z} plek${z > 1 ? 'ken' : ''} naar links gaat (${b} = ${b},0).`,
        `${b} wordt ${fmt(b / m)}.`]),
        guide: [st(`Hoeveel nullen heeft ${fmt(m)}? (zoveel plekken schuiven de cijfers op)`, z, `Tel de nullen van ${fmt(m)}.`)],
        guideFinal: `Het getal wordt ${fmt(m)} keer zo klein: elk cijfer schuift ${z} plek${z > 1 ? 'ken' : ''} naar rechts (de komma ${z} naar links)` });
    }
    if (t === 'geld') {
      const p = rnd(115, 495) / 100, k = rnd(3, 8), item = pick(['pakken melk', 'schriften', 'broodjes', 'tijdschriften']), h = Math.floor(p);
      return tpl('kommagetallen.2c', { ...num(`Je koopt ${k} ${item} van ${euro(p)} per stuk. Hoeveel moet je betalen?`, p * k, [
        `Splits: ${k} × € ${h} = € ${k * h}`, `${k} × € ${fmt(p - h, 2)} = € ${fmt(k * (p - h), 2)}`, `Samen: ${euro(p * k)}`], { money: true }),
      guide: [st(`Eerst de hele euro's: ${k} × ${h} = ?`, k * h, 'Tafelsom.'), st(`Dan de centen: ${k} × ${Math.round((p - h) * 100)} cent = ? cent`, k * Math.round((p - h) * 100), `Reken het als een gewone keersom zonder euroteken: ${k} × ${Math.round((p - h) * 100)}.`, { unit: 'cent' })],
      guideFinal: `Samen: € ${k * h} + ${k * Math.round((p - h) * 100)} cent` });
    }
    // eerlijk verdelen met geld: eerst de hele euro's, dan de centen (zo leren scholen het)
    const d = rnd(3, 8);
    let qi; do { qi = rnd(12, 95); } while (qi % 10 === 0);
    const q = qi / 10, total = round(q * d, 2), heel = Math.floor(q), h = heel * d, restC = Math.round((total - h) * 100);
    return tpl('kommagetallen.2d', { ...num(`${fmt(total)} : ${d} =`, q, [
      `Denk aan geld: € ${fmt(total, 2)} eerlijk verdelen over ${d} personen.`,
      `Eerst de hele euro's: € ${h} : ${d} = € ${heel} per persoon.`,
      `Er blijft € ${fmt(total - h, 2)} over. Dat is ${restC} cent. ${restC} cent : ${d} = ${restC / d} cent per persoon.`,
      `Samen: € ${heel} en ${restC / d} cent = € ${fmt(q, 2)}. Als kommagetal: ${fmt(q)}.`,
      `Controle: ${d} × € ${fmt(q, 2)} = € ${fmt(total, 2)}. Klopt!`]),
    guide: [st(`Denk aan geld: € ${fmt(total, 2)} eerlijk verdelen over ${d} personen. Eerst de hele euro's: ${h} : ${d} = ?`, heel, `Een som uit de tafel van ${d}.`, { unit: 'euro' }),
      st(`Er blijft € ${fmt(total - h, 2)} over. Hoeveel cent is dat?`, restC, '1 euro is 100 cent.', { unit: 'cent' }),
      st(`${restC} cent : ${d} = ? cent`, restC / d, `Een som uit de tafel van ${d}.`, { unit: 'cent' })],
    guideFinal: `Iedereen krijgt € ${heel} en ${restC / d} cent. Schrijf dat als kommagetal (euro's vóór de komma)` });
  },
  3() {
    if (Math.random() < 0.2) return kassabonTerug();
    if (Math.random() < 0.5) {
      // geen getallen die op ,5 eindigen: dan is "ongeveer" verwarrend (2,5 ligt precies tussen 2 en 3)
      let ai, bi; do { ai = rnd(15, 95); bi = rnd(12, 49); } while ([0, 5].includes(ai % 10) || [0, 5].includes(bi % 10));
      const a = ai / 10, b = bi / 10, raw = ai * bi, prod = raw / 100;
      const ra = Math.round(a), rb = Math.round(b), est = ra * rb;
      const opts = shuffle([fmt(raw / 1000), fmt(prod), fmt(raw / 10)]);
      return tpl('kommagetallen.3a', { ...num(`${fmt(a)} × ${fmt(b)} =`, prod, [
        `Schat eerst. Schatten = met makkelijke, ronde getallen ongeveer uitrekenen: ${fmt(a)} is ongeveer ${ra}, ${fmt(b)} is ongeveer ${rb}. ${ra} × ${rb} = ${est}. Het antwoord is dus ongeveer ${est}.`,
        `Reken nu precies, zonder komma's: ${ai} × ${bi} = ${raw} (splitsen: ${ai} × ${bi - (bi % 10)} = ${ai * (bi - (bi % 10))} en ${ai} × ${bi % 10} = ${ai * (bi % 10)}).`,
        `Waar komt de komma? Kies uit ${opts.join(' / ')}: alleen ${fmt(prod)} ligt in de buurt van ${est}.`]),
      guide: [st(`Schat eerst (met ronde getallen ongeveer uitrekenen): ${fmt(a)} is ongeveer ${ra}, ${fmt(b)} is ongeveer ${rb}. ${ra} × ${rb} = ?`, est, 'Reken met de ronde getallen.'),
        st(`Reken zonder komma's: ${ai} × ${bi} = ?`, raw, `Splits: ${ai} × ${bi - (bi % 10)} en ${ai} × ${bi % 10}, en tel ze op.`),
        stC(`Waar moet de komma in ${raw}? Welke ligt in de buurt van ${est}?`, opts, opts.indexOf(fmt(prod)), `Je schatting was ongeveer ${est}.`)],
      guideFinal: 'Schrijf het antwoord op dat bij je schatting past' });
    }
    let di, qi; do { di = rnd(12, 39); qi = rnd(12, 59); } while (di % 10 === 0 || qi % 10 === 0);
    const d = di / 10, q = qi / 10, a = round(d * q, 2), a10 = round(a * 10, 1), t = Math.round(a10 * 10);
    const hp = happen(t, di);
    return tpl('kommagetallen.3b', { ...num(`${fmt(a)} : ${fmt(d)} =`, q, [
      `Delen door een kommagetal is lastig. Maak er een makkelijkere som van: doe beide getallen × 10. Het antwoord blijft hetzelfde (net zoals 6 : 2 en 60 : 20 allebei 3 zijn).`,
      `${fmt(a)} : ${fmt(d)} wordt ${fmt(a10)} : ${di}.`,
      `Reken in tienden: ${fmt(a10)} is ${t} tienden (één hele = 10 tienden). Nu ${t} : ${di}, kolomsgewijs met happen:`,
      ...hp.steps.slice(1),
      `Dat zijn ${qi} tienden = ${fmt(q)}.`, `Controle: ${fmt(d)} × ${fmt(q)} = ${fmt(a)}. Klopt!`]),
    guide: [st(`Maak er een makkelijkere som van. ${fmt(d)} × 10 = ?`, di, 'Het getal wordt 10 keer zo groot (elk cijfer schuift één plek op).'),
      st(`Doe het andere getal ook × 10: ${fmt(a)} × 10 = ?`, a10, '× 10: elk cijfer schuift één plek naar links in het positieschema (het getal wordt 10 keer zo groot).'),
      st(`Reken in tienden. ${fmt(a10)} is hoeveel tienden?`, t, `${Math.floor(a10)} helen en ${Math.round((a10 % 1) * 10)} tienden. Eén hele = 10 tienden.`),
      ...hp.guide],
    guideFinal: `${hp.final}. Dat zijn tienden: schrijf het als kommagetal` });
  },
};

const getalbegrip = {
  0() {
    if (Math.random() < 0.5) {
      const n = rnd(11, 989), r = Math.round(n / 10) * 10;
      return tpl('getalbegrip.0a', { ...num(`Rond ${n} af op tientallen.`, r, [`Kijk naar het laatste cijfer: ${n % 10}.`, `5 of meer → naar boven, minder dan 5 → naar beneden.`, `${n} → ${r}`]),
        guide: [st(`Welk cijfer staat op de plek van de eenheden in ${n}?`, n % 10, 'Het laatste cijfer.')], guideFinal: `Het laatste cijfer is ${n % 10}. Is dat 5 of meer? Dan rond je naar boven af, anders naar beneden` });
    }
    const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4), i = rnd(0, 3), d = digits[i], n = Number(digits.join(''));
    return tpl('getalbegrip.0b', { ...num(`Hoeveel is de ${d} waard in het getal ${n}?`, d * 10 ** (3 - i), [`Zet ${n} in het positieschema (D H T E). Van rechts naar links: eenheden, tientallen, honderdtallen, duizendtallen.`, `De ${d} staat op de plek van de ${PLACE[3 - i]}.`, `Dus ${d * 10 ** (3 - i)}.`]),
      guide: [stC(`Op welke plek staat de ${d}?`, ['eenheden', 'tientallen', 'honderdtallen', 'duizendtallen'], 3 - i, 'Tel van rechts: eenheden, tientallen, honderdtallen, duizendtallen.')],
      guideFinal: `Hoeveel is ${d} ${PLACE[3 - i]}` });
  },
  1() {
    if (Math.random() < 0.5) {
      const n = rnd(1001, 9899), op = pick([10, 100]);
      const r = Math.round(n / op) * op, naam = op === 10 ? 'tientallen' : 'honderdtallen', kijk = op === 10 ? n % 10 : Math.floor(n / 10) % 10;
      return tpl('getalbegrip.1a', { ...num(`Rond ${fmt(n)} af op ${naam}.`, r, [`Kijk naar het cijfer rechts van de ${naam}: ${kijk}.`, `Is dat 5 of meer? Dan naar boven, anders naar beneden.`, `${fmt(n)} → ${fmt(r)}`]),
        guide: [st(`Welk cijfer staat rechts van de ${naam}?`, kijk, `Dat is het cijfer van de ${op === 10 ? 'eenheden' : 'tientallen'}.`)], guideFinal: `${kijk} is ${kijk >= 5 ? '5 of meer → omhoog' : 'minder dan 5 → omlaag'}` });
    }
    let digits;
    do { digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]).slice(0, 6); } while (digits[0] === 0);
    const i = rnd(0, 4), d = digits[i] || 7;
    digits[i] = d;
    if (digits.filter((x) => x === d).length > 1) return tpl('getalbegrip.1b', getalbegrip[1]());
    const val = d * 10 ** (5 - i);
    return tpl('getalbegrip.1c', { ...num(`Hoeveel is de ${d} waard in het getal ${fmt(Number(digits.join('')))}?`, val, [
      `Tel de plaatsen van rechts: eenheden, tientallen, honderdtallen, duizendtallen, ...`, `De ${d} staat op de plek van de ${PLACE[5 - i]}.`, `Dus de ${d} is ${fmt(val)} waard.`]),
    guide: [stC(`Op welke plek staat de ${d}?`, PLACE.slice(0, 6), 5 - i, 'Tel van rechts.')], guideFinal: `Hoeveel is ${d} ${PLACE[5 - i]}` });
  },
  2() {
    const t = pick(['woorden', 'midden', 'afronden', 'schatten']);
    if (t === 'schatten') {
      const a = pick([198, 297, 398, 403, 502, 599, 701, 799]), b = pick([19, 21, 29, 31, 41, 49, 51]);
      const ra = Math.round(a / 100) * 100, rb = Math.round(b / 10) * 10, est = ra * rb;
      return tpl('getalbegrip.2a', { ...choice(`Schat: ${a} × ${b} is ongeveer…`, [fmt(est), fmt(est / 10), fmt(est * 10), fmt(est / 2)], 0, [
        `Maak er makkelijke getallen van (afronden): ${a} wordt ${ra} en ${b} wordt ${rb}.`, `${ra} × ${rb} = ${fmt(est)}.`]),
      guide: [st(`Rond ${a} af op honderdtallen:`, ra, 'Kijk naar het cijfer van de tientallen: 0 t/m 4 naar beneden, 5 t/m 9 naar boven.'), st(`Rond ${b} af op tientallen:`, rb, 'Kijk naar het cijfer van de eenheden: 0 t/m 4 naar beneden, 5 t/m 9 naar boven.')], guideFinal: `Reken ${ra} × ${rb}` });
    }
    if (t === 'woorden') {
      const m = rnd(1, 9), k = rnd(1, 9) * 100 + pick([0, rnd(1, 9) * 10]) + pick([0, rnd(1, 9)]), n = m * 1e6 + k * 1000;
      return tpl('getalbegrip.2b', { ...num(`Schrijf in cijfers: ${numberWords(n)}`, n, [`Een miljoen heeft 6 nullen: 1 000 000.`, `Schrijf eerst de miljoenen, daarna 3 cijfers voor de duizenden en 3 voor de rest.`, `${fmt(n)}`]),
        guide: [st(`Hoeveel miljoen?`, m, 'Het woord vóór "miljoen".'), st(`Hoeveel duizend?`, k, 'Het stuk vóór "duizend".')], guideFinal: `${m} miljoen en ${k} duizend in cijfers (let op de nullen!)` });
    }
    if (t === 'midden') {
      const a = rnd(12, 80) * 100, b = a + rnd(2, 9) * 200;
      return tpl('getalbegrip.2c', { ...num(`Welk getal ligt op de getallenlijn precies in het midden tussen ${fmt(a)} en ${fmt(b)}?`, (a + b) / 2,
        [`Het verschil is ${fmt(b - a)}.`, `De helft daarvan is ${fmt((b - a) / 2)}.`, `${fmt(a)} + ${fmt((b - a) / 2)} = ${fmt((a + b) / 2)}`]),
      guide: [st(`Hoe ver liggen ze uit elkaar? ${fmt(b)} − ${fmt(a)} = ?`, b - a, 'Trek af.'), st(`De helft daarvan = ?`, (b - a) / 2, 'Deel door 2.')], guideFinal: `${fmt(a)} + ${fmt((b - a) / 2)}` });
    }
    const n = rnd(100000, 9999999), r = Math.round(n / 1000) * 1000, h = Math.floor(n / 100) % 10;
    return tpl('getalbegrip.2d', { ...num(`Rond ${fmt(n)} af op duizendtallen.`, r, [`Kijk naar het honderdtal-cijfer: ${h}.`, `5 of meer → naar boven, minder dan 5 → naar beneden.`, `${fmt(r)}`]),
      guide: [st(`Welk cijfer staat op de plek van de honderdtallen?`, h, 'Het derde cijfer van rechts.')], guideFinal: `${h} is ${h >= 5 ? '5 of meer → omhoog' : 'minder dan 5 → omlaag'}` });
  },
  3() {
    const t = pick(['temp', 'grootste', 'afrondkomma', 'schatdeel']);
    if (t === 'schatdeel') {
      const d = pick([19, 21, 39, 41, 49, 51]), rd = Math.round(d / 10) * 10, q = pick([20, 30, 40, 200, 300]), n = rd * q + rnd(-40, 40);
      return tpl('getalbegrip.3a', { ...choice(`Welke schatting past het best bij ${fmt(n)} : ${d}?`, [fmt(q), fmt(q * 10), fmt(q / 10), fmt(q * 2)], 0, [
        `Maak van ${d} een makkelijk getal: ${d} wordt ${rd}.`, `Welk rond getal × ${rd} komt in de buurt van ${fmt(n)}? ${fmt(q)} × ${rd} = ${fmt(q * rd)}.`, `Dus ongeveer ${fmt(q)}.`]),
      guide: [st(`Rond ${d} af op tientallen:`, rd, 'Kijk naar het cijfer van de eenheden: 0 t/m 4 naar beneden, 5 t/m 9 naar boven.')], guideFinal: `Hoe vaak past ${rd} ongeveer in ${fmt(n)}?` });
    }
    if (t === 'temp') {
      const lo = -rnd(3, 12), hi = rnd(2, 14);
      return tpl('getalbegrip.3b', { ...num(`'s Nachts was het ${fmt(lo)} °C. 's Middags was het ${hi} °C. Hoeveel graden is het warmer geworden?`, hi - lo,
        [`Van ${fmt(lo)} naar 0 is ${-lo} graden.`, `Van 0 naar ${hi} is ${hi} graden.`, `Samen: ${-lo} + ${hi} = ${hi - lo} graden.`], { unit: '°C' }),
      guide: [st(`Hoeveel graden is het van ${fmt(lo)} tot 0?`, -lo, 'Denk aan een thermometer: tel omhoog tot 0.', { unit: '°C' }), st(`Hoeveel graden van 0 tot ${hi}?`, hi, 'Tel op de thermometer de streepjes vanaf 0 omhoog.', { unit: '°C' })],
      guideFinal: `${-lo} + ${hi}` });
    }
    if (t === 'grootste') {
      const a = rnd(2, 8), groot = Math.random() < 0.5;
      const opts = [`0,${a}`, `0,${a - 1}${rnd(5, 9)}`, `0,${a}0${rnd(1, 9)}`, `0,0${a}${rnd(1, 9)}`];
      const vals = opts.map((o) => Number(o.replace(',', '.')));
      const idx = vals.indexOf(groot ? Math.max(...vals) : Math.min(...vals));
      return tpl('getalbegrip.3c', { ...choice(`Welk getal is het ${groot ? 'grootst' : 'kleinst'}?`, opts, idx, [`Maak alle getallen even lang met nullen achteraan:`,
        ...opts.map((o) => `${o} → ${fmt(Number(o.replace(',', '.')), 3)}`), `Vergelijk ze nu als duizendsten: ${opts[idx]} is het ${groot ? 'grootst' : 'kleinst'}.`]),
      guide: [st(`Maak ${opts[0]} even lang (3 cijfers achter de komma). Hoeveel duizendsten is dat?`, vals[0] * 1000, 'Een nul achteraan verandert de waarde niet. Vul aan met nullen tot er 3 cijfers achter de komma staan.')],
      guideFinal: `Schrijf ze allemaal als duizendsten en vergelijk` });
    }
    const n = rnd(1001, 9999) / 1000, r = round(Math.round(round(n * 10, 6)) / 10, 1), c = Number(n.toFixed(3)[3]);
    return tpl('getalbegrip.3d', { ...num(`Rond ${fmt(n)} af op één cijfer achter de komma.`, r, [`Kijk naar het tweede cijfer achter de komma: ${c}.`, `5 of meer → naar boven, anders naar beneden.`, `${fmt(n)} → ${fmt(r, 1)}`], { display: fmt(r, 1) }),
      guide: [st(`Welk cijfer staat op de 2e plek achter de komma?`, c, 'Dat cijfer bepaalt of je naar boven of naar beneden afrondt.')], guideFinal: `${c} is ${c >= 5 ? '5 of meer → omhoog' : 'minder dan 5 → omlaag'}` });
  },
};

// =====================================================================
// VERHOUDINGEN
// =====================================================================
// Geheel uit een deel terugrekenen (3/4 deel = 60 punten → 1/4 = 20 → 4/4 = 80), met een strook.
function breukGeheel() {
  const d = pick([3, 4, 5, 6, 8, 10]), n = rnd(2, d - 1), een = pick([5, 10, 15, 20, 25, 30, 12, 8]), deel = n * een, tot = d * een;
  const [wat, eenh] = pick([['punten', 'punten'], ['km', 'km'], ['euro', 'euro'], ['bladzijden', 'bladzijden']]);
  const zin = { punten: `Bij een spel heb je ${n}/${d} deel van de punten gehaald. Dat zijn ${deel} punten. Hoeveel punten kun je in totaal halen?`,
    km: `Je hebt ${n}/${d} deel van een fietstocht gefietst. Dat is ${deel} km. Hoe lang is de hele tocht?`,
    euro: `Je hebt ${n}/${d} deel van je spaardoel gespaard. Dat is € ${deel}. Hoeveel euro is je hele spaardoel?`,
    bladzijden: `Je hebt ${n}/${d} deel van een boek gelezen. Dat zijn ${deel} bladzijden. Hoeveel bladzijden heeft het boek?` }[wat];
  return tpl('breuken.2f', { ...num(zin, tot, [`Stap 1: ${n}/${d} deel = ${deel}.`, `Stap 2: 1/${d} deel = ${deel} : ${n} = ${een}.`, `Stap 3: ${d}/${d} deel (alles) = ${d} × ${een} = ${tot}.`], { unit: eenh === 'euro' ? undefined : eenh, ...(eenh === 'euro' ? { money: true } : {}) }),
    guide: [st(`${n}/${d} deel = ${deel}. Hoeveel is 1/${d} deel? ${deel} : ${n} = ?`, een, `${n}/${d} deel is ${n} gelijke stukken. Verdeel ${deel} over ${n} stukken.`)],
    guideFinal: `Alles is ${d}/${d} deel: ${d} × ${een}` });
}
// Heel getal × gemengd getal: splitsen in helen en de breuk (3 × 1 1/4 = 3 × 1 + 3 × 1/4), met hulpsommen
function breukKeerGemengd() {
  const d = pick([2, 3, 4, 5]), n = rnd(1, d - 1), h = rnd(1, 3), w = rnd(2, 5);
  const tot = w * (h * d + n), heel = w * h, br = w * n;
  const benoemd = Math.random() < 0.5;
  const tekst = benoemd ? `Je hebt ${w} flessen met elk ${h} ${n}/${d} liter. Hoeveel liter is dat samen?` : `${w} × ${h} ${n}/${d} =`;
  return tpl('breuken.3d', { ...frac(tekst, [tot, d], [`Splits ${h} ${n}/${d} in ${h} en ${n}/${d}.`, `Hulpsom: ${w} × ${h} = ${heel}.`, `Hulpsom: ${w} × ${n}/${d} = ${br}/${d}${br >= d ? ` = ${fracStr([br, d])}` : ''}.`, `Samen: ${heel} + ${fracStr([br, d])} = ${fracStr([tot, d])}.`]),
    guide: [st(`Splits ${h} ${n}/${d} in ${h} en ${n}/${d}. Eerst de helen: ${w} × ${h} = ?`, heel, 'De hele getallen eerst.'),
      stF(`Dan de breuk: ${w} × ${n}/${d} = ?`, [br, d], `${w} sprongen van ${n}/${d}: ${w} × ${n} stukjes van 1/${d}. De noemer blijft ${d}.`)],
    guideFinal: `Tel de twee hulpsommen op: ${heel} + ${fracStr([br, d])}` });
}
// Breuken en kommagetallen ordenen: 1 maak kommagetallen, 2 denk aan de getallenlijn, 3 kies (zoals de methodes)
function breukOrdenen() {
  const w = rnd(1, 4), groot = Math.random() < 0.5;
  const fr = shuffle([[1, 4], [1, 10], [1, 2], [3, 4], [1, 5]]).slice(0, 2);
  const dec = shuffle([0.3, 0.03, 0.6, 0.15, 0.45, 0.08]).slice(0, 2);
  const items = [...fr.map((f) => ({ s: `${w} ${f[0]}/${f[1]}`, v: w + f[0] / f[1] })), ...dec.map((x) => ({ s: fmt(w + x), v: w + x }))];
  const vals = items.map((i) => i.v);
  if (new Set(vals.map((v) => Math.round(v * 1000))).size < 4) return breukOrdenen();
  const opt = shuffle(items), doel = groot ? Math.max(...vals) : Math.min(...vals), idx = opt.findIndex((i) => i.v === doel);
  const bf = fr[0];
  return tpl('breuken.3f', { ...choice(`Welk getal is het ${groot ? 'grootst' : 'kleinst'}? ${opt.map((i) => i.s).join(' – ')}`, opt.map((i) => i.s), idx, [`Stap 1: maak er kommagetallen van: ${opt.map((i) => fmt(i.v)).join(' – ')}.`, `Stap 2: zet ze op de getallenlijn van ${w} tot ${w + 1}.`, `Stap 3: het ${groot ? 'grootste' : 'kleinste'} is ${fmt(doel)}${opt[idx].s !== fmt(doel) ? ` (${opt[idx].s})` : ''}.`]),
    guide: [st(`Stap 1: maak er kommagetallen van. ${w} ${bf[0]}/${bf[1]} = ?`, w + bf[0] / bf[1], `${bf[0]}/${bf[1]} euro is ${100 * bf[0] / bf[1]} cent, dus 0,${String(100 * bf[0] / bf[1]).padStart(2, '0').replace(/0$/, '')}.`)],
    guideFinal: `Maak ook de andere breuk een kommagetal en zet alles op de getallenlijn van ${w} tot ${w + 1}: welke is het ${groot ? 'grootst' : 'kleinst'}?` });
}

const breuken = {
  0() {
    const t = pick(['pizza', 'helft', 'kwart', 'derde']);
    if (t === 'pizza') {
      const d = pick([2, 3, 4, 5, 6, 8, 10, 12]), n = rnd(1, d - 1), [eten, wie] = pick([['pizza', 'Je eet'], ['taart', 'Je eet'], ['quiche', 'Opa eet'], ['pannenkoek', 'Je eet'], ['pizza', `${pick(NAMES)} eet`], ['taart', 'De klas eet']]);
      return tpl('breuken.0a', { ...frac(`Een ${eten} is in ${d} gelijke stukken gesneden. ${wie} er ${n} op. Welk deel van de ${eten} is opgegeten?`, [n, d],
        [`De noemer (onder de streep) is in hoeveel stukken: ${d}.`, `De teller (boven de streep) is hoeveel er op is: ${n}.`, `Dus ${n}/${d}.`, ...(gcd(n, d) > 1 ? [`Dat is hetzelfde als ${fracStr([n, d])} (allebei gedeeld door ${gcd(n, d)}). Allebei goed!`] : [])], { visual: { kind: 'pizza', parts: d, eaten: n } }),
      guide: [st(`In hoeveel stukken is de ${eten} verdeeld? (dat wordt de noemer)`, d, 'Tel alle stukken.'), st('Hoeveel stukken zijn er opgegeten? (dat wordt de teller)', n, 'Tel de opgegeten stukken.')],
      guideFinal: 'Schrijf als breuk: het gegeten aantal boven de streep, alle stukken eronder' });
    }
    if (t === 'helft') {
      const k = rnd(3, 60) * 2;
      return tpl('breuken.0b', { ...num(Math.random() < 0.5 ? `Wat is de helft van ${k}?` : `Hoeveel is 1/2 van ${k}?`, k / 2, [`De helft = delen door 2.`, `${k} : 2 = ${k / 2}`]),
        guide: k > 20 ? [st(`De helft van ${k - (k % 20)} = ?`, (k - (k % 20)) / 2, `Denk aan geld: € ${k - (k % 20)} eerlijk verdelen over 2 kinderen.`)] : [], guideFinal: k > 20 ? `Nog de helft van ${k % 20} erbij` : null });
    }
    if (t === 'derde') {
      const k = rnd(2, 15), total = 3 * k;
      return tpl('breuken.0c', { ...num(`Hoeveel is 1/3 van ${total}?`, k, [`1/3 = verdeel in 3 gelijke stukken.`, `${total} : 3 = ${k}`]),
        ...anker(3, k) });
    }
    const k = rnd(2, 25), total = 4 * k;
    return tpl('breuken.0d', { ...num(`Hoeveel is 1/4 van ${total}?`, k, [`1/4 = verdeel in 4 gelijke stukken.`, `${total} : 4 = ${k}`]),
      guide: [st(`De helft van ${total} = ?`, total / 2, '1/4 is de helft van de helft.')], guideFinal: `En nog eens de helft: de helft van ${total / 2}` });
  },
  1() {
    const t = pick(['deel', 'vereenvoudig', 'gelijk']);
    if (t === 'deel') {
      const d = pick([3, 4, 5, 6, 8]), n = rnd(1, d - 1), k = rnd(3, 12), total = d * k;
      return tpl('breuken.1a', { ...num(`Hoeveel is ${n}/${d} deel van ${total}?`, n * k, [`Eerst 1/${d} deel: ${total} : ${d} = ${k}.`, `Dan ${n}/${d} deel: ${n} × ${k} = ${n * k}.`]),
        guide: [st(`Eerst 1/${d} deel: ${total} : ${d} = ?`, k, `Verdeel in ${d} gelijke stukken.`)], guideFinal: `Je wilt ${n} van die stukken: ${n} × ${k}` });
    }
    if (t === 'vereenvoudig') {
      let n, d; do { d = rnd(3, 9); n = rnd(1, d - 1); } while (gcd(n, d) !== 1);
      const k = rnd(2, 6);
      return tpl('breuken.1b', { ...frac(`Vereenvoudig zo ver mogelijk: ${n * k}/${d * k}`, [n, d], [`Zoek een getal waardoor teller én noemer allebei te delen zijn: ${k}.`,
        `${n * k} : ${k} = ${n}, ${d * k} : ${k} = ${d}.`, `Antwoord: ${n}/${d}`], { requireSimplest: true }),
      guide: [st(`Deel de teller door ${k}: ${n * k} : ${k} = ?`, n, `${n * k} en ${d * k} zitten allebei in de tafel van ${k}.`), st(`Deel de noemer ook door ${k}: ${d * k} : ${k} = ?`, d, 'Doe met de teller en de noemer altijd hetzelfde!')],
      guideFinal: 'Schrijf de nieuwe breuk op' });
    }
    // Gelijknamige breuken optellen én aftrekken, kaal of benoemd (liter, pizza): de noemer blijft, alleen de tellers.
    const d = pick([4, 5, 6, 8, 10, 12]), min = Math.random() < 0.4;
    let a = rnd(2, d - 1), b = rnd(1, min ? a - 1 : d - a - 1); if (!min && a + b >= d) { a = rnd(1, d - 2); b = rnd(1, d - a - 1); }
    const res = min ? a - b : a + b, op = min ? '−' : '+';
    const benoemd = Math.random() < 0.5 ? pick(min ? [['l water', 'Je hebt {a} l water in een kan. Je giet er {b} l uit. Hoeveel liter heb je nog?'], ['pizza', 'Er ligt nog {a} pizza. Je eet er {b} pizza van op. Hoeveel pizza ligt er nog?']]
      : [['l', 'In de ene fles zit {a} l limonade, in de andere {b} l. Hoeveel liter is dat samen?'], ['pizza', 'Sam eet {a} pizza en Noor eet {b} pizza. Hoeveel pizza eten ze samen?']]) : null;
    const tekst = benoemd ? benoemd[1].replace('{a}', `${a}/${d}`).replace('{b}', `${b}/${d}`) : `${a}/${d} ${op} ${b}/${d} =`;
    return tpl('breuken.1c', { ...frac(tekst, [res, d], [`De noemers zijn gelijk (${d}): de stukjes zijn even groot. Alleen de tellers ${min ? 'trek je af' : 'tel je op'}.`,
      `${a} ${op} ${b} = ${res}, dus ${res}/${d}.`, gcd(res, d) > 1 ? `Vereenvoudigen mag: ${fracStr([res, d])}` : `Dat kan niet verder vereenvoudigd worden.`]),
    guide: [st(`De noemers zijn gelijk. ${min ? 'Trek de tellers af' : 'Tel de tellers op'}: ${a} ${op} ${b} = ?`, res, 'De noemer blijft hetzelfde: de stukjes blijven even groot.')], guideFinal: `Schrijf de breuk: ${res}/${d}` });
  },
  2() {
    const t = pick(['optel', 'aftrek', 'komma', 'keer', 'vergelijk', 'geheel']);
    if (t === 'geheel') return breukGeheel();
    const pair = () => { const ds = shuffle([2, 3, 4, 5, 6, 8]); return [ds[0], ds[1]]; };
    if (t === 'optel' || t === 'aftrek') {
      let [d1, d2] = pair(); let n1 = rnd(1, d1 - 1), n2 = rnd(1, d2 - 1);
      if (t === 'aftrek' && n1 / d1 <= n2 / d2) [d1, d2, n1, n2] = [d2, d1, n2, n1];
      if (t === 'aftrek' && n1 / d1 === n2 / d2) return tpl('breuken.2a', breuken[2]());
      const L = lcm(d1, d2), a = n1 * (L / d1), b = n2 * (L / d2), res = t === 'optel' ? a + b : a - b;
      const op = t === 'optel' ? '+' : '−';
      return tpl('breuken.2b', { ...frac(`${n1}/${d1} ${op} ${n2}/${d2} =`, [res, L], [`Maak de breuken gelijknamig: zoek een noemer waar ${d1} en ${d2} allebei in passen: ${L}.`,
        `${n1}/${d1} = ${a}/${L} en ${n2}/${d2} = ${b}/${L}.`, `${a}/${L} ${op} ${b}/${L} = ${res}/${L}`, `Vereenvoudig als het kan: ${fracStr([res, L])}`]),
      guide: [st(`Welk getal zit in de tafel van ${d1} én van ${d2}? (de nieuwe noemer)`, L, `Zeg de tafel van ${Math.max(d1, d2)} op: ${Math.max(d1, d2)}, ${2 * Math.max(d1, d2)}, ${3 * Math.max(d1, d2)}, … Bij elk getal: past ${Math.min(d1, d2)} er ook precies in? We nemen ${L}.`, { commonMultipleOf: [d1, d2] }),
        st(`${n1}/${d1} = ?/${L} — wat wordt de teller?`, a, n1 === 1 ? `Met welk getal ga je van ${d1} naar ${L}? Doe de teller keer hetzelfde getal.` : `${d1} × ${L / d1} = ${L}, dus de teller ook × ${L / d1}.`),
        st(`${n2}/${d2} = ?/${L} — wat wordt de teller?`, b, n2 === 1 ? `Met welk getal ga je van ${d2} naar ${L}? Doe de teller keer hetzelfde getal.` : `${d2} × ${L / d2} = ${L}, dus de teller ook × ${L / d2}.`)],
      guideFinal: `${a}/${L} ${op} ${b}/${L}` });
    }
    if (t === 'komma') {
      const [n, d] = pick([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 8], [3, 8], [7, 10], [3, 20]]);
      // Via geld (zoals de methodes: 1/4 euro = 25 cent = 0,25): bij noemers waar 100 in past. Anders (achtsten) via 1000.
      if (100 % d === 0) {
        const per = 100 / d, cent = n * per;
        return tpl('breuken.2c', { ...num(`Schrijf ${n}/${d} als kommagetal.`, n / d, [`Denk aan geld: 1 euro = 100 cent.`, `1/${d} euro = 100 : ${d} = ${per} cent.`, ...(n > 1 ? [`${n}/${d} euro = ${n} × ${per} = ${cent} cent.`] : []), `${cent} cent = € ${fmt(n / d, 2)}, dus ${fmt(n / d)}.`]),
          guide: [st(`Denk aan geld. 1/${d} euro = 100 : ${d} = ? cent`, per, `1 euro is 100 cent; verdeel die in ${d} gelijke stukken.`),
            ...(n > 1 ? [st(`Hoeveel cent is ${n}/${d} euro? (${n} stukjes van ${per} cent)`, cent, `Tel ${n} keer ${per} cent.`)] : [])],
          guideFinal: `${cent} cent als euro met een komma (100 cent = € 1,00)` });
      }
      const f = [10, 100, 1000].map((x) => x / d).find(Number.isInteger);
      return tpl('breuken.2c', { ...num(`Schrijf ${n}/${d} als kommagetal.`, n / d, [`Maak de noemer 10, 100 of 1000: vermenigvuldig teller en noemer met ${f}.`, `${n}/${d} = ${n * f}/${d * f}`, `${n * f}/${d * f} = ${fmt(n / d)}`]),
        guide: [st(`Maak de noemer ${d * f}: ${n}/${d} = ?/${d * f}`, n * f, n === 1 ? `Met welk getal ga je van ${d} naar ${d * f}? Doe de teller keer hetzelfde getal.` : `${d} × ${f} = ${d * f}, dus de teller ook × ${f}.`)], guideFinal: `${n * f}/${d * f} als kommagetal (${d * f === 10 ? 'tienden' : d * f === 100 ? 'honderdsten' : 'duizendsten'})` });
    }
    if (t === 'keer') {
      const d = pick([3, 4, 5]), n = rnd(1, d - 1), w = rnd(2, 7);
      // Zoals de methodes: herhaald optellen, sprongen van n/d op de getallenlijn (3 × 1/4 = 1/4 + 1/4 + 1/4 = 3/4), ook benoemd.
      const ding = Math.random() < 0.5 ? pick([['flesjes van', 'l', 'Hoeveel liter is dat samen?'], ['stukken van', 'pizza', 'Hoeveel pizza is dat samen?']]) : null;
      const tekst = ding ? `Je hebt ${w} ${ding[0]} ${n}/${d} ${ding[1]}. ${ding[2]}` : `${w} × ${n}/${d} =`;
      const keer = n === 1 ? `${w} sprongen van 1/${d}` : `${w} sprongen van ${n}/${d}`;
      return tpl('breuken.2d', { ...frac(tekst, [w * n, d], [`${w} × ${n}/${d} is ${keer} op de getallenlijn: ${Array(w).fill(`${n}/${d}`).join(' + ')}.`, `Dat zijn ${w} × ${n} = ${w * n} stukjes van 1/${d}: ${w * n}/${d}. De noemer blijft ${d}.`, ...(w * n >= d ? [`Haal de helen eruit (${d}/${d} = 1 hele): ${fracStr([w * n, d])}.`] : [])]),
        guide: [st(`Spring ${w} keer ${n}/${d} op de getallenlijn. Hoeveel stukjes van 1/${d} zijn dat samen?`, w * n, `Elke sprong is ${n} ${n === 1 ? 'stukje' : 'stukjes'} van 1/${d}: tel ${w} keer ${n}. De noemer blijft ${d}.`)],
        guideFinal: `Schrijf ${w * n}/${d}${w * n >= d ? ` (haal er de helen uit: ${d}/${d} = 1 hele)` : ''}` });
    }
    // Breuken vergelijken zoals de methodes: eerst vergelijken met 1/2 (de ene is minder, de andere meer dan de helft);
    // anders "reken met een handig getal" (bijv. van 100 of 60 km) en vergelijk de uitkomsten. Geen gelijknamig maken nodig.
    const cands = [[3, 5], [5, 8], [2, 3], [3, 4], [1, 4], [1, 3], [2, 5], [3, 10], [7, 10], [5, 6], [1, 6], [3, 8]];
    let [x, y] = shuffle(cands); while (x[0] / x[1] === y[0] / y[1]) y = pick(cands);
    const big = x[0] / x[1] > y[0] / y[1] ? 0 : 1, wint = big === 0 ? x : y, B = (f) => `${f[0]}/${f[1]}`;
    const kant = (f) => (f[0] / f[1] < 0.5 ? 'minder' : 'meer');
    if ((x[0] / x[1] - 0.5) * (y[0] / y[1] - 0.5) < 0) {
      return tpl('breuken.2e', { ...choice('Welke breuk is het grootst?', [B(x), B(y)], big, [`Vergelijk allebei met 1/2.`, `${B(x)} is ${kant(x)} dan 1/2 (de helft van ${x[1]} is ${fmt(x[1] / 2)}).`, `${B(y)} is ${kant(y)} dan 1/2 (de helft van ${y[1]} is ${fmt(y[1] / 2)}).`, `Dus ${B(wint)} is groter.`]),
        guide: [stC(`Is ${B(x)} meer of minder dan 1/2?`, ['meer', 'minder'], kant(x) === 'meer' ? 0 : 1, `De helft van ${x[1]} is ${fmt(x[1] / 2)}. Is ${x[0]} meer of minder dan dat?`),
          stC(`Is ${B(y)} meer of minder dan 1/2?`, ['meer', 'minder'], kant(y) === 'meer' ? 0 : 1, `De helft van ${y[1]} is ${fmt(y[1] / 2)}. Is ${y[0]} meer of minder dan dat?`)],
        guideFinal: 'Welke is dus het grootst: de breuk die meer dan de helft is' });
    }
    const H = [100, 60, 120, 40, 24, 80].find((h) => h % x[1] === 0 && h % y[1] === 0) || lcm(x[1], y[1]) * 10;
    const vx = (H / x[1]) * x[0], vy = (H / y[1]) * y[0];
    return tpl('breuken.2e', { ...choice('Welke breuk is het grootst?', [B(x), B(y)], big, [`Reken met een handig getal, bijv. ${H} km.`, `${B(x)} van ${H} = ${H} : ${x[1]} × ${x[0]} = ${vx}.`, `${B(y)} van ${H} = ${H} : ${y[1]} × ${y[0]} = ${vy}.`, `${Math.max(vx, vy)} is meer, dus ${B(wint)} is groter.`]),
      guide: [st(`Reken met ${H} km. ${B(x)} van ${H} = ?`, vx, `Eerst 1/${x[1]} van ${H}: ${H} : ${x[1]} = ${H / x[1]}. Dan keer ${x[0]}.`), st(`${B(y)} van ${H} = ?`, vy, `Eerst 1/${y[1]} van ${H}: ${H} : ${y[1]} = ${H / y[1]}. Dan keer ${y[0]}.`)],
      guideFinal: 'Welke breuk geeft het meeste? Die is het grootst' });
  },
  3() {
    const t = pick(['maal', 'deeldoor', 'gemengd', 'keergemengd', 'orden']);
    if (t === 'keergemengd') return breukKeerGemengd();
    if (t === 'orden') return breukOrdenen();
    if (t === 'maal') {
      const a = [rnd(1, 4), 0]; a[1] = rnd(a[0] + 1, 6); const b = [rnd(1, 5), 0]; b[1] = rnd(b[0] + 1, 8);
      return tpl('breuken.3a', { ...frac(`${a[0]}/${a[1]} × ${b[0]}/${b[1]} =`, [a[0] * b[0], a[1] * b[1]], [`Teller × teller: ${a[0]} × ${b[0]} = ${a[0] * b[0]}.`,
        `Noemer × noemer: ${a[1]} × ${b[1]} = ${a[1] * b[1]}.`, ...(gcd(a[0] * b[0], a[1] * b[1]) > 1 ? [`Vereenvoudig: ${a[0] * b[0]}/${a[1] * b[1]} = ${fracStr([a[0] * b[0], a[1] * b[1]])}`] : [`Dus ${a[0] * b[0]}/${a[1] * b[1]}.`])]),
      guide: [st(`Teller × teller: ${a[0]} × ${b[0]} = ?`, a[0] * b[0], 'De bovenste getallen.'), st(`Noemer × noemer: ${a[1]} × ${b[1]} = ?`, a[1] * b[1], 'De onderste getallen.')],
      guideFinal: `Schrijf de breuk en vereenvoudig als het kan` });
    }
    if (t === 'deeldoor') {
      const d = pick([2, 3, 4, 5, 8]), w = rnd(2, 6), unit = pick(['liter', 'kilo', 'meter']);
      const ding = { liter: 'flesjes van', kilo: 'zakjes van', meter: 'stukken van' }[unit];
      return tpl('breuken.3b', { ...num(`Je hebt ${w} ${unit}. Je verdeelt het over ${ding} 1/${d} ${unit}. Hoeveel ${ding.split(' ')[0]} krijg je?`, w * d,
        [`Hoe vaak past 1/${d} in 1 ${unit}? ${d} keer.`, `In ${w} ${unit} past het dus ${w} × ${d} = ${w * d} keer.`, `Dat is de deelsom ${w} : 1/${d} = ${w * d}.`]),
      guide: [st(`Hoeveel ${ding.split(' ')[0]} van 1/${d} ${unit} haal je uit 1 ${unit}?`, d, `Hoeveel stukken van 1/${d} ${unit} maken samen 1 hele ${unit}? Denk aan een strook in ${d} gelijke stukken.`)], guideFinal: `En uit ${w} ${unit}: ${w} × ${d}` });
    }
    const d = pick([2, 4, 3]), d2 = pick([4, 8, 6]), w1 = rnd(1, 4), w2 = rnd(1, 3), n1 = rnd(1, d - 1), n2 = rnd(1, d2 - 1);
    const L = lcm(d, d2), tot = (w1 + w2) * L + n1 * (L / d) + n2 * (L / d2);
    return tpl('breuken.3c', { ...frac(`${w1} ${n1}/${d} + ${w2} ${n2}/${d2} =`, [tot, L], [`Tel eerst de helen op: ${w1} + ${w2} = ${w1 + w2}.`,
      `Dan de breuken, gelijknamig gemaakt: ${n1 * (L / d)}/${L} + ${n2 * (L / d2)}/${L} = ${n1 * (L / d) + n2 * (L / d2)}/${L}.`, `Samen: ${fracStr([tot, L])}`]),
    guide: [st(`Eerst de helen: ${w1} + ${w2} = ?`, w1 + w2, 'De hele getallen vooraan.'), stF(`Dan de breuken: ${n1}/${d} + ${n2}/${d2} = ?`, [n1 * (L / d) + n2 * (L / d2), L], `Maak gelijknamig met noemer ${L}.`)],
    guideFinal: `Zet de helen en de breuk samen (is de breuk meer dan 1? Dan gaat er een hele bij)` });
  },
};

// ---------- procenten volgens de methode (strook, breuk, kommagetal, via 1%) ----------
// Procent koppelen aan breuk, kommagetal en "1 op de …" (25% = 1/4 = 0,25 = 1 op de 4).
function procentKoppelen() {
  const [p, n, d] = pick([[25, 1, 4], [50, 1, 2], [75, 3, 4], [10, 1, 10], [20, 1, 5], [40, 2, 5], [5, 1, 20], [30, 3, 10], [60, 3, 5]]);
  const kg = p / 100;
  const vis = vtabel([['%', 0, p, 100], ['deel', 0, '?', 1]]);
  const v = pick(n === 1 ? ['komma', 'opde', 'terug'] : ['komma', 'terug']);
  if (v === 'komma') return tpl('procenten.1c', { ...num(`Welk kommagetal hoort bij ${p}%?`, kg, [`${p}% = ${p}/100 = ${n}/${d} deel.`, `${p} honderdsten = ${fmt(kg)}.`], { visual: vis }),
    guide: [st(`${p}% is ${p} van de 100. Hoeveel honderdsten is dat?`, p, 'Procent betekent: van de 100.', { unit: 'honderdsten' })], guideFinal: `Schrijf ${p} honderdsten als kommagetal (0,01 is één honderdste)` });
  if (v === 'opde') return tpl('procenten.1d', { ...num(`${p}% is 1 op de ... (vul in)`, d, [`${p}% = ${p}/100 = 1/${d} deel.`, `Dus 1 op de ${d}.`]),
    guide: [st(`Hoe vaak past ${p} in 100?`, d, `${p} × ? = 100`)], guideFinal: `${p}% is 1 van elke ... ` });
  return tpl('procenten.1e', { ...num(`${fmt(kg)} is hoeveel procent?`, p, [`${fmt(kg)} = ${p} honderdsten = ${p}/100.`, `Dus ${p}%.`], { unit: '%' }),
    guide: [st(`Hoeveel honderdsten is ${fmt(kg)}?`, p, 'Kijk naar het tweede cijfer achter de komma: de honderdsten. 0,1 is 10 honderdsten.', { unit: 'honderdsten' })], guideFinal: `Procent = honderdsten: ${p}/100 = ...%` });
}
// Hoeveel procent bij grotere aantallen (500 bezoekers, 125 met de trein): de procentstrook / welk deel.
function procentVanGroot() {
  const totaal = pick([200, 400, 500, 800, 1000, 600]), p = pick([5, 10, 20, 25, 50, 75]), deel = (totaal * p) / 100;
  const wie = pick([['bezoekers', 'kwamen met de trein'], ['leerlingen', 'gaan op de fiets naar school'], ['fans', 'droegen een oranje shirt'], ['lopers', 'liepen de 5 km']]);
  const breukRoute = [25, 50, 75, 20].includes(p);
  const opts = ['3/4 deel', '1/2 deel', '1/4 deel', '1/5 deel'];
  const br = { 25: '1/4 deel', 50: '1/2 deel', 75: '3/4 deel', 20: '1/5 deel' }[p];
  return tpl('procenten.2e', { ...num(`Er zijn ${fmt(totaal)} ${wie[0]}. ${fmt(deel)} ${wie[0]} ${wie[1]}. Hoeveel procent is dat?`, p, [
    `${fmt(totaal)} ${wie[0]} is 100%.`, breukRoute ? `${fmt(deel)} is ${br} van ${fmt(totaal)}.` : `10% van ${fmt(totaal)} = ${fmt(totaal / 10)}${p === 5 ? `, en 5% is de helft: ${fmt(totaal / 20)}` : ''}.`, `Dus ${p}%.`],
  { unit: '%', visual: vtabel([[wie[0], fmt(totaal), fmt(deel)], ['%', 100, '?']]) }),
  guide: breukRoute ? [stC(`Welk deel van ${fmt(totaal)} is ${fmt(deel)}?`, opts, opts.indexOf(br), `Denk aan de strook: de helft van ${fmt(totaal)} is ${fmt(totaal / 2)}.`)]
    : [st(`Wat is 10% van ${fmt(totaal)}?`, totaal / 10, 'Deel door 10.')],
  guideFinal: breukRoute ? `${br} is hoeveel procent?` : p === 5 ? `${fmt(deel)} is de helft van 10%` : `${fmt(deel)} is hoeveel keer 10%?` });
}
// Procenten boven 100% (de methode): "nu 25% meer" → 25% van de oude hoeveelheid erbij.
function procentMeer() {
  const p = pick([10, 20, 25, 50]), [wat, unit] = pick([['Een zak chips', 'g'], ['Een fles shampoo', 'ml'], ['Een pak hagelslag', 'g'], ['Een fles limonade', 'ml']]);
  const oud = p === 25 ? pick([200, 400, 600, 800]) : p === 50 ? pick([150, 250, 300, 500]) : pick([250, 300, 500, 750]), bij = (oud * p) / 100;
  const g = p === 25 ? [st(`25% is 1/4 deel. Hoeveel is 1/4 van ${oud} ${unit}?`, bij, 'Deel door 4.', { unit })] : p === 50 ? [st(`50% is de helft. Hoeveel is de helft van ${oud} ${unit}?`, bij, 'Deel door 2.', { unit })]
    : [st(`10% van ${oud} ${unit} = ?`, oud / 10, 'Deel door 10.', { unit }), ...(p === 20 ? [st(`20% is 2 × 10%. Hoeveel ${unit} is dat?`, bij, 'Twee keer zoveel.', { unit })] : [])];
  return tpl('procenten.3h', { ...num(`${wat} had een inhoud van ${oud} ${unit}. Nu zit er ${p}% meer in. Hoeveel ${unit} zit er nu in?`, oud + bij, [
    `De oude inhoud is 100%. Er komt ${p}% bij: samen ${100 + p}%.`, `${p}% van ${oud} = ${bij} ${unit}.`, `${oud} + ${bij} = ${oud + bij} ${unit}.`], { unit, visual: vtabel([['%', 100, p, 100 + p], [unit, oud, '?', '?']]) }),
  guide: g, guideFinal: `Tel het erbij op: ${oud} + ${bij}` });
}
// Via 1% (de methode, ook met de rekenmachine): 7% van € 640 → 1% = € 6,40 → 7 × € 6,40.
function procentViaEen() {
  const p = pick([3, 4, 6, 7, 8, 9, 12, 14, 18, 21]), base = pick([640, 320, 450, 780, 1200, 960, 850, 1500, 2400]), een = base / 100;
  const item = pick(['Een laptop', 'Een fiets', 'Een vakantie', 'Een bank', 'Een tv']);
  return tpl('procenten.3i', { ...num(`${item} kost ${euro(base)}. Je betaalt ${p}% aanbetaling. Hoeveel euro is dat?`, (base * p) / 100, [
    `Reken via 1%: 1% van ${euro(base)} = ${euro(base)} : 100 = ${euro(een)}.`, `${p}% = ${p} × ${euro(een)} = ${euro((base * p) / 100)}.`, `Met de rekenmachine: ${fmt(base)} : 100 = ${fmt(een)}, en dan ${p} × ${fmt(een)}.`],
  { money: true, rekenmachine: true, visual: vtabel([['%', 100, 1, p], ['euro', fmt(base), '?', '?']]) }),
  guide: [st(`Reken via 1%: 1% van ${euro(base)} = ? (deel door 100)`, een, 'Elk cijfer schuift 2 plekken naar rechts.', { money: true })], guideFinal: `${p}% = ${p} × ${euro(een)} (mag met de rekenmachine)` });
}

const procenten = {
  0() {
    const t = pick(['helft', 'tien', 'heel']);
    if (t === 'helft') {
      const b = rnd(4, 75) * 2;
      return tpl('procenten.0a', { ...num(`Hoeveel is 50% van ${b}?`, b / 2, [`50% is de helft.`, `De helft van ${b} = ${b / 2}.`]), guide: [st('50% is hetzelfde als de ... (vul in: deel door hoeveel?)', 2, '50 van de 100 = de helft.')], guideFinal: `${b} : 2` });
    }
    if (t === 'tien') {
      const b = rnd(2, 40) * 10;
      return tpl('procenten.0b', { ...num(`Hoeveel is 10% van ${b}?`, b / 10, [`10% = 1/10 deel.`, `${b} : 10 = ${b / 10}`]), guide: [st('10% is 1/10 deel. Door hoeveel moet je delen?', 10, '10 van de 100 = 1 van de 10.')], guideFinal: `${b} : 10` });
    }
    const b = rnd(10, 90);
    return tpl('procenten.0c', { ...choice(`Een klas heeft ${b} punten verdiend. Hoeveel is 100% daarvan?`, [String(b), String(b * 100), String(Math.round(b / 2)), String(b + 100)], 0, ['100% is alles, het hele getal.', `Dus ${b}.`]), guide: [], guideFinal: null });
  },
  1() {
    if (Math.random() < 0.6) {
      const p = pick([50, 25, 10, 20, 75]), base = { 50: 2, 25: 4, 10: 10, 20: 5, 75: 4 }[p] * rnd(3, 40);
      const ans = (p * base) / 100, br = { 50: [1, 2], 25: [1, 4], 10: [1, 10], 20: [1, 5], 75: [3, 4] }[p];
      return tpl('procenten.1a', { ...num(`Hoeveel is ${p}% van ${base}?`, ans, [`${p}% is hetzelfde als ${br[0]}/${br[1]} deel.`,
        p === 75 ? `1/4 van ${base} = ${base / 4}, dus 3/4 van ${base} = 3 × ${base / 4} = ${ans}.` : `${br[0]}/${br[1]} van ${base} = ${ans}.`]),
      guide: [stF(`${p}% is welke breuk?`, br, `${p}% = ${p}/100. Vereenvoudig.`), ...(p === 75 ? [st(`1/4 van ${base} = ?`, base / 4, 'Deel door 4.')] : [])],
      guideFinal: p === 75 ? `3/4 van ${base} = 3 × ${base / 4}` : `${base} : ${br[1]}` });
    }
    if (Math.random() < 0.4) return procentKoppelen();
    const [b, p] = pick([['1/2', 50], ['1/4', 25], ['3/4', 75], ['1/5', 20], ['7/10', 70], ['2/5', 40], ['3/10', 30], ['9/10', 90], ['3/5', 60], ['4/5', 80]]);
    const [bn, bd] = b.split('/').map(Number);
    return tpl('procenten.1b', { ...num(`${b} deel is hoeveel procent?`, p, [`Procent betekent "van de 100".`, `Maak de noemer 100: ${b} = ${p}/100 = ${p}%.`], { unit: '%' }),
      guide: [st(`Maak de noemer 100: ${bd} × ? = 100`, 100 / bd, 'Hoe vaak past de noemer in 100?'), st(`Doe de teller ook keer ${100 / bd}: ${bn} × ${100 / bd} = ?`, p, 'Teller en noemer allebei.')], guideFinal: `${p}/100 = ...%` });
  },
  2() {
    const t = pick(['vanX', 'korting', 'hoeveel', 'hoeveel']);
    if (t === 'hoeveel' && Math.random() < 0.5) return procentVanGroot();
    if (t === 'vanX') {
      const p = pick([15, 30, 35, 45, 60]), base = rnd(2, 16) * 20;
      const g = [st(`Eerst 10% van ${base} = ?`, base / 10, '10% = deel door 10.')];
      if (p % 10 === 5) g.push(st(`5% is de helft van 10%: = ?`, base / 20, `De helft van ${base / 10}.`));
      return tpl('procenten.2a', { ...num(`Hoeveel is ${p}% van ${base}?`, (p * base) / 100, [`Begin met 10%: ${base} : 10 = ${base / 10}.`,
        ...(p % 10 === 5 ? [`5% is de helft van 10%: ${base / 20}.`, `${p}% = ${Math.floor(p / 10)} × ${base / 10}${Math.floor(p / 10) ? '' : ''} + ${base / 20} = ${(p * base) / 100}.`] : [`${p}% is ${p / 10} × 10%: ${p / 10} × ${base / 10} = ${(p * base) / 100}.`])]),
      guide: g, guideFinal: p % 10 === 5 ? `${p}% = ${Math.floor(p / 10)} × 10% + 5% = ${Math.floor(p / 10)} × ${base / 10} + ${base / 20}` : `${p}% = ${p / 10} × 10% = ${p / 10} × ${base / 10}` });
    }
    if (t === 'korting') {
      const p = pick([10, 20, 25, 30, 40]), prijs = rnd(3, 12) * 20, item = pick(['jas', 'skateboard', 'koptelefoon', 'voetbal']);
      const k = (p * prijs) / 100, nieuw = prijs - k;
      return tpl('procenten.2b', { ...num(`Een ${item} kost ${euro(prijs)}. Je krijgt ${p}% korting. Wat is de nieuwe prijs?`, nieuw, [
        ...(p === 25 ? [`25% is een kwart: ${prijs} : 4 = ${k} korting.`] : [`10% van ${prijs} = ${prijs / 10}.`, ...(p === 10 ? [] : [`${p}% is ${p / 10} × 10%: ${p / 10} × ${prijs / 10} = ${k} korting.`])]), `Nieuwe prijs: ${prijs} − ${k} = ${nieuw}.`], { money: true }),
      guide: p === 25 ? [st(`25% is 1/4 deel. Hoeveel euro korting is dat? ${prijs} : 4 = ?`, k, 'Een kwart = delen door 4.', { money: true })]
        : [st(`10% van ${prijs} = ?`, prijs / 10, 'Deel door 10.'), st(`Hoeveel euro korting is ${p}%?`, k, p === 10 ? 'Dat is de 10% die je net hebt uitgerekend.' : `${p}% is ${p / 10} keer zoveel als 10%.`, { money: true })], guideFinal: `De nieuwe prijs: ${prijs} − ${k}` });
    }
    const totaal = pick([20, 25, 40, 50, 80]), p = pick([10, 20, 25, 40, 75]), deel = (p * totaal) / 100;
    if (!Number.isInteger(deel)) return tpl('procenten.2c', procenten[2]());
    return tpl('procenten.2d', { ...num(`In een klas zitten ${totaal} kinderen. ${deel} kinderen hebben een huisdier. Hoeveel procent is dat?`, p, [
      `Schrijf als breuk: ${deel}/${totaal}.`, `Maak de noemer 100: ${deel}/${totaal} = ${p}/100.`, `Dus ${p}%.`], { unit: '%' }),
    guide: Number.isInteger(100 / totaal)
      ? [st(`Maak de noemer 100: ${totaal} × ? = 100`, 100 / totaal, `Hoe vaak past ${totaal} in 100?`), st(`Teller ook keer ${100 / totaal}: ${deel} × ${100 / totaal} = ?`, p, 'Teller en noemer allebei.')]
      : [st(`Wat is 10% van ${totaal}?`, totaal / 10, 'Deel door 10.'), st(`Hoe vaak past ${totaal / 10} in ${deel}?`, deel / (totaal / 10), `${totaal / 10} × ? = ${deel}`)],
    guideFinal: Number.isInteger(100 / totaal) ? `${p}/100 = ...%` : `Zoveel keer 10%` });
  },
  3() {
    const t = pick(['welkpct', 'totaal', 'oud', 'omhoog', 'meer', 'een', 'een']);
    if (t === 'meer') return procentMeer();
    if (t === 'een') return procentViaEen();
    if (t === 'omhoog') {
      const p = pick([5, 10, 15, 20]), oud = rnd(2, 15) * 20, bij = (oud * p) / 100;
      return tpl('procenten.3a', { ...num(`Een abonnement kost € ${oud} per jaar. Volgend jaar wordt het ${p}% duurder. Wat is de nieuwe prijs?`, oud + bij, [
        `10% van ${oud} = ${fmt(oud / 10)}.`, p === 10 ? `Erbij: ${oud} + ${fmt(bij)} = ${fmt(oud + bij)}.` : `${p}% = ${fmt(bij)}.`, `Nieuwe prijs: ${oud} + ${fmt(bij)} = ${fmt(oud + bij)}.`], { money: true }),
      guide: [st(`10% van ${oud} = ?`, oud / 10, 'Deel door 10.'), ...(p !== 10 ? [st(`Hoeveel euro is ${p}%?`, bij, p === 5 ? '5% is de helft van 10%.' : `${p}% = ${p / 5} × 5%, of 10% + ${p - 10}%.`, { money: true })] : [])],
      guideFinal: `Duurder: tel het erbij op` });
    }
    if (t === 'welkpct') {
      const oud = rnd(4, 16) * 20, p = pick([5, 15, 20, 25, 35, 25, 50]), nieuw = oud - (oud * p) / 100;
      if (!Number.isInteger(nieuw)) return tpl('procenten.3b', procenten[3]());
      if ([20, 25, 50].includes(p)) {
        // Zoals de methode (S): korting in euro, dan "welk deel van de oude prijs is dat?" → breuk → procent.
        const d = 100 / p, k = oud - nieuw, item = pick(['Een spelcomputer', 'Een game', 'Een fiets', 'Een paar schoenen']);
        return tpl('procenten.3c', { ...num(`${item} kostte € ${oud}. Nu kost ${item.startsWith('Een paar') ? 'het' : 'hij'} € ${nieuw}. Hoeveel procent korting is dat?`, p, [
          `Korting in euro: ${oud} − ${nieuw} = ${k}.`, `Welk deel van € ${oud} is € ${k}? ${k} × ${d} = ${oud}, dus 1/${d} deel.`, `1/${d} deel = ${p}%.`], { unit: '%' }),
        guide: [st(`Hoeveel euro korting is het? ${oud} − ${nieuw} = ?`, k, 'Oude prijs min nieuwe prijs.', { money: true }),
          stC(`Welk deel van € ${oud} is die korting?`, ['1/2 deel', '1/4 deel', '1/5 deel', '1/10 deel'], ['1/2 deel', '1/4 deel', '1/5 deel', '1/10 deel'].indexOf(`1/${d} deel`), `Hoe vaak past de korting in € ${oud}?`)],
        guideFinal: `1/${d} deel is hoeveel procent? (1/2 = 50%, 1/4 = 25%, 1/5 = 20%, 1/10 = 10%)` });
      }
      return tpl('procenten.3c', { ...num(`Een spelcomputer kostte € ${oud}. Nu kost hij € ${nieuw}. Hoeveel procent korting is dat?`, p, [
        `Korting in euro: ${oud} − ${nieuw} = ${oud - nieuw}.`, `10% van ${oud} = ${fmt(oud / 10)}, en 5% is de helft daarvan: ${fmt(oud / 20)}.`,
        `5% van ${oud} is ${fmt(oud / 20)}. Hoe vaak past ${fmt(oud / 20)} in ${oud - nieuw}? ${oud - nieuw} : ${fmt(oud / 20)} = ${p / 5}. Dus ${p / 5} × 5% = ${p}%.`], { unit: '%' }),
      guide: [st(`Hoeveel euro korting is het? ${oud} − ${nieuw} = ?`, oud - nieuw, 'Oude prijs min nieuwe prijs.'), st(`Wat is 10% van ${oud}?`, oud / 10, 'Deel door 10.')],
      guideFinal: `10% is € ${fmt(oud / 10)} en 5% is € ${fmt(oud / 20)}. Hoeveel procent is € ${oud - nieuw}? (Probeer: 10% + 5%, 2 × 10%, …)` });
    }
    if (t === 'totaal') {
      const p = pick([20, 25, 30, 40, 60]), totaal = rnd(2, 12) * 10, deel = (p * totaal) / 100;
      if (!Number.isInteger(deel) || !Number.isInteger(deel / (p / 10))) return tpl('procenten.3d', procenten[3]());
      if (p === 25) return tpl('procenten.3e', { ...num(`25% van de leerlingen gaat met de fiets naar school. Dat zijn ${deel} leerlingen. Hoeveel leerlingen zijn er in totaal?`, totaal, [
        `25% is 1/4 deel.`, `1/4 deel = ${deel} leerlingen.`, `Alles (4/4) = 4 × ${deel} = ${totaal}.`]),
      guide: [stC('25% is hetzelfde als:', ['1/4 deel', '1/2 deel', '1/25 deel'], 0, 'Denk aan 100 gelijke hokjes: 25 hokjes, hoeveel van zulke groepjes passen er in 100?')], guideFinal: `Alles is 4 keer zoveel: 4 × ${deel}` });
      return tpl('procenten.3f', { ...num(`${p}% van de leerlingen gaat met de fiets naar school. Dat zijn ${deel} leerlingen. Hoeveel leerlingen zijn er in totaal?`, totaal, [
        `Maak een verhoudingstabel: ${p}% → ${deel}.`, `10% → ${deel / (p / 10)}.`, `100% → ${totaal}.`]),
      guide: [st(`Verhoudingstabel: ${p}% zijn ${deel} leerlingen. Hoeveel leerlingen is 10%?`, deel / (p / 10), `Deel door ${p / 10}.`)], guideFinal: `100% is 10 keer zoveel als 10%` });
    }
    const p = pick([20, 25, 50]), oud = rnd(3, 12) * 8, nieuw = oud * (1 - p / 100);
    return tpl('procenten.3g', { ...num(`Na ${p}% korting kost een spel ${euro(nieuw)}. Wat was de oude prijs?`, oud, [
      `Je betaalt nog ${100 - p}% van de oude prijs (100% − ${p}%).`,
      ...(p === 50 ? [`50% is de helft. ${euro(nieuw)} is dus de helft van de oude prijs.`, `De oude prijs is 2 × ${fmt(nieuw)} = ${fmt(oud)}.`]
        : p === 25 ? [`75% is 3 kwart. Dus 3 stukjes zijn samen ${fmt(nieuw)}, één stukje (25%) is ${fmt(nieuw)} : 3 = ${fmt(nieuw / 3)}.`, `De oude prijs is 4 stukjes: 4 × ${fmt(nieuw / 3)} = ${fmt(oud)}.`]
        : [`80% is 8 keer 10%. Dus 10% is ${fmt(nieuw)} : 8 = ${fmt(nieuw / 8)}.`, `De oude prijs (100%) is 10 × ${fmt(nieuw / 8)} = ${fmt(oud)}.`])], { money: true }),
    guide: [st(`Hoeveel procent betaal je nog?`, 100 - p, `Alles is 100%. Haal de korting eraf.`, { unit: '%' }),
      ...(p === 50 ? [] : p === 25 ? [st(`75% is 3 × 25%. Hoeveel is 25%? ${fmt(nieuw)} : 3 = ?`, nieuw / 3, 'Deel door 3.', { money: true })]
        : [st(`80% is 8 × 10%. Hoeveel is 10%? ${fmt(nieuw)} : 8 = ?`, nieuw / 8, 'Deel door 8.', { money: true })])],
    guideFinal: p === 50 ? `${euro(nieuw)} is de helft. Het geheel is 2 keer zoveel` : p === 25 ? `100% is 4 × 25%: 4 × ${fmt(nieuw / 3)}` : `100% is 10 × 10%: 10 × ${fmt(nieuw / 8)}` });
  },
};

function vtabel(rows) {
  return { kind: 'table', headers: null, rows };
}

const verhoudingen = {
  0() {
    const p = rnd(2, 9), k = rnd(2, 9), item = pick(['ijsjes', 'stickers', 'ballonnen', 'scheetkussens', 'nepsnorren', 'knikkers', 'snoepjes', 'zaadjes', 'kraaltjes', 'elastiekjes']);
    return tpl('verhoudingen.0a', { ...num(`Eén zakje ${item} kost € ${p}. Hoeveel kosten ${k} zakjes?`, p * k, [`${k} keer € ${p}.`, `${k} × ${p} = ${p * k}`], { unit: 'euro', visual: vtabel([['zakjes', 1, k], ['euro', p, '?']]) }),
      guide: k > 2 ? [st(`Wat kosten 2 zakjes?`, 2 * p, 'Het dubbele.')] : [], guideFinal: k > 2 ? `En ${k} zakjes (${k} × ${p})` : null });
  },
  1() {
    if (Math.random() < 0.5) {
      const n = rnd(2, 5), p = rnd(2, 6), k = rnd(2, 4), item = pick(['pakken sap', 'zakken chips', 'pennen']);
      return tpl('verhoudingen.1a', { ...num(`${n} ${item} kosten € ${n * p}. Hoeveel kosten ${n * k} ${item}?`, n * p * k, [
        `Verhoudingstabel: ${n} → € ${n * p}.`, `${n * k} is ${k} keer zo veel als ${n}.`, `Dus ${k} × € ${n * p} = € ${n * p * k}.`],
      { unit: 'euro', visual: vtabel([['aantal', n, n * k], ['prijs (€)', n * p, '?']]) }),
      guide: [st(`Hoeveel keer zoveel is ${n * k} als ${n}?`, k, `${n} × ? = ${n * k}`)], guideFinal: `Dan is de prijs ook ${k} keer zoveel: ${k} × ${n * p}` });
    }
    const d = pick([3, 4, 5]), k = rnd(4, 9);
    return tpl('verhoudingen.1b', { ...num(`1 op de ${d} kinderen speelt een instrument. In de school zitten ${d * k} kinderen. Hoeveel kinderen spelen een instrument?`, k,
      [`"1 op de ${d}" betekent: van elke ${d} kinderen is er 1.`, `${d * k} : ${d} = ${k}.`]),
    guide: [stC(`"1 op de ${d}" betekent:`, [`van elke ${d} kinderen doet er 1 het`, `${d} kinderen doen het`, `1 kind doet het`], 0, 'Denk aan groepjes.')], guideFinal: `Hoeveel groepjes van ${d} zitten er in ${d * k}` });
  },
  2() {
    const t = pick(['recept', 'perkilo', 'verdeel']);
    if (t === 'recept') {
      const p1 = pick([2, 4]), g = pick([150, 200, 250, 300]), p2 = p1 * pick([1.5, 2.5, 3]);
      return tpl('verhoudingen.2a', { ...num(`Voor ${p1} personen heb je ${g} gram pasta nodig. Hoeveel gram heb je nodig voor ${fmt(p2)} personen?`, (g / p1) * p2, [
        `Verhoudingstabel: ${p1} personen → ${g} gram.`, `1 persoon → ${g} : ${p1} = ${fmt(g / p1)} gram.`, `${fmt(p2)} personen → ${fmt(p2)} × ${fmt(g / p1)} = ${fmt((g / p1) * p2)} gram.`],
      { unit: 'gram', visual: vtabel([['personen', p1, 1, fmt(p2)], ['gram', g, '', '?']]) }),
      guide: [st(`Hoeveel gram voor 1 persoon? ${g} : ${p1} = ?`, g / p1, 'Ga in de tabel eerst naar 1.', { unit: 'gram' })], guideFinal: `${fmt(p2)} × ${fmt(g / p1)}` });
    }
    if (t === 'perkilo' && Math.random() < 0.5) {
      // Prijs bij een gewicht (zoals de methode): kiloprijs in centen, via 100 gram naar het gevraagde gewicht.
      const cent = rnd(12, 48) * 10, gram = pick([200, 300, 400, 600, 700, 800, 900]), wat = pick(['appels', 'kaas', 'druiven', 'tomaten', 'kersen', 'gehakt']);
      const p100 = cent / 10, totCent = p100 * (gram / 100);
      return tpl('verhoudingen.2d', { ...num(`1 kilo ${wat} kost ${euro(cent / 100)}. Hoeveel kost ${gram} gram?`, totCent / 100, [
        `Verhoudingstabel: 1000 gram → ${cent} cent.`, `100 gram is een tiende: ${cent} : 10 = ${fmt(p100)} cent.`, `${gram} gram is ${gram / 100} × 100 gram: ${gram / 100} × ${fmt(p100)} = ${fmt(totCent)} cent = ${euro(totCent / 100)}.`],
      { money: true, visual: vtabel([['gram', 1000, 100, gram], ['cent', cent, '', '?']]) }),
      guide: [st(`Hoeveel cent is ${euro(cent / 100)}?`, cent, '1 euro = 100 cent.', { unit: 'cent' }), st(`100 gram is een tiende van een kilo. Hoeveel cent kost 100 gram?`, p100, 'Deel door 10.', { unit: 'cent' })],
      guideFinal: `${gram} gram is ${gram / 100} × 100 gram: ${gram / 100} × ${fmt(p100)} cent, en dan naar euro` });
    }
    if (t === 'perkilo') {
      const gram = pick([100, 200, 250, 500]), perKilo = rnd(8, 24), prijs = (perKilo * gram) / 1000;
      return tpl('verhoudingen.2b', { ...num(`${gram} gram kaas kost ${euro(prijs)}. Hoeveel kost 1 kilo?`, perKilo, [
        `1 kilo = 1000 gram.`, `1000 : ${gram} = ${1000 / gram}, dus 1 kilo is ${1000 / gram} keer zoveel.`, `${1000 / gram} × ${euro(prijs)} = ${euro(perKilo)}.`], { money: true }),
      guide: [st(`Hoeveel gram is 1 kilo?`, 1000, 'Kilo = duizend.'), st(`Hoe vaak past ${gram} gram in 1000 gram?`, 1000 / gram, `${gram} × ? = 1000`)], guideFinal: `${1000 / gram} × ${euro(prijs)}` });
    }
    const a = rnd(1, 4), b = rnd(a + 1, 6), k = rnd(3, 9), totaal = (a + b) * k, n1 = pick(NAMES), n2 = pick(NAMES.filter((x) => x !== n1));
    return tpl('verhoudingen.2c', { ...num(`${n1} en ${n2} verdelen ${totaal} knikkers in de verhouding ${a} : ${b}. Hoeveel knikkers krijgt ${n1}?`, a * k, [
      `Samen zijn het ${a} + ${b} = ${a + b} delen.`, `Eén deel = ${totaal} : ${a + b} = ${k} knikkers.`, `${n1} krijgt ${a} delen: ${a} × ${k} = ${a * k}.`]),
    guide: [st(`Hoeveel delen zijn het samen? ${a} + ${b} = ?`, a + b, 'Tel de delen van de verhouding op.'), st(`Hoeveel knikkers is één deel? ${totaal} : ${a + b} = ?`, k, 'Verdeel alles over de delen.')],
    guideFinal: `${n1} krijgt ${a} delen: ${a} × ${k}` });
  },
  3() {
    const t = pick(['voordelig', 'verbruik', 'mengen']);
    if (t === 'voordelig') {
      const hoog = rnd(12, 18) / 10, laag = round(hoog - pick([0.1, 0.2]), 2), a = pick([3, 4]), b = pick([5, 6]);
      const groteGoedkoper = Math.random() < 0.6, pa = groteGoedkoper ? hoog : laag, pb = groteGoedkoper ? laag : hoog;
      return tpl('verhoudingen.3a', { ...choice(`Welke aanbieding is het voordeligst per stuk?`, [`${a} stuks voor ${euro(a * pa)}`, `${b} stuks voor ${euro(b * pb)}`], groteGoedkoper ? 1 : 0, [
        `Reken uit wat 1 stuk kost.`, `${euro(a * pa)} : ${a} = ${euro(pa)} per stuk.`, `${euro(b * pb)} : ${b} = ${euro(pb)} per stuk.`,
        `De aanbieding met ${groteGoedkoper ? b : a} stuks is goedkoper per stuk.${groteGoedkoper ? '' : ' Een groot pak is dus niet altijd voordeliger!'}`]),
      guide: [st(`Prijs per stuk bij ${a} stuks: ${euro(a * pa)} : ${a} = ?`, pa, 'Deel de prijs door het aantal.', { money: true }), st(`Prijs per stuk bij ${b} stuks: ${euro(b * pb)} : ${b} = ?`, pb, 'Deel de prijs door het aantal.', { money: true })],
      guideFinal: 'Welke is goedkoper per stuk' });
    }
    if (t === 'verbruik') {
      const per = pick([12, 15, 16, 18, 20]), l = rnd(15, 40);
      return tpl('verhoudingen.3b', { ...num(`Een auto rijdt 1 op ${per}: met 1 liter benzine rijdt hij ${per} km. Hoeveel liter heeft hij nodig voor ${per * l} km?`, l, [
        `Verhoudingstabel: 1 liter → ${per} km.`, `${per * l} : ${per} = ${l}.`, `Dus ${l} liter.`], { unit: 'liter' }),
      guide: [st(`Hoeveel km met 10 liter?`, per * 10, `10 × ${per}.`, { unit: 'km' })], guideFinal: `Hoe vaak past ${per} in ${per * l}? (tip: ${per * 10} km = 10 liter)` });
    }
    const w = pick([4, 5, 6, 7]), totaalDl = (w + 1) * rnd(2, 4), ml = (totaalDl * 100) / (w + 1);
    return tpl('verhoudingen.3c', { ...num(`Limonade maak je met 1 deel siroop op ${w} delen water. Je wilt ${fmt(totaalDl / 10)} liter limonade maken. Hoeveel milliliter siroop heb je nodig?`, ml, [
      `Samen zijn het 1 + ${w} = ${w + 1} delen.`, `${fmt(totaalDl / 10)} liter = ${totaalDl * 100} ml.`, `1 deel = ${totaalDl * 100} : ${w + 1} = ${ml} ml siroop.`], { unit: 'ml' }),
    guide: [st(`Hoeveel delen zijn het samen? 1 + ${w} = ?`, w + 1, 'Siroop + water.'), st(`Hoeveel ml is ${fmt(totaalDl / 10)} liter?`, totaalDl * 100, 'Denk aan de trap: liter – dl – cl – ml is 3 stappen, elke stap × 10.', { unit: 'ml' })],
    guideFinal: `Eén deel is siroop: ${totaalDl * 100} : ${w + 1}` });
  },
};

// Bouwtekening op schaal 1 : 50, 1 : 100 of 1 : 200, beide kanten op (tekening → echt en echt → tekening).
function schaalTekening() {
  const s = pick([50, 100, 200]), perCm = s / 100, wat = pick(['de kamer', 'de keuken', 'het klaslokaal', 'de schuur', 'de garage', 'de slaapkamer']);
  const stap1 = st(`Schaal 1 : ${s}: 1 cm op de tekening is ${s} cm in het echt. Hoeveel meter is dat?`, perCm, '100 cm = 1 m: deel door 100.', { unit: 'm' });
  if (Math.random() < 0.5) {
    const cm = s === 100 ? rnd(4, 24) / 2 : rnd(3, 14), m = cm * perCm;
    return tpl('schaal.2b', { ...num(`Op een bouwtekening met schaal 1 : ${s} is ${wat} ${fmt(cm)} cm lang. Hoe lang is ${wat} in het echt (in meter)?`, m, [
      `1 cm op de tekening is ${s} cm = ${fmt(perCm)} m in het echt.`, `${fmt(cm)} cm → ${fmt(cm)} × ${fmt(perCm)} = ${fmt(m)} m.`], { unit: 'm', visual: vtabel([['tekening (cm)', 1, fmt(cm)], ['echt (cm)', s, '?']]) }),
    guide: [stap1], guideFinal: `${fmt(cm)} cm op de tekening: ${fmt(cm)} × ${fmt(perCm)} m` });
  }
  const m = s === 200 ? rnd(2, 8) * 2 : rnd(3, 12), cm = m / perCm;
  return tpl('schaal.2c', { ...num(`${cap(wat)} is in het echt ${m} m lang. Hoe lang teken je ${wat} op een bouwtekening met schaal 1 : ${s} (in cm)?`, cm, [
    `1 cm op de tekening is ${s} cm = ${fmt(perCm)} m in het echt.`, `Hoe vaak past ${fmt(perCm)} m in ${m} m? ${m} : ${fmt(perCm)} = ${fmt(cm)}, dus ${fmt(cm)} cm.`], { unit: 'cm' }),
  guide: [stap1], guideFinal: `Hoe vaak past ${fmt(perCm)} m in ${m} m` });
}

const schaal = {
  0() {
    const per = pick([1, 2, 3, 4, 5, 10, 20]), h = rnd(2, 12), wat = pick(['Een pad', 'Een gang', 'Het schoolplein', 'Een sloot', 'Een hek', 'De zandbak', 'Een tuinpad', 'Een muur']);
    return tpl('schaal.0a', { ...num(`Op een plattegrond is 1 hokje ${per} meter. ${wat} is ${h} hokjes lang. Hoeveel meter is dat?`, per * h, [`Elk hokje is ${per} meter.`, `${h} × ${per} = ${per * h} meter.`], { unit: 'meter' }),
      guide: [st(`Hoeveel meter zijn 2 hokjes?`, 2 * per, `2 × ${per}.`, { unit: 'meter' })], guideFinal: `${h} hokjes: ${h} × ${per}` });
  },
  1() {
    const per = pick([2, 3, 4, 5, 10, 20, 25, 50, 100]), unit = per >= 20 ? 'm' : 'km', cm = rnd(2, 15), wat = pick(['een weg', 'een fietspad', 'een rivier', 'een wandelroute', 'een spoorlijn', 'een dijk', 'een kanaal']);
    return tpl('schaal.1a', { ...num(`Op een kaart staat: 1 cm is ${per} ${unit} in het echt. Op de kaart is ${wat} ${cm} cm lang. Hoe lang is dat in het echt?`, per * cm, [
      `Elke cm op de kaart is ${per} ${unit}.`, `${cm} × ${per} = ${per * cm} ${unit}.`], { unit }),
    guide: [st(`Hoeveel ${unit} is 2 cm op de kaart?`, 2 * per, `2 × ${per}.`, { unit })], guideFinal: `${cm} cm: ${cm} × ${per}` });
  },
  2() {
    if (Math.random() < 0.45) return schaalTekening();
    // Zoals de methode: eerst wat 1 cm op de kaart in het echt is, in meter ("1 : 100 → 1 cm is 100 cm = 1 m"), dan de verhoudingstabel.
    const s = pick([10000, 20000, 25000, 40000, 50000, 100000, 200000]), cm = rnd(2, 15), echtCm = cm * s, perCm = s / 100, wat = pick(['de afstand', 'de fietsroute', 'het pad langs het water', 'de weg naar het strand', 'de afstand tussen twee kerken']);
    return tpl('schaal.2a', { ...num(`Een kaart heeft schaal 1 : ${fmt(s)}. Op de kaart is ${wat} ${cm} cm. Hoeveel kilometer is dat in het echt?`, echtCm / 100000, [
      `1 : ${fmt(s)} betekent: 1 cm op de kaart is ${fmt(s)} cm in het echt = ${fmt(perCm)} m.`, `Verhoudingstabel: 1 cm → ${fmt(perCm)} m, dus ${cm} cm → ${cm} × ${fmt(perCm)} = ${fmt(echtCm / 100)} m.`,
      `Van m naar km: deel door 1000 → ${fmt(echtCm / 100000)} km.`], { unit: 'km', visual: vtabel([['kaart (cm)', 1, cm], ['echt (cm)', fmt(s), '?']]) }),
    guide: [st(`1 cm op de kaart is ${fmt(s)} cm in het echt. Hoeveel meter is dat?`, perCm, '100 cm = 1 m: deel door 100.', { unit: 'm' }),
      st(`${cm} cm op de kaart is hoeveel meter in het echt?`, echtCm / 100, `Verhoudingstabel: ${cm} cm is ${cm} keer zoveel als 1 cm.`, { unit: 'm' })], guideFinal: `Van meter naar km: ${fmt(echtCm / 100)} : 1000` });
  },
  3() {
    // verzonnen plekken: met echte plaatsnamen zou de afstand niet kloppen
    const [A, B] = pick([['de school', 'de sporthal'], ['het dorp', 'het strand'], ['de boerderij', 'de molen'], ['de camping', 'het meer'], ['de kerk', 'de haven'], ['het station', 'het kasteel'], ['de brug', 'de vuurtoren'], ['het bos', 'de dierentuin']]);
    if (Math.random() < 0.5) {
      const s = pick([10000, 20000, 25000, 50000, 100000]), km = rnd(1, 24) / 2, cm = (km * 100000) / s;
      if (!Number.isInteger(cm * 10) || cm > 40 || cm < 2) return tpl('schaal.3a', schaal[3]());
      // Echt → op de kaart (de methode): 1 cm op de kaart is ... m echt; hoe vaak past dat in de echte afstand?
      return tpl('schaal.3b', { ...num(`De afstand tussen ${A} en ${B} is in het echt ${fmt(km)} km. Hoeveel cm is dat op een kaart met schaal 1 : ${fmt(s)}?`, cm, [
        `1 cm op de kaart is ${fmt(s)} cm = ${fmt(s / 100)} m in het echt.`, `${fmt(km)} km = ${fmt(km * 1000)} m.`, `Hoe vaak past ${fmt(s / 100)} m in ${fmt(km * 1000)} m? ${fmt(km * 1000)} : ${fmt(s / 100)} = ${fmt(cm)}, dus ${fmt(cm)} cm.`], { unit: 'cm' }),
      guide: [st(`1 cm op de kaart is ${fmt(s)} cm in het echt. Hoeveel meter is dat?`, s / 100, '100 cm = 1 m: deel door 100.', { unit: 'm' }), st(`${fmt(km)} km = ? m`, km * 1000, 'Kilo betekent duizend: in 1 kilometer zitten duizend meter.', { unit: 'm' })],
      guideFinal: `Hoe vaak past ${fmt(s / 100)} m in ${fmt(km * 1000)} m` });
    }
    const cm = pick([2, 3, 4, 5, 6, 8, 10, 12]), s = pick([1000, 5000, 10000, 20000, 25000, 50000]), m = (cm * s) / 100;
    return tpl('schaal.3c', { ...num(`Op een kaart is de weg van ${A} naar ${B} ${cm} cm. In het echt is die weg ${fmt(m)} meter. Wat is de schaal? Vul in: 1 : ...`, s, [
      `${fmt(m)} m = ${fmt(m * 100)} cm.`, `${cm} cm op de kaart is ${fmt(m * 100)} cm echt.`, `1 cm is dan ${fmt(m * 100)} : ${cm} = ${fmt(s)} cm.`, `Schaal 1 : ${fmt(s)}.`]),
    guide: [st(`${fmt(m)} meter = ? cm`, m * 100, '1 m = 100 cm. Bij schaal reken je alles in cm.', { unit: 'cm' })], guideFinal: `1 cm op de kaart = ${fmt(m * 100)} : ${cm} cm echt` });
  },
};

// =====================================================================
// METEN & MEETKUNDE
// =====================================================================
const TRAP = 'km – hm – dam – m – dm – cm – mm';
const metriek = {
  0() {
    const t = pick([
      () => { const v = rnd(2, 30); return [`${v} meter = ... cm`, v * 100, 'cm', [`1 m = 100 cm.`, `${v} × 100 = ${v * 100}`], [st('Hoeveel cm is 1 meter?', 100, 'Kijk op een meetlint.', { unit: 'cm' })], `${v} × 100`]; },
      () => { const v = rnd(2, 25); return [`${v} kilo = ... gram`, v * 1000, 'gram', [`1 kg = 1000 g.`, `${v} × 1000 = ${v * 1000}`], [st('Hoeveel gram is 1 kilo?', 1000, 'Kilo betekent duizend.', { unit: 'gram' })], `${v} × 1000`]; },
      () => { const v = rnd(2, 25); return [`${v} liter = ... dl`, v * 10, 'dl', [`1 liter = 10 dl.`, `${v} × 10 = ${v * 10}`], [st('Hoeveel dl is 1 liter?', 10, 'Deci betekent: een tiende deel. Hoeveel bekertjes van 1 dl vul je met een pak melk van 1 liter?', { unit: 'dl' })], `${v} × 10`]; },
      () => { const v = rnd(2, 30) * 100; return [`${v} cm = ... meter`, v / 100, 'meter', [`100 cm = 1 m.`, `${v} : 100 = ${v / 100}`], [st('Hoeveel cm is 1 meter?', 100, 'Kijk op een meetlint.', { unit: 'cm' })], `${v} : 100`]; },
      () => { const v = rnd(2, 30); return [`${v} cm = ... mm`, v * 10, 'mm', [`1 cm = 10 mm.`, `${v} × 10 = ${v * 10}`], [st('Hoeveel mm is 1 cm?', 10, 'Kijk op je liniaal: de kleine streepjes.', { unit: 'mm' })], `${v} × 10`]; },
      () => { const v = rnd(2, 12); return [`${v} km = ... meter`, v * 1000, 'meter', [`1 km = 1000 m.`, `${v} × 1000 = ${v * 1000}`], [st('Hoeveel meter is 1 kilometer?', 1000, 'Kilo betekent duizend.', { unit: 'meter' })], `${v} × 1000`]; },
      () => { const v = rnd(2, 15); return [`${v} meter = ... dm`, v * 10, 'dm', [`1 m = 10 dm.`, `${v} × 10 = ${v * 10}`], [st('Hoeveel dm is 1 meter?', 10, 'Deci betekent een tiende: een decimeter is een tiende deel van een meter.', { unit: 'dm' })], `${v} × 10`]; },
      () => { const v = rnd(2, 15) * 10; return [`${v} dl = ... liter`, v / 10, 'liter', [`10 dl = 1 liter.`, `${v} : 10 = ${v / 10}`], [st('Hoeveel dl is 1 liter?', 10, 'Deci betekent: een tiende deel. Hoeveel bekertjes van 1 dl vul je met een pak melk van 1 liter?', { unit: 'dl' })], `${v} : 10`]; },
      () => { const v = rnd(2, 12) * 1000; return [`${fmt(v)} gram = ... kilo`, v / 1000, 'kilo', [`1000 g = 1 kg.`, `${fmt(v)} : 1000 = ${v / 1000}`], [st('Hoeveel gram is 1 kilo?', 1000, 'Kilo betekent duizend.', { unit: 'gram' })], `${fmt(v)} : 1000`]; },
    ])();
    return tpl('metriek.0a', { ...num(t[0], t[1], t[3], { unit: t[2] }), guide: t[4], guideFinal: t[5] });
  },
  1() {
    if (Math.random() < 0.35) {
      // Gewicht met de oude namen (zoals de methode): ons = 100 g, pond = 500 g, ton = 1000 kg; trap kg – hg – dag – g.
      const [txt, ans, unit, per, vraag, tip] = pick([
        () => { const v = rnd(2, 9); return [`${v} ons = ... gram`, v * 100, 'gram', 100, 'Hoeveel gram is 1 ons?', 'Een ons is een hectogram: op de trap kg – hg – dag – g is dat 2 treden boven de gram.']; },
        () => { const v = rnd(2, 9); return [`${v} pond = ... gram`, v * 500, 'gram', 500, 'Hoeveel gram is 1 pond?', 'Een pond is een halve kilo.']; },
        () => { const v = rnd(2, 12); return [`${v} ton = ... kg`, v * 1000, 'kg', 1000, 'Hoeveel kg is 1 ton?', 'Een kleine auto weegt ongeveer 1 ton.']; },
        () => { const v = rnd(2, 9); return [`${v} hg = ... gram`, v * 100, 'gram', 100, 'Hoeveel gram is 1 hg (hectogram)?', 'Trap: kg – hg – dag – g. Van hg naar g zijn 2 treden omlaag, elke tree × 10.']; },
      ])();
      return tpl('metriek.1b', { ...num(txt, ans, [`1 ${txt.split(' ')[1]} = ${fmt(per)} ${unit}.`, `${txt.split(' ')[0]} × ${fmt(per)} = ${fmt(ans)}`], { unit }),
        guide: [st(vraag, per, tip, { unit })], guideFinal: `${txt.split(' ')[0]} × ${fmt(per)}` });
    }
    const t = pick([
      () => { const v = rnd(12, 95) / 10; return [`${fmt(v)} meter = ... cm`, v * 100, 'cm', [`1 m = 100 cm.`, `${fmt(v)} × 100 = ${fmt(v * 100)}`], 100]; },
      () => { const v = rnd(11, 95) * 100; return [`${fmt(v)} gram = ... kg`, v / 1000, 'kg', [`1 kg = 1000 g.`, `${fmt(v)} : 1000 = ${fmt(v / 1000)}`], 1000]; },
      () => { const v = pick([3, 5, 6, 7, 9, 10, 11]) * 250; return [`${fmt(v)} ml = ... liter`, v / 1000, 'liter', [`1 liter = 1000 ml.`, `${fmt(v)} : 1000 = ${fmt(v / 1000)}`], 1000]; },
      () => { const v = rnd(2, 9); return [`${v} km = ... m`, v * 1000, 'm', [`1 km = 1000 m.`, `${v} × 1000 = ${fmt(v * 1000)}`], 1000]; },
    ])();
    return tpl('metriek.1a', { ...num(t[0], t[1], t[3], { unit: t[2] }), guide: [st(`Met welk getal reken je om? (1 grote maat = ? kleine maten)`, t[4], 'Kijk op de trap hoeveel stappen het is tussen de twee maten. Elke stap scheelt 10 keer.')], guideFinal: t[3][1].split('=')[0].trim() });
  },
  2() {
    if (Math.random() < 0.35) {
      // Maten optellen (de methode): eerst alles in dezelfde maat, dan pas optellen. 6 km + 1530 m = 6000 m + 1530 m.
      const [g, k, per, a, b] = pick([
        () => ['km', 'm', 1000, rnd(2, 9), rnd(11, 99) * 10 + rnd(0, 9)],
        () => ['kg', 'gram', 1000, rnd(2, 6), rnd(1, 19) * 50],
        () => ['m', 'cm', 100, rnd(2, 9), rnd(5, 95)],
        () => ['liter', 'ml', 1000, rnd(1, 4), pick([150, 250, 330, 500, 750])],
      ])();
      return tpl('metriek.2b', { ...num(`${a} ${g} + ${fmt(b)} ${k} = ... ${k}`, a * per + b, [`Maak eerst dezelfde maat: ${a} ${g} = ${fmt(a * per)} ${k}.`, `${fmt(a * per)} + ${fmt(b)} = ${fmt(a * per + b)} ${k}.`], { unit: k }),
        guide: [st(`Maak eerst dezelfde maat: ${a} ${g} = ? ${k}`, a * per, `Hoeveel ${k} zit er in 1 ${g}? Kijk op de trap.`, { unit: k })], guideFinal: `Nu optellen: ${fmt(a * per)} + ${fmt(b)}` });
    }
    const t = pick([
      () => { const v = rnd(11, 99) / 100; return [`${fmt(v)} liter = ... cl`, v * 100, 'cl', [`Trap: liter – dl – cl – ml. Van liter naar cl is 2 stappen omlaag.`, `Twee stappen = × 100: ${fmt(v)} × 100 = ${fmt(v * 100)}`], 2, 'omlaag (×)']; },
      () => { const v = rnd(12, 95) / 10; return [`${fmt(v)} km = ... m`, v * 1000, 'm', [`Trap: ${TRAP}. Van km naar m is 3 stappen omlaag. Omlaag op de trap = keer.`, `3 stappen is × 10 × 10 × 10 = × 1000: ${fmt(v)} × 1000 = ${fmt(v * 1000)}`], 3, 'omlaag (×)']; },
      () => { const v = rnd(12, 480); return [`${v} mm = ... m`, v / 1000, 'm', [`Van mm naar m is 3 stappen omhoog op de trap. Omhoog op de trap = delen.`, `3 stappen is : 1000. ${v} : 1000 = ${fmt(v / 1000)}`], 3, 'omhoog (:)']; },
      () => { const v = rnd(2, 9) * 15; return [`${v} dl = ... liter`, v / 10, 'liter', [`1 liter = 10 dl.`, `${v} : 10 = ${fmt(v / 10)}`], 1, 'omhoog (:)']; },
    ])();
    return tpl('metriek.2a', { ...num(t[0], t[1], t[3], { unit: t[2] }), guide: [st('Hoeveel stappen op de trap moet je?', t[4], `Trap: ${TRAP}, of liter – dl – cl – ml.`)], guideFinal: t[5].startsWith('omhoog') ? `${t[4]} stap${t[4] > 1 ? 'pen' : ''} omhoog. Omhoog = delen: elke stap is : 10` : `${t[4]} stap${t[4] > 1 ? 'pen' : ''} omlaag. Omlaag = keer: elke stap is × 10` });
  },
  3() {
    const t = pick([
      () => { const v = rnd(15, 95) / 10; return [`${fmt(v)} m² = ... dm²`, v * 100, 'dm²', [`Bij oppervlakte (m²) is elke stap op de trap × 100.`, `m² → dm² is 1 stap: ${fmt(v)} × 100 = ${fmt(v * 100)}`], [st('Bij m² is één stap op de trap keer ...?', 100, '1 m² = 10 dm × 10 dm.')], `${fmt(v)} × 100`]; },
      () => { const v = rnd(12, 95) * 100; return [`${fmt(v)} cm³ = ... liter`, v / 1000, 'liter', [`1 liter = 1 dm³ = 1000 cm³.`, `${fmt(v)} : 1000 = ${fmt(v / 1000)} liter`], [st('Hoeveel cm³ past er in 1 liter?', 1000, '1 liter = 1 dm³ = 10 × 10 × 10 cm³.', { unit: 'cm³' })], `${fmt(v)} : 1000`]; },
      () => { const v = rnd(2, 9) / 2; return [`${fmt(v)} m³ = ... liter`, v * 1000, 'liter', [`1 m³ = 1000 dm³ = 1000 liter.`, `${fmt(v)} × 1000 = ${fmt(v * 1000)}`], [st('Hoeveel liter is 1 m³?', 1000, 'Een kubus van 1 m is 10 × 10 × 10 blokjes van 1 dm³, en elk blokje van 1 dm³ is 1 liter.', { unit: 'liter' })], `${fmt(v)} × 1000`]; },
      () => { const v = rnd(2, 9); return [`${v} hectare = ... m²`, v * 10000, 'm²', [`1 hectare (ha) = 100 m × 100 m = 10 000 m².`, `${v} × 10 000 = ${fmt(v * 10000)}`], [st('1 hectare is een veld van 100 m bij 100 m. Hoeveel m² is dat?', 10000, '100 × 100.', { unit: 'm²' })], `${v} × 10 000`]; },
      () => { const v = rnd(2, 9); return [`${v} are = ... m²`, v * 100, 'm²', [`1 are = 1 dam² = 10 m × 10 m = 100 m².`, `${v} × 100 = ${v * 100}`], [st('1 are is een veld van 10 m bij 10 m. Hoeveel m² is dat?', 100, '10 × 10. Op de trap van de m² is are (dam²) één tree boven de m², en bij m² is elke tree × 100.', { unit: 'm²' })], `${v} × 100`]; },
      () => { const v = rnd(2, 9) + pick([0, 0.5]); return [`${fmt(v)} ha = ... are`, v * 100, 'are', [`Hectare = hm² en are = dam²: op de trap van de m² is dat één tree.`, `Eén tree bij m² is × 100: ${fmt(v)} × 100 = ${fmt(v * 100)}`], [st('Op de trap van de m² is hectare hm² en are dam². Hoeveel treden is dat?', 1, 'km² – hm² – dam² – m²: tel de treden.'), st('Bij m² is één tree keer ...?', 100, '1 hm² = 10 dam × 10 dam.')], `${fmt(v)} × 100`]; },
      () => { const v = rnd(2, 8) * 1000 + 500; return [`${fmt(v)} kg = ... ton`, v / 1000, 'ton', [`1 ton = 1000 kg.`, `${fmt(v)} : 1000 = ${fmt(v / 1000)}`], [st('Hoeveel kg is 1 ton?', 1000, 'Een kleine auto weegt ongeveer 1 ton.', { unit: 'kg' })], `${fmt(v)} : 1000`]; },
    ])();
    return tpl('metriek.3a', { ...num(t[0], t[1], t[3], { unit: t[2] }), guide: t[4], guideFinal: t[5] });
  },
};

const oppervlakte = {
  0() {
    const w = rnd(2, 9), h = rnd(2, 7);
    if (Math.random() < 0.45) return tpl('oppervlakte.0a', { ...num(`Hoeveel hokjes zitten er in deze rechthoek?`, w * h, [`Tel de hokjes in één rij: ${w}.`, `Er zijn ${h} rijen.`, `${h} × ${w} = ${w * h}`], { visual: { kind: 'grid', w, h } }),
      guide: [st('Hoeveel hokjes zitten er in één rij?', w, 'Tel de bovenste rij.'), st('Hoeveel rijen zijn er?', h, 'Tel van boven naar beneden.')], guideFinal: `${h} rijen van ${w}: ${h} × ${w}` });
    const wat = pick(['Een rechthoek', 'Een foto', 'Een kaartje', 'Een tegel', 'Een sticker', 'Een boekje', 'Een tekening']);
    return tpl('oppervlakte.0b', { ...num(`${wat} is ${w} cm lang en ${h} cm breed. Hoe lang is de rand rondom (de omtrek)?`, 2 * (w + h), [`Tel alle zijden op: ${w} + ${h} + ${w} + ${h}.`, `= ${2 * (w + h)} cm`], { unit: 'cm', visual: { kind: 'rect', w, h, unit: 'cm' } }),
      guide: [st(`Eén lange en één korte kant: ${w} + ${h} = ?`, w + h, 'Dat is de halve rand.', { unit: 'cm' })], guideFinal: `De hele rand is twee keer zo lang: 2 × ${w + h}` });
  },
  1() {
    const l = rnd(4, 20), b = rnd(3, l - 1);
    if (Math.random() < 0.5) return tpl('oppervlakte.1a', { ...num(`Een rechthoekige ${pick(['tuin', 'kamer', 'moestuin', 'parkeerplaats', 'vijver', 'zolder'])} is ${l} m lang en ${b} m breed. Hoe groot is de oppervlakte?`, l * b,
      [`Oppervlakte rechthoek = lengte × breedte.`, `${l} × ${b} = ${l * b} m².`], { unit: 'm²', visual: { kind: 'rect', w: l, h: b, unit: 'm' } }),
    guide: [stC('Oppervlakte van een rechthoek is:', ['lengte × breedte', 'lengte + breedte', 'alle kanten optellen'], 0, 'Oppervlakte = hoeveel vierkantjes erin passen: zoveel rijen keer zoveel in een rij.')], guideFinal: `${l} × ${b}` });
    return tpl('oppervlakte.1b', { ...num(`Een rechthoekig grasveld is ${l} m lang en ${b} m breed. Hoe groot is de omtrek?`, 2 * (l + b),
      [`Omtrek = de afstand helemaal rondom.`, `Lengte + breedte = de halve rand: ${l} + ${b} = ${l + b} m.`, `De hele rand: 2 × ${l + b} = ${2 * (l + b)} m.`], { unit: 'm', visual: { kind: 'rect', w: l, h: b, unit: 'm' } }),
    guide: [st(`Lengte + breedte: ${l} + ${b} = ?`, l + b, 'Dat is de halve rand.', { unit: 'm' })], guideFinal: `De hele rand is twee keer zoveel: 2 × ${l + b}` });
  },
  2() {
    const r = Math.random();
    if (r < 0.3) {
      // Inhoud als blokjes van 1 dm³ (de methode): eerst één laag op de bodem, dan het aantal lagen.
      const l = rnd(2, 8), b = rnd(2, 5), h = rnd(2, 5), wat = pick(['Een doos', 'Een kist', 'Een bak', 'Een krat']);
      return tpl('oppervlakte.2c', { ...num(`${wat} is ${l} dm lang, ${b} dm breed en ${h} dm hoog. Hoeveel blokjes van 1 dm³ passen erin?`, l * b * h,
        [`Op de bodem past één laag: ${l} × ${b} = ${l * b} blokjes.`, `Er passen ${h} lagen op elkaar: ${h} × ${l * b} = ${l * b * h} blokjes (= ${l * b * h} dm³ = ${l * b * h} liter).`], { unit: 'blokjes' }),
      guide: [st(`Hoeveel blokjes passen op de bodem (één laag)? ${l} × ${b} = ?`, l * b, 'Een rij langs de lange kant, en zoveel rijen als de breedte.', { unit: 'blokjes' })],
      guideFinal: `Er passen ${h} lagen op elkaar: ${h} × ${l * b}` });
    }
    if (r < 0.62) {
      const l = pick([10, 15, 20, 25, 30, 40, 50]), b = pick([10, 15, 20, 25]), h = pick([10, 20, 30, 40]), cm3 = l * b * h, wat = pick(['Een doos', 'Een kist', 'Een bak', 'Een koelbox', 'Een plantenbak']);
      return tpl('oppervlakte.2a', { ...num(`${wat} (balk) is ${l} cm lang, ${b} cm breed en ${h} cm hoog. Hoeveel liter past erin?`, cm3 / 1000,
        [`Inhoud = lengte × breedte × hoogte.`, `${l} × ${b} × ${h} = ${fmt(cm3)} cm³.`, `1 liter = 1000 cm³, dus ${fmt(cm3)} : 1000 = ${fmt(cm3 / 1000)} liter.`], { unit: 'liter' }),
      guide: [st(`Grondvlak: ${l} × ${b} = ?`, l * b, 'Lengte × breedte.', { unit: 'cm²' }), st(`Inhoud: ${l * b} × ${h} = ?`, cm3, 'Doe dat keer de hoogte.', { unit: 'cm³' })], guideFinal: `Naar liters: ${fmt(cm3)} : 1000` });
    }
    const basis = rnd(2, 15) * 2, hoogte = rnd(3, 14);
    return tpl('oppervlakte.2b', { ...num(`Een driehoek heeft een basis van ${basis} cm en een hoogte van ${hoogte} cm. Hoe groot is de oppervlakte?`, (basis * hoogte) / 2,
      [`Denk een rechthoek om de driehoek heen (de stippellijn): ${basis} cm breed en ${hoogte} cm hoog.`, `Die rechthoek is ${basis} × ${hoogte} = ${basis * hoogte} cm².`, `De driehoek vult precies de helft van die rechthoek. Dus ${basis * hoogte} : 2 = ${(basis * hoogte) / 2} cm².`], { unit: 'cm²', visual: { kind: 'tri', w: basis, h: hoogte, unit: 'cm' } }),
    guide: [st(`Kijk naar de stippel-rechthoek om de driehoek. Hoe groot is die? ${basis} × ${hoogte} = ?`, basis * hoogte, 'Rechthoek = breed × hoog.', { unit: 'cm²' })], guideFinal: `De driehoek is precies de helft van de rechthoek. Reken ${basis * hoogte} : 2` });
  },
  3() {
    const t = pick(['tegels', 'vierkant', 'aquarium', 'lvorm', 'lvorm', 'lomtrek', 'blokken2']);
    if (t === 'blokken2') {
      // Blokken van 2 dm³ (S in de methode): eerst de inhoud in dm³, dan hoeveel blokken van 2 dm³ daarin passen.
      const l = rnd(2, 5) * 2, b = rnd(2, 5), h = rnd(2, 4);
      return tpl('oppervlakte.3e', { ...num(`Een kist is ${l} dm lang, ${b} dm breed en ${h} dm hoog. Hoeveel blokken van 2 dm³ (2 dm lang, 1 dm breed, 1 dm hoog) passen erin?`, (l * b * h) / 2,
        [`Inhoud van de kist: ${l} × ${b} × ${h} = ${l * b * h} dm³.`, `Elk blok is 2 dm³: ${l * b * h} : 2 = ${(l * b * h) / 2} blokken.`], { unit: 'blokken' }),
      guide: [st(`Hoeveel dm³ is de kist? ${l} × ${b} × ${h} = ?`, l * b * h, 'Eerst één laag op de bodem (lengte × breedte), dan keer het aantal lagen.', { unit: 'dm³' })], guideFinal: `Elk blok is 2 dm³: ${l * b * h} : 2` });
    }
    if (t === 'tegels') {
      const l = rnd(4, 7), b = rnd(3, 5), p = pick([15, 20, 25, 30]);
      return tpl('oppervlakte.3a', { ...num(`Een kamer is ${l} m lang en ${b} m breed. Een nieuwe vloer kost € ${p} per m². Hoeveel kost de vloer?`, l * b * p,
        [`Oppervlakte: ${l} × ${b} = ${l * b} m².`, `Prijs: ${l * b} × € ${p} = € ${l * b * p}.`], { unit: 'euro' }),
      guide: [st(`Hoeveel m² is de kamer? ${l} × ${b} = ?`, l * b, 'Lengte × breedte.', { unit: 'm²' })], guideFinal: `Elke m² kost € ${p}: ${l * b} × ${p}` });
    }
    if (t === 'vierkant') {
      const z = rnd(5, 15);
      return tpl('oppervlakte.3b', { ...num(`De omtrek van een vierkant is ${4 * z} cm. Hoe groot is de oppervlakte?`, z * z,
        [`Een vierkant heeft 4 even lange zijden.`, `Eén zijde: ${4 * z} : 4 = ${z} cm.`, `Oppervlakte: ${z} × ${z} = ${z * z} cm².`], { unit: 'cm²' }),
      guide: [st(`Hoe lang is één zijde? ${4 * z} : 4 = ?`, z, 'Een vierkant heeft 4 gelijke zijden.', { unit: 'cm' })], guideFinal: `Oppervlakte = zijde × zijde: ${z} × ${z}` });
    }
    if (t === 'aquarium') {
      const l = pick([60, 80, 100]), b = pick([30, 40]), h = pick([40, 50]);
      return tpl('oppervlakte.3c', { ...num(`Een aquarium is ${l} cm lang, ${b} cm breed en ${h} cm hoog. Hoeveel liter water past erin?`, (l * b * h) / 1000,
        [`Reken in dm, want 1 dm³ = 1 liter: ${l / 10} dm, ${b / 10} dm, ${h / 10} dm.`, `${l / 10} × ${b / 10} × ${h / 10} = ${(l * b * h) / 1000} dm³ = ${(l * b * h) / 1000} liter.`], { unit: 'liter' }),
      guide: [st(`Reken in dm (10 cm is 1 dm). Hoeveel dm is ${l} cm?`, l / 10, 'Deel door 10.', { unit: 'dm' }),
        st(`Grondvlak in dm²: ${l / 10} × ${b / 10} = ?`, (l / 10) * (b / 10), 'Lengte × breedte in dm.', { unit: 'dm²' })], guideFinal: `Keer de hoogte (${h / 10} dm). 1 dm³ = 1 liter` });
    }
    const A = rnd(8, 12), B = rnd(6, 9), a = rnd(3, A - 3), b = rnd(2, B - 3);
    const lvis = { kind: 'lshape', A, B, a, b, unit: 'm' };
    if (t === 'lomtrek') {
      // Omtrek van een samengestelde figuur (de methode): alle zijden optellen; de twee zijden zonder maat eerst uitrekenen.
      return tpl('oppervlakte.3g', { ...num(`Een L-vormig speelveld is een rechthoek van ${A} m bij ${B} m waar een hoek van ${a} m bij ${b} m uit is gehaald. Hoe lang is de rand rondom (de omtrek)?`, 2 * (A + B),
        [`Het veld heeft 6 zijden: ${A} m, ${B} m, ${a} m, ${b} m en twee zijden zonder maat.`, `Die twee: ${A} − ${a} = ${A - a} m en ${B} − ${b} = ${B - b} m.`, `Alles opgeteld: ${A} + ${B} + ${a} + ${b} + ${A - a} + ${B - b} = ${2 * (A + B)} m.`], { unit: 'm', visual: lvis }),
      guide: [st(`Eén zijde zonder maat: ${A} − ${a} = ?`, A - a, 'De lange kant min het stuk dat eruit is gehaald.', { unit: 'm' }), st(`De andere zijde zonder maat: ${B} − ${b} = ?`, B - b, 'De korte kant min het stuk dat eruit is gehaald.', { unit: 'm' })],
      guideFinal: `Tel alle 6 zijden op: ${A} + ${B} + ${a} + ${b} + ${A - a} + ${B - b}` });
    }
    if (Math.random() < 0.5) {
      // Samengestelde figuur in rechthoeken verdelen (de methode): twee rechthoeken uitrekenen en optellen.
      return tpl('oppervlakte.3f', { ...num(`Een L-vormig speelveld is een rechthoek van ${A} m bij ${B} m waar een hoek van ${a} m bij ${b} m uit is gehaald. Hoe groot is de oppervlakte?`, A * B - a * b,
        [`Verdeel het veld in twee rechthoeken.`, `Een strook over de hele lengte: ${A} m bij ${B} − ${b} = ${B - b} m → ${A} × ${B - b} = ${A * (B - b)} m².`, `Het stuk ernaast: ${A} − ${a} = ${A - a} m bij ${b} m → ${A - a} × ${b} = ${(A - a) * b} m².`, `Samen: ${A * (B - b)} + ${(A - a) * b} = ${A * B - a * b} m².`], { unit: 'm²', visual: lvis }),
      guide: [st(`Rechthoek 1 is een strook van ${A} m bij ${B - b} m. Hoe groot is die?`, A * (B - b), 'Lengte × breedte.', { unit: 'm²' }), st(`Rechthoek 2 is ${A - a} m bij ${b} m. Hoe groot is die?`, (A - a) * b, 'Lengte × breedte.', { unit: 'm²' })],
      guideFinal: `Tel de twee rechthoeken op: ${A * (B - b)} + ${(A - a) * b}` });
    }
    return tpl('oppervlakte.3d', { ...num(`Een L-vormig speelveld is een rechthoek van ${A} m bij ${B} m waar een hoek van ${a} m bij ${b} m uit is gehaald. Hoe groot is de oppervlakte?`, A * B - a * b,
      [`Grote rechthoek: ${A} × ${B} = ${A * B} m².`, `Weggehaald stuk: ${a} × ${b} = ${a * b} m².`, `${A * B} − ${a * b} = ${A * B - a * b} m².`], { unit: 'm²', visual: { kind: 'lshape', A, B, a, b, unit: 'm' } }),
    guide: [st(`De hele rechthoek: ${A} × ${B} = ?`, A * B, 'Doe alsof de hoek er nog in zit.', { unit: 'm²' }), st(`Het weggehaalde stuk: ${a} × ${b} = ?`, a * b, 'Het gestippelde stuk.', { unit: 'm²' })],
    guideFinal: `${A * B} − ${a * b}` });
  },
};

// ---------- klokken: klokkijken, tijd in woorden, wekker, oven, vertrekbord ----------
// Zo zeg je de tijd in Nederland (per 5 minuten, zoals op school). Na het halve uur noem je al het volgende uur.
const UREN = ['twaalf', 'één', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien', 'elf'];
const uurW = (h) => UREN[((h % 12) + 12) % 12];
export function tijdInWoorden(h, m) {
  const nu = uurW(h), straks = uurW(h + 1);
  return { 0: `${nu} uur`, 5: `vijf over ${nu}`, 10: `tien over ${nu}`, 15: `kwart over ${nu}`, 20: `tien voor half ${straks}`, 25: `vijf voor half ${straks}`,
    30: `half ${straks}`, 35: `vijf over half ${straks}`, 40: `tien over half ${straks}`, 45: `kwart voor ${straks}`, 50: `tien voor ${straks}`, 55: `vijf voor ${straks}` }[m];
}
// foute keuzes zoals kinderen ze echt maken: uur ernaast ("half drie" i.p.v. "half vier"), over/voor omgedraaid
function tijdAfleiders(h, m, woorden, extra = []) {
  const ok = woorden(h, m), out = [];
  for (const w of [woorden(h - 1, (60 - m) % 60), woorden(h, m) === woorden(h - 1, m) ? null : woorden(h - 1, m), woorden(h + 1, m), woorden(h, (60 - m) % 60), ...extra]) {
    if (w && w !== ok && !out.includes(w)) out.push(w);
  }
  return out.slice(0, 3);
}
const LOOKS = ['wall', 'alarm', 'watch'];
const KLOKNAAM = { wall: 'de klok', alarm: 'de wekker', watch: 'het horloge' };
const klokPlaatje = (min, look, label) => ({ kind: 'clock', time: hhmm(min), look: look || pick(LOOKS), ...(label ? { label } : {}) });
const TREINEN = ['Utrecht Centraal', 'Amersfoort', 'Zwolle', 'Groningen', 'Den Haag Centraal', 'Eindhoven', 'Rotterdam Centraal', 'Maastricht'];

// Klokkijken: wat wijst de klok aan? (ochtend, dus 12-uursklok volstaat)
function klokLezen(lv) {
  const h = rnd(7, 11), m = lv === 0 ? pick([0, 15, 30, 45]) : rnd(0, 11) * 5, look = pick(LOOKS);
  const kort = m === 0 ? `De kleine wijzer (de uurwijzer) staat precies op de ${h}.` : `De kleine wijzer (de uurwijzer) staat tussen de ${h} en de ${h + 1}: het is dus al ná ${h} uur.`;
  return tpl('klokLezen.a', { ...time(`Hoe laat is het op ${KLOKNAAM[look]}? Het is ochtend.`, h * 60 + m, [
    `De grote wijzer (de minutenwijzer) staat ${m === 0 ? 'op de 12: precies het hele uur' : `bij de ${m / 5}: dat is ${m / 5} × 5 = ${m} minuten`}.`, kort,
    `Het is ${hhmm(h * 60 + m)}. Je zegt: ${tijdInWoorden(h, m)}.`], { twelve: true, visual: klokPlaatje(h * 60 + m, look) }),
  guide: [st('Bij welk getal staat de grote wijzer?', m === 0 ? 12 : m / 5, 'De grote (lange) wijzer wijst de minuten aan.'),
    st('Hoeveel minuten is dat? (elk getal is 5 minuten)', m, m === 0 ? 'Staat de grote wijzer op de 12, dan is het precies het hele uur. Hoeveel minuten over het uur is het dan?' : 'Tel in sprongen van 5 vanaf de 12: 5, 10, 15, …', { unit: 'minuten' }),
    st('Welk uur is de kleine wijzer al voorbij (of staat hij op)?', h, 'De kleine wijzer wijst de uren aan.')],
  guideFinal: 'Schrijf de tijd zo: uur:minuten' });
}
// De tijd in woorden: hoe zeg je wat de klok aanwijst?
function klokWoorden(lv) {
  const h = rnd(1, 12), m = lv === 0 ? pick([15, 30, 45]) : pick([5, 10, 20, 25, 35, 40, 50, 55, 15, 45, 30]);
  const ok = tijdInWoorden(h, m);
  return tpl('klokWoorden.a', { ...choice('Hoe zeg je deze tijd?', [ok, ...tijdAfleiders(h, m, tijdInWoorden)], 0, [
    `De grote wijzer staat ${m === 0 ? 'op de 12' : `bij de ${m / 5}`}: ${m} minuten. De kleine wijzer: na ${uurW(h)} uur.`,
    m >= 20 ? `Na kwart over zeg je het al vanaf het volgende uur: ${m === 30 ? `half ${uurW(h + 1)}` : `rond half ${uurW(h + 1)}`}.` : 'Tot kwart over zeg je het uur dat net geweest is.',
    `Dus: ${ok}.`], { visual: klokPlaatje(h * 60 + m) }),
  guide: [st('Hoeveel minuten over het hele uur is het?', m, `De grote wijzer bij de ${m / 5 || 12}: elk getal is 5 minuten.`, { unit: 'minuten' }),
    stC(`Is het vóór of na half ${uurW(h + 1)}?`, ['vóór half', 'precies half', 'na half'], m < 30 ? 0 : m === 30 ? 1 : 2, 'Een heel uur is 60 minuten. Half: de helft daarvan. Kwart over: een kwart. Kwart voor: drie kwart.')],
  guideFinal: 'Kies hoe je het zegt' });
}
// Digitale wekker (24 uur): hoe zeg je dat? (met 's middags/'s avonds)
function digiWoorden() {
  const h = rnd(13, 22), m = pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  const dagdeel = h < 18 ? "'s middags" : "'s avonds", ander = h < 18 ? "'s avonds" : "'s ochtends";
  const ok = `${tijdInWoorden(h, m)} ${dagdeel}`;
  return tpl('digiWoorden.a', { ...choice(`Op de digitale wekker staat ${hhmm(h * 60 + m)}. Hoe zeg je deze tijd?`, [ok, `${tijdInWoorden(h, m)} ${ander}`, ...tijdAfleiders(h, m, tijdInWoorden).map((w) => `${w} ${dagdeel}`)].slice(0, 4), 0, [
    `${h} uur is na 12 uur 's middags: haal er 12 af. ${h} − 12 = ${h - 12}.`, `${h - 12}:${String(m).padStart(2, '0')} ${dagdeel} = ${ok}.`],
  { visual: { kind: 'digital', time: hhmm(h * 60 + m), look: 'alarm' } }),
  guide: [st(`Haal er 12 af: ${h} − 12 = ?`, h - 12, 'Na 12 uur ’s middags begint de wijzerklok weer bij 1. Daarom haal je er 12 af.')], guideFinal: `Hoe zeg je ${h - 12}:${String(m).padStart(2, '0')}?` });
}
// Oven: hoe laat is het eten klaar?
function ovenSom(lang) {
  // echte baktijden per gerecht
  const wat = pick([['een pizza', 'hij', [15, 20, 25]], ['een ovenschotel', 'die', [30, 35, 40, 45, 50]], ['een appeltaart', 'die', [50, 55, 60, 65, 70]], ['een lasagne', 'die', [40, 45, 50, 55, 60]]]);
  const tijden = wat[2], d = lang ? tijden.at(-1 - rnd(0, 1)) : pick(tijden);
  const s = rnd(15, 18) * 60 + rnd(0, 11) * 5, heel = Math.floor(s / 60) * 60 + 60;
  const over = s + d >= heel;
  return tpl('ovenSom.a', { ...time(`Je zet om ${hhmm(s)} ${wat[0]} in de oven (zie het klokje van de oven). ${cap(wat[1])} moet ${d} minuten bakken. Hoe laat is ${wat[1]} klaar?`, s + d,
    over ? [`Tel eerst door naar het hele uur: ${hhmm(s)} → ${hhmm(heel)} = ${heel - s} minuten.`, `Dan nog ${d} − ${heel - s} = ${s + d - heel} minuten: ${hhmm(s + d)}.`]
      : [`${hhmm(s)} + ${d} minuten = ${hhmm(s + d)} (het uur blijft hetzelfde).`],
    { visual: { kind: 'digital', time: hhmm(s), look: 'oven' } }),
  guide: over ? [st(`Hoeveel minuten van ${hhmm(s)} tot ${hhmm(heel)}?`, heel - s, 'Tel vanaf de begintijd door tot het volgende hele uur. Hoeveel minuten is dat?', { unit: 'minuten' }),
    st(`Hoeveel minuten moet ${wat[1]} daarna nog? ${d} − ${heel - s} = ?`, d - (heel - s), 'Wat er van de baktijd overblijft.', { unit: 'minuten' })] : [],
  guideFinal: over ? `${hhmm(heel)} + ${s + d - heel} minuten` : null });
}
// Bestaande tijdsommen krijgen het plaatje dat erbij hoort
function metKlok(q) {
  let m;
  if ((m = q.text.match(/^Het is (\d{1,2}:\d{2})\. Hoe laat is het over/))) q.visual = klokPlaatje(toMin(m[1]), 'wall');
  else if ((m = q.text.match(/begint om (\d{1,2}:\d{2}) en is afgelopen om (\d{1,2}:\d{2})/))) q.visual = { kind: 'clocks', items: [{ time: m[1], look: 'wall', label: 'begin' }, { time: m[2], look: 'wall', label: 'einde' }] };
  else if (/^Schrijf in 24-uursnotatie/.test(q.text)) q.visual = klokPlaatje(q.answer, 'wall', q.text.includes("avonds") ? "'s avonds" : "'s middags");
  else if ((m = q.text.match(/^De trein vertrekt om (\d{1,2}:\d{2})\./))) {
    const naar = pick(TREINEN), ander = pick(TREINEN.filter((x) => x !== naar)), dep = toMin(m[1]);
    q.text = q.text.replace('De trein vertrekt om', `De trein naar ${naar} vertrekt om`);
    q.visual = { kind: 'board', rows: [{ time: m[1], to: naar, track: String(rnd(1, 12)) }, { time: hhmm(dep + rnd(2, 9)), to: ander, track: String(rnd(1, 12)) }] };
  } else if ((m = q.text.match(/^In Amsterdam is het (\d{1,2}:\d{2})\./))) q.visual = { kind: 'digital', time: m[1], look: 'phone', label: 'Amsterdam' };
  return q;
}
const toMin = (t) => { const [a, b] = String(t).split(':').map(Number); return a * 60 + b; };

// Tijdsduur in uren en minuten (de methode): op de tijdlijn eerst hele uren springen, dan naar het hele uur, dan de rest.
// 06:52 → 19:52 (13 uur) → 20:00 (8 min) → 20:28 (28 min): 13 uur en 36 minuten. Antwoord als uu:mm.
function tijdsduurLang() {
  const [wat, b0, b1, e0, e1] = pick([
    ['Op een dag in september komt de zon op om {b} en gaat onder om {e}. Hoe lang is het licht?', 5, 7, 18, 20],
    ['De schoolreis begint om {b} en de bus is om {e} terug. Hoe lang duurt de schoolreis?', 7, 8, 15, 17],
    ['Een winkel gaat open om {b} en sluit om {e}. Hoe lang is de winkel open?', 7, 9, 17, 21],
    ['Een vlucht vertrekt om {b} en landt om {e}. Hoe lang duurt de vlucht?', 6, 9, 12, 16],
  ]);
  const s = rnd(b0, b1) * 60 + rnd(31, 58), e = rnd(e0, e1) * 60 + rnd(3, 29);
  const H = Math.floor((e - s) / 60), tus = s + H * 60, heel = Math.ceil(tus / 60) * 60, m = e - s - H * 60;
  const tekst = wat.replace('{b}', hhmm(s)).replace('{e}', hhmm(e));
  return tpl('tijdBasis.2c', { ...time(`${tekst} Schrijf je antwoord als uren:minuten (bijv. 2:05 is 2 uur en 5 minuten).`, H * 60 + m, [
    `Spring eerst hele uren: van ${hhmm(s)} tot ${hhmm(tus)} is ${H} uur.`, `Dan naar het hele uur: van ${hhmm(tus)} tot ${hhmm(heel)} is ${heel - tus} minuten.`,
    `Dan de rest: van ${hhmm(heel)} tot ${hhmm(e)} is ${e - heel} minuten.`, `Samen: ${H} uur en ${heel - tus} + ${e - heel} = ${m} minuten.`], { display: `${H}:${String(m).padStart(2, '0')} (${H} uur en ${m} minuten)`, visual: { kind: 'clocks', items: [{ time: hhmm(s), look: 'wall', label: 'begin' }, { time: hhmm(e), look: 'wall', label: 'einde' }] } }),
  guide: [st(`Spring eerst hele uren, tot vlak voor het einde: van ${hhmm(s)} tot ${hhmm(tus)} is hoeveel uur?`, H, 'Alleen het uur verandert; de minuten blijven hetzelfde.', { unit: 'uur' }),
    st(`Van ${hhmm(tus)} tot het hele uur ${hhmm(heel)} = ? minuten`, heel - tus, 'Een uur is 60 minuten.', { unit: 'minuten' }),
    st(`Van ${hhmm(heel)} tot ${hhmm(e)} = ? minuten`, e - heel, 'Kijk naar de minuten van de eindtijd.', { unit: 'minuten' })],
  guideFinal: `Samen: ${H} uur en ${heel - tus} + ${e - heel} minuten` });
}
// Begintijd terugrekenen (de methode): eerst de hele uren terug, dan de minuten terug via het hele uur.
function begintijd() {
  const H = rnd(1, 2), m = rnd(5, 11) * 5, e = rnd(17, 22) * 60 + rnd(1, Math.floor(m / 5) - 1) * 5, s = e - H * 60 - m;
  const naHeel = e - H * 60, heel = Math.floor(naHeel / 60) * 60;
  const wat = pick([['De film', 'begon de film'], ['De voetbalwedstrijd', 'begon de wedstrijd'], ['Het concert', 'begon het concert'], ['De musical', 'begon de musical']]);
  return tpl('tijdBasis.2d', { ...time(`${wat[0]} is om ${hhmm(e)} afgelopen en duurde ${H} uur en ${m} minuten. Hoe laat ${wat[1]}?`, s, [
    `Terugrekenen. Eerst de hele uren terug: ${hhmm(e)} − ${H} uur = ${hhmm(naHeel)}.`, `Dan ${m} minuten terug: eerst ${naHeel - heel} minuten naar ${hhmm(heel)}, dan nog ${m - (naHeel - heel)} minuten terug: ${hhmm(s)}.`],
  { visual: { kind: 'digital', time: hhmm(e), look: 'phone', label: 'einde' } }),
  guide: [{ ask: `Eerst de hele uren terug: ${hhmm(e)} − ${H} uur = ?`, type: 'time', answer: naHeel % 1440, display: hhmm(naHeel), tip: 'Alleen het uur verandert.' },
    st(`Nu ${m} minuten terug. Eerst terug naar het hele uur ${hhmm(heel)}: hoeveel minuten moet je daarna nog terug?`, m - (naHeel - heel), `Van ${hhmm(naHeel)} naar ${hhmm(heel)} is al een stukje van de ${m} minuten.`, { unit: 'minuten' })],
  guideFinal: `${hhmm(heel)} min ${m - (naHeel - heel)} minuten` });
}

const tijdBasis = {
  0() {
    const t = pick(['later', 'uur', 'halfuur']);
    if (t === 'later') {
      const s = rnd(8 * 4, 17 * 4) * 15, d = pick([15, 30, 45]);
      return tpl('tijdBasis.0a', { ...time(`Het is ${hhmm(s)}. Hoe laat is het over ${d} minuten?`, s + d, [`${d} minuten = ${d === 15 ? 'een kwartier' : d === 30 ? 'een half uur' : 'drie kwartier'}.`, `${hhmm(s)} + ${d} min = ${hhmm(s + d)}`]),
        guide: d === 45 ? [{ ask: 'Eerst een half uur later. Hoe laat is het dan?', type: 'time', answer: (s + 30) % 1440, display: hhmm(s + 30), tip: '30 minuten erbij.' }] : [],
        guideFinal: d === 45 ? `Nog 15 minuten erbij` : null });
    }
    if (t === 'uur') {
      const u = rnd(2, 4);
      return tpl('tijdBasis.0b', { ...num(`Hoeveel minuten zitten er in ${u} uur?`, u * 60, [`1 uur = 60 minuten.`, `${u} × 60 = ${u * 60}`], { unit: 'minuten' }), guide: [st('Hoeveel minuten zitten er in 1 uur?', 60, 'Kijk naar de klok: één rondje van de grote wijzer.', { unit: 'minuten' })], guideFinal: `${u} × 60` });
    }
    return tpl('tijdBasis.0c', { ...num(`Hoeveel minuten is een half uur plus een kwartier?`, 45, [`Een half uur = 30 minuten.`, `Een kwartier = 15 minuten.`, `30 + 15 = 45`], { unit: 'minuten' }),
      guide: [st('Hoeveel minuten is een half uur?', 30, 'De helft van 60.', { unit: 'minuten' }), st('Hoeveel minuten is een kwartier?', 15, 'Een kwart van 60.', { unit: 'minuten' })], guideFinal: '30 + 15' });
  },
  1() {
    const t = pick(['duur', 'uurmin', '24']);
    if (t === 'duur') {
      let s = rnd(8 * 12, 14 * 12) * 5;
      if (s % 60 === 0) s += 5 * rnd(1, 11); // niet precies op het hele uur: dan is 'tot het hele uur' een lege stap
      const d = rnd(7, 22) * 5, heel = Math.floor(s / 60) * 60 + 60;
      const split = heel <= s + d;
      if (heel === s + d) {
        return tpl('tijdBasis.1a', { ...num(`De film begint om ${hhmm(s)} en is afgelopen om ${hhmm(s + d)}. Hoeveel minuten duurt de film?`, d,
          [`Tel door naar het hele uur: van ${hhmm(s)} naar ${hhmm(heel)}.`, `Een heel uur is 60 minuten. ${s % 60} minuten waren al voorbij, dus nog 60 − ${s % 60} = ${d} minuten.`], { unit: 'minuten' }),
        guide: [st(`Hoeveel minuten zitten er in een heel uur?`, 60, 'Eén rondje van de grote wijzer.', { unit: 'minuten' })], guideFinal: `Er waren al ${s % 60} minuten voorbij: 60 − ${s % 60}` });
      }
      if (!split) {
        const m1 = s % 60, m2 = (s + d) % 60;
        return tpl('tijdBasis.1b', { ...num(`De film begint om ${hhmm(s)} en is afgelopen om ${hhmm(s + d)}. Hoeveel minuten duurt de film?`, d,
          [`Het uur blijft hetzelfde, dus kijk alleen naar de minuten.`, `Van ${m1} naar ${m2} minuten: ${m2} − ${m1} = ${d} minuten.`], { unit: 'minuten' }),
        guide: [st(`Het uur blijft hetzelfde. Kijk alleen naar de minuten: ${m2} − ${m1} = ?`, d, 'Het is hetzelfde uur, dus je kijkt alleen naar de minuten: hoeveel minuten van de eerste tijd tot de tweede?', { unit: 'minuten' })], guideFinal: 'Zoveel minuten duurt de film' });
      }
      return tpl('tijdBasis.1c', { ...num(`De film begint om ${hhmm(s)} en is afgelopen om ${hhmm(s + d)}. Hoeveel minuten duurt de film?`, d,
        [`Tel eerst door naar een heel uur: ${hhmm(s)} → ${hhmm(heel)} = ${heel - s} min.`, `Dan verder tot ${hhmm(s + d)}: ${s + d - heel} min.`, `Samen: ${heel - s} + ${s + d - heel} = ${d} minuten.`], { unit: 'minuten' }),
      guide: [st(`Van ${hhmm(s)} tot ${hhmm(heel)} = ? minuten`, heel - s, 'Tel door tot het hele uur. Een heel uur is 60 minuten.', { unit: 'minuten' }), st(`Van ${hhmm(heel)} tot ${hhmm(s + d)} = ? minuten`, s + d - heel, 'Hoeveel minuten na het hele uur is het einde? Kijk naar de minuten.', { unit: 'minuten' })],
      guideFinal: `Tel samen: ${heel - s} + ${s + d - heel}` });
    }
    if (t === 'uurmin') {
      const u = pick([1.5, 2.5, 0.75, 1.25, 3.5, 0.25]), h = Math.floor(u);
      const kw = (u - h) * 4, rest = ['', 'een kwartier', 'een half uur', 'drie kwartier'][kw];
      return tpl('tijdBasis.1d', { ...num(`${fmt(u)} uur = ... minuten`, u * 60, [
        `1 uur = 60 minuten. Een kwartier = 15 minuten.`, `${fmt(u - h)} uur is ${rest}: ${kw} × 15 = ${kw * 15} minuten.`,
        ...(h ? [`${h} uur = ${h * 60} minuten. Samen: ${h * 60} + ${kw * 15} = ${u * 60} minuten.`] : [])], { unit: 'minuten' }),
        guide: [st('Hoeveel minuten is een kwartier?', 15, 'Een uur is 60 minuten. Een kwartier is een kwart daarvan: 60 in 4 gelijke stukken.', { unit: 'minuten' }), ...(h ? [st(`Hoeveel minuten is ${h} uur?`, h * 60, h === 1 ? 'Elk uur gaat de grote wijzer één keer helemaal rond. Hoeveel minuten telt hij dan?' : `Eén uur is 60 minuten. ${h} uur is ${h} keer zoveel.`, { unit: 'minuten' })] : [])],
        guideFinal: `${fmt(u - h)} uur is ${rest} (${kw} × 15)${h ? `, plus de ${h * 60} minuten van de hele uren` : ''}` });
    }
    const [txt, m] = pick([['kwart voor drie \'s middags', 14 * 60 + 45], ['half acht \'s avonds', 19 * 60 + 30], ['tien over half vijf \'s middags', 16 * 60 + 40],
      ['vijf voor half tien \'s avonds', 21 * 60 + 25], ['kwart over elf \'s avonds', 23 * 60 + 15], ['twintig over zes \'s avonds', 18 * 60 + 20]]);
    return tpl('tijdBasis.1e', { ...time(`Schrijf in 24-uursnotatie: ${txt}`, m, [`Na 12 uur 's middags tel je er 12 bij op.`, `Dus: ${hhmm(m)}`]),
      guide: [st(`Hoe laat is het op een klok met wijzers? Welk uur (1-12)?`, Math.floor(m / 60) - 12, 'Het uur dat de kleine wijzer net voorbij is.'), st('Hoeveel minuten over het hele uur?', m % 60, 'Een heel uur is 60 minuten. Half: de helft daarvan. Kwart over: een kwart. Kwart voor: drie kwart.', { unit: 'min' })],
      guideFinal: `Tel 12 bij het uur op ('s middags/avonds)` });
  },
  2() {
    const r = Math.random();
    if (r < 0.2) return tijdsduurLang();
    if (r < 0.35) return begintijd();
    if (r < 0.7) {
      const s = rnd(7 * 12, 16 * 12) * 5, d = rnd(16, 40) * 5;
      return tpl('tijdBasis.2a', { ...time(`De trein vertrekt om ${hhmm(s)}. De reis duurt ${Math.floor(d / 60)} uur en ${d % 60} minuten. Hoe laat komt de trein aan?`, s + d,
        [`Tel eerst de hele uren erbij: ${hhmm(s)} + ${Math.floor(d / 60)} uur = ${hhmm(s + Math.floor(d / 60) * 60)}.`, ...((s % 60) + (d % 60) >= 60 ? [`Dan de minuten: ${s % 60} + ${d % 60} = ${(s % 60) + (d % 60)} minuten. Dat is ${(s % 60) + (d % 60) === 60 ? 'precies 1 uur' : `1 uur en ${(s % 60) + (d % 60) - 60} minuten`}.`, `Dus ${hhmm(s + d)}.`] : [`Dan de minuten: + ${d % 60} min = ${hhmm(s + d)}.`])]),
      guide: [{ ask: `Eerst de hele uren erbij: ${hhmm(s)} + ${Math.floor(d / 60)} uur = ?`, type: 'time', answer: (s + Math.floor(d / 60) * 60) % 1440, display: hhmm(s + Math.floor(d / 60) * 60), tip: 'Alleen het uur verandert.' }],
      guideFinal: (s % 60) + (d % 60) >= 60 ? `Nu de minuten: ${s % 60} + ${d % 60} minuten. 60 of meer? Dan komt er een uur bij` : `Nu de minuten: + ${d % 60} min` });
    }
    const v = pick([15, 20, 60, 80, 90, 100, 120]), u = pick([0.5, 1.5, 2, 3, 2.5]);
    return tpl('tijdBasis.2b', { ...num(`Een ${v <= 20 ? 'fietser' : 'auto'} rijdt ${u === 0.5 ? 'een half uur' : fmt(u) + ' uur'} met een snelheid van ${v} km per uur. Hoeveel kilometer legt die af?`, v * u,
      [`${v} km per uur betekent: in 1 uur ${v} km.`, `In ${fmt(u)} uur: ${fmt(u)} × ${v} = ${fmt(v * u)} km.`], { unit: 'km' }),
    guide: [st(`Hoeveel km in 1 uur?`, v, 'Kijk in de som: "per uur" zegt hoeveel km in 1 uur.', { unit: 'km' }), ...(u % 1 ? [st('Hoeveel km in een half uur?', v / 2, 'De helft.', { unit: 'km' })] : [])],
    guideFinal: `In ${fmt(u)} uur` });
  },
  3() {
    const t = pick(['gemsnel', 'gemsnel', 'minuten', 'zone', 'ms']);
    if (t === 'gemsnel') {
      // Gemiddelde snelheid met de verhoudingstabel (de methode): 75 km in 90 min → 25 km per 30 min → 50 km per 60 min.
      const min = pick([20, 30, 40, 45, 90, 80, 15]), g = gcd(min, 60), c = rnd(Math.ceil((15 * g) / 60), Math.floor((120 * g) / 60)), v = (c * 60) / g, afst = (c * min) / g;
      const tijdTxt = min === 90 ? 'anderhalf uur (90 minuten)' : min === 30 ? 'een half uur (30 minuten)' : `${min} minuten`;
      return tpl('tijdBasis.3a', { ...num(`Een ${v <= 25 ? 'fietser' : 'auto'} rijdt ${afst} km in ${tijdTxt}. Wat is de gemiddelde snelheid in km per uur?`, v,
        [`Verhoudingstabel: ${min} minuten → ${afst} km.`, ...(g !== min ? [`${min} minuten is ${min / g} × ${g} minuten. In ${g} minuten: ${afst} : ${min / g} = ${c} km.`] : []), `1 uur = 60 minuten = ${60 / g} × ${g} minuten: ${60 / g} × ${c} = ${v} km. Dus ${v} km per uur.`],
      { unit: 'km/u', visual: vtabel(g !== min ? [['minuten', min, g, 60], ['km', afst, '', '?']] : [['minuten', min, 60], ['km', afst, '?']]) }),
      guide: g !== min ? [st(`Hoeveel km in ${g} minuten? (${min} minuten is ${min / g} × ${g} minuten)`, c, `Wat je met de minuten doet, doe je met de km ook: deel door ${min / g}.`, { unit: 'km' })] : [st(`Hoe vaak past ${min} minuten in 1 uur (60 minuten)?`, 60 / min, `${min} × ? = 60`)],
      guideFinal: g !== min ? `1 uur is ${60 / g} × ${g} minuten: ${60 / g} × ${c}` : `In 1 uur rijdt hij ${60 / min} keer zo ver: ${60 / min} × ${afst}` });
    }
    if (t === 'ms') {
      // Meter per seconde (S in de methode): eerst per minuut, dan per seconde (1 minuut = 60 seconden).
      const v = rnd(3, 8), min = pick([2, 4, 5, 10]), m = v * 60 * min, wie = pick(['Een hardloper', 'Een schaatser', 'Een fietser', 'Een skeeleraar']);
      return tpl('tijdBasis.3e', { ...num(`${wie} legt ${fmt(m)} m af in ${min} minuten. Hoeveel meter per seconde is dat?`, v,
        [`Per minuut: ${fmt(m)} : ${min} = ${v * 60} m.`, `1 minuut = 60 seconden: ${v * 60} : 60 = ${v} m per seconde.`], { unit: 'm/s', visual: vtabel([['tijd', `${min} min`, '1 min', '1 sec'], ['meter', fmt(m), '', '?']]) }),
      guide: [st(`Hoeveel meter in 1 minuut? ${fmt(m)} : ${min} = ?`, v * 60, 'Deel de meters door het aantal minuten.', { unit: 'm' })], guideFinal: `1 minuut = 60 seconden: ${v * 60} : 60` });
    }
    if (t === 'minuten') {
      const v = pick([60, 90, 120, 48, 30]), min = pick([10, 20, 30, 40, 50]);
      if (!Number.isInteger((v * min) / 60) || !Number.isInteger((v * 10) / 60)) return tpl('tijdBasis.3b', tijd[3]());
      return tpl('tijdBasis.3c', { ...num(`Een trein rijdt ${v} km per uur. Hoeveel km rijdt hij in ${min} minuten?`, (v * min) / 60,
        [`${v} km per uur = ${v} km in 60 minuten.`, `In 10 minuten: ${v} : 6 = ${fmt(v / 6)} km.`, `In ${min} minuten: ${fmt(min / 10)} × ${fmt(v / 6)} = ${fmt((v * min) / 60)} km.`], { unit: 'km' }),
      guide: [st(`Hoeveel km in 10 minuten? (1 uur is 6 × 10 minuten) ${v} : 6 = ?`, v / 6, '1 uur = 6 stukjes van 10 minuten.', { unit: 'km' })], guideFinal: `In ${min} minuten = ${fmt(min / 10)} × ${fmt(v / 6)}` });
    }
    const [stad, diff] = pick([['New York', -6], ['Londen', -1], ['Tokio', 7], ['Bangkok', 5], ['Los Angeles', -9]]);
    const s = rnd(9 * 4, 20 * 4) * 15;
    return tpl('tijdBasis.3d', { ...time(`In Amsterdam is het ${hhmm(s)}. In ${stad} is het ${Math.abs(diff)} uur ${diff < 0 ? 'vroeger' : 'later'}. Hoe laat is het in ${stad}?`, s + diff * 60,
      [`${diff < 0 ? 'Vroeger' : 'Later'} betekent ${diff < 0 ? 'eraf halen' : 'erbij tellen'}.`, ...(s + diff * 60 >= 1440 ? [`Van ${hhmm(s)} tot 24:00 (middernacht) is ${Math.floor((1440 - s) / 60)} uur${(1440 - s) % 60 ? ` en ${(1440 - s) % 60} minuten` : ''}. De rest tel je verder vanaf 0:00: ${hhmm(s + diff * 60)} (de volgende dag).`] : s + diff * 60 < 0 ? [`Terug tot 0:00 (middernacht) en dan verder terug vanaf 24:00: ${hhmm(s + diff * 60)} (de dag ervoor).`] : [`${hhmm(s)} ${diff < 0 ? '−' : '+'} ${Math.abs(diff)} uur = ${hhmm(s + diff * 60)}.`])]),
    guide: [stC(`${diff < 0 ? 'Vroeger' : 'Later'} betekent:`, ['uren erbij tellen', 'uren eraf halen'], diff < 0 ? 1 : 0, diff < 0 ? 'Vroeger: daar staat de klok nog niet zo ver; je gaat terug in de tijd.' : 'Later: daar staat de klok al verder; je gaat vooruit in de tijd.')],
    guideFinal: `${hhmm(s)} ${diff < 0 ? '−' : '+'} ${Math.abs(diff)} uur (de minuten blijven hetzelfde)` });
  },
};

// =====================================================================
// VERBANDEN
// =====================================================================
const DAGEN = ['ma', 'di', 'wo', 'do', 'vr'];
const DAGNAAM = { ma: 'maandag', di: 'dinsdag', wo: 'woensdag', do: 'donderdag', vr: 'vrijdag' };
function rij(level) {
  if (level === 0) {
    const s = rnd(1, 9), k = pick([2, 3, 5, 10]);
    const r = [0, 1, 2, 3].map((i) => s + i * k);
    return tpl('rij.a', { ...num(`Welk getal komt hierna? ${r.join(', ')}, …`, s + 4 * k, [`Kijk hoeveel er steeds bij komt: ${r[1]} − ${r[0]} = ${k}.`, `${r[3]} + ${k} = ${s + 4 * k}`]),
      guide: [st(`Hoeveel komt er steeds bij? ${r[1]} − ${r[0]} = ?`, k, 'Kijk naar het verschil tussen twee getallen.')], guideFinal: `${r[3]} + ${k}` });
  }
  if (level === 1) {
    const s = pick([1, 2, 3, 5]), m = pick([2, 3]);
    const r = [0, 1, 2, 3].map((i) => s * m ** i);
    return tpl('rij.b', { ...num(`Welk getal komt hierna? ${r.join(', ')}, …`, s * m ** 4, [`Het verschil wordt steeds groter, dus kijk naar keer: ${r[1]} : ${r[0]} = ${m}.`, `Steeds × ${m}: ${r[3]} × ${m} = ${s * m ** 4}`]),
      guide: [stC('Wat gebeurt er steeds?', [`steeds × ${m}`, `steeds + ${r[1] - r[0]}`, `steeds − ${m}`], 0, `Kijk: ${r[0]} → ${r[1]} → ${r[2]}. Is het verschil steeds hetzelfde?`)], guideFinal: `${r[3]} × ${m}` });
  }
  const s = rnd(1, 10), d0 = rnd(1, 3);
  const r = [s]; for (let i = 0; i < 4; i++) r.push(r[i] + d0 + i);
  return tpl('rij.c', { ...num(`Welk getal komt hierna? ${r.join(', ')}, …`, r[4] + d0 + 4, [`Bekijk de verschillen: ${r.slice(1).map((x, i) => x - r[i]).join(', ')}.`, `Het verschil wordt steeds 1 groter, dus nu + ${d0 + 4}.`, `${r[4]} + ${d0 + 4} = ${r[4] + d0 + 4}`]),
    guide: [st(`Wat is het verschil tussen de laatste twee? ${r[4]} − ${r[3]} = ?`, r[4] - r[3], 'Trek af.'), st('Met hoeveel groeit het verschil steeds?', 1, `Verschillen: ${r.slice(1).map((x, i) => x - r[i]).join(', ')}`)],
    guideFinal: `Het volgende verschil is ${d0 + 4}: ${r[4]} + ${d0 + 4}` });
}
function combinaties(level) {
  const a = rnd(2, 4), b = rnd(2, 5);
  if (level < 3) {
    const [x, y] = pick([['shirts', 'broeken'], ['soorten ijs', 'soorten saus'], ['broodjes', 'drankjes']]);
    return tpl('combinaties.a', { ...num(`Je hebt ${a} ${x} en ${b} ${y}. Hoeveel verschillende combinaties kun je maken?`, a * b, [`Bij elk van de ${a} ${x} passen ${b} ${y}.`, `${a} × ${b} = ${a * b}`]),
      guide: [st(`Met 1 van de ${x}: hoeveel combinaties?`, b, `Neem één van de ${x}. Met welke ${y} kun je die combineren? Tel ze.`)], guideFinal: `En met alle ${a} ${x}: ${a} × ${b}` });
  }
  const c = rnd(2, 3);
  return tpl('combinaties.b', { ...num(`In de snackbar kies je een broodje (${a} soorten), een drankje (${b} soorten) en een toetje (${c} soorten). Hoeveel verschillende menu's zijn er?`, a * b * c, [`Broodje en drankje: ${a} × ${b} = ${a * b}.`, `Bij elk daarvan ${c} toetjes: ${a * b} × ${c} = ${a * b * c}.`]),
    guide: [st(`Broodje + drankje: ${a} × ${b} = ?`, a * b, 'Elk broodje met elk drankje.')], guideFinal: `Met de toetjes erbij: ${a * b} × ${c}` });
}
const grafieken = {
  0() {
    if (Math.random() < 0.35) return tpl('grafieken.0a', rij(0));
    const fruit = shuffle(['appels', 'peren', 'bananen', 'kiwi\'s']).slice(0, 4), vals = fruit.map(() => rnd(1, 9)), i = rnd(0, 3);
    const visual = { kind: 'bar', title: 'Fruit in de klas', labels: fruit, values: vals, step: 1 };
    if (Math.random() < 0.5) return tpl('grafieken.0b', { ...num(`Kijk naar de grafiek. Hoeveel ${fruit[i]} zijn er?`, vals[i], [`Zoek de staaf van de ${fruit[i]}.`, `Kijk tot waar de staaf komt: ${vals[i]}.`], { visual }), guide: [], guideFinal: null });
    const mx = Math.max(...vals);
    if (vals.filter((v) => v === mx).length > 1) return tpl('grafieken.0c', grafieken[0]());
    return tpl('grafieken.0d', { ...choice('Kijk naar de grafiek. Van welk fruit is er het meest?', fruit, vals.indexOf(mx), ['De hoogste staaf hoort bij het meeste fruit.', `Dat zijn de ${fruit[vals.indexOf(mx)]} (${mx}).`], { visual }), guide: [], guideFinal: null });
  },
  1() {
    if (Math.random() < 0.3) return tpl('grafieken.1a', rij(1));
    let vals = DAGEN.map(() => rnd(2, 14) * 5);
    // één drukste en één rustigste dag (meetlat #6: twee dagen met 10 → "de rustigste dag" was dubbelzinnig)
    while (vals.filter((v) => v === Math.max(...vals)).length > 1 || vals.filter((v) => v === Math.min(...vals)).length > 1) vals = DAGEN.map(() => rnd(2, 14) * 5);
    const i = rnd(0, 4);
    const visual = { kind: 'bar', title: 'Uitgeleende boeken in de bieb', labels: DAGEN, values: vals, step: 10 };
    if (Math.random() < 0.5) return tpl('grafieken.1b', { ...num(`Kijk naar de grafiek. Hoeveel boeken werden er op ${DAGNAAM[DAGEN[i]]} uitgeleend?`, vals[i],
      [`Zoek de staaf van ${DAGNAAM[DAGEN[i]]}.`, `Kijk waar de bovenkant uitkomt op de as: ${vals[i]}.${vals[i] % 10 ? ' Hij valt precies tussen twee streepjes: dan is het het getal ertussenin.' : ''}`], { visual }),
    guide: [st('Met hoeveel gaat de as per streepje omhoog?', 10, 'Kijk naar de getallen links: 0, 10, 20...')], guideFinal: `Lees de staaf van ${DAGNAAM[DAGEN[i]]} af` });
    const mx = Math.max(...vals), mn = Math.min(...vals);
    return tpl('grafieken.1c', { ...num(`Kijk naar de grafiek. Hoeveel boeken zijn er op de drukste dag meer uitgeleend dan op de rustigste dag?`, mx - mn,
      [`Drukste dag: ${DAGNAAM[DAGEN[vals.indexOf(mx)]]} met ${mx}.`, `Rustigste dag: ${DAGNAAM[DAGEN[vals.indexOf(mn)]]} met ${mn}.`, `${mx} − ${mn} = ${mx - mn}.`], { visual }),
    guide: [st('Hoeveel boeken waren er op de drukste dag (hoogste staaf)?', mx, 'Zoek de hoogste staaf.'), st('Hoeveel boeken waren er op de rustigste dag (laagste staaf)?', mn, 'Zoek de laagste staaf.')], guideFinal: `${mx} − ${mn}` });
  },
  2() {
    if (Math.random() < 0.3) return tpl('grafieken.2a', combinaties(2));
    if (Math.random() < 0.5) {
      const n = pick([4, 5]), mean = rnd(5, 9);
      const vals = Array.from({ length: n }, () => mean + rnd(-3, 3));
      vals[n - 1] = mean * n - vals.slice(0, n - 1).reduce((a, b) => a + b, 0);
      if (vals.some((x) => x < 1 || x > 10)) return tpl('grafieken.2b', grafieken[2]());
      const name = pick(NAMES);
      return tpl('grafieken.2c', { ...num(`${name} haalde deze cijfers voor rekenen: ${vals.join(', ')}. Wat is het gemiddelde cijfer?`, mean,
        [`Tel alle getallen op: ${vals.join(' + ')} = ${mean * n}.`, `Deel door het aantal getallen (${n}): ${mean * n} : ${n} = ${mean}.`],
        { visual: { kind: 'table', headers: ['toets', ...vals.map((_, i) => String(i + 1))], rows: [['cijfer', ...vals]] } }),
      guide: [st(`Tel alle getallen op: ${vals.join(' + ')} = ?`, mean * n, 'Tel ze één voor één bij elkaar op. Zoek eerst twee getallen die samen een rond getal maken.'), st('Hoeveel getallen zijn het?', n, 'Tel ze.')], guideFinal: `Deel het totaal door het aantal getallen: ${mean * n} : ${n}` });
    }
    const sports = shuffle(['voetbal', 'hockey', 'zwemmen', 'judo', 'dansen']).slice(0, 4), vals = sports.map(() => rnd(3, 12));
    const total = vals.reduce((a, b) => a + b, 0);
    return tpl('grafieken.2d', { ...num(`In de tabel zie je welke sport de kinderen van groep 8 doen. Hoeveel kinderen zitten er in groep 8? (Iedereen doet één sport.)`, total,
      [`Tel alle aantallen op: ${vals.join(' + ')} = ${total}.`], { visual: { kind: 'table', headers: ['sport', 'aantal'], rows: sports.map((s, i) => [s, vals[i]]) } }),
    guide: [st(`Eerst de eerste twee: ${vals[0]} + ${vals[1]} = ?`, vals[0] + vals[1], 'Tel stap voor stap.')], guideFinal: `${vals[0] + vals[1]} + ${vals[2]} + ${vals[3]}` });
  },
  3() {
    const r = Math.random();
    if (r < 0.12) return gemiddeldeRekenmachine();
    if (r < 0.3) return tpl('grafieken.3a', rij(3));
    if (r < 0.35) return tpl('grafieken.3b', combinaties(3));
    if (Math.random() < 0.5) {
      const labels = ['8:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
      let v = rnd(2, 8); const vals = labels.map((_, i) => (v = i === 0 ? v : v + rnd(i < 4 ? 1 : -4, i < 4 ? 5 : 0)));
      const a = rnd(0, 2), b = rnd(3, 5);
      return tpl('grafieken.3c', { ...num(`Kijk naar de lijngrafiek van de temperatuur. Hoeveel graden is het verschil tussen ${labels[a]} en ${labels[b]}?`, Math.abs(vals[b] - vals[a]),
        [`Om ${labels[a]} was het ${vals[a]} °C.`, `Om ${labels[b]} was het ${vals[b]} °C.`, `Verschil: ${Math.abs(vals[b] - vals[a])} graden.`],
        { unit: '°C', visual: { kind: 'line', title: 'Temperatuur (°C)', labels, values: vals, step: 2 } }),
      guide: [st(`Hoe warm was het om ${labels[a]}?`, vals[a], 'Zoek het punt boven die tijd.', { unit: '°C' }), st(`Hoe warm was het om ${labels[b]}?`, vals[b], 'Zoek het punt boven die tijd.', { unit: '°C' })],
      guideFinal: 'Het verschil: groot getal min klein getal' });
    }
    const totaal = pick([200, 400, 500, 800]), parts = pick([[50, 25, 15, 10], [40, 30, 20, 10], [45, 25, 20, 10], [35, 30, 25, 10]]);
    const names = shuffle(['fiets', 'lopen', 'auto', 'bus']), i = rnd(0, 3);
    const hoe = { fiets: 'met de fiets', lopen: 'lopend', auto: 'met de auto', bus: 'met de bus' }[names[i]];
    const tien = parts[i] % 10 === 0;
    return tpl('grafieken.3d', { ...num(`Op een school met ${totaal} leerlingen is gevraagd hoe ze naar school komen. Hoeveel leerlingen komen ${hoe}?`, (parts[i] * totaal) / 100,
      [`In het cirkeldiagram zie je: ${names[i]} = ${parts[i]}%.`,
        ...(parts[i] === 25 ? [`25% is een kwart: ${totaal} : 4 = ${totaal / 4}.`]
          : parts[i] === 50 ? [`50% is de helft: ${totaal} : 2 = ${totaal / 2}.`]
            : [`10% van ${totaal} = ${totaal / 10}.`, ...(parts[i] === 10 ? [] : tien ? [`${parts[i]}% = ${parts[i] / 10} × 10% = ${parts[i] / 10} × ${totaal / 10} = ${(parts[i] * totaal) / 100}.`]
              : [`5% is de helft van 10%: ${totaal / 20}.`, `${parts[i]}% = ${Math.floor(parts[i] / 10)} × 10% + 5% = ${Math.floor(parts[i] / 10) * (totaal / 10)} + ${totaal / 20} = ${(parts[i] * totaal) / 100}.`])])],
      { visual: { kind: 'pie', labels: names, values: parts } }),
    guide: [st(`Hoeveel procent komt ${hoe}? (kijk in het cirkeldiagram)`, parts[i], 'Zoek de kleur van ' + names[i] + ' in het cirkeldiagram.', { unit: '%' }),
      ...(parts[i] === 25 || parts[i] === 50 ? [] : [st(`10% van ${totaal} = ?`, totaal / 10, 'Deel door 10.'), ...(tien ? [] : [st(`5% is de helft van 10%. 5% van ${totaal} = ?`, totaal / 20, 'De helft.')])])],
    guideFinal: parts[i] === 25 ? `25% is een kwart: ${totaal} : 4` : parts[i] === 50 ? `50% is de helft: ${totaal} : 2` : parts[i] === 10 ? 'Dat is 10%: zoveel leerlingen'
      : tien ? `${parts[i]}% is ${parts[i] / 10} keer 10%: ${parts[i] / 10} × ${totaal / 10}` : `${parts[i]}% = ${Math.floor(parts[i] / 10)} × 10% + 5%: ${Math.floor(parts[i] / 10)} × ${totaal / 10} + ${totaal / 20}` });
  },
};

// =====================================================================
// MEETKUNDE: hoeken, figuren, symmetrie, richting, ruimtelijke figuren
// =====================================================================
const RICHTING = ['noord', 'oost', 'zuid', 'west'];
const draai = (start, kwart) => RICHTING[(RICHTING.indexOf(start) + kwart + 40) % 4];
const meetkunde = {
  0() {
    const t = pick(['hoeken', 'richting', 'figuur', 'samen', 'samen', 'route']);
    if (t === 'samen') {
      const V = [['driehoek', 'driehoeken', 3], ['vierkant', 'vierkanten', 4], ['vijfhoek', 'vijfhoeken', 5], ['zeshoek', 'zeshoeken', 6], ['achthoek', 'achthoeken', 8]];
      const [x, y] = shuffle(V).slice(0, 2), a = rnd(1, 6), b = rnd(1, 6), n = pick(NAMES);
      const fa = a === 1 ? x[0] : x[1], fb = b === 1 ? y[0] : y[1];
      return tpl('meetkunde.0a', { ...num(`${n} tekent ${a === 1 ? 'een' : a} ${fa} en ${b === 1 ? 'een' : b} ${fb}. Hoeveel hoeken tekent ${n} samen?`, a * x[2] + b * y[2],
        [`Een ${x[0]} heeft ${x[2]} hoeken: ${a} × ${x[2]} = ${a * x[2]}.`, `Een ${y[0]} heeft ${y[2]} hoeken: ${b} × ${y[2]} = ${b * y[2]}.`, `Samen: ${a * x[2]} + ${b * y[2]} = ${a * x[2] + b * y[2]}.`]),
      guide: [st(`Hoeveel hoeken heeft een ${x[0]}?`, x[2], 'Tel de punten.'), st(`Hoeveel hoeken hebben ${a === 1 ? 'die' : 'de'} ${fa} samen? ${a} × ${x[2]} = ?`, a * x[2], 'Keer het aantal.')], guideFinal: `En nog ${b} × ${y[2]} erbij` });
    }
    if (t === 'route') {
      const start = pick(RICHTING), r1 = rnd(1, 3), l1 = rnd(1, 3), eind = draai(start, r1 - l1);
      const kw = (k) => (k === 1 ? 'een kwartslag' : `${k} kwartslagen`);
      return tpl('meetkunde.0b', { ...choice(`Je kijkt naar het ${start}en. Je draait ${kw(r1)} naar rechts en daarna ${kw(l1)} naar links. Welke kant kijk je nu op?`, RICHTING, RICHTING.indexOf(eind),
        ['Rechtsom: noord → oost → zuid → west.', `Begin bij ${start}. Eerst ${r1} stap${r1 > 1 ? 'pen' : ''} rechtsom: ${Array.from({ length: r1 }, (_, i) => draai(start, i + 1)).join(' → ')}.`, `Dan ${l1} stap${l1 > 1 ? 'pen' : ''} terug (linksom): ${Array.from({ length: l1 }, (_, i) => draai(start, r1 - i - 1)).join(' → ')}.`]),
      guide: [stC(`Je begint naar het ${start}en. Waar kijk je na ${kw(r1)} naar rechts?`, RICHTING, RICHTING.indexOf(draai(start, r1)), 'Nooit Oorlog Zonder Wapens: N – O – Z – W.')], guideFinal: `Nu ${l1} stap${l1 > 1 ? 'pen' : ''} terug` });
    }
    if (t === 'hoeken') {
      const [naam, n] = pick([['driehoek', 3], ['vierkant', 4], ['vijfhoek', 5], ['zeshoek', 6], ['achthoek', 8]]);
      return tpl('meetkunde.0c', { ...num(`Hoeveel hoeken heeft een ${naam}?`, n, [`Een ${naam} heeft ${n} zijden en dus ook ${n} hoeken.`]), guide: [], guideFinal: null });
    }
    if (t === 'richting') {
      const start = pick(RICHTING), rechts = Math.random() < 0.5, eind = draai(start, rechts ? 1 : -1);
      return tpl('meetkunde.0d', { ...choice(`Je kijkt naar het ${start}en. Je draait een kwartslag naar ${rechts ? 'rechts' : 'links'}. Welke kant kijk je nu op?`, RICHTING.map((r) => r), RICHTING.indexOf(eind),
        ['Denk aan het kompas: noord – oost – zuid – west is rechtsom.', `Een kwartslag naar ${rechts ? 'rechts' : 'links'} vanaf ${start}: ${eind}.`]),
      guide: [stC('Welke volgorde is rechtsom (met de klok mee)?', ['noord – oost – zuid – west', 'noord – west – zuid – oost'], 0, 'Nooit Oorlog Zonder Wapens: N – O – Z – W.')], guideFinal: `Eén stap ${rechts ? 'verder' : 'terug'} vanaf ${start}` });
    }
    const [vraag, goed] = pick([['Welke figuur heeft 4 even lange zijden en 4 rechte hoeken?', 'vierkant'], ['Welke figuur heeft 3 zijden?', 'driehoek'], ['Welke figuur is helemaal rond?', 'cirkel'], ['Welke figuur heeft 4 rechte hoeken, maar niet 4 even lange zijden?', 'rechthoek']]);
    const opts = ['vierkant', 'driehoek', 'cirkel', 'rechthoek'];
    const WAT = { vierkant: 'Een vierkant: 4 even lange zijden en 4 rechte hoeken.', rechthoek: 'Een rechthoek: 4 rechte hoeken, de lange en korte kanten zijn verschillend.', cirkel: 'Een cirkel is helemaal rond: geen hoeken, geen rechte kanten.', driehoek: 'Een driehoek: 3 zijden en 3 hoeken (drie = drie-hoek).' };
    return tpl('meetkunde.0e', { ...choice(vraag, opts, opts.indexOf(goed), [WAT[goed], ...opts.filter((o) => o !== goed).map((o) => WAT[o]), `Dus: ${goed}.`]), guide: [], guideFinal: null });
  },
  1() {
    const t = pick(['soorthoek', 'soorthoek', 'soorthoek', 'symmetrie', 'kubus', 'draai180']);
    if (t === 'soorthoek') {
      const [g, soort] = pick([[rnd(15, 80), 'scherpe hoek'], [90, 'rechte hoek'], [rnd(100, 170), 'stompe hoek'], [180, 'gestrekte hoek']]);
      const opts = ['scherpe hoek', 'rechte hoek', 'stompe hoek', 'gestrekte hoek'];
      return tpl('meetkunde.1a', { ...choice(`Een hoek van ${g}° is een…`, opts, opts.indexOf(soort), ['Kleiner dan 90° = scherp.', 'Precies 90° = recht (het hoekje van een blad papier).', 'Tussen 90° en 180° = stomp.', '180° = gestrekt (een rechte lijn).']),
        guide: [stC(`Is ${g}° kleiner dan, gelijk aan of groter dan 90°?`, ['kleiner', 'gelijk', 'groter'], g < 90 ? 0 : g === 90 ? 1 : 2, '90° is een rechte hoek, zoals de hoek van je schrift.')], guideFinal: 'Welke soort hoek is dat?' });
    }
    if (t === 'symmetrie') {
      const [vorm, n] = pick([['een vierkant', 4], ['een rechthoek (geen vierkant)', 2], ['een gelijkzijdige driehoek', 3], ['de letter H', 2], ['de letter A', 1], ['de letter F', 0], ['een regelmatige zeshoek', 6]]);
      return tpl('meetkunde.1b', { ...num(`Hoeveel symmetrieassen heeft ${vorm}?`, n, ['Een symmetrieas is een lijn waarlangs je de figuur kunt vouwen, zodat beide helften precies op elkaar passen.', `${vorm[0].toUpperCase() + vorm.slice(1)} heeft er ${n}.`]), guide: [], guideFinal: null });
    }
    if (t === 'kubus') {
      const [deel, n, tip] = pick([['vlakken', 6, 'Denk aan een dobbelsteen: op hoeveel platte vlakken staan ogen?'], ['ribben', 12, 'Ribben zijn de randen: 4 boven, 4 onder, 4 staand.'], ['hoekpunten', 8, '4 hoekpunten boven en 4 onder.']]);
      const vorm = pick(['kubus', 'balk']), k = Math.random() < 0.6 ? rnd(2, 9) : 1;
      if (k > 1) return tpl('meetkunde.1c', { ...num(`Je hebt ${k} ${vorm === 'kubus' ? 'kubussen' : 'balken'}. Hoeveel ${deel} hebben ze samen?`, k * n, [tip, `Eén ${vorm} heeft ${n} ${deel}.`, `${k} × ${n} = ${k * n}.`]),
        guide: [st(`Hoeveel ${deel} heeft één ${vorm}?`, n, tip)], guideFinal: `${k} × ${n}` });
      return tpl('meetkunde.1d', { ...num(`Hoeveel ${deel} heeft een ${vorm}?`, n, [tip, `Een ${vorm} heeft ${n} ${deel}.`]), guide: [], guideFinal: null });
    }
    const start = pick(RICHTING), eind = draai(start, 2);
    return tpl('meetkunde.1e', { ...choice(`Je kijkt naar het ${start}en en draait een halve slag (180°). Welke kant kijk je nu op?`, RICHTING, RICHTING.indexOf(eind), ['Een halve slag = 2 kwartslagen.', `Dan kijk je precies de andere kant op: ${eind}.`]),
      guide: [st('Hoeveel kwartslagen is een halve slag?', 2, 'Een kwartslag is 90°. Hoeveel keer 90° is 180°?')], guideFinal: `Twee stappen verder vanaf ${start}` });
  },
  2() {
    const t = pick(['driehoek', 'klok', 'vierhoek', 'kwartslagen']);
    if (t === 'driehoek') {
      const a = rnd(30, 80), b = rnd(30, 150 - a);
      return tpl('meetkunde.2a', { ...num(`In een driehoek is één hoek ${a}° en een andere hoek ${b}°. Hoe groot is de derde hoek?`, 180 - a - b, ['De drie hoeken van een driehoek zijn samen altijd 180°.', `${a} + ${b} = ${a + b}`, `180 − ${a + b} = ${180 - a - b}°`], { unit: '°' }),
        guide: [st('Hoeveel graden zijn de hoeken van een driehoek samen?', 180, 'Altijd hetzelfde, bij elke driehoek.', { unit: '°' }), st(`${a} + ${b} = ?`, a + b, 'Tel de twee hoeken op.', { unit: '°' })], guideFinal: `180 − ${a + b}` });
    }
    if (t === 'klok') {
      const m = pick([10, 15, 20, 30, 45]);
      return tpl('meetkunde.2b', { ...num(`Hoeveel graden draait de grote wijzer van de klok in ${m} minuten?`, m * 6, ['In 60 minuten draait de grote wijzer een heel rondje: 360°.', 'In 1 minuut: 360 : 60 = 6°.', `In ${m} minuten: ${m} × 6 = ${m * 6}°.`], { unit: '°' }),
        guide: [st('Hoeveel graden is een heel rondje?', 360, 'Een hele draai.', { unit: '°' }), st('Hoeveel graden per minuut? 360 : 60 = ?', 6, 'Deel door 60.', { unit: '°' })], guideFinal: `${m} × 6` });
    }
    if (t === 'vierhoek') {
      const a = rnd(60, 120), b = rnd(60, 120), c = rnd(60, 120), d = 360 - a - b - c;
      if (d < 30 || d > 170) return tpl('meetkunde.2c', meetkunde[2]());
      return tpl('meetkunde.2d', { ...num(`In een vierhoek zijn drie hoeken ${a}°, ${b}° en ${c}°. Hoe groot is de vierde hoek?`, d, ['De vier hoeken van een vierhoek zijn samen 360°.', `${a} + ${b} + ${c} = ${a + b + c}`, `360 − ${a + b + c} = ${d}°`], { unit: '°' }),
        guide: [st('Hoeveel graden zijn de hoeken van een vierhoek samen?', 360, 'Denk aan een rechthoek: 4 × 90°.', { unit: '°' }), st(`${a} + ${b} + ${c} = ?`, a + b + c, 'Tel de drie hoeken op.', { unit: '°' })], guideFinal: `360 − ${a + b + c}` });
    }
    const k = rnd(2, 7);
    return tpl('meetkunde.2e', { ...num(`Hoeveel graden is ${k} kwartslagen?`, k * 90, ['Een kwartslag is 90°.', `${k} × 90 = ${k * 90}°`], { unit: '°' }), guide: [st('Hoeveel graden is één kwartslag?', 90, 'Een kwart van een heel rondje (360°).', { unit: '°' })], guideFinal: `${k} × 90` });
  },
  3() {
    const t = pick(['cirkel', 'blokjes', 'rechthoekig', 'kompas']);
    if (t === 'cirkel') {
      const d = rnd(2, 30);
      return tpl('meetkunde.3a', { ...num(`Een rond ${pick(['tafeltje', 'kleed', 'bloembed', 'trampoline', 'zwembadje'])} heeft een diameter van ${d} dm. Hoe lang is de rand (omtrek) ongeveer? Reken met 3,14.`, round(3.14 * d, 2), ['Omtrek cirkel = 3,14 × diameter.', `3,14 × ${d} = ${fmt(3.14 * d)} dm.`], { unit: 'dm' }),
        guide: [stC('Hoe bereken je de omtrek van een cirkel?', ['3,14 × diameter', 'diameter × diameter', '3,14 + diameter'], 0, 'De rand is iets meer dan 3 keer zo lang als de diameter.')], guideFinal: `3,14 × ${d}` });
    }
    if (t === 'blokjes') {
      const l = rnd(2, 8), b = rnd(2, 6), h = rnd(2, 5);
      return tpl('meetkunde.3b', { ...num(`Een stapel blokjes is ${l} blokjes lang, ${b} blokjes breed en ${h} lagen hoog. Hoeveel blokjes zijn het?`, l * b * h, [`Eén laag: ${l} × ${b} = ${l * b} blokjes.`, `${h} lagen: ${l * b} × ${h} = ${l * b * h}.`]),
        guide: [st(`Hoeveel blokjes zitten er in één laag? ${l} × ${b} = ?`, l * b, 'Lengte × breedte.')], guideFinal: `En ${h} lagen: ${l * b} × ${h}` });
    }
    if (t === 'rechthoekig') {
      const a = rnd(20, 70);
      return tpl('meetkunde.3c', { ...num(`In een rechthoekige driehoek is één van de andere hoeken ${a}°. Hoe groot is de derde hoek?`, 90 - a, ['Een rechthoekige driehoek heeft een hoek van 90°.', 'Alle hoeken samen: 180°.', `180 − 90 − ${a} = ${90 - a}°`], { unit: '°' }),
        guide: [st('Hoeveel graden is de rechte hoek?', 90, 'Het hoekje van een blad papier.', { unit: '°' }), st('Hoeveel graden blijft er over voor de andere twee hoeken? 180 − 90 = ?', 90, 'Alle hoeken samen zijn 180°.', { unit: '°' })], guideFinal: `90 − ${a}` });
    }
    const start = pick(RICHTING), g = pick([90, 180, 270]), eind = draai(start, g / 90);
    return tpl('meetkunde.3d', { ...choice(`${pick(['Een vliegtuig vliegt', 'Een boot vaart', 'Een drone vliegt', 'Een zeilboot vaart'])} naar het ${start}en en draait ${g}° rechtsom (met de klok mee). Welke kant gaat het nu op?`, RICHTING, RICHTING.indexOf(eind),
      [`${g}° = ${g / 90} kwartslagen.`, `Rechtsom: noord → oost → zuid → west.`, `Vanaf ${start} ${g / 90} stappen: ${eind}.`]),
    guide: [st(`Hoeveel kwartslagen is ${g}°?`, g / 90, 'Een kwartslag = 90°.')], guideFinal: `Tel zoveel stappen rechtsom vanaf ${start} (N – O – Z – W)` });
  },
};

// Tijd: klokkijken en de tijd in woorden horen er vanaf groep 5 gewoon bij, met echte klokken
const tijd = {
  0() { const r = Math.random(); if (r < 0.3) return tpl('tijd.0a', klokLezen(0)); if (r < 0.5) return tpl('tijd.0b', klokWoorden(0)); return tpl('tijd.0c', metKlok(tijdBasis[0]())); },
  1() { const r = Math.random(); if (r < 0.15) return tpl('tijd.1a', klokLezen(1)); if (r < 0.3) return tpl('tijd.1b', klokWoorden(1)); if (r < 0.42) return tpl('tijd.1c', digiWoorden()); if (r < 0.55) return tpl('tijd.1d', ovenSom(false)); return tpl('tijd.1e', metKlok(tijdBasis[1]())); },
  2() { return tpl('tijd.2a', Math.random() < 0.25 ? ovenSom(true) : metKlok(tijdBasis[2]())); },
  3() { return tpl('tijd.3a', metKlok(tijdBasis[3]())); },
};

// Strategie-tip per onderdeel: de eerste hint, verklapt nooit een uitkomst.
// Aanpak per onderwerp en niveau komt uit het didactisch handboek (src/didactiek.js): overal dezelfde aanpak.
export const STRATEGY = Object.fromEntries(Object.keys(DIDACTIEK).map((c) => [c, hintAanpak(c, 2)]));

// Hints: eerst de aanpak, daarna de tussenstap-vragen (met ?), nooit de uitkomsten.
export function hintsFor(q) {
  const m = mnemonicsFor(q.cat)[0];
  // Hints gaan over déze som: de tussenstappen. De algemene aanpak van het onderdeel (en een ezelsbruggetje) alleen als er
  // geen tussenstappen zijn; die paste vaak niet bij de somvorm (Max-test: bv. afronden-uitleg bij een plaatswaardevraag).
  const steps = (q.guide || []).map((g) => g.ask + (g.type === 'choice' ? ` (${g.options.join(' / ')})` : ''));
  if (steps.length) return steps;
  // Geen tussenstappen: de aanpak van de uitlegkaart van déze soort som (Max-meetlat #4: de algemene onderdeel-hint ging
  // over hoeken of gemiddelde bij een balk- of staafgrafieksom). Alleen als er geen kaart is de algemene aanpak.
  const kaart = kaartVoor('nl', q.tpl);
  if (kaart?.aanpak?.length) return [kid(kaart.aanpak.slice(0, 2).join(' '))];
  return [kid(hintAanpak(q.cat, q.level ?? 2)) + (m ? `\n🧠 ${m.soort === 'ezelsbrug' ? 'Ezelsbruggetje' : 'Onthoud'}: ${m.kort}` : '')].filter(Boolean);
}

export const GENERATORS = { optellen, vermenigvuldigen, delen, kommagetallen, getalbegrip, breuken, procenten, verhoudingen, schaal, metriek, oppervlakte, tijd, meetkunde, grafieken };

// ---------- kindertaal ----------
// Vakwoorden eerst in gewone woorden, met het vakwoord erachter (alleen de eerste keer per tekst).
const KIDWORDS = [
  // [familie, patroon, uitleg (of [enkelvoud, meervoud]), al uitgelegd als de tekst dit bevat]
  ['vereenvoudig', /\b[Vv]ereenvoudig(en)?\b(?! worden)/, 'maak de getallen zo klein mogelijk'],
  ['gelijknamig', /\b[Gg]elijknamig\b/, 'met hetzelfde getal onder de streep', /onder de streep/],
  ['noemer', /\b[Nn]oemers?\b/, ['het getal onder de streep', 'de getallen onder de streep'], /onder de streep/],
  ['teller', /\b[Tt]ellers?\b/, ['het getal boven de streep', 'de getallen boven de streep'], /boven de streep/],
  ['kolomsgewijs', /\b[Kk]olomsgewijs\b/, 'onder elkaar, per positie'],
  ['verhoudingstabel', /\b[Vv]erhoudingstabel\b/, 'een tabelletje met twee rijen: wat je boven doet, doe je onder ook'],
  ['omtrek', /\b[Oo]mtrek\b/, 'de lengte van de rand rondom', /rand rondom/],
  ['oppervlakte', /\b[Oo]ppervlakte\b/, 'hoeveel vierkantjes erin passen', /vierkantjes/],
  ['diameter', /\b[Dd]iameter\b/, 'de lijn dwars door het midden'],
  ['deelbaar', /\bdeelbaar\b/, 'te delen zonder rest', /zonder rest/],
  ['gemengd', /\b[Gg]emengd getal\b/, 'een heel getal met een breuk erbij, zoals 2 1/2'],
];
// Eén keer uitleggen, in één ronde (zodat uitleg niet zelf weer vervangen wordt).
// `done` deelt de uitgelegde woorden tussen teksten: een woord dat al is uitgelegd, krijgt geen uitleg meer.
// Staat de uitleg al in de tekst (bv. "onder de streep"), dan geen tweede uitleg.
export function kid(text, done = new Set()) {
  if (!text || typeof text !== 'string') return text;
  const parts = [];
  let out = text;
  for (const [fam, re, uitleg, al] of KIDWORDS) {
    const [een, meer] = Array.isArray(uitleg) ? uitleg : [uitleg, uitleg];
    if (done.has(fam) || out.includes(`(${een})`) || out.includes(`(${meer})`) || (al && al.test(text))) continue;
    const g = new RegExp(re.source, 'g');
    out = out.replace(g, (m, ...rest) => {
      const at = rest[rest.length - 2], str = rest[rest.length - 1], after = str.slice(at + m.length);
      // al uitgelegd, onderdeel van een formule (teller/noemer) of al een eigen uitleg erachter
      if (done.has(fam) || /^\s?[/()]/.test(after) || str[at - 1] === '/' || str[at - 1] === '(') return m;
      done.add(fam);
      if (fam === 'gelijknamig') done.add('noemer'); // die uitleg zegt al wat er onder de streep staat
      parts.push(`${m} (${/s$/.test(m) && fam !== 'deelbaar' ? meer : een})`);
      return `⟦${parts.length - 1}⟧`;
    });
  }
  return out.replace(/⟦(\d+)⟧/g, (_, i) => parts[Number(i)]);
}
// Een vraag eindigt met een vraagteken ("Hoe vaak past 8 in 72?"), ook als de tekst in stukjes is opgebouwd.
const VRAAGWOORD = /(^|[.!?]\s+)(Hoeveel|Hoe|Welke|Welk|Wat|Waar|Wie|Waarom|Is|Zijn|Past|Kun|Kan|Klopt|Ligt|Heb|Moet)\b[^.!?:]*$/;
const vraagteken = (t) => (typeof t === 'string' && VRAAGWOORD.test(t.trim()) && !/[?:!.…]$/.test(t.trim()) ? t.trim() + '?' : t);
function kidify(q) {
  // De vraag is altijd zichtbaar: wat daar is uitgelegd, hoeft nergens meer.
  const seen = new Set();
  q.text = kid(q.text, seen);
  const guideSeen = new Set(seen), stepSeen = new Set(seen);
  q.guide = (q.guide || []).map((g) => ({ ...g, ask: vraagteken(kid(g.ask, guideSeen)), tip: kid(g.tip, guideSeen) }));
  q.guideFinal = vraagteken(kid(q.guideFinal, guideSeen));
  q.steps = (q.steps || []).map((t) => kid(t, stepSeen));
  return q;
}

let counter = 0;
// "Vorm" van een som: getallen en namen weggelaten. Zo kan het foutenschrift dezelfde soort som terugbrengen.
const NAME_RE = new RegExp(`\\b(${NAMES.join('|')}|Meester Bram)\\b`, 'g');
export const shapeOf = (text) => String(text).replace(NAME_RE, 'N').replace(/€\s?/g, '€').replace(/\d+([.,\s\u2009]\d+)*/g, '#').replace(/\b(appels|peren|bananen|kiwi's|voetbal|hockey|zwemmen|judo|dansen|fiets|lopen|auto|bus|liter|kilo|meter|ijsjes|stickers|ballonnen|scheetkussens|nepsnorren|pakken sap|zakken chips|pennen|pakken melk|schriften|broodjes|tijdschriften|jas|skateboard|koptelefoon|museum|zwembad|dierentuin|bibliotheek)\b/gi, 'X');

// Plaatjes die helpen zonder het antwoord te verklappen
function addVisual(q) {
  if (q.visual) return;
  let m;
  if ((m = q.text.match(/^(\d+)\/(\d+) [+−] (\d+)\/(\d+) =$/))) q.visual = { kind: 'strips', fracs: [[+m[1], +m[2]], [+m[3], +m[4]]] };
  else if (q.type === 'choice' && q.options?.length === 2 && q.options.every((o) => /^\d+\/\d+$/.test(o))) q.visual = { kind: 'strips', fracs: q.options.map((o) => o.split('/').map(Number)) };
  else if ((m = q.text.match(/^Rond ([\d\s\u2009]+) af op (tientallen|honderdtallen|duizendtallen)/))) {
    const N = Number(m[1].replace(/\s|\u2009/g, '')), step = { tientallen: 10, honderdtallen: 100, duizendtallen: 1000 }[m[2]];
    const lo = Math.floor(N / step) * step;
    q.visual = { kind: 'line', from: lo, to: lo + step, mark: N, ticks: [lo, lo + step / 2, lo + step] };
  } else if ((m = q.text.match(/midden tussen ([\d\s\u2009]+) en ([\d\s\u2009]+)\?/))) {
    const a = Number(m[1].replace(/\s|\u2009/g, '')), b = Number(m[2].replace(/\s|\u2009/g, ''));
    q.visual = { kind: 'line', from: a, to: b, ticks: [a, b] };
  } else if ((m = q.text.match(/was het −(\d+) °C\. 's Middags was het (\d+) °C/))) {
    q.visual = { kind: 'line', from: -Number(m[1]), to: Number(m[2]), ticks: [-Number(m[1]), 0, Number(m[2])], unit: '°C' };
  }
}

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
  const g = GENERATORS[cat];
  const lv = Math.max(0, Math.min(3, level));
  const q = g[lv]();
  q.cat = cat;
  q.level = lv;
  q.id = `${Date.now().toString(36)}${(counter++).toString(36)}`;
  if (!q.guide || !q.guide.length) { q.guide = []; q.guideFinal = null; }
  q.shape = shapeOf(q.text);
  improveTips(q, 'nl'); // vage tips ("Tafel van 3.") → concrete aanpak
  q.wrong = misconceptionsFor(q);
  q.wrong = [...q.wrong, ...algemeneDenkfouten(q, 'nl')]; // kale sommen: onthouden vergeten, ernaast in de tafel, … (src/denkfouten.js)
  addVisual(q);
  return enkelvoudSom(vereenvoudigStap(stappenVolgenTussenstappen(zonderEenKeer(kidify(q)), 'nl'), 'nl'), 'nl');
}
// Een som van dezelfde soort (voor herhaling en voorbeelden). Valt terug op een gewone som.
export function generateLike(cat, level, shape, notText) {
  let last = null;
  for (let i = 0; i < 120; i++) {
    const q = generate(cat, level);
    if (q.shape === shape && q.text !== notText) return q;
    last = q;
  }
  return last;
}

// ---------- antwoord controleren ----------
function parseNumber(s) {
  const t = String(s).replace(/^\s*R/i, '').replace(/[€\s  ]/g, '').replace('−', '-').replace(',', '.');
  if (!/^-?\d*\.?\d+$/.test(t)) return null;
  return Number(t);
}
function parseFraction(s) {
  const t = String(s).trim().replace(/\s+/g, ' ').replace('−', '-');
  let m;
  if ((m = t.match(/^(\d+) (\d+)\/(\d+)$/))) {
    const w = +m[1], n = +m[2], d = +m[3];
    return d ? [w * d + n, d] : null;
  }
  if ((m = t.match(/^(-?\d+)\/(\d+)$/))) return +m[2] ? [+m[1], +m[2]] : null;
  const x = parseNumber(t);
  if (x == null) return null;
  const dec = (String(t).split(/[.,]/)[1] || '').length;
  return [Math.round(x * 10 ** dec), 10 ** dec];
}
function parseTime(s) {
  const m = String(s).trim().replace('.', ':').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = +m[1], mi = +m[2];
  if (h > 24 || mi > 59) return null;
  return (h * 60 + mi) % 1440;
}

// Werkt voor een hele som én voor een tussenstap. Geeft { correct, note } terug.
export function checkAnswer(q, input) {
  if (input == null || String(input).trim() === '') return { correct: false, empty: true };
  switch (q.type) {
    case 'number': {
      const x = parseNumber(input);
      if (x != null && q.commonMultipleOf) {
        // tussenstap "gemeenschappelijke noemer": elk gemeenschappelijk veelvoud is goed
        const ok = x > 0 && Number.isInteger(x) && q.commonMultipleOf.every((d) => x % d === 0);
        return { correct: ok, note: ok && x !== q.answer ? ts('Klopt! We rekenen verder met het kleinste getal: {x}.', { x: q.answer }) : null };
      }
      return { correct: x != null && Math.abs(x - q.answer) < 1e-6 };
    }
    case 'fraction': {
      const f = parseFraction(input);
      if (!f) return { correct: false };
      const [n, d] = q.answer;
      if (f[0] * d !== n * f[1]) return { correct: false };
      const isSimplest = gcd(f[0], f[1]) === 1;
      if (q.requireSimplest && !isSimplest) return { correct: false, note: ts('Bijna! Je kunt de breuk nog verder vereenvoudigen tot {x}.', { x: fracStr(q.answer, false) }) };
      if (!isSimplest) return { correct: true, note: ts('Goed! Korter opgeschreven is het {x}.', { x: fracStr(q.answer) }) };
      return { correct: true };
    }
    case 'time': {
      const t = parseTime(input);
      // klokkijken op een wijzerklok: 8:25 en 20:25 zien er hetzelfde uit
      return { correct: t != null && (q.twelve ? t % 720 === q.answer % 720 : t === q.answer) };
    }
    case 'choice':
      return { correct: Number(input) === q.answer };
    default:
      return { correct: false };
  }
}

// Wat de client mag zien (zonder antwoorden, stappen en tussenstap-antwoorden).
export function publicQuestion(q) {
  const { answer, steps, display, requireSimplest, guide, guideFinal, wrong, shape, example, tpl, ...rest } = q;
  return {
    ...rest,
    hasSteps: true,
    guideCount: guide?.length || 0,
  };
}
export function publicStep(s) {
  return { ask: s.ask, type: s.type, options: s.options, unit: s.unit, money: s.money };
}
