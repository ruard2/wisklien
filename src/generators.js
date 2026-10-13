// Sommengeneratoren voor groep 8, gebaseerd op de referentieniveaus 1F/1S
// (domeinen Getallen, Verhoudingen, Meten & meetkunde, Verbanden) en de
// leerlijn groep 8 van de gangbare methodes (o.a. Pluspunt 4, Wereld in getallen 5).
//
// Elke categorie heeft 3 niveaus:
//   1 = basis (stof groep 6/7, moet vlot gaan)
//   2 = 1F (fundamenteel niveau eind groep 8)
//   3 = 1S (streefniveau eind groep 8)
//
// Elke generator geeft een vraag terug met het juiste antwoord én een
// stappenplan in de taal van de methodes (kolomsgewijs, happen, verhoudingstabel...).

import { rnd, pick, shuffle, gcd, lcm, round, fmt, euro, simplify, fracStr, numberWords, hhmm } from './util.js';

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
  { id: 'grafieken', label: 'Tabellen & grafieken', domain: 'Verbanden', icon: '📊' },
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

// ---------- stappenplannen ----------
const PLACE = ['eenheden', 'tientallen', 'honderdtallen', 'duizendtallen', 'tienduizendtallen', 'honderdduizendtallen'];
function colAddSteps(a, b) {
  const steps = [`Zet de getallen precies onder elkaar: eenheden onder eenheden.`];
  const da = String(a).split('').reverse().map(Number), db = String(b).split('').reverse().map(Number);
  let carry = 0;
  for (let i = 0; i < Math.max(da.length, db.length); i++) {
    const x = da[i] || 0, y = db[i] || 0, s = x + y + carry;
    steps.push(`${cap(PLACE[i])}: ${x} + ${y}${carry ? ' + 1 (onthouden)' : ''} = ${s}` +
      (s >= 10 ? ` → schrijf ${s % 10}, onthoud 1.` : ` → schrijf ${s}.`));
    carry = s >= 10 ? 1 : 0;
  }
  if (carry) steps.push(`Er staat nog 1 onthouden: zet die vooraan.`);
  steps.push(`Antwoord: ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}`);
  return steps;
}
function colSubSteps(a, b) {
  const steps = [`Zet de getallen onder elkaar, het grootste getal bovenaan.`];
  const da = String(a).split('').reverse().map(Number), db = String(b).split('').reverse().map(Number);
  let borrow = 0;
  for (let i = 0; i < da.length; i++) {
    let x = da[i] - borrow; const y = db[i] || 0;
    const shown = borrow ? `${da[i]} (min 1 uitgeleend = ${x})` : `${x}`;
    if (x < y) {
      steps.push(`${cap(PLACE[i])}: ${shown} − ${y} gaat niet → leen 10 van links: ${x + 10} − ${y} = ${x + 10 - y}.`);
      borrow = 1;
    } else {
      if (i >= db.length && !borrow) continue;
      steps.push(`${cap(PLACE[i])}: ${shown} − ${y} = ${x - y}.`);
      borrow = 0;
    }
  }
  steps.push(`Controleer: ${fmt(a - b)} + ${fmt(b)} = ${fmt(a)} ✓`);
  return steps;
}
function splitMulSteps(a, b) {
  // a × b met b uit elkaar halen (rekenen met splitsen / kolomsgewijs)
  const parts = String(b).split('').reverse().map((d, i) => Number(d) * 10 ** i).filter(Boolean).reverse();
  const steps = [`Splits ${fmt(b)} in ${parts.map((p) => fmt(p)).join(' + ')}.`];
  for (const p of parts) steps.push(`${fmt(a)} × ${fmt(p)} = ${fmt(a * p)}`);
  steps.push(`Tel op: ${parts.map((p) => fmt(a * p)).join(' + ')} = ${fmt(a * b)}`);
  return steps;
}
function happenSteps(a, d) {
  // kolomsgewijs delen ("happen")
  const steps = [`Kolomsgewijs delen: haal steeds een grote "hap" van ${fmt(d)} eraf.`];
  let rest = a, total = 0;
  for (let p = String(a).length; p >= 0; p--) {
    const unit = d * 10 ** p;
    const k = Math.floor(rest / unit);
    if (k > 0) {
      const hap = k * 10 ** p;
      steps.push(`${fmt(hap)} × ${fmt(d)} = ${fmt(hap * d)} → er blijft ${fmt(rest - hap * d)} over.`);
      rest -= hap * d; total += hap;
    }
  }
  steps.push(`Tel de happen op: ${fmt(total)}${rest ? `, rest ${rest}` : ''}.`);
  return steps;
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// =====================================================================
// GETALLEN
// =====================================================================
const optellen = {
  1() {
    if (Math.random() < 0.5) {
      const a = rnd(120, 880), b = rnd(12, 98);
      return num(`${a} + ${b} =`, a + b, [
        `Splits ${b} in ${b - (b % 10)} + ${b % 10}.`,
        `${a} + ${b - (b % 10)} = ${a + b - (b % 10)}`,
        `${a + b - (b % 10)} + ${b % 10} = ${a + b}`]);
    }
    const a = rnd(300, 990), b = rnd(15, 99);
    return num(`${a} − ${b} =`, a - b, [
      `Handig: ${b} is bijna ${Math.ceil(b / 10) * 10}.`,
      `${a} − ${Math.ceil(b / 10) * 10} = ${a - Math.ceil(b / 10) * 10}`,
      `Je hebt ${Math.ceil(b / 10) * 10 - b} te veel afgehaald, dus tel dat er weer bij: ${a - b}`]);
  },
  2() {
    if (Math.random() < 0.5) {
      const a = rnd(1200, 6999), b = rnd(1200, 2999);
      return num(`${fmt(a)} + ${fmt(b)} =`, a + b, colAddSteps(a, b));
    }
    let a = rnd(3, 9) * 1000 + pick([0, rnd(1, 9) * 100]) + rnd(0, 9) * 10 + rnd(0, 4), b = rnd(1100, a - 400);
    return num(`${fmt(a)} − ${fmt(b)} =`, a - b, colSubSteps(a, b));
  },
  3() {
    const n = pick(NAMES);
    const t = pick(['bike', 'school', 'big']);
    if (t === 'bike') {
      const spaar = rnd(180, 420), krijgt = rnd(45, 95), fiets = rnd(spaar + krijgt + 40, 649);
      return num(`${n} heeft € ${spaar} gespaard en krijgt € ${krijgt} voor de verjaardag. De nieuwe fiets kost € ${fiets}. Hoeveel euro komt ${n} nog tekort?`,
        fiets - spaar - krijgt, [`Eerst wat ${n} heeft: ${spaar} + ${krijgt} = ${spaar + krijgt}.`,
          `Dan het verschil met de prijs: ${fiets} − ${spaar + krijgt} = ${fiets - spaar - krijgt}.`], { unit: 'euro' });
    }
    if (t === 'school') {
      const totaal = rnd(12, 18) * 1000 + rnd(1, 9) * 100 + rnd(10, 90), a = rnd(2500, 4500), b = rnd(1800, 3900);
      return num(`De school heeft € ${fmt(totaal)} te besteden. Ze kopen boeken voor € ${fmt(a)} en gaan op schoolreis voor € ${fmt(b)}. Hoeveel euro blijft er over?`,
        totaal - a - b, [`Wat ze uitgeven: ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}.`,
          `Wat overblijft: ${fmt(totaal)} − ${fmt(a + b)} = ${fmt(totaal - a - b)}.`], { unit: 'euro' });
    }
    const a = rnd(40, 90) * 1000 + rnd(0, 9) * 10, b = rnd(12000, 38999);
    return num(`${fmt(a)} − ${fmt(b)} =`, a - b, colSubSteps(a, b));
  },
};

const vermenigvuldigen = {
  1() {
    const t = pick(['tafel', 'nul', 'handig']);
    if (t === 'tafel') {
      const a = rnd(6, 9), b = rnd(6, 9);
      return num(`${a} × ${b} =`, a * b, [`Ken je de tafel van ${a}? Of gebruik een buurtafel:`,
        `${a} × ${b} = ${a} × ${b - 1} + ${a} = ${a * (b - 1)} + ${a} = ${a * b}`]);
    }
    if (t === 'nul') {
      const a = rnd(3, 9), b = rnd(3, 9) * 10;
      return num(`${a} × ${b} =`, a * b, [`Reken eerst zonder de nul: ${a} × ${b / 10} = ${a * b / 10}.`,
        `Er hoort nog een nul achter: ${a * b}.`]);
    }
    const a = pick([25, 50, 15, 12, 11]), b = pick([4, 6, 8, 12]);
    return num(`${a} × ${b} =`, a * b, splitMulSteps(b, a));
  },
  2() {
    if (Math.random() < 0.5) {
      const a = rnd(6, 9), b = rnd(140, 480);
      return num(`${a} × ${b} =`, a * b, splitMulSteps(a, b));
    }
    const a = rnd(21, 29), b = rnd(31, 79);
    return num(`${a} × ${b} =`, a * b, splitMulSteps(b, a));
  },
  3() {
    if (Math.random() < 0.5) {
      const a = rnd(112, 389), b = rnd(23, 68);
      return num(`${a} × ${b} =`, a * b, splitMulSteps(a, b));
    }
    const prijs = rnd(14, 38), aantal = rnd(24, 36), n = pick(NAMES);
    return num(`Groep 8 gaat naar een pretpark. Een kaartje kost € ${prijs}. Er gaan ${aantal} kinderen mee. Hoeveel euro kost dat samen?`,
      prijs * aantal, splitMulSteps(prijs, aantal), { unit: 'euro' });
  },
};

const delen = {
  1() {
    const t = pick(['tafel', 'nullen', 'nullen2']);
    const b = rnd(4, 9), q = rnd(4, 9);
    if (t === 'tafel') return num(`${b * q} : ${b} =`, q, [`Welke som uit de tafel van ${b} geeft ${b * q}?`, `${q} × ${b} = ${b * q}, dus ${b * q} : ${b} = ${q}.`]);
    if (t === 'nullen') return num(`${b * q * 10} : ${b} =`, q * 10, [`Denk aan ${b * q} : ${b} = ${q}.`, `${b * q * 10} is 10 keer zo groot, dus het antwoord ook: ${q * 10}.`]);
    return num(`${fmt(b * q * 100)} : ${b * 10} =`, q * 10, [`Streep aan beide kanten een nul weg: ${b * q * 10} : ${b}.`, `${b * q} : ${b} = ${q}, dus ${b * q * 10} : ${b} = ${q * 10}.`]);
  },
  2() {
    if (Math.random() < 0.6) {
      const d = rnd(3, 9), q = rnd(112, 289);
      return num(`${d * q} : ${d} =`, q, happenSteps(d * q, d));
    }
    const d = rnd(6, 8), q = rnd(28, 46), r = rnd(1, d - 1), n = pick(NAMES), total = d * q + r;
    return num(`${n} verdeelt ${total} kaarten in stapels van ${d}. Hoeveel volle stapels kan ${n} maken?`,
      q, [...happenSteps(total, d), `Alleen volle stapels tellen, de rest (${r}) telt niet mee.`]);
  },
  3() {
    if (Math.random() < 0.5) {
      const d = rnd(13, 29), q = rnd(112, 389);
      return num(`${fmt(d * q)} : ${d} =`, q, happenSteps(d * q, d));
    }
    const plaatsen = pick([48, 52, 56, 60]), kinderen = rnd(4, 7) * plaatsen + rnd(5, plaatsen - 5);
    const bussen = Math.ceil(kinderen / plaatsen);
    return num(`Er gaan ${kinderen} kinderen op schoolreis. In één bus passen ${plaatsen} kinderen. Hoeveel bussen zijn er nodig?`,
      bussen, [`${kinderen} : ${plaatsen} = ${Math.floor(kinderen / plaatsen)} rest ${kinderen % plaatsen}.`,
        `Die ${kinderen % plaatsen} kinderen moeten ook mee! Dus nog één bus extra: ${bussen}.`, `Let op: hier rond je naar boven af.`]);
  },
};

const kommagetallen = {
  1() {
    if (Math.random() < 0.5) {
      const a = rnd(11, 89) / 10, b = rnd(105, 495) / 100;
      return num(`${fmt(a)} + ${fmt(b)} =`, a + b, [`Zet de komma's onder elkaar. Maak ${fmt(a)} even lang: ${fmt(a, 2)}.`,
        `${fmt(a, 2)} + ${fmt(b, 2)} = ${fmt(a + b, 2)}`]);
    }
    const a = rnd(5, 20), b = rnd(105, 495) / 100;
    return num(`${a} − ${fmt(b)} =`, a - b, [`Schrijf ${a} als ${fmt(a, 2)}.`, `${fmt(a, 2)} − ${fmt(b, 2)} = ${fmt(a - b, 2)}`,
      `Controle: ${fmt(a - b, 2)} + ${fmt(b, 2)} = ${a}`]);
  },
  2() {
    const t = pick(['tien', 'geld', 'deel']);
    if (t === 'tien') {
      const a = rnd(1001, 9999) / 1000, m = pick([10, 100, 1000]);
      if (Math.random() < 0.5) return num(`${fmt(a)} × ${fmt(m)} =`, a * m, [`Bij × ${m} schuift de komma ${String(m).length - 1} plaats(en) naar rechts.`, `${fmt(a)} → ${fmt(a * m)}`]);
      const b = rnd(12, 980);
      return num(`${b} : ${m} =`, b / m, [`Bij : ${m} schuift de komma ${String(m).length - 1} plaats(en) naar links.`, `${b} → ${fmt(b / m)}`]);
    }
    if (t === 'geld') {
      const p = rnd(115, 495) / 100, k = rnd(3, 8), item = pick(['pakken melk', 'schriften', 'broodjes', 'tijdschriften']);
      return num(`Je koopt ${k} ${item} van ${euro(p)} per stuk. Hoeveel moet je betalen?`, p * k, [
        `Splits: ${k} × € ${Math.floor(p)} = € ${k * Math.floor(p)}`,
        `${k} × € ${fmt(p - Math.floor(p), 2)} = € ${fmt(k * (p - Math.floor(p)), 2)}`,
        `Samen: ${euro(p * k)}`], { money: true });
    }
    const d = rnd(3, 8), q = rnd(12, 95) / 10;
    return num(`${fmt(q * d)} : ${d} =`, q, [`Reken eerst zonder komma: ${Math.round(q * d * 10)} : ${d} = ${Math.round(q * 10)}.`,
      `Zet de komma terug: het antwoord moet ongeveer ${Math.round(q * d)} : ${d} ≈ ${Math.round(q)} zijn, dus ${fmt(q)}.`]);
  },
  3() {
    if (Math.random() < 0.5) {
      const a = rnd(15, 95) / 10, b = rnd(12, 95) / 10;
      return num(`${fmt(a)} × ${fmt(b)} =`, a * b, [`Schat eerst: ongeveer ${Math.round(a)} × ${Math.round(b)} = ${Math.round(a) * Math.round(b)}.`,
        `Reken zonder komma's: ${Math.round(a * 10)} × ${Math.round(b * 10)} = ${Math.round(a * b * 100)}.`,
        `Zet de komma zo dat het past bij je schatting: ${fmt(a * b)}.`]);
    }
    const d = rnd(12, 79) / 10, q = rnd(12, 59) / 10, a = round(d * q, 2);
    return num(`${fmt(a)} : ${fmt(d)} =`, q, [`Schat: ongeveer ${Math.round(a)} : ${Math.round(d)} ≈ ${fmt(round(Math.round(a) / Math.max(1, Math.round(d)), 1))}.`,
      `Maak de deler een heel getal: beide × 10 → ${fmt(a * 10)} : ${fmt(d * 10)}.`,
      `${fmt(d * 10)} × ${fmt(q)} = ${fmt(a * 10)}, dus het antwoord is ${fmt(q)}.`]);
  },
};

const getalbegrip = {
  1() {
    if (Math.random() < 0.5) {
      const n = rnd(1001, 9899), op = pick([10, 100]);
      const r = Math.round(n / op) * op, naam = op === 10 ? 'tientallen' : 'honderdtallen';
      return num(`Rond ${fmt(n)} af op ${naam}.`, r, [`Kijk naar het cijfer rechts van de ${naam}.`,
        `Is dat 5 of meer? Dan naar boven, anders naar beneden.`, `${fmt(n)} → ${fmt(r)}`]);
    }
    const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]).slice(0, 6);
    if (digits[0] === 0) [digits[0], digits[5]] = [digits[5], digits[0]];
    const i = rnd(0, 4), d = digits[i] || 7;
    digits[i] = d;
    if (digits.filter((x) => x === d).length > 1) return getalbegrip[1]();
    const fixed = digits.join(''), val = d * 10 ** (5 - i);
    return num(`Hoeveel is de ${d} waard in het getal ${fmt(Number(fixed))}?`, val, [
      `Tel de plaatsen van rechts: eenheden, tientallen, honderdtallen, duizendtallen, ...`,
      `De ${d} staat op de plek van de ${PLACE[5 - i]}.`, `Dus de ${d} is ${fmt(val)} waard.`]);
  },
  2() {
    const t = pick(['woorden', 'midden', 'afronden']);
    if (t === 'woorden') {
      const n = rnd(1, 9) * 1e6 + rnd(1, 9) * 1e5 + pick([0, rnd(1, 9) * 1e4]) + pick([0, rnd(1, 9) * 1e3]);
      return num(`Schrijf in cijfers: ${numberWords(n)}`, n, [`Een miljoen heeft 6 nullen: 1 000 000.`,
        `Schrijf eerst de miljoenen, daarna 3 cijfers voor de duizenden en 3 voor de rest.`, `${fmt(n)}`]);
    }
    if (t === 'midden') {
      const a = rnd(12, 80) * 100, b = a + rnd(2, 9) * 200;
      return num(`Welk getal ligt op de getallenlijn precies in het midden tussen ${fmt(a)} en ${fmt(b)}?`, (a + b) / 2,
        [`Het verschil is ${fmt(b - a)}.`, `De helft daarvan is ${fmt((b - a) / 2)}.`, `${fmt(a)} + ${fmt((b - a) / 2)} = ${fmt((a + b) / 2)}`]);
    }
    const n = rnd(100000, 9999999), r = Math.round(n / 1000) * 1000;
    return num(`Rond ${fmt(n)} af op duizendtallen.`, r, [`Kijk naar het honderdtal-cijfer: ${String(n).slice(-3, -2)}.`,
      `5 of meer → naar boven, minder dan 5 → naar beneden.`, `${fmt(r)}`]);
  },
  3() {
    const t = pick(['temp', 'grootste', 'afrondkomma']);
    if (t === 'temp') {
      const lo = -rnd(3, 12), hi = rnd(2, 14);
      return num(`'s Nachts was het ${fmt(lo)} °C. 's Middags was het ${hi} °C. Hoeveel graden is het warmer geworden?`, hi - lo,
        [`Van ${fmt(lo)} naar 0 is ${-lo} graden.`, `Van 0 naar ${hi} is ${hi} graden.`, `Samen: ${-lo} + ${hi} = ${hi - lo} graden.`], { unit: '°C' });
    }
    if (t === 'grootste') {
      const a = rnd(2, 8), groot = Math.random() < 0.5;
      const opts = [`0,${a}`, `0,${a - 1}${rnd(5, 9)}`, `0,${a}0${rnd(1, 9)}`, `0,0${a}${rnd(1, 9)}`];
      const vals = opts.map((o) => Number(o.replace(',', '.')));
      const idx = vals.indexOf(groot ? Math.max(...vals) : Math.min(...vals));
      return choice(`Welk getal is het ${groot ? 'grootst' : 'kleinst'}?`, opts, idx, [`Maak alle getallen even lang met nullen achteraan:`,
        ...opts.map((o) => `${o} → ${fmt(Number(o.replace(',', '.')), 3)}`), `Vergelijk ze nu als duizendsten: ${opts[idx]} is het ${groot ? 'grootst' : 'kleinst'}.`]);
    }
    const n = rnd(1001, 9999) / 1000, r = round(Math.round(round(n * 10, 6)) / 10, 1);
    return num(`Rond ${fmt(n)} af op één cijfer achter de komma.`, r, [`Kijk naar het tweede cijfer achter de komma: ${String(n.toFixed(3))[3]}.`,
      `5 of meer → naar boven, anders naar beneden.`, `${fmt(n)} → ${fmt(r, 1)}`], { display: fmt(r, 1) });
  },
};

