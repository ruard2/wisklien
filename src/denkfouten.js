// Algemene denkfouten bij kale sommen (+ − × ÷), voor NL en AF.
//
// Waarom: maar 20% (NL) en 48% (AF) van de sjablonen had een eigen lijst met denkfouten. Bij de rest weet de app niet hoe
// een kind aan zijn foute antwoord kwam, en moet Max dat eerst vragen. Bij kale sommen zijn de echte foute manieren
// voorspelbaar (onthouden vergeten, kleinste van grootste per kolom, ernaast in de tafel, nul vergeten …): die rekent de
// app hier uit. Een foute uitkomst die bij twee verschillende denkfouten past, nemen we niet op (dan weten we het niet).
const nr = (s) => Number(String(s).replace(/[\s  ]/g, ''));
const cijfers = (x, n) => String(x).padStart(n, '0').split('').map(Number);

function zonderOnthouden(a, b) { // per kolom optellen en alleen het laatste cijfer opschrijven
  const n = Math.max(String(a).length, String(b).length), A = cijfers(a, n), B = cijfers(b, n);
  return Number(A.map((x, i) => (x + B[i]) % 10).join(''));
}
function kleinsteVanGrootste(a, b) { // per kolom het kleinste cijfer van het grootste
  const n = String(a).length, A = cijfers(a, n), B = cijfers(b, n);
  return Number(A.map((x, i) => Math.abs(x - B[i])).join(''));
}
function lenenNietVerlaagd(a, b) { // wel 10 erbij geleend, maar de kolom links niet 1 lager gemaakt
  const n = String(a).length, A = cijfers(a, n), B = cijfers(b, n);
  return Number(A.map((x, i) => (x >= B[i] ? x - B[i] : x + 10 - B[i])).join(''));
}

const T = {
  nl: {
    onthouden: ['Je bent het onthouden vergeten: de tien uit de kolom ernaast telde je niet mee.', 'Komt een kolom boven de 9, schrijf dan de 1 klein boven de volgende kolom en tel die mee.'],
    kleinste: ['Je hebt in elke kolom het kleinste cijfer van het grootste afgehaald.', 'Je haalt altijd het onderste getal eraf. Gaat dat niet? Leen dan 1 van de kolom links (die wordt 1 kleiner).'],
    lenen: ['Je hebt wel geleend, maar de kolom links niet 1 kleiner gemaakt.', 'Leen je 10 van de kolom links, streep die dan door en schrijf er 1 minder boven.'],
    plusMin: ['Je hebt afgetrokken in plaats van opgeteld.', 'Kijk goed naar het teken: + betekent erbij.'],
    minPlus: ['Je hebt opgeteld in plaats van afgetrokken.', 'Kijk goed naar het teken: − betekent eraf.'],
    keerPlus: ['Je hebt opgeteld in plaats van keer gerekend.', (a, b) => `× betekent "keer": ${b} groepjes van ${a}. Tel ${a} dus ${b} keer.`],
    tafelMin: [(a, b) => `Je zat één rijtje ernaast in de tafel: je rekende ${b - 1} × ${a}.`, (a, b) => `Tel vanaf een som die je zeker weet (bijv. 10 × ${a} of 5 × ${a}) verder in sprongen van ${a}.`],
    tafelPlus: [(a, b) => `Je zat één rijtje ernaast in de tafel: je rekende ${b + 1} × ${a}.`, (a, b) => `Tel vanaf een som die je zeker weet (bijv. 10 × ${a} of 5 × ${a}) verder in sprongen van ${a}.`],
    nul: ['Je bent een nul vergeten.', 'Reken eerst zonder de nullen en zet ze er daarna allemaal achter.'],
    deelKeer: ['Je hebt keer gerekend in plaats van gedeeld.', 'Bij : verdeel je: hoe vaak past het tweede getal in het eerste?'],
    deelMin: ['Je antwoord is één keer te weinig: er past nog één keer bij.', (a, b) => `Controleer met keer: jouw antwoord × ${b}, hoeveel blijft er dan nog over van ${a}?`],
    deelPlus: ['Je antwoord is één keer te veel.', (a, b) => `Controleer met keer: jouw antwoord × ${b} is meer dan ${a}.`],
  },
  af: {
    onthouden: ['Jy het vergeet om oor te dra: die tien uit die kolom langsaan het jy nie bygetel nie.', 'Is ’n kolom meer as 9, skryf die 1 klein bo die volgende kolom en tel dit by.'],
    kleinste: ['Jy het in elke kolom die kleiner syfer van die groter syfer afgetrek.', 'Die onderste syfer word altyd afgetrek. Gaan dit nie? Ruil 1 van die kolom links om (daardie kolom word 1 minder).'],
    lenen: ['Jy het wel omgeruil, maar die kolom links nie 1 minder gemaak nie.', 'Ruil jy 1 van die kolom links om, trek dit deur en skryf een minder daarbo.'],
    plusMin: ['Jy het afgetrek in plaas van bygetel.', 'Kyk mooi na die teken: + beteken byvoeg.'],
    minPlus: ['Jy het bygetel in plaas van afgetrek.', 'Kyk mooi na die teken: − beteken weghaal.'],
    keerPlus: ['Jy het bygetel in plaas van gemaal.', (a, b) => `× beteken "maal": ${b} groepe van ${a}. Tel ${a} dus ${b} keer.`],
    tafelMin: [(a, b) => `Jy was een ry langsaan in die maaltafel: jy het ${b - 1} × ${a} uitgewerk.`, (a, b) => `Begin by ’n som wat jy seker weet (bv. 10 × ${a} of 5 × ${a}) en spring verder in spronge van ${a}.`],
    tafelPlus: [(a, b) => `Jy was een ry langsaan in die maaltafel: jy het ${b + 1} × ${a} uitgewerk.`, (a, b) => `Begin by ’n som wat jy seker weet (bv. 10 × ${a} of 5 × ${a}) en spring verder in spronge van ${a}.`],
    nul: ['Jy het ’n nul vergeet.', 'Werk eers sonder die nulle en sit hulle daarna almal agteraan.'],
    deelKeer: ['Jy het gemaal in plaas van gedeel.', 'By ÷ verdeel jy: hoeveel keer gaan die tweede getal in die eerste?'],
    deelMin: ['Jou antwoord is een keer te min: dit gaan nog een keer in.', (a, b) => `Kontroleer met maal: jou antwoord × ${b}, hoeveel bly dan nog oor van ${a}?`],
    deelPlus: ['Jou antwoord is een keer te veel.', (a, b) => `Kontroleer met maal: jou antwoord × ${b} is meer as ${a}.`],
  },
};

