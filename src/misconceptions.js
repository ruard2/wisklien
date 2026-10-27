// Bekende denkfouten herkennen aan het foute antwoord (zonder AI).
// Per soort som: welke foute antwoorden horen bij welke denkfout, en wat helpt.
import { round } from './util.js';
import { isAF } from './i18n.js';

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
    if (op === '+') out.push(W([a + c, b + d], 'Je hebt de getallen boven én onder de streep opgeteld.', b === d ? `De stukjes zijn al even groot (allebei ${b}e delen). Het getal onder de streep blijft ${b}: tel alleen de bovenste getallen op.` : 'Maak eerst de stukjes even groot (zelfde getal onder de streep). Alleen de bovenste getallen tel je op.'));
    else if (b !== d) out.push(W([Math.abs(a - c), Math.abs(b - d)], 'Je hebt boven en onder de streep allebei afgetrokken.', 'Maak eerst de stukjes even groot. Daarna trek je alleen de bovenste getallen af.'));
    if (b !== d) out.push(W([op === '+' ? a + c : Math.abs(a - c), Math.max(b, d)], 'Je hebt alleen de bovenste getallen samen genomen, maar de stukjes waren nog niet even groot.', 'Zoek eerst een getal waar beide onderste getallen in passen.'));
  }
  // --- breuk als kommagetal: teller en noemer achter de komma gezet (1/4 → 1,4) ---
  if ((m = t.match(/^Schrijf (\d+)\/(\d+) als kommagetal/))) {
    out.push(W(Number(`${m[1]}.${m[2]}`), 'Je hebt de teller en de noemer achter elkaar gezet, met een komma ertussen.', `Een breuk is een deel van 1: denk aan geld. Hoeveel cent is ${m[1]}/${m[2]} euro?`));
  }
  // --- deel van een getal: alleen gedeeld, keer vergeten ---
  if ((m = t.match(/^Hoeveel is (\d+)\/(\d+) deel van (\d+)\?$/)) && +m[1] > 1) {
    out.push(W(+m[3] / +m[2], `Je hebt 1/${m[2]} deel uitgerekend, maar er werd ${m[1]}/${m[2]} gevraagd.`, `Eerst 1/${m[2]} deel, en dat dan nog keer ${m[1]}.`));
  }
  // --- procent van: het percentage zelf, of gedeeld door het procent ---
  if ((m = t.match(/^Hoeveel is (\d+)% van (\d+)\?$/))) {
    const [p, b] = [+m[1], +m[2]];
    const route = { 50: `50% is de helft: deel ${b} door 2.`, 25: `25% is een kwart: deel ${b} door 4.`, 75: `75% is drie kwart: eerst een kwart (${b} : 4), dan keer 3.`, 10: `10% is 1 van elke 10: deel ${b} door 10.`, 1: `1% is 1 van elke 100: deel ${b} door 100.`, 100: '100% is het hele getal.' }[p]
      || (p % 10 === 0 ? `Begin met 10%: deel ${b} door 10, en dan keer ${p / 10}.` : p === 5 ? `5% is de helft van 10%: eerst ${b} : 10, dan de helft.` : p > 10 && p % 10 === 5 ? `Begin met 10%: deel ${b} door 10. ${p}% = ${Math.floor(p / 10)} × 10% en nog 5% (de helft van 10%).` : p > 10 ? `Begin met 10%: deel ${b} door 10. ${p}% = ${Math.floor(p / 10)} × 10% en nog ${p % 10} × 1% (1% = ${b} : 100).` : `Begin met 1%: deel ${b} door 100, en dan keer ${p}.`);
    out.push(W(p, 'Je hebt alleen het procent opgeschreven, niet uitgerekend hoeveel dat is.', `${p}% is ${p} van elke 100. ${route}`));
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
  // --- maten optellen: zonder om te rekenen opgeteld (6 km + 1530 m als 1536) ---
  if ((m = t.match(/^(\d+) (km|kg|m|liter) \+ ([\d.]+) (m|gram|cm|ml) = \.\.\./))) {
    out.push(W(+m[1] + n(m[3]), 'Je hebt de getallen opgeteld, maar het waren verschillende maten.', `Maak eerst dezelfde maat: hoeveel ${m[4]} is ${m[1]} ${m[2]}? Tel daarna pas op.`));
  }
  // --- ons/pond/hg: verkeerde maat onthouden ---
  if ((m = t.match(/^(\d+) (ons|hg|pond) = \.\.\. gram/))) {
    out.push(W(+m[1] * 10, `Je hebt 1 ${m[2]} als 10 gram genomen.`, m[2] === 'pond' ? 'Een pond is een halve kilo: 500 gram.' : 'Een ons is een hectogram: 100 gram (trap kg – hg – dag – g).'));
    if (m[2] === 'pond') out.push(W(+m[1] * 1000, 'Je hebt 1 pond als een hele kilo genomen.', 'Een pond is een halve kilo: 500 gram.'));
  }
  // --- prijs bij een gewicht: cent als euro geschreven ---
  if (/^1 kilo .* kost €\s?[\d,]+\. Hoeveel kost \d+ gram\?$/.test(t) && typeof q.answer === 'number') {
    out.push(W(round(q.answer * 100), 'Je hebt het bedrag in cent als euro’s geschreven.', 'Je rekende in cent. 100 cent is 1 euro: zet het terug naar euro (met de komma).'));
  }
  // --- blokjes in een doos: maten opgeteld in plaats van laag × lagen ---
  if ((m = t.match(/is (\d+) dm lang, (\d+) dm breed en (\d+) dm hoog\. Hoeveel blokjes van 1 dm³/))) {
    out.push(W(+m[1] + +m[2] + +m[3], 'Je hebt de lengte, breedte en hoogte opgeteld.', 'Tel eerst hoeveel blokjes er op de bodem passen (lengte × breedte), en dan hoeveel lagen erop passen.'));
  }
  // --- maten omrekenen: verkeerde factor of verkeerde kant op ---
  if (/^[\d,\s ]+ (meter|km|m|mm|cm|gram|kg|kilo|ml|liter|dl|cl|m²|cm³|m³|hectare) = \.\.\. /.test(t) && typeof q.answer === 'number') {
    // De uitleg hangt af van de richting: naar een grotere maat deel je, naar een kleinere maat doe je keer.
    // (Max-test: "één trede te ver" bij 128 mm → 1,28 m klopte niet; het kind had juist één keer te weinig gedeeld.)
    const A = q.answer, v = Number(t.match(/^([\d,\s ]+)/)[1].replace(/[\s ]/g, '').replace(',', '.'));
    const delen = A < v;
    const lab = delen
      ? [[A * 10, 'Je hebt één keer te weinig door 10 gedeeld: je antwoord is 10 keer te groot.'], [A / 10, 'Je hebt één keer te veel door 10 gedeeld: je antwoord is 10 keer te klein.'],
        [A * 100, 'Je hebt twee keer te weinig door 10 gedeeld: je antwoord is 100 keer te groot.'], [A / 100, 'Je hebt twee keer te veel door 10 gedeeld: je antwoord is 100 keer te klein.']]
      : [[A * 10, 'Je hebt één keer te veel keer 10 gedaan: je antwoord is 10 keer te groot.'], [A / 10, 'Je hebt één keer te weinig keer 10 gedaan: je antwoord is 10 keer te klein.'],
        [A * 100, 'Je hebt twee keer te veel keer 10 gedaan: je antwoord is 100 keer te groot.'], [A / 100, 'Je hebt twee keer te weinig keer 10 gedaan: je antwoord is 100 keer te klein.']];
    if (v > 0 && v !== A) lab.unshift([(v * v) / A, delen ? 'Je ging de verkeerde kant op de trap: je deed keer, maar naar een grotere maat moet je delen.' : 'Je ging de verkeerde kant op de trap: je deelde, maar naar een kleinere maat moet je keer doen.']);
    for (const [w, why] of lab) out.push(W(round(w, 6), why, 'Kan Het Dametje Met De Centimeter Meten: tel de treden. Naar beneden = keer, naar boven = delen.'));
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
    else { out.push(W(l * b, 'Je hebt de oppervlakte (de vloer) uitgerekend.', 'Omtrek = de rand rondom: eerst lengte + breedte (een halve rand), en dat keer 2.')); out.push(W(l + b, 'Je hebt maar 2 kanten opgeteld.', 'Een rechthoek heeft 4 kanten: 2 lange en 2 korte.')); }
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
    if (+digits !== q.answer) out.push(W(+digits, 'Je hebt bij elk cijfer het kleinste van het grootste afgehaald.', `Haal het getal er in stukken af (rijgen), net als op de getallenlijn: ${b.replace(/^0+/, '').length >= 4 ? 'eerst de duizendtallen, dan de honderdtallen, dan de tientallen en de eenheden' : b.replace(/^0+/, '').length === 3 ? 'eerst de honderdtallen, dan de tientallen en dan de eenheden' : 'eerst de tientallen, dan de eenheden'}.`));
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
  // Past het antwoord bij twee verschillende denkfouten, dan weten we het niet zeker (meetlat AF #7: patrone.1b, deling.2c):
  // geen label, zodat Max vraagt hoe het kind het deed in plaats van een verkeerde oorzaak te noemen.
  const raak = [];
  for (const w of q.wrong || []) {
    const probe = { ...q, answer: w.answer, requireSimplest: false, commonMultipleOf: undefined };
    if (check(probe, given).correct && !raak.some((x) => x.label === w.label)) raak.push(w);
  }
  if (raak.length === 1) return { label: raak[0].label, fix: raak[0].fix };
  if (raak.length > 1) return null;
  // Algemeen (elke soort som met een getal als antwoord): precies 10, 100 of 1000 keer te groot of te klein = de komma
  // (of een nul) op de verkeerde plek. Meetlat AF #5: "3732" bij 373,2 en "3310"-achtige fouten bleven onherkend.
  // Komma weggelaten (Na een fout AF #29: "445" bij R44,50 en "3088" bij 308,8 kregen "10 keer te groot", terwijl het kind
  // gewoon de komma (en bij geld de nul van de centen) wegliet): het antwoord met dezelfde cijfers zonder komma.
  if (q.type === 'number' && typeof q.answer === 'number' && !Number.isInteger(q.answer)) {
    const geld = /^(€|R)/.test(String(q.display).trim());
    const cijfers = (x) => String(x).replace(/[^\d,.]/g, '').replace(/[.,]/g, '');
    const juist2 = q.answer.toFixed(2).replace('.', ''), juist = String(q.answer).replace('.', '');
    const kind = cijfers(String(given).replace(/^\s*(€|R)\s*/i, ''));
    const zonderNul = juist2.replace(/0$/, '');
    if (!/[.,]/.test(String(given)) && kind && (kind === juist || kind === juist2 || kind === zonderNul) && Number(kind) !== q.answer) {
      if (isAF()) return geld
        ? { label: 'Jy het die komma weggelaat: die rande en die sent staan aan mekaar geskryf.', fix: 'Skryf eers die rande, dan ’n komma, dan altyd twee syfers vir die sent (R44,50).' }
        : { label: 'Jy het die komma vergeet.', fix: 'Beraam eers: omtrent hoe groot moet die antwoord wees? Sit dan die komma sodat dit pas.' };
      return geld
        ? { label: 'Je hebt de komma weggelaten: de euro’s en de centen staan aan elkaar.', fix: 'Schrijf eerst de euro’s, dan een komma, dan altijd twee cijfers voor de centen (€ 44,50).' }
        : { label: 'Je bent de komma vergeten.', fix: 'Hoe groot moet het antwoord ongeveer zijn (reken met ronde getallen)? Zet de komma dan zo dat het klopt.' };
    }
  }
  if (q.type === 'number' && typeof q.answer === 'number' && q.answer !== 0) {
    for (const k of [10, 100, 1000]) for (const groter of [true, false]) {
      const probe = { ...q, answer: round(groter ? q.answer * k : q.answer / k, 6) };
      if (!check(probe, given).correct) continue;
      const komma = !Number.isInteger(q.answer) || !Number.isInteger(probe.answer);
      const x = k === 1000 ? '1 000' : String(k);
      if (isAF()) return komma
        ? { label: `Jou antwoord is ${x} keer te ${groter ? 'groot' : 'klein'}: die komma staan op die verkeerde plek.`, fix: 'Beraam eers: omtrent hoe groot moet die antwoord wees? Sit dan die komma sodat dit pas.' }
        : { label: `Jou antwoord is ${x} keer te ${groter ? 'groot' : 'klein'}: daar is ${groter ? '’n nul te veel' : '’n nul te min'}.`, fix: 'Beraam eers: omtrent hoe groot moet die antwoord wees? Tel dan die nulle.' };
      return komma
        ? { label: `Je antwoord is ${x} keer te ${groter ? 'groot' : 'klein'}: de komma staat op de verkeerde plek.`, fix: 'Hoe groot moet het antwoord ongeveer zijn (reken met ronde getallen)? Zet de komma dan zo dat het klopt.' }
        : { label: `Je antwoord is ${x} keer te ${groter ? 'groot' : 'klein'}: er is ${groter ? 'een nul te veel' : 'een nul te weinig'}.`, fix: 'Hoe groot moet het antwoord ongeveer zijn (reken met ronde getallen)? Tel dan de nullen.' };
    }
  }
  return null;
}