// =====================================================================
// VERHOUDINGEN
// =====================================================================
const breuken = {
  1() {
    const t = pick(['deel', 'vereenvoudig', 'gelijk']);
    if (t === 'deel') {
      const d = pick([3, 4, 5, 6, 8]), n = rnd(1, d - 1), k = rnd(3, 12), total = d * k;
      return num(`Hoeveel is ${n}/${d} deel van ${total}?`, n * k, [`Eerst 1/${d} deel: ${total} : ${d} = ${k}.`,
        `Dan ${n}/${d} deel: ${n} × ${k} = ${n * k}.`]);
    }
    if (t === 'vereenvoudig') {
      let n, d; do { d = rnd(3, 9); n = rnd(1, d - 1); } while (gcd(n, d) !== 1);
      const k = rnd(2, 6);
      return frac(`Vereenvoudig zo ver mogelijk: ${n * k}/${d * k}`, [n, d], [`Zoek een getal waardoor teller én noemer allebei te delen zijn: ${k}.`,
        `${n * k} : ${k} = ${n}, ${d * k} : ${k} = ${d}.`, `Antwoord: ${n}/${d}`], { requireSimplest: true });
    }
    const d = pick([5, 7, 8, 9, 10, 12]), a = rnd(1, d - 2), b = rnd(1, d - a - 1);
    return frac(`${a}/${d} + ${b}/${d} =`, [a + b, d], [`De noemers zijn gelijk (${d}), dus tel alleen de tellers op.`,
      `${a} + ${b} = ${a + b}, dus ${a + b}/${d}.`, gcd(a + b, d) > 1 ? `Vereenvoudigen: ${fracStr([a + b, d])}` : `Dat kan niet verder vereenvoudigd worden.`]);
  },
  2() {
    const t = pick(['optel', 'aftrek', 'komma', 'keer', 'vergelijk']);
    const pair = () => { const ds = shuffle([2, 3, 4, 5, 6, 8]); return [ds[0], ds[1]]; };
    if (t === 'optel' || t === 'aftrek') {
      let [d1, d2] = pair(); let n1 = rnd(1, d1 - 1), n2 = rnd(1, d2 - 1);
      if (t === 'aftrek' && n1 / d1 <= n2 / d2) [d1, d2, n1, n2] = [d2, d1, n2, n1];
      if (t === 'aftrek' && n1 / d1 === n2 / d2) { n1 = d1 - 1; n2 = 1; d2 = d2 > d1 ? d2 : d1 + 1; }
      const L = lcm(d1, d2), a = n1 * (L / d1), b = n2 * (L / d2), res = t === 'optel' ? a + b : a - b;
      const op = t === 'optel' ? '+' : '−';
      return frac(`${n1}/${d1} ${op} ${n2}/${d2} =`, [res, L], [`Maak de breuken gelijknamig: zoek een noemer waar ${d1} en ${d2} allebei in passen: ${L}.`,
        `${n1}/${d1} = ${a}/${L} en ${n2}/${d2} = ${b}/${L}.`, `${a}/${L} ${op} ${b}/${L} = ${res}/${L}`,
        `Vereenvoudig als het kan: ${fracStr([res, L])}`]);
    }
    if (t === 'komma') {
      const [n, d] = pick([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 8], [3, 8], [7, 10], [3, 20]]);
      const f = [10, 100, 1000].map((t) => t / d).find(Number.isInteger);
      return num(`Schrijf ${n}/${d} als kommagetal.`, n / d, [`Maak de noemer 10, 100 of 1000: vermenigvuldig teller en noemer met ${f}.`,
        `${n}/${d} = ${n * f}/${d * f}`, `${n * f}/${d * f} = ${fmt(n / d)}`]);
    }
    if (t === 'keer') {
      const d = pick([3, 4, 5]), n = rnd(1, d - 1), w = rnd(2, 7);
      return frac(`${w} × ${n}/${d} =`, [w * n, d], [`${w} keer ${n}/${d} = ${w * n}/${d}.`, `Haal de helen eruit: ${fracStr([w * n, d])}.`]);
    }
    const cands = [[3, 5], [5, 8], [2, 3], [3, 4], [4, 7], [5, 6], [7, 10], [4, 9]];
    let [x, y] = shuffle(cands); while (x[0] / x[1] === y[0] / y[1]) y = pick(cands);
    const big = x[0] / x[1] > y[0] / y[1] ? 0 : 1, L = lcm(x[1], y[1]);
    return choice('Welke breuk is het grootst?', [`${x[0]}/${x[1]}`, `${y[0]}/${y[1]}`], big, [`Maak ze gelijknamig met noemer ${L}:`,
      `${x[0]}/${x[1]} = ${x[0] * L / x[1]}/${L}`, `${y[0]}/${y[1]} = ${y[0] * L / y[1]}/${L}`, `Dus ${big === 0 ? `${x[0]}/${x[1]}` : `${y[0]}/${y[1]}`} is groter.`]);
  },
  3() {
    const t = pick(['maal', 'deeldoor', 'gemengd']);
    if (t === 'maal') {
      const a = [rnd(1, 4), 0]; a[1] = rnd(a[0] + 1, 6); const b = [rnd(1, 5), 0]; b[1] = rnd(b[0] + 1, 8);
      return frac(`${a[0]}/${a[1]} × ${b[0]}/${b[1]} =`, [a[0] * b[0], a[1] * b[1]], [`Teller × teller: ${a[0]} × ${b[0]} = ${a[0] * b[0]}.`,
        `Noemer × noemer: ${a[1]} × ${b[1]} = ${a[1] * b[1]}.`, `${a[0] * b[0]}/${a[1] * b[1]} = ${fracStr([a[0] * b[0], a[1] * b[1]])}`,
        `Tip: "${a[0]}/${a[1]} × ${b[0]}/${b[1]}" betekent "${a[0]}/${a[1]} deel ván ${b[0]}/${b[1]}".`]);
    }
    if (t === 'deeldoor') {
      const d = pick([2, 3, 4, 5, 8]), w = rnd(2, 6), unit = pick(['liter', 'kilo', 'meter']);
      const ding = { liter: 'flesjes van', kilo: 'zakjes van', meter: 'stukken van' }[unit];
      return num(`Je hebt ${w} ${unit}. Je verdeelt dat in ${ding} 1/${d} ${unit}. Hoeveel ${ding.split(' ')[0]} krijg je?`, w * d,
        [`Hoe vaak past 1/${d} in 1 ${unit}? ${d} keer.`, `In ${w} ${unit} past het dus ${w} × ${d} = ${w * d} keer.`, `Dat is de som ${w} : 1/${d} = ${w * d}.`]);
    }
    const d = pick([2, 4, 3]), d2 = pick([4, 8, 6]), w1 = rnd(1, 4), w2 = rnd(1, 3), n1 = rnd(1, d - 1), n2 = rnd(1, d2 - 1);
    const L = lcm(d, d2), tot = (w1 + w2) * L + n1 * (L / d) + n2 * (L / d2);
    return frac(`${w1} ${n1}/${d} + ${w2} ${n2}/${d2} =`, [tot, L], [`Tel eerst de helen op: ${w1} + ${w2} = ${w1 + w2}.`,
      `Dan de breuken, gelijknamig gemaakt: ${n1 * (L / d)}/${L} + ${n2 * (L / d2)}/${L} = ${n1 * (L / d) + n2 * (L / d2)}/${L}.`,
      `Samen: ${fracStr([tot, L])}`]);
  },
};

