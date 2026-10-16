// Bekende denkfouten herkennen aan het foute antwoord (zonder AI).
// Per soort som: welke foute antwoorden horen bij welke denkfout, en wat helpt.
import { round } from './util.js';

const n = (s) => Number(String(s).replace(/\s| /g, '').replace('−', '-').replace(',', '.'));
const W = (answer, label, fix) => ({ answer, label, fix });

// Geeft [{answer: number | [teller, noemer], label, fix}] terug (zonder het goede antwoord)
export function misconceptionsFor(q) {
  const t = q.text;
  const out = [];
  let m;

  // --- breuken optellen/aftrekken: boven én onder opgeteld ---
  if ((m = t.match(/^(\d+)\/(\d+) ([+−]) (\d+)\/(\d+) =$/))) {
    const [a, b, op, c, d] = [+m[1], +m[2], m[3], +m[4], +m[5]];
    if (op === '+') out.push(W([a + c, b + d], 'Je hebt de getallen boven én onder de streep opgeteld.', 'Maak eerst de stukjes even groot (zelfde getal onder de streep). Alleen de bovenste getallen tel je op.'));
    else if (b !== d) out.push(W([Math.abs(a - c), Math.abs(b - d)], 'Je hebt boven en onder de streep allebei afgetrokken.', 'Maak eerst de stukjes even groot. Daarna trek je alleen de bovenste getallen af.'));
    if (b !== d) out.push(W([op === '+' ? a + c : Math.abs(a - c), Math.max(b, d)], 'Je hebt alleen de bovenste getallen samen genomen, maar de stukjes waren nog niet even groot.', 'Zoek eerst een getal waar beide onderste getallen in passen.'));
  }
  // --- deel van een getal: alleen gedeeld, keer vergeten ---
  if ((m = t.match(/^Hoeveel is (\d+)\/(\d+) deel van (\d+)\?$/)) && +m[1] > 1) {
    out.push(W(+m[3] / +m[2], `Je hebt 1/${m[2]} deel uitgerekend, maar er werd ${m[1]}/${m[2]} gevraagd.`, `Eerst 1/${m[2]} deel, en dat dan nog keer ${m[1]}.`));
  }
  // --- procent van: het percentage zelf, of gedeeld door het procent ---
  if ((m = t.match(/^Hoeveel is (\d+)% van (\d+)\?$/))) {
    const [p, b] = [+m[1], +m[2]];
    out.push(W(p, 'Je hebt alleen het procent opgeschreven, niet uitgerekend hoeveel dat is.', `${p}% is ${p} van elke 100. Begin met 10%: deel ${b} door 10.`));
    if (b % p === 0) out.push(W(b / p, `Je hebt ${b} gedeeld door ${p}.`, 'Bij procenten deel je eerst door 100 (of door 10 voor 10%), en dan keer het procent.'));
    out.push(W(b - p, 'Je hebt het procent ervan afgehaald.', 'Een procent is een deel van het getal, geen getal om af te trekken.'));
  }
  // --- korting: de korting gegeven in plaats van de nieuwe prijs ---
  if ((m = t.match(/kost €\s?([\d,]+)\. Je krijgt (\d+)% korting\. Wat is de nieuwe prijs\?/))) {
    const [P, p] = [n(m[1]), +m[2]];
    out.push(W(round((P * p) / 100), 'Je hebt de korting uitgerekend, maar niet de nieuwe prijs.', 'Goed begin! Haal de korting nu nog van de oude prijs af.'));
    out.push(W(round(P - p), 'Je hebt het procent gebruikt alsof het euro’s zijn.', `${p}% korting is niet € ${p} korting. Reken eerst uit hoeveel euro ${p}% is.`));
  }
  // --- "hoeveel procent is dat": het aantal gegeven ---
  if ((m = t.match(/zitten (\d+) kinderen\. (\d+) kinderen hebben een huisdier\. Hoeveel procent/))) {
    out.push(W(+m[2], 'Je gaf het aantal kinderen, niet het procent.', 'Procent = hoeveel van de 100. Maak van de breuk iets met 100 onder de streep.'));
  }
  // --- maten omrekenen: verkeerde factor of verkeerde kant op ---
  if (/^[\d,\s ]+ (meter|km|m|mm|cm|gram|kg|kilo|ml|liter|dl|cl|m²|cm³|m³|hectare) = \.\.\. /.test(t) && typeof q.answer === 'number') {
    const A = q.answer;
    for (const [w, why] of [[A * 10, 'Je bent één trede te ver gegaan op de trap.'], [A / 10, 'Je bent één trede te kort gegaan op de trap.'], [A * 100, 'Je ging de verkeerde kant op de trap op, of 2 treden te ver.'], [A / 100, 'Je ging de verkeerde kant op de trap op, of 2 treden te kort.']]) {
      out.push(W(round(w, 6), why, 'Kan Het Dametje Met De Centimeter Meten: tel de treden. Naar beneden = keer, naar boven = delen.'));
    }
  }
  // --- uren naar minuten: een uur als 100 minuten ---
  if ((m = t.match(/^([\d,]+) uur = \.\.\. minuten$/))) {
    out.push(W(round(n(m[1]) * 100), 'Je rekende alsof een uur 100 minuten heeft.', 'Een uur is 60 minuten. Een half uur is 30, een kwartier 15.'));
  }
  // --- tijdsduur: klokgetallen als gewone getallen afgetrokken ---
  if ((m = t.match(/begint om (\d{1,2}):(\d{2}) en is afgelopen om (\d{1,2}):(\d{2})/))) {
    const a = +(m[1] + m[2]), b = +(m[3] + m[4]);
    if (b - a !== q.answer) out.push(W(b - a, 'Je hebt de tijden als gewone getallen afgetrokken.', 'Bij de klok gaat een uur maar tot 60 minuten. Tel eerst door naar het hele uur.'));
  }
  // --- bussen: naar beneden afgerond ---
  if (/Hoeveel bussen zijn er nodig\?/.test(t)) {
    out.push(W(q.answer - 1, 'Je bent de kinderen van de rest vergeten.', 'Er blijven kinderen over: die moeten ook mee, dus nog een bus extra.'));
  }
  // --- omtrek en oppervlakte verwisseld ---
  if ((m = t.match(/is (\d+) m lang en (\d+) m breed\. Hoe groot is de (oppervlakte|omtrek)/))) {
    const [l, b] = [+m[1], +m[2]];
    if (m[3] === 'oppervlakte') out.push(W(2 * (l + b), 'Je hebt de omtrek (de rand rondom) uitgerekend.', 'Oppervlakte = de vloer vol tegels: lengte × breedte.'));
    else { out.push(W(l * b, 'Je hebt de oppervlakte (de vloer) uitgerekend.', 'Omtrek = de rand rondom: tel alle 4 de zijden op.')); out.push(W(l + b, 'Je hebt maar 2 kanten opgeteld.', 'Een rechthoek heeft 4 kanten: 2 lange en 2 korte.')); }
  }
  // --- plaatswaarde: het cijfer in plaats van de waarde ---
  if ((m = t.match(/^Hoeveel is de (\d) waard in het getal/))) {
    out.push(W(+m[1], 'Je gaf het cijfer, maar niet hoeveel het waard is.', 'Kijk op welke plek het staat: tientallen, honderdtallen, duizendtallen…'));
  }
  // --- afronden: verkeerde kant op ---
  if ((m = t.match(/^Rond ([\d\s ]+) af op (tientallen|honderdtallen|duizendtallen)/))) {
    const step = { tientallen: 10, honderdtallen: 100, duizendtallen: 1000 }[m[2]];
    const N = n(m[1]);
    const other = q.answer > N ? q.answer - step : q.answer + step;
    out.push(W(other, 'Je hebt naar de verkeerde kant afgerond.', '0 t/m 4: naar beneden. 5 t/m 9: naar boven. Kijk naar het cijfer rechts ervan.'));
  }
  // --- gemiddelde: opgeteld maar niet gedeeld ---
  if (/Wat is het gemiddelde cijfer\?/.test(t)) {
    const vals = (t.match(/cijfers voor rekenen: ([\d, ]+)\./)?.[1] || '').split(',').map((x) => +x.trim()).filter(Boolean);
    if (vals.length) out.push(W(vals.reduce((a, b) => a + b, 0), 'Je hebt alles opgeteld, maar nog niet eerlijk verdeeld.', `Deel het totaal nog door het aantal getallen (${vals.length}).`));
  }
  // --- kommagetallen optellen: komma's niet onder elkaar ---
  if ((m = t.match(/^(\d+),(\d) \+ (\d+),(\d\d) =$/))) {
    const wrong = +m[1] + +m[2] / 100 + n(`${m[3]},${m[4]}`);
    out.push(W(round(wrong), `Je hebt ${m[1]},${m[2]} gelezen als ${m[1]},0${m[2]}.`, `Komma onder komma: ${m[1]},${m[2]} = ${m[1]},${m[2]}0 (net als bij geld).`));
  }
  // --- kommagetallen keer: komma op de verkeerde plek ---
  if ((m = t.match(/^(\d+,\d) × (\d+,\d) =$/))) {
    const ra = Math.round(n(m[1])), rb = Math.round(n(m[2]));
    const fix = `Schat: reken met ronde getallen ongeveer uit. ${m[1]} is ongeveer ${ra}, ${m[2]} is ongeveer ${rb}, en ${ra} × ${rb} = ${ra * rb}. Zet de komma zo dat je antwoord in de buurt van ${ra * rb} ligt.`;
    out.push(W(round(q.answer * 10), 'De komma staat één plek te ver naar rechts: je antwoord is 10 keer te groot.', fix));
    out.push(W(round(q.answer / 10), 'De komma staat één plek te ver naar links: je antwoord is 10 keer te klein.', fix));
  }
  // --- aftrekken onder elkaar: per kolom klein van groot (lenen vergeten) ---
  if ((m = t.match(/^([\d\s ]+) − ([\d\s ]+) =$/))) {
    const a = String(n(m[1])), b = String(n(m[2])).padStart(a.length, '0');
    const digits = a.split('').map((d, i) => Math.abs(+d - +b[i])).join('');
    if (+digits !== q.answer) out.push(W(+digits, 'Je hebt bij elk cijfer het kleinste van het grootste afgehaald.', 'Haal het getal er in stukken af (rijgen), net als op de getallenlijn: eerst de duizendtallen, dan de honderdtallen, dan de tientallen en de eenheden.'));
  }
  // --- verhoudingen: erbij geteld in plaats van keer ---
  if ((m = t.match(/^(\d+) [a-z ]+ kosten € (\d+)\. Hoeveel kosten (\d+) /))) {
    const [a, P, b] = [+m[1], +m[2], +m[3]];
    out.push(W(P + (b - a), 'Je hebt opgeteld in plaats van keer gerekend.', `Als je ${b / a} keer zoveel koopt, betaal je ook ${b / a} keer zoveel.`));
  }
  // --- schaal: niet omgerekend naar km ---
  if (/Hoeveel kilometer is dat in het echt\?/.test(t) && typeof q.answer === 'number') {
    out.push(W(round(q.answer * 100000), 'Je hebt alleen naar centimeters omgerekend.', 'Reken nog om: van cm naar m (: 100) en van m naar km (: 1000).'));
    out.push(W(round(q.answer * 1000), 'Je hebt alleen naar meters omgerekend.', 'Nog één stap: van m naar km is delen door 1000.'));
  }

  // dubbelen en het goede antwoord eruit
  const same = (x) => (Array.isArray(x) && Array.isArray(q.answer) ? x[0] * q.answer[1] === q.answer[0] * x[1] : x === q.answer);
  const seen = new Set();
  return out.filter((w) => {
    const key = JSON.stringify(w.answer);
    if (seen.has(key) || same(w.answer) || (typeof w.answer === 'number' && (!Number.isFinite(w.answer) || w.answer < 0))) return false;
    seen.add(key);
    return true;
  });
}

// Welke denkfout past bij dit foute antwoord? (check = checkAnswer uit generators.js)
export function detectMisconception(q, given, check) {
  for (const w of q.wrong || []) {
    const probe = { ...q, answer: w.answer, requireSimplest: false, commonMultipleOf: undefined };
    if (check(probe, given).correct) return { label: w.label, fix: w.fix };
  }
  return null;
}