export function algemeneDenkfouten(q, lang = 'nl') {
  const m = String(q.text || '').trim().match(/^(\d[\d  ]*)\s*([+−×÷:])\s*(\d[\d  ]*)\s*=\s*(\.\.\.|…|\?)?\s*$/);
  if (!m || q.type !== 'number' || typeof q.answer !== 'number') return [];
  const a = nr(m[1]), op = m[2], b = nr(m[3]), L = T[lang === 'af' ? 'af' : 'nl'];
  const tekst = (x, ...args) => (typeof x === 'function' ? x(...args) : x);
  const kand = [];
  const voeg = (answer, [label, fix]) => { if (Number.isFinite(answer) && answer >= 0 && answer !== q.answer) kand.push({ answer, label: tekst(label, a, b), fix: tekst(fix, a, b) }); };
  if (op === '+') { voeg(zonderOnthouden(a, b), L.onthouden); if (a > b) voeg(a - b, L.plusMin); }
  if (op === '−' && a >= b) { voeg(kleinsteVanGrootste(a, b), L.kleinste); voeg(lenenNietVerlaagd(a, b), L.lenen); voeg(a + b, L.minPlus); }
  if (op === '×') {
    voeg(a + b, L.keerPlus);
    const [g, k] = a >= b ? [a, b] : [b, a]; // tafelfout: ernaast in de tafel van het grootste getal (bij tafelsommen)
    if (g <= 12 && k <= 12 && k >= 2) { voeg(g * (k - 1), [(x, y) => tekst(L.tafelMin[0], g, k), (x, y) => tekst(L.tafelMin[1], g, k)]); voeg(g * (k + 1), [(x, y) => tekst(L.tafelPlus[0], g, k), (x, y) => tekst(L.tafelPlus[1], g, k)]); }
    if ((a % 10 === 0 || b % 10 === 0) && q.answer % 10 === 0) voeg(q.answer / 10, L.nul);
  }
  if ((op === ':' || op === '÷') && b > 1 && Number.isInteger(q.answer)) {
    voeg(a * b, L.deelKeer);
    if (q.answer > 1) voeg(q.answer - 1, L.deelMin);
    voeg(q.answer + 1, L.deelPlus);
    if (a % 10 === 0 && q.answer % 10 === 0) voeg(q.answer / 10, L.nul);
  }
  // past een foute uitkomst bij twee denkfouten, of bij een denkfout die het sjabloon al kent, dan laten we hem weg
  const bekend = new Set((q.wrong || []).map((w) => JSON.stringify(w.answer)));
  const telling = {};
  for (const k of kand) telling[k.answer] = (telling[k.answer] || 0) + 1;
  return kand.filter((k) => telling[k.answer] === 1 && !bekend.has(JSON.stringify(k.answer)));
}