const procenten = {
  1() {
    if (Math.random() < 0.6) {
      const p = pick([50, 25, 10, 20, 75]), base = { 50: 2, 25: 4, 10: 10, 20: 5, 75: 4 }[p] * rnd(3, 20);
      const ans = (p * base) / 100;
      const breuk = { 50: '1/2', 25: '1/4', 10: '1/10', 20: '1/5', 75: '3/4' }[p];
      return num(`Hoeveel is ${p}% van ${base}?`, ans, [`${p}% is hetzelfde als ${breuk} deel.`,
        p === 75 ? `1/4 van ${base} = ${base / 4}, dus 3/4 = 3 × ${base / 4} = ${ans}.` : `${breuk} van ${base} = ${ans}.`]);
    }
    const [b, p] = pick([['1/2', 50], ['1/4', 25], ['3/4', 75], ['1/5', 20], ['1/10', 10], ['2/5', 40], ['3/10', 30]]);
    return num(`${b} deel is hoeveel procent?`, p, [`Procent betekent "van de 100".`, `Maak de noemer 100: ${b} = ${p}/100 = ${p}%.`], { unit: '%' });
  },
  2() {
    const t = pick(['vanX', 'korting', 'hoeveel']);
    if (t === 'vanX') {
      const p = pick([15, 30, 35, 45, 60]), base = rnd(2, 16) * 20;
      return num(`Hoeveel is ${p}% van ${base}?`, (p * base) / 100, [`Begin met 10%: ${base} : 10 = ${base / 10}.`,
        p % 10 === 5 ? `5% is de helft van 10%: ${base / 20}.` : `${p}% is ${p / 10} × 10%.`,
        `${p}% = ${(p * base) / 100}.`]);
    }
    if (t === 'korting') {
      const p = pick([10, 20, 25, 30, 40]), prijs = rnd(3, 12) * 20, item = pick(['jas', 'skateboard', 'koptelefoon', 'voetbal']);
      const nieuw = prijs - (p * prijs) / 100;
      return num(`Een ${item} kost ${euro(prijs)}. Je krijgt ${p}% korting. Wat is de nieuwe prijs?`, nieuw, [
        `Korting: ${p}% van ${prijs} = ${(p * prijs) / 100}.`, `Nieuwe prijs: ${prijs} − ${(p * prijs) / 100} = ${nieuw}.`,
        `Of: je betaalt ${100 - p}% van ${prijs} = ${nieuw}.`], { money: true });
    }
    const totaal = pick([20, 25, 40, 50, 80]), p = pick([10, 20, 25, 40, 75]), deel = (p * totaal) / 100;
    if (!Number.isInteger(deel)) return procenten[2]();
    return num(`In een klas zitten ${totaal} kinderen. ${deel} kinderen hebben een huisdier. Hoeveel procent is dat?`, p, [
      `Schrijf als breuk: ${deel}/${totaal}.`, `Maak de noemer 100: ${deel}/${totaal} = ${p}/100.`, `Dus ${p}%.`], { unit: '%' });
  },
  3() {
    const t = pick(['welkpct', 'totaal', 'oud']);
    if (t === 'welkpct') {
      const oud = rnd(4, 16) * 20, p = pick([5, 15, 20, 25, 35]), nieuw = oud - (oud * p) / 100;
      if (!Number.isInteger(nieuw)) return procenten[3]();
      return num(`Een spelcomputer kostte € ${oud}. Nu kost hij € ${nieuw}. Hoeveel procent korting is dat?`, p, [
        `Korting in euro: ${oud} − ${nieuw} = ${oud - nieuw}.`, `Welk deel van ${oud} is ${oud - nieuw}? 1% van ${oud} = ${fmt(oud / 100)}.`,
        `${oud - nieuw} : ${fmt(oud / 100)} = ${p}, dus ${p}%.`], { unit: '%' });
    }
    if (t === 'totaal') {
      const p = pick([20, 25, 30, 40, 60]), totaal = rnd(2, 12) * 10, deel = (p * totaal) / 100;
      if (!Number.isInteger(deel)) return procenten[3]();
      return num(`${p}% van de leerlingen gaat met de fiets naar school. Dat zijn ${deel} leerlingen. Hoeveel leerlingen zijn er in totaal?`, totaal, [
        `Maak een verhoudingstabel: ${p}% → ${deel}.`, `10% → ${deel / (p / 10)}.`, `100% → ${totaal}.`]);
    }
    const p = pick([20, 25, 50]), oud = rnd(3, 12) * 8, nieuw = oud * (1 - p / 100);
    return num(`Na ${p}% korting kost een spel ${euro(nieuw)}. Wat was de oude prijs?`, oud, [
      `De nieuwe prijs is ${100 - p}% van de oude prijs.`, `${100 - p}% → ${fmt(nieuw)}, dus 1% → ${fmt(nieuw / (100 - p))}.`, `100% → ${fmt(oud)}.`], { money: true });
  },
};

