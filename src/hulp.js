// Hulpladder per tussenstap: de app knipt een stap waar het kind op vastloopt in kleine deelstappen, volgens de route van de
// methode (Malmberg: rijgen in stukjes, aanvullen, splitsen, de kleine som, delen met een bekende keersom, procent via de
// breuk of 10%, breuk van een getal via 1 deel, tijdsduur via het hele uur, kommagetallen: helen en achter de komma).
// Elke deelstap is door de app uitgerekend; de laatste deelstap geeft precies de uitkomst van de stap.
//
// Waarom (meetlat #37): bij "ik snap deze stap niet" bedacht Max zelf een voorbeeld ("wat is 12 × 11?") zonder te zeggen
// hoe je het uitrekent, soms moeilijker dan de stap zelf (max_stap 3,95). Nu bepaalt de app de kleine stapjes; Max hoeft
// ze alleen te verwoorden, en elk antwoord van het kind kan de app nakijken.
import { fmt } from './util.js';
import { betterTip, makkelijker } from './tips.js';

const NUM = String.raw`(\d{1,3}(?:[ .   ]\d{3})+|\d+)`;
const toN = (s) => Number(String(s).replace(/[ .   ]/g, ''));
const KOLOM = /^(Eenheden|Tientallen|Honderdtallen|Duizendtallen|Tienduizendtallen|Honderdduizendtallen|Ene|Tiene|Honderde|Duisende|Tienduisende|Honderdduisende|Tienden|Honderdsten|Tiendes|Honderdstes)\b/i;
const parts = (n) => { const out = []; let p = 10 ** (String(n).length - 1); let r = n; while (p >= 1) { const d = Math.floor(r / p) * p; if (d) out.push(d); r -= d; p /= 10; } return out; };
const T = {
  nl: { samen: 'Samen', min: 'minuten', rest: 'Wat blijft er over?', hoeVaak: (b, r) => `Hoe vaak past ${fmt(b)} in ${fmt(r)}?`, keer: 'keer', tot: (a, b) => `Van ${a} tot ${b} = ? minuten`, helen: 'De helen', komma: 'Achter de komma', deel: (d, x) => `1/${d} van ${fmt(x)} = ?`, pct: (p, x) => `${p}% van ${fmt(x)} = ?`, aanvul: (a, b) => `Van ${fmt(a)} naar ${fmt(b)} = ?` },
  af: { samen: 'Saam', min: 'minute', rest: 'Wat bly oor?', hoeVaak: (b, r) => `Hoeveel keer gaan ${fmt(b)} in ${fmt(r)}?`, keer: 'keer', tot: (a, b) => `Van ${a} tot ${b} = ? minute`, helen: 'Die heelgetalle', komma: 'Ná die komma', deel: (d, x) => `1/${d} van ${fmt(x)} = ?`, pct: (p, x) => `${p}% van ${fmt(x)} = ?`, aanvul: (a, b) => `Van ${fmt(a)} tot ${fmt(b)} = ?` },
};
const d = (ask, answer, tip, extra = {}) => ({ ask, answer, display: fmt(answer), tip: tip || null, type: 'number', ...extra });
const mm = (x) => `${Math.floor(x / 60) % 24}:${String(x % 60).padStart(2, '0')}`;