function vtabel(rows) {
  // rows: [[kolomA...],[kolomB...]] voor visuele verhoudingstabel
  return { kind: 'table', headers: null, rows };
}

const verhoudingen = {
  1() {
    if (Math.random() < 0.5) {
      const n = rnd(2, 5), p = rnd(2, 6), k = rnd(2, 4), item = pick(['pakken sap', 'zakken chips', 'pennen']);
      return num(`${n} ${item} kosten € ${n * p}. Hoeveel kosten ${n * k} ${item}?`, n * p * k, [
        `Verhoudingstabel: ${n} → € ${n * p}.`, `${n * k} is ${k} keer zo veel als ${n}.`, `Dus ${k} × € ${n * p} = € ${n * p * k}.`],
      { unit: 'euro', visual: vtabel([['aantal', n, n * k], ['prijs (€)', n * p, '?']]) });
    }
    const d = pick([3, 4, 5]), k = rnd(4, 9);
    return num(`1 op de ${d} kinderen speelt een instrument. In de school zitten ${d * k} kinderen. Hoeveel kinderen spelen een instrument?`, k,
      [`"1 op de ${d}" betekent: van elke ${d} kinderen is er 1.`, `${d * k} : ${d} = ${k}.`]);
  },
  2() {
    const t = pick(['recept', 'perkilo', 'verdeel']);
    if (t === 'recept') {
      const p1 = pick([2, 4]), g = pick([150, 200, 250, 300]), p2 = p1 * pick([1.5, 2.5, 3]);
      return num(`Voor ${p1} personen heb je ${g} gram pasta nodig. Hoeveel gram heb je nodig voor ${p2} personen?`, (g / p1) * p2, [
        `Verhoudingstabel: ${p1} personen → ${g} gram.`, `1 persoon → ${g} : ${p1} = ${fmt(g / p1)} gram.`, `${fmt(p2)} personen → ${fmt(p2)} × ${fmt(g / p1)} = ${fmt((g / p1) * p2)} gram.`],
      { unit: 'gram', visual: vtabel([['personen', p1, 1, p2], ['gram', g, '', '?']]) });
    }
    if (t === 'perkilo') {
      const gram = pick([100, 200, 250, 500]), perKilo = rnd(8, 24), prijs = (perKilo * gram) / 1000;
      return num(`${gram} gram kaas kost ${euro(prijs)}. Hoeveel kost 1 kilo?`, perKilo, [
        `1 kilo = 1000 gram.`, `1000 : ${gram} = ${1000 / gram}, dus 1 kilo is ${1000 / gram} keer zoveel.`, `${1000 / gram} × ${euro(prijs)} = ${euro(prijs * (1000 / gram))}.`],
      { money: true });
    }
    const a = rnd(1, 4), b = rnd(a + 1, 6), k = rnd(3, 9), totaal = (a + b) * k, n1 = pick(NAMES), n2 = pick(NAMES.filter((x) => x !== n1));
    return num(`${n1} en ${n2} verdelen ${totaal} knikkers in de verhouding ${a} : ${b}. Hoeveel knikkers krijgt ${n1}?`, a * k, [
      `Samen zijn het ${a} + ${b} = ${a + b} delen.`, `Eén deel = ${totaal} : ${a + b} = ${k} knikkers.`, `${n1} krijgt ${a} delen: ${a} × ${k} = ${a * k}.`]);
  },
  3() {
    const t = pick(['voordelig', 'verbruik', 'mengen']);
    if (t === 'voordelig') {
      const hoog = rnd(12, 18) / 10, laag = round(hoog - pick([0.1, 0.2]), 2), a = pick([3, 4]), b = pick([5, 6]);
      const groteGoedkoper = Math.random() < 0.6, pa = groteGoedkoper ? hoog : laag, pb = groteGoedkoper ? laag : hoog;
      const optA = `${a} stuks voor ${euro(a * pa)}`, optB = `${b} stuks voor ${euro(b * pb)}`;
      return choice(`Welke aanbieding is het voordeligst per stuk?`, [optA, optB], groteGoedkoper ? 1 : 0, [
        `Reken uit wat 1 stuk kost.`, `${euro(a * pa)} : ${a} = ${euro(pa)} per stuk.`, `${euro(b * pb)} : ${b} = ${euro(pb)} per stuk.`,
        `De aanbieding met ${groteGoedkoper ? b : a} stuks is goedkoper per stuk.${groteGoedkoper ? '' : ' Een groot pak is dus niet altijd voordeliger!'}`]);
    }
    if (t === 'verbruik') {
      const per = pick([12, 15, 16, 18, 20]), l = rnd(15, 40);
      return num(`Een auto rijdt 1 op ${per}: met 1 liter benzine rijdt hij ${per} km. Hoeveel liter heeft hij nodig voor ${per * l} km?`, l, [
        `Verhoudingstabel: 1 liter → ${per} km.`, `${per * l} : ${per} = ${l}.`, `Dus ${l} liter.`], { unit: 'liter' });
    }
    const w = pick([4, 5, 6, 7]), totaalDl = (w + 1) * rnd(2, 4) * 1, ml = (totaalDl * 100) / (w + 1);
    return num(`Limonade maak je met 1 deel siroop op ${w} delen water. Je wilt ${fmt(totaalDl / 10)} liter limonade maken. Hoeveel milliliter siroop heb je nodig?`, ml, [
      `Samen zijn het 1 + ${w} = ${w + 1} delen.`, `${fmt(totaalDl / 10)} liter = ${totaalDl * 100} ml.`, `1 deel = ${totaalDl * 100} : ${w + 1} = ${ml} ml siroop.`], { unit: 'ml' });
  },
};

const schaal = {
  1() {
    const per = pick([2, 5, 10, 50]), unit = per >= 50 ? 'm' : 'km', cm = rnd(3, 12);
    return num(`Op een kaart staat: 1 cm is ${per} ${unit} in het echt. Op de kaart is een weg ${cm} cm lang. Hoe lang is de weg in het echt?`, per * cm, [
      `Elke cm op de kaart is ${per} ${unit}.`, `${cm} × ${per} = ${per * cm} ${unit}.`], { unit });
  },
  2() {
    const s = pick([10000, 20000, 25000, 50000, 100000]), cm = rnd(2, 9), echtCm = cm * s;
    return num(`Een kaart heeft schaal 1 : ${fmt(s)}. Op de kaart is de afstand ${cm} cm. Hoeveel kilometer is dat in het echt?`, echtCm / 100000, [
      `1 cm op de kaart is ${fmt(s)} cm in het echt.`, `${cm} cm → ${cm} × ${fmt(s)} = ${fmt(echtCm)} cm.`,
      `Van cm naar m: : 100 → ${fmt(echtCm / 100)} m.`, `Van m naar km: : 1000 → ${fmt(echtCm / 100000)} km.`], { unit: 'km' });
  },
  3() {
    if (Math.random() < 0.5) {
      const s = pick([20000, 25000, 50000]), km = pick([1, 2, 3, 4, 5, 6]) * (s / 50000 >= 1 ? 1 : 0.5), cm = (km * 100000) / s;
      if (!Number.isInteger(cm * 10)) return schaal[3]();
      return num(`De afstand tussen twee dorpen is in het echt ${fmt(km)} km. Hoeveel cm is dat op een kaart met schaal 1 : ${fmt(s)}?`, cm, [
        `${fmt(km)} km = ${fmt(km * 1000)} m = ${fmt(km * 100000)} cm.`, `Elke cm op de kaart is ${fmt(s)} cm echt.`, `${fmt(km * 100000)} : ${fmt(s)} = ${fmt(cm)} cm.`], { unit: 'cm' });
    }
    const cm = pick([2, 4, 5, 8]), s = pick([10000, 20000, 25000, 50000]), m = (cm * s) / 100;
    return num(`Op een kaart is een afstand ${cm} cm. In het echt is die afstand ${fmt(m)} meter. Wat is de schaal? Vul in: 1 : ...`, s, [
      `${fmt(m)} m = ${fmt(m * 100)} cm.`, `${cm} cm op de kaart is ${fmt(m * 100)} cm echt.`, `1 cm is dan ${fmt(m * 100)} : ${cm} = ${fmt(s)} cm.`, `Schaal 1 : ${fmt(s)}.`]);
  },
};