// Geeft een lijst deelstappen ({ask, answer, display, tip}) of null (de stap is al klein genoeg, of de app kent hem niet).
export function deelstappen(step, { lang = 'nl' } = {}) {
  if (!step || step.type !== 'number' || typeof step.answer !== 'number') return null;
  if (Array.isArray(step.deel) && step.deel.length) return klopt(step.deel, step); // door de generator meegegeven (eigen route)
  const L = T[lang] || T.nl, tip = (a) => betterTip(a, lang);
  const ask = String(step.ask).replace(/(?:€\s?|\bR\s?)(?=\d)/g, '').replace(/\s*\([^)]*\)\s*(?==)/g, ' ');
  if (KOLOM.test(ask)) return null;
  let m;
  // tijdsduur over het hele uur: "Van 14:36 tot 15:20 = ? minuten"
  if ((m = ask.match(/(\d{1,2}):(\d{2})\s*(?:tot|→|naar)\s*(\d{1,2}):(\d{2})/))) {
    const A = +m[1] * 60 + +m[2], B = +m[3] * 60 + +m[4], H = Math.ceil(A / 60) * 60;
    if (A % 60 && B > H && B - A <= 180) return klopt([d(L.tot(mm(A), mm(H)), H - A, null, { unit: L.min }), d(L.tot(mm(H), mm(B)), B - H, null, { unit: L.min }), d(`${L.samen}: ${H - A} + ${B - H} = ?`, B - A, null, { unit: L.min })], step);
    return null;
  }
  // procent van een getal (de methode: 25/50/75/20% met de breuk, anders via 10% of 1%)
  if ((m = ask.match(new RegExp(`(\\d+)\\s*%\\s*van\\s*${NUM}`, 'i')))) {
    const p = +m[1], X = toN(m[2]);
    const br = { 50: 2, 25: 4, 75: 4, 20: 5 }[p];
    if (br && X % br === 0) { const een = X / br; return klopt(p === 75 ? [d(L.deel(4, X), een, tip(`${fmt(X)} : 4 = ?`)), d(`3 × ${fmt(een)} = ?`, 3 * een, tip(`3 × ${fmt(een)} = ?`))] : [d(L.deel(br, X), een, tip(`${fmt(X)} : ${br} = ?`))], step, true); }
    if (p % 10 === 0 && X % 10 === 0 && p > 10) return klopt([d(L.pct(10, X), X / 10, tip(`${fmt(X)} : 10 = ?`)), d(`${p / 10} × ${fmt(X / 10)} = ?`, (p / 10) * (X / 10), tip(`${p / 10} × ${fmt(X / 10)} = ?`))], step);
    if (p % 5 === 0 && X % 20 === 0 && p > 10) { const t = X / 10, v = X / 20; const n10 = Math.floor(p / 10); return klopt([d(L.pct(10, X), t, tip(`${fmt(X)} : 10 = ?`)), d(L.pct(5, X), v, null), d(`${n10} × ${fmt(t)} + ${fmt(v)} = ?`, n10 * t + v, null)], step); }
    return null;
  }
  // breuk van een getal: "3/4 van 20" → 1/4 van 20, dan 3 ×
  if ((m = ask.match(new RegExp(`(\\d+)\\/(\\d+)\\s*(?:deel\\s*)?van\\s*${NUM}`, 'i')))) {
    const [t, n, X] = [+m[1], +m[2], toN(m[3])];
    if (t > 1 && X % n === 0) return klopt([d(L.deel(n, X), X / n, tip(`${fmt(X)} : ${n} = ?`)), d(`${t} × ${fmt(X / n)} = ?`, (t * X) / n, tip(`${t} × ${fmt(X / n)} = ?`))], step);
    return null;
  }
  // kommagetal + / − kommagetal (zelfde soort): helen en achter de komma apart (de methode: splitsen)
  if ((m = ask.match(/(\d+),(\d{1,2})\s*([+−])\s*(\d+),(\d{1,2})\s*=\s*\?/))) {
    const plus = m[3] === '+', hA = +m[1], hB = +m[4], cA = Number(m[2].padEnd(2, '0')), cB = Number(m[5].padEnd(2, '0'));
    if (!plus && cA < cB) return null; // inwisselen: dat doet de stap zelf al (cijferend)
    if (hA === 0 && hB === 0) return null; // alleen achter de komma: dat is al de kleinste stap
    const h = plus ? hA + hB : hA - hB, c = plus ? cA + cB : cA - cB;
    return klopt([d(`${L.helen}: ${hA} ${m[3]} ${hB} = ?`, h, null), d(`${L.komma}: 0,${String(cA).padStart(2, '0')} ${m[3]} 0,${String(cB).padStart(2, '0')} = ?`, c / 100, lang === 'af' ? `Dink aan sent: ${cA} ${m[3]} ${cB} sent.` : `Denk aan centen: ${cA} ${m[3]} ${cB} cent.`), d(`${L.samen}: ${h} + ${fmt(c / 100, 2)} = ?`, h + c / 100, null)], step);
  }
  // een rij optellingen (9 + 8 + 3 + 5 = ?): één voor één, met de tussenuitkomst steeds erbij
  if ((m = ask.match(new RegExp(`(${NUM}(?:\\s*\\+\\s*${NUM}){2,5})\\s*=\\s*\\?`)))) {
    const xs = m[1].split('+').map(toN); const out = []; let cur = xs[0];
    for (const x of xs.slice(1)) { out.push(d(`${fmt(cur)} + ${fmt(x)} = ?`, cur + x, null)); cur += x; }
    return klopt(out.map((x) => ({ ...x, tip: tip(x.ask) })), step);
  }
  // geld × aantal (3 × € 1,65): de hele euro's en de centen apart (de methode: splitsen)
  if ((m = ask.match(/(?:(\d+)\s*[×x]\s*(\d+),(\d{2})|(\d+),(\d{2})\s*[×x]\s*(\d+))\s*=\s*\?/))) {
    const k = +(m[1] ?? m[6]), h = +(m[2] ?? m[4]), c = +(m[3] ?? m[5]);
    if (k >= 2 && k <= 12 && h >= 1 && c > 0) return klopt([d(`${k} × ${h} = ?`, k * h, null), d(lang === 'af' ? `${k} × ${c} sent = ? sent` : `${k} × ${c} cent = ? cent`, k * c, null, { unit: lang === 'af' ? 'sent' : 'cent' }), d(`${L.samen}: ${k * h} + ${fmt((k * c) / 100, 2)} = ?`, k * h + (k * c) / 100, lang === 'af' ? `${k * c} sent is ${fmt((k * c) / 100, 2)}.` : `${k * c} cent is ${fmt((k * c) / 100, 2)} euro.`)], step);
    return null;
  }
  // geld delen (€ 4,50 : 3): splits in een handig deel en de rest (de methode: 16,20 : 3 = 15 : 3 en 1,20 : 3)
  if ((m = ask.match(/(\d+),(\d{2})\s*[:÷]\s*(\d+)\s*=\s*\?/))) {
    const h = +m[1], c = +m[2], n = +m[3], tot = h * 100 + c, H = Math.floor(h / n) * n, rest = tot - H * 100;
    if (n >= 2 && H > 0 && rest > 0 && rest % n === 0) return klopt([d(`${H} : ${n} = ?`, H / n, null), d(lang === 'af' ? `Oor: ${fmt(rest / 100, 2)} = ${rest} sent. ${rest} sent : ${n} = ? sent` : `Over: ${fmt(rest / 100, 2)} = ${rest} cent. ${rest} cent : ${n} = ? cent`, rest / n, null, { unit: lang === 'af' ? 'sent' : 'cent' }), d(`${L.samen}: ${H / n} + ${fmt(rest / n / 100, 2)} = ?`, H / n + rest / n / 100, null)], step);
    return null;
  }
  // aanvullen tot een hele (van 4,26 naar 5): eerst de centen tot 100
  if ((m = ask.match(/van\s*(\d+),(\d{2})\s*naar\s*(\d+)\s*=\s*\?/i)) && +m[3] === +m[1] + 1) {
    const c = +m[2];
    return klopt([d(lang === 'af' ? `Van ${c} sent tot 100 sent = ? sent` : `Van ${c} cent tot 100 cent = ? cent`, 100 - c, null, { unit: lang === 'af' ? 'sent' : 'cent' }), d(lang === 'af' ? `${100 - c} sent as kommagetal = ?` : `${100 - c} cent als kommagetal (in euro) = ?`, (100 - c) / 100, null)], step);
  }
  const s = ask.match(new RegExp(`(?<![\\d,.]|[\\d]\\s*[×x·:÷−–+-]\\s*)${NUM}\\s*([×x·:÷−–+-])\\s*${NUM}\\s*(?:=\\s*\\?|\\?\\s*$)`));
  if (!s) return null;
  const a = toN(s[1]), op = s[2], b = toN(s[3]);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b <= 0) return null;
  // erbij en eraf: rijgen in stukjes (de methode), over het tiental via het ronde tiental, kleine verschillen aanvullen
  if (['−', '–', '-'].includes(op)) {
    if (b >= a) return null;
    if (a - b < 20 && a > 50 && b % 10) { const R = Math.ceil(b / 10) * 10; return R < a ? klopt([d(L.aanvul(b, R), R - b, null), d(L.aanvul(R, a), a - R, null), d(`${L.samen}: ${R - b} + ${a - R} = ?`, a - b, null)], step) : null; }
    const p = b < 10 ? [b] : parts(b);
    const out = []; let cur = a;
    for (const x of p) {
      if (x < 10 && cur % 10 && x > cur % 10) { const e = cur % 10; out.push(d(`${fmt(cur)} − ${e} = ?`, cur - e, null)); cur -= e; out.push(d(`${fmt(cur)} − ${x - e} = ?`, cur - (x - e), null)); cur -= x - e; }
      else { out.push(d(`${fmt(cur)} − ${fmt(x)} = ?`, cur - x, null)); cur -= x; }
    }
    return out.length >= 2 ? klopt(out.map((x) => ({ ...x, tip: tip(x.ask) })), step) : null;
  }
  if (op === '+') {
    const p = b < 10 ? [b] : parts(b);
    const out = []; let cur = a;
    for (const x of p) {
      if (x < 10 && (cur % 10) + x > 10) { const e = 10 - (cur % 10); out.push(d(`${fmt(cur)} + ${e} = ?`, cur + e, null)); cur += e; out.push(d(`${fmt(cur)} + ${x - e} = ?`, cur + (x - e), null)); cur += x - e; }
      else { out.push(d(`${fmt(cur)} + ${fmt(x)} = ?`, cur + x, null)); cur += x; }
    }
    return out.length >= 2 ? klopt(out.map((x) => ({ ...x, tip: tip(x.ask) })), step) : null;
  }
  if (['×', 'x', '·'].includes(op)) {
    const zeros = (n) => { let k = 0; while (n >= 10 && n % 10 === 0) { n /= 10; k++; } return [n, k]; };
    const [a0, ka] = zeros(a), [b0, kb] = zeros(b);
    // de kleine som (30 × 400: 3 × 4, dan 10 × zo veel en nog eens 100 × zo veel)
    if ((a0 === 1 && ka) || (b0 === 1 && kb)) return null; // × 10, × 100: zet de nullen erachter (de tip zegt het al)
    // één getal rond, het andere niet (70 × 19, 40 × 289): de kleine som zonder de nullen, dan × 10 (cijferend: eerst een 0)
    if ((ka && !kb && b0 > 12) || (kb && !ka && a0 > 12)) {
      const [r0, k, ander] = ka ? [a0, ka, b] : [b0, kb, a];
      return klopt([d(`${r0} × ${fmt(ander)} = ?`, r0 * ander, tip(`${r0} × ${fmt(ander)} = ?`)), d(`${fmt(a)} × ${fmt(b)} = ?`, a * b, lang === 'af' ? `Dit is ${fmt(10 ** k)} keer soveel: sit ${k === 1 ? '’n nul' : k + ' nulle'} agter.` : `Dat is ${fmt(10 ** k)} × zo veel: zet er ${k === 1 ? 'een nul' : k + ' nullen'} achter.`)], step);
    }
    if (ka + kb > 0 && a0 * b0 < 100 && a0 <= 12 && b0 <= 12) {
      const out = [d(`${a0} × ${b0} = ?`, a0 * b0, tip(`${a0} × ${b0} = ?`))];
      if (kb) out.push(d(`${a0} × ${fmt(b)} = ?`, a0 * b, lang === 'af' ? `${fmt(b)} is ${fmt(10 ** kb)} keer soveel as ${b0}: die antwoord ook.` : `${fmt(b)} is ${fmt(10 ** kb)} × zo veel als ${b0}: het antwoord ook.`));
      if (ka) out.push(d(`${fmt(a)} × ${fmt(b)} = ?`, a * b, lang === 'af' ? `${fmt(a)} is ${fmt(10 ** ka)} keer soveel as ${a0}: die antwoord ook.` : `${fmt(a)} is ${fmt(10 ** ka)} × zo veel als ${a0}: het antwoord ook.`));
      return out.length >= 2 ? klopt(out, step) : null;
    }
    // tafelsom via een tafel die je kent (6 × of 7 ×: eerst 5 ×; 9 ×: eerst 10 ×; 8 ×: 4 × en dan dubbel)
    if (a <= 10 && b <= 10) {
      if (a === 9) return klopt([d(`10 × ${b} = ?`, 10 * b, null), d(`${10 * b} − ${b} = ?`, 9 * b, null)], step);
      if (a === 6 || a === 7) return klopt([d(`5 × ${b} = ?`, 5 * b, null), d(`${a - 5} × ${b} = ?`, (a - 5) * b, null), d(`${5 * b} + ${(a - 5) * b} = ?`, a * b, null)], step);
      if (a === 8) return klopt([d(`4 × ${b} = ?`, 4 * b, null), d(`${4 * b} + ${4 * b} = ?`, 8 * b, null)], step);
      return null;
    }
    // splitsen (de methode: 22 × 53 = 20 × 53 + 2 × 53; 7 × 148 = 7 × 100 + 7 × 40 + 7 × 8)
    let [sp, ander, splitsEerste] = a >= 10 && b >= 10 ? [a, b, true] : a >= 10 ? [a, b, true] : [b, a, false];
    if (sp % 10 === 0 && ander % 10) [sp, ander, splitsEerste] = [ander, sp, !splitsEerste];
    const p = parts(sp);
    if (p.length < 2 || p.length > 3 || ander === 1) return null;
    const stuk = p.map((x) => (splitsEerste ? d(`${fmt(x)} × ${fmt(ander)} = ?`, x * ander, null) : d(`${fmt(ander)} × ${fmt(x)} = ?`, x * ander, null)));
    const out = [...stuk.map((x) => ({ ...x, tip: tip(x.ask) })), d(`${L.samen}: ${stuk.map((x) => x.display).join(' + ')} = ?`, a * b, null)];
    return klopt(out, step);
  }
  if ([':', '÷'].includes(op)) {
    const q = a / b;
    if (!Number.isInteger(q) || q <= 2 || b <= 2) return null;
    const zeros = (n) => { let k = 0; while (n >= 10 && n % 10 === 0) { n /= 10; k++; } return [n, k]; };
    const [, kb] = zeros(b), [, ka] = zeros(a);
    // de kleine som (1500 : 30 → 15 : 3; 1500 : 3 is 100 × zo veel; : 30 is 10 × zo weinig)
    if (kb > 0 && ka >= kb) {
      const b0 = b / 10 ** kb, a0 = a / 10 ** ka;
      if (Number.isInteger(a0 / b0) && b0 <= 10) {
        const out = [d(`${fmt(a0)} : ${b0} = ?`, a0 / b0, tip(`${fmt(a0)} : ${b0} = ?`)), d(`${fmt(a)} : ${b0} = ?`, a / b0, lang === 'af' ? `${fmt(a)} is ${fmt(10 ** ka)} keer soveel as ${fmt(a0)}: die antwoord ook.` : `${fmt(a)} is ${fmt(10 ** ka)} × zo veel als ${fmt(a0)}: het antwoord ook.`), d(`${fmt(a)} : ${fmt(b)} = ?`, q, lang === 'af' ? `Jy deel deur ${fmt(b)}, ${fmt(10 ** kb)} keer soveel as ${b0}: die antwoord word ${fmt(10 ** kb)} keer so min.` : `Je deelt door ${fmt(b)}, ${fmt(10 ** kb)} × zo veel als ${b0}: het antwoord wordt ${fmt(10 ** kb)} × zo weinig.`)];
        return klopt(out, step);
      }
    }
    // delen met een keersom die je kent (de methode): 10 ×, 5 × of 2 × de deler, eraf, en hoe vaak past het nog
    const pq = 10 ** (String(q).length - 1);
    let c = q > 10 ? Math.floor(q / pq) * pq : q > 5 ? 5 : 2;
    if (c === q) c = q > 10 ? q - pq : 5;
    if (c <= 0) return null;
    const r = a - c * b;
    return klopt([d(`${c} × ${fmt(b)} = ?`, c * b, tip(`${c} × ${fmt(b)} = ?`)), d(`${L.rest} ${fmt(a)} − ${fmt(c * b)} = ?`, r, tip(`${fmt(a)} − ${fmt(c * b)} = ?`)), d(L.hoeVaak(b, r), r / b, tip(`${fmt(r)} : ${fmt(b)} = ?`)), d(`${L.samen}: ${c} + ${r / b} = ?`, q, null)], step);
  }
  return null;
}
// De ketting moet kloppen: elke deelstap een geheel of net getal en de laatste = de uitkomst van de stap.
function klopt(lijst, step, magKort = false) {
  if (!lijst?.length || (!magKort && lijst.length < 2)) return null;
  const last = lijst.at(-1);
  if (Math.abs(Number(last.answer) - Number(step.answer)) > 1e-9) return null;
  if (lijst.some((x) => !Number.isFinite(x.answer) || x.answer < 0 || Math.abs(x.answer * 1000 - Math.round(x.answer * 1000)) > 1e-6)) return null;
  return lijst.map((x) => ({ ...x, display: x.display ?? fmt(x.answer) }));
}

// Een mini-voorbeeld dat de app helemaal voordoet (met uitkomst), van dezelfde soort als de deelstap, met kleinere getallen.
// Geeft { som, uitkomst, hoe } of null. "hoe" = de aanpak in één zin (dezelfde route als de tip).
export function voordoen(deel, verboden = [], lang = 'nl') {
  const v = makkelijker(deel.ask, deel.answer, verboden);
  if (!v) return null;
  const som = String(v.som).replace(/\s*=\s*\?\s*$/, '');
  return { som, uitkomst: v.uitkomst, hoe: betterTip(`${som} = ?`, lang) || deel.tip || null };
}