// =====================================================================
// METEN & MEETKUNDE
// =====================================================================
const TRAP = 'km – hm – dam – m – dm – cm – mm';
const metriek = {
  1() {
    const t = pick([
      () => { const v = rnd(12, 95) / 10; return [`${fmt(v)} meter = ... cm`, v * 100, 'cm', [`1 m = 100 cm.`, `${fmt(v)} × 100 = ${fmt(v * 100)}`]]; },
      () => { const v = rnd(11, 95) * 100; return [`${fmt(v)} gram = ... kg`, v / 1000, 'kg', [`1 kg = 1000 g.`, `${fmt(v)} : 1000 = ${fmt(v / 1000)}`]]; },
      () => { const v = rnd(2, 9) * 250; return [`${fmt(v)} ml = ... liter`, v / 1000, 'liter', [`1 liter = 1000 ml.`, `${fmt(v)} : 1000 = ${fmt(v / 1000)}`]]; },
      () => { const v = rnd(2, 9); return [`${v} km = ... m`, v * 1000, 'm', [`1 km = 1000 m.`, `${v} × 1000 = ${fmt(v * 1000)}`]]; },
    ])();
    return num(t[0], t[1], t[3], { unit: t[2] });
  },
  2() {
    const t = pick([
      () => { const v = rnd(11, 99) / 100; return [`${fmt(v)} liter = ... cl`, v * 100, 'cl', [`Trap: liter – dl – cl – ml. Van liter naar cl is 2 stappen omlaag.`, `Twee stappen = × 100: ${fmt(v)} × 100 = ${fmt(v * 100)}`]]; },
      () => { const v = rnd(12, 95) / 10; return [`${fmt(v)} km = ... m`, v * 1000, 'm', [`Trap: ${TRAP}. Van km naar m is 3 stappen.`, `× 1000: ${fmt(v * 1000)}`]]; },
      () => { const v = rnd(12, 480); return [`${v} mm = ... m`, v / 1000, 'm', [`Van mm naar m is 3 stappen omhoog: : 1000.`, `${v} : 1000 = ${fmt(v / 1000)}`]]; },
      () => { const a = rnd(11, 29) / 10, b = rnd(2, 9) * 100; return [`${fmt(a)} kg + ${b} g = ... g`, a * 1000 + b, 'g', [`Maak eerst alles grammen: ${fmt(a)} kg = ${fmt(a * 1000)} g.`, `${fmt(a * 1000)} + ${b} = ${fmt(a * 1000 + b)} g`]]; },
      () => { const v = rnd(2, 9) * 15; return [`${v} dl = ... liter`, v / 10, 'liter', [`1 liter = 10 dl.`, `${v} : 10 = ${fmt(v / 10)}`]]; },
    ])();
    return num(t[0], t[1], t[3], { unit: t[2] });
  },
  3() {
    const t = pick([
      () => { const v = rnd(15, 95) / 10; return [`${fmt(v)} m² = ... dm²`, v * 100, 'dm²', [`Bij oppervlakte (m²) is elke stap op de trap × 100.`, `m² → dm² is 1 stap: ${fmt(v)} × 100 = ${fmt(v * 100)}`]]; },
      () => { const v = rnd(12, 95) * 100; return [`${fmt(v)} cm³ = ... liter`, v / 1000, 'liter', [`1 liter = 1 dm³ = 1000 cm³.`, `${fmt(v)} : 1000 = ${fmt(v / 1000)} liter`]]; },
      () => { const v = rnd(2, 9) / 2; return [`${fmt(v)} m³ = ... liter`, v * 1000, 'liter', [`1 m³ = 1000 dm³ = 1000 liter.`, `${fmt(v)} × 1000 = ${fmt(v * 1000)}`]]; },
      () => { const v = rnd(2, 9); return [`${v} hectare = ... m²`, v * 10000, 'm²', [`1 hectare (ha) = 100 m × 100 m = 10 000 m².`, `${v} × 10 000 = ${fmt(v * 10000)}`]]; },
      () => { const v = rnd(2, 8) * 1000 + 500; return [`${fmt(v)} kg = ... ton`, v / 1000, 'ton', [`1 ton = 1000 kg.`, `${fmt(v)} : 1000 = ${fmt(v / 1000)}`]]; },
    ])();
    return num(t[0], t[1], t[3], { unit: t[2] });
  },
};

const oppervlakte = {
  1() {
    const l = rnd(4, 15), b = rnd(3, l - 1);
    if (Math.random() < 0.5) return num(`Een rechthoekige tuin is ${l} m lang en ${b} m breed. Hoe groot is de oppervlakte?`, l * b,
      [`Oppervlakte rechthoek = lengte × breedte.`, `${l} × ${b} = ${l * b} m².`], { unit: 'm²', visual: { kind: 'rect', w: l, h: b, unit: 'm' } });
    return num(`Een rechthoekig grasveld is ${l} m lang en ${b} m breed. Hoe groot is de omtrek?`, 2 * (l + b),
      [`Omtrek = de afstand helemaal rondom.`, `${l} + ${b} + ${l} + ${b} = ${2 * (l + b)} m.`], { unit: 'm', visual: { kind: 'rect', w: l, h: b, unit: 'm' } });
  },
  2() {
    if (Math.random() < 0.5) {
      const l = pick([10, 20, 25, 30, 40]), b = pick([10, 15, 20]), h = pick([10, 20, 30]), cm3 = l * b * h;
      return num(`Een doos (balk) is ${l} cm lang, ${b} cm breed en ${h} cm hoog. Hoeveel liter past erin?`, cm3 / 1000,
        [`Inhoud = lengte × breedte × hoogte.`, `${l} × ${b} × ${h} = ${fmt(cm3)} cm³.`, `1 liter = 1000 cm³, dus ${fmt(cm3)} : 1000 = ${fmt(cm3 / 1000)} liter.`], { unit: 'liter' });
    }
    const basis = rnd(3, 12) * 2, hoogte = rnd(3, 10);
    return num(`Een driehoek heeft een basis van ${basis} cm en een hoogte van ${hoogte} cm. Hoe groot is de oppervlakte?`, (basis * hoogte) / 2,
      [`Een driehoek is de helft van een rechthoek.`, `Rechthoek: ${basis} × ${hoogte} = ${basis * hoogte} cm².`, `Helft: ${(basis * hoogte) / 2} cm².`], { unit: 'cm²', visual: { kind: 'tri', w: basis, h: hoogte, unit: 'cm' } });
  },
  3() {
    const t = pick(['tegels', 'vierkant', 'aquarium', 'lvorm']);
    if (t === 'tegels') {
      const l = rnd(4, 7), b = rnd(3, 5), p = pick([15, 20, 25, 30]);
      return num(`Een kamer is ${l} m lang en ${b} m breed. Een nieuwe vloer kost € ${p} per m². Hoeveel kost de vloer?`, l * b * p,
        [`Oppervlakte: ${l} × ${b} = ${l * b} m².`, `Prijs: ${l * b} × € ${p} = € ${l * b * p}.`], { unit: 'euro' });
    }
    if (t === 'vierkant') {
      const z = rnd(5, 15);
      return num(`De omtrek van een vierkant is ${4 * z} cm. Hoe groot is de oppervlakte?`, z * z,
        [`Een vierkant heeft 4 even lange zijden.`, `Eén zijde: ${4 * z} : 4 = ${z} cm.`, `Oppervlakte: ${z} × ${z} = ${z * z} cm².`], { unit: 'cm²' });
    }
    if (t === 'aquarium') {
      const l = pick([60, 80, 100]), b = pick([30, 40]), h = pick([40, 50]);
      return num(`Een aquarium is ${l} cm lang, ${b} cm breed en ${h} cm hoog. Hoeveel liter water past erin?`, (l * b * h) / 1000,
        [`Reken in dm, want 1 dm³ = 1 liter: ${l / 10} dm, ${b / 10} dm, ${h / 10} dm.`, `${l / 10} × ${b / 10} × ${h / 10} = ${(l * b * h) / 1000} dm³ = ${(l * b * h) / 1000} liter.`], { unit: 'liter' });
    }
    const A = rnd(8, 12), B = rnd(6, 9), a = rnd(3, A - 3), b = rnd(2, B - 3);
    return num(`Een L-vormig speelveld is een rechthoek van ${A} m bij ${B} m waar een hoek van ${a} m bij ${b} m uit is gehaald. Hoe groot is de oppervlakte?`, A * B - a * b,
      [`Grote rechthoek: ${A} × ${B} = ${A * B} m².`, `Weggehaald stuk: ${a} × ${b} = ${a * b} m².`, `${A * B} − ${a * b} = ${A * B - a * b} m².`], { unit: 'm²', visual: { kind: 'lshape', A, B, a, b, unit: 'm' } });
  },
};

const tijd = {
  1() {
    const t = pick(['duur', 'uurmin', '24']);
    if (t === 'duur') {
      const s = rnd(8 * 12, 14 * 12) * 5, d = rnd(7, 22) * 5;
      const heel = Math.ceil(s / 60) * 60;
      const steps = heel > s && heel < s + d
        ? [`Tel eerst door naar een heel uur: ${hhmm(s)} → ${hhmm(heel)} = ${heel - s} min.`, `Dan verder tot ${hhmm(s + d)}: ${s + d - heel} min.`, `Samen: ${d} minuten.`]
        : [`Tel de minuten van ${hhmm(s)} tot ${hhmm(s + d)}.`, `Samen: ${d} minuten.`];
      return num(`De film begint om ${hhmm(s)} en is afgelopen om ${hhmm(s + d)}. Hoeveel minuten duurt de film?`, d, steps, { unit: 'minuten' });
    }
    if (t === 'uurmin') {
      const u = pick([1.5, 2.5, 0.75, 1.25, 3.5, 0.25]);
      return num(`${fmt(u)} uur = ... minuten`, u * 60, [`1 uur = 60 minuten.`, `${fmt(u)} × 60 = ${u * 60}`], { unit: 'minuten' });
    }
    const [txt, m] = pick([['kwart voor drie \'s middags', 14 * 60 + 45], ['half acht \'s avonds', 19 * 60 + 30], ['tien over half vijf \'s middags', 16 * 60 + 40],
      ['vijf voor half tien \'s avonds', 21 * 60 + 25], ['kwart over elf \'s avonds', 23 * 60 + 15], ['twintig over zes \'s avonds', 18 * 60 + 20]]);
    return time(`Schrijf in 24-uursnotatie: ${txt}`, m, [`Na 12 uur 's middags tel je er 12 bij op.`, `Dus: ${hhmm(m)}`]);
  },
  2() {
    if (Math.random() < 0.5) {
      const s = rnd(7 * 12, 16 * 12) * 5, d = rnd(16, 40) * 5;
      return time(`De trein vertrekt om ${hhmm(s)}. De reis duurt ${Math.floor(d / 60)} uur en ${d % 60} minuten. Hoe laat komt de trein aan?`, s + d,
        [`Tel eerst de hele uren erbij: ${hhmm(s)} + ${Math.floor(d / 60)} uur = ${hhmm(s + Math.floor(d / 60) * 60)}.`, `Dan de minuten: + ${d % 60} min = ${hhmm(s + d)}.`]);
    }
    const v = pick([15, 20, 60, 80, 90, 100, 120]), u = pick([0.5, 1.5, 2, 3, 2.5]);
    return num(`Een ${v <= 20 ? 'fietser' : 'auto'} rijdt ${u === 0.5 ? 'een half uur' : fmt(u) + ' uur'} met een snelheid van ${v} km per uur. Hoeveel kilometer legt die af?`, v * u,
      [`${v} km per uur betekent: in 1 uur ${v} km.`, `In ${fmt(u)} uur: ${fmt(u)} × ${v} = ${fmt(v * u)} km.`], { unit: 'km' });
  },
  3() {
    const t = pick(['gemsnel', 'minuten', 'zone']);
    if (t === 'gemsnel') {
      const v = pick([40, 60, 80, 90, 100, 120]), u = pick([1.5, 2.5, 0.5]);
      return num(`Een auto rijdt ${fmt(v * u)} km in ${u === 0.5 ? 'een half uur' : fmt(u) + ' uur'}. Wat is de gemiddelde snelheid in km per uur?`, v,
        [`Snelheid = afstand : tijd.`, `${fmt(v * u)} : ${fmt(u)} = ${v}. Of: in een half uur ${fmt((v * u) / (u * 2))} km, dus in een heel uur ${v} km.`], { unit: 'km/u' });
    }
    if (t === 'minuten') {
      const v = pick([60, 90, 120, 48, 30]), min = pick([10, 20, 40, 45, 15, 50]);
      if (!Number.isInteger((v * min) / 60)) return tijd[3]();
      return num(`Een trein rijdt ${v} km per uur. Hoeveel km rijdt hij in ${min} minuten?`, (v * min) / 60,
        [`${v} km per uur = ${v} km in 60 minuten.`, `In 1 minuut: ${v} : 60 = ${fmt(v / 60)} km.`, `In ${min} minuten: ${min} × ${fmt(v / 60)} = ${fmt((v * min) / 60)} km.`], { unit: 'km' });
    }
    const [stad, diff] = pick([['New York', -6], ['Londen', -1], ['Tokio', 7], ['Bangkok', 5], ['Los Angeles', -9]]);
    const s = rnd(9 * 4, 20 * 4) * 15;
    return time(`In Amsterdam is het ${hhmm(s)}. In ${stad} is het ${Math.abs(diff)} uur ${diff < 0 ? 'vroeger' : 'later'}. Hoe laat is het in ${stad}?`, s + diff * 60,
      [`${diff < 0 ? 'Vroeger' : 'Later'} betekent ${diff < 0 ? 'eraf halen' : 'erbij tellen'}.`, `${hhmm(s)} ${diff < 0 ? '−' : '+'} ${Math.abs(diff)} uur = ${hhmm(s + diff * 60)}.`]);
  },
};

// =====================================================================
// VERBANDEN
// =====================================================================
const DAGEN = ['ma', 'di', 'wo', 'do', 'vr'];
const DAGNAAM = { ma: 'maandag', di: 'dinsdag', wo: 'woensdag', do: 'donderdag', vr: 'vrijdag' };
const grafieken = {
  1() {
    const vals = DAGEN.map(() => rnd(2, 14) * 5), i = rnd(0, 4);
    const visual = { kind: 'bar', title: 'Uitgeleende boeken in de bieb', labels: DAGEN, values: vals, step: 10 };
    if (Math.random() < 0.5) return num(`Kijk naar de grafiek. Hoeveel boeken werden er op ${DAGNAAM[DAGEN[i]]} uitgeleend?`, vals[i],
      [`Zoek de staaf van ${DAGNAAM[DAGEN[i]]}.`, `Kijk waar de bovenkant uitkomt op de as: ${vals[i]}.`], { visual });
    const mx = Math.max(...vals), mn = Math.min(...vals);
    return num(`Kijk naar de grafiek. Hoeveel boeken zijn er op de drukste dag meer uitgeleend dan op de rustigste dag?`, mx - mn,
      [`Drukste dag: ${DAGNAAM[DAGEN[vals.indexOf(mx)]]} met ${mx}.`, `Rustigste dag: ${DAGNAAM[DAGEN[vals.indexOf(mn)]]} met ${mn}.`, `${mx} − ${mn} = ${mx - mn}.`], { visual });
  },
  2() {
    if (Math.random() < 0.5) {
      const n = pick([4, 5]), mean = rnd(5, 9);
      let vals = Array.from({ length: n }, () => mean + rnd(-3, 3));
      vals[n - 1] = mean * n - vals.slice(0, n - 1).reduce((a, b) => a + b, 0);
      if (vals[n - 1] < 1 || vals[n - 1] > 10) return grafieken[2]();
      const name = pick(NAMES);
      return num(`${name} haalde deze cijfers voor rekenen: ${vals.join(', ')}. Wat is het gemiddelde cijfer?`, mean,
        [`Tel alle cijfers op: ${vals.join(' + ')} = ${mean * n}.`, `Deel door het aantal cijfers (${n}): ${mean * n} : ${n} = ${mean}.`],
        { visual: { kind: 'table', headers: ['toets', ...vals.map((_, i) => String(i + 1))], rows: [['cijfer', ...vals]] } });
    }
    const sports = shuffle(['voetbal', 'hockey', 'zwemmen', 'judo', 'dansen']).slice(0, 4), vals = sports.map(() => rnd(3, 12));
    const total = vals.reduce((a, b) => a + b, 0);
    return num(`In de tabel zie je welke sport de kinderen van groep 8 doen. Hoeveel kinderen zitten er in groep 8? (Iedereen doet één sport.)`, total,
      [`Tel alle aantallen op: ${vals.join(' + ')} = ${total}.`],
      { visual: { kind: 'table', headers: ['sport', 'aantal'], rows: sports.map((s, i) => [s, vals[i]]) } });
  },
  3() {
    if (Math.random() < 0.5) {
      const labels = ['8:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
      let v = rnd(2, 8); const vals = labels.map((_, i) => (v = i === 0 ? v : v + rnd(i < 4 ? 1 : -4, i < 4 ? 5 : 0)));
      const a = rnd(0, 2), b = rnd(3, 5);
      return num(`Kijk naar de lijngrafiek van de temperatuur. Hoeveel graden is het verschil tussen ${labels[a]} en ${labels[b]}?`, Math.abs(vals[b] - vals[a]),
        [`Om ${labels[a]} was het ${vals[a]} °C.`, `Om ${labels[b]} was het ${vals[b]} °C.`, `Verschil: ${Math.abs(vals[b] - vals[a])} graden.`],
        { unit: '°C', visual: { kind: 'line', title: 'Temperatuur (°C)', labels, values: vals, step: 2 } });
    }
    const totaal = pick([200, 400, 500, 800]), parts = pick([[50, 25, 15, 10], [40, 30, 20, 10], [45, 25, 20, 10], [35, 30, 25, 10]]);
    const names = shuffle(['fiets', 'lopen', 'auto', 'bus']), i = rnd(0, 3);
    return num(`Op een school met ${totaal} leerlingen is gevraagd hoe ze naar school komen. Hoeveel leerlingen komen met de ${names[i]}?`, (parts[i] * totaal) / 100,
      [`In de grafiek zie je: ${names[i]} = ${parts[i]}%.`, `1% van ${totaal} = ${totaal / 100}.`, `${parts[i]}% = ${parts[i]} × ${totaal / 100} = ${(parts[i] * totaal) / 100}.`],
      { visual: { kind: 'pie', labels: names, values: parts } });
  },
};

export const GENERATORS = { optellen, vermenigvuldigen, delen, kommagetallen, getalbegrip, breuken, procenten, verhoudingen, schaal, metriek, oppervlakte, tijd, grafieken };

let counter = 0;
export function generate(cat, level) {
  const g = GENERATORS[cat];
  const lv = Math.max(1, Math.min(3, level));
  const q = g[lv]();
  q.cat = cat;
  q.level = lv;
  q.id = `${Date.now().toString(36)}${(counter++).toString(36)}`;
  return q;
}

// ---------- antwoord controleren ----------
function parseNumber(s) {
  const t = String(s).replace(/[€\s  ]/g, '').replace('−', '-').replace(',', '.');
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

// Geeft { correct, note } terug. note = extra uitleg (bijv. "kan nog vereenvoudigd").
export function checkAnswer(q, input) {
  if (input == null || String(input).trim() === '') return { correct: false, empty: true };
  switch (q.type) {
    case 'number': {
      const x = parseNumber(input);
      return { correct: x != null && Math.abs(x - q.answer) < 1e-6 };
    }
    case 'fraction': {
      const f = parseFraction(input);
      if (!f) return { correct: false };
      const [n, d] = q.answer;
      const equal = f[0] * d === n * f[1];
      if (!equal) return { correct: false };
      const isSimplest = gcd(f[0], f[1]) === 1;
      if (q.requireSimplest && !isSimplest) return { correct: false, note: `Bijna! Het kan nog verder vereenvoudigd worden tot ${fracStr(q.answer, false)}.` };
      if (!isSimplest) return { correct: true, note: `Goed! Mooier opgeschreven is het ${fracStr(q.answer)}.` };
      return { correct: true };
    }
    case 'time': {
      const t = parseTime(input);
      return { correct: t != null && t === q.answer };
    }
    case 'choice':
      return { correct: Number(input) === q.answer };
    default:
      return { correct: false };
  }
}

// Wat de client mag zien (zonder antwoord en stappen).
export function publicQuestion(q) {
  const { answer, steps, display, requireSimplest, ...rest } = q;
  return { ...rest, hasSteps: steps?.length > 1 };
}
