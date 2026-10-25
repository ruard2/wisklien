// Betere tips bij tussenstappen. De Max-test liet zien dat veel tips te kaal waren ("Tafel van 3.", "Trek af.",
// "Een gewone tafelsom.", "Tafelsom of splitsen: 24 × 7."): ze herhalen de opdracht maar zeggen niet HOE.
// Is een tip vaag en is de tussenstap een gewone som (a × b, a : b, a − b, a + b), dan maken we er een concrete
// aanpak van, zonder de uitkomst te noemen. Goede tips (met een eigen aanpak) blijven staan.
const NUM = String.raw`(\d{1,3}(?:[ .\u00a0\u202f\u2009]\d{3})+|\d+)`;
const toN = (s) => Number(String(s).replace(/[ .\u00a0\u202f\u2009]/g, ''));

// Vaag = geen eigen aanpak: kort en zonder getal, of alleen "tafel(som) van …" / "trek af" / "tel op"
export function isVagueTip(tip) {
  const t = String(tip || '').trim();
  if (!t) return true;
  if (/^(een gewone tafelsom|tafelsom|tafelsom of splitsen:.*|tafel van \d+|die tafel van \d+|’n gewone tafelsom|maaltafel van \d+|tafel van \d+ of splits.*)\.?$/i.test(t)) return true;
  if (/^(trek (het |dit )?af|trek af|tel (het )?op|tel|tel verder|haal de hap eraf|haal die hap af|keer het aantal|maal die aantal|totaal|deel)\.?$/i.test(t)) return true;
  return false;
}

const TXT = {
  nl: {
    tafelGroot: (a, b) => `Weet je ${a} × ${b} niet meteen? Begin bij 5 × ${b} en doe er nog ${a - 5} × ${b} bij.`,
    tafelKlein: (a, b) => a === 2 ? `2 × ${b} is het dubbele van ${b}: ${b} + ${b}.` : a === 3 ? `3 × ${b} is ${b} + ${b} + ${b}. Of: 2 × ${b} en dan nog ${b} erbij.` : a === 4 ? `4 × ${b} is het dubbele van het dubbele: eerst 2 × ${b}, dan dat nog eens keer 2.` : `${a} × ${b}: tel ${a} keer ${b} op.`,
    tafel10: (b) => `10 × ${b}: zet een nul achter ${b}.`,
    tafel5: (b) => `5 × ${b} is de helft van 10 × ${b}.`,
    tafel9: (b) => `9 × ${b} is 10 × ${b} min één keer ${b}.`,
    splits: (a, b, t, e) => `Splits ${a} in ${t} en ${e}: reken ${t} × ${b} en ${e} × ${b}, en tel die twee op.`,
    nul: (a, b, k) => `Reken eerst ${a} × ${b}, en zet er dan ${k === 1 ? 'een nul' : `${k} nullen`} achter.`,
    deel: (a, b) => (a / b > 4 ? `Welk getal keer ${b} is ${a}? Zeg de tafel van ${b} op: ${b}, ${2 * b}, ${3 * b}, … tot je bij ${a} bent, en tel hoeveel stappen dat zijn.` : `Welk getal keer ${b} is ${a}? Zeg de tafel van ${b} op tot je bij ${a} bent, en tel hoeveel stappen dat zijn.`),
    deelGroot: (a, b) => `Welk getal keer ${b} is ${a}? Probeer eerst 10 × ${b} = ${10 * b}: is dat te veel of te weinig?`,
    min: (a, b, t, e) => (t && e ? `Trek het in stukjes af: eerst ${a} − ${t}, dan daar nog ${e} af.` : `Begin op de getallenlijn bij ${a} en spring ${b} terug.`),
    minBrug: (a, b) => (b % 10 === 0 || Math.ceil(b / 10) * 10 >= a ? `Tel verder vanaf ${b} tot ${a}. Hoeveel stapjes is dat?` : `Vul aan: van ${b} naar ${a}. Spring eerst naar ${Math.ceil(b / 10) * 10}, dan verder tot ${a}. Tel de sprongen op.`),
    plus: (a, b, t, e) => (t && e ? `Tel het in stukjes op: eerst ${a} + ${t}, dan daar nog ${e} bij.` : `Begin op de getallenlijn bij ${a} en spring ${b} vooruit.`),
    een: 'Wat verandert er als je maar één groepje hebt?',
    tijdZelfde: (a, b) => `${a} en ${b} zijn in hetzelfde uur: kijk alleen naar de minuten en tel van de ene naar de andere.`,
    tijdOver: (a, h, b) => `Tel eerst van ${a} tot het hele uur ${h}, en dan verder tot ${b}. Tel de stukjes op.`,
    desMaal: (a, b, n, eenh) => `${a} is ${n} ${eenh}. Reken ${n} × ${b} = ? ${eenh}, en schrijf dat dan als kommagetal.`,
    desPlus: (op) => (op === '+' ? 'Komma onder komma: tel eerst de hele getallen op, dan wat achter de komma staat. Samen meer dan een hele achter de komma? Dan komt er 1 bij de helen.' : 'Komma onder komma: haal eerst de hele getallen eraf, dan wat achter de komma staat. Lukt dat niet? Wissel dan 1 hele in voor 10 tienden of 100 honderdsten.'),
    alles: 'Vergelijk wat je eraf haalt met wat er is: blijft er nog iets over?',
    sprong: (p, op) => (p % 1000 === 0 ? `Spring in sprongen van 1000: ${p / 1000} ${p === 1000 ? 'sprong' : 'sprongen'} ${op === '+' ? 'vooruit' : 'terug'}.` : p % 100 === 0 ? `Spring in sprongen van 100: ${p / 100} ${p === 100 ? 'sprong' : 'sprongen'} ${op === '+' ? 'vooruit' : 'terug'}.` : p % 10 === 0 ? `Spring in sprongen van 10: ${p / 10} ${p === 10 ? 'sprong' : 'sprongen'} ${op === '+' ? 'vooruit' : 'terug'}.` : `Spring ${op === '+' ? 'vooruit' : 'terug'} op de getallenlijn.`),
  },
  af: {
    tafelGroot: (a, b) => `Weet jy nie dadelik ${a} × ${b} nie? Begin by 5 × ${b} en tel nog ${a - 5} × ${b} by.`,
    tafelKlein: (a, b) => a === 2 ? `2 × ${b} is die dubbel van ${b}: ${b} + ${b}.` : a === 3 ? `3 × ${b} is ${b} + ${b} + ${b}. Of: 2 × ${b} en dan nog ${b} by.` : a === 4 ? `4 × ${b} is verdubbel en weer verdubbel: eers 2 × ${b}, dan dit nog ’n keer × 2.` : `${a} × ${b}: tel ${a} keer ${b} op.`,
    tafel10: (b) => `10 × ${b}: sit ’n nul agter ${b}.`,
    tafel5: (b) => `5 × ${b} is die helfte van 10 × ${b}.`,
    tafel9: (b) => `9 × ${b} is 10 × ${b} min een keer ${b}.`,
    splits: (a, b, t, e) => `Breek ${a} op in ${t} en ${e}: reken ${t} × ${b} en ${e} × ${b}, en tel die twee op.`,
    nul: (a, b, k) => `Reken eers ${a} × ${b}, en sit dan ${k === 1 ? '’n nul' : `${k} nulle`} agter.`,
    deel: (a, b) => (a / b > 4 ? `Watter getal maal ${b} is ${a}? Sê die tafel van ${b}: ${b}; ${2 * b}; ${3 * b}; … tot jy by ${a} kom, en tel hoeveel stappe dit is.` : `Watter getal maal ${b} is ${a}? Sê die tafel van ${b} op tot jy by ${a} kom, en tel hoeveel stappe dit is.`),
    deelGroot: (a, b) => `Watter getal maal ${b} is ${a}? Probeer eers 10 × ${b} = ${10 * b}: is dit te veel of te min?`,
    min: (a, b, t, e) => (t && e ? `Trek dit in stukkies af: eers ${a} − ${t}, dan daarvan nog ${e} af.` : `Begin op die getallelyn by ${a} en spring ${b} terug.`),
    minBrug: (a, b) => (b % 10 === 0 || Math.ceil(b / 10) * 10 >= a ? `Tel verder van ${b} tot ${a}. Hoeveel treetjies is dit?` : `Tel aan: van ${b} tot ${a}. Spring eers na ${Math.ceil(b / 10) * 10}, dan verder tot ${a}. Tel die spronge bymekaar.`),
    plus: (a, b, t, e) => (t && e ? `Tel dit in stukkies op: eers ${a} + ${t}, dan daarby nog ${e}.` : `Begin op die getallelyn by ${a} en spring ${b} vorentoe.`),
    een: 'Wat verander as jy net een groepie het?',
    tijdZelfde: (a, b) => `${a} en ${b} is in dieselfde uur: kyk net na die minute en tel van die een na die ander.`,
    tijdOver: (a, h, b) => `Tel eers van ${a} tot by die heel uur ${h}, en dan verder tot ${b}. Tel die stukkies bymekaar.`,
    desMaal: (a, b, n, eenh) => `${a} is ${n} ${eenh}. Reken ${n} × ${b} = ? ${eenh}, en skryf dit dan as ’n desimale getal.`,
    desPlus: (op) => (op === '+' ? 'Kommas onder mekaar: tel eers die heelgetalle op, dan wat ná die komma staan. Is dit saam meer as een heel ná die komma? Dan kom daar 1 by die heelgetalle.' : 'Kommas onder mekaar: trek eers die heelgetalle af, dan wat ná die komma staan. Gaan dit nie? Ruil dan 1 heel om vir 10 tiendes of 100 honderdstes.'),
    alles: 'Vergelyk wat jy aftrek met wat daar is: bly daar nog iets oor?',
    sprong: (p, op) => (p % 1000 === 0 ? `Spring in spronge van 1000: ${p / 1000} ${p === 1000 ? 'sprong' : 'spronge'} ${op === '+' ? 'vorentoe' : 'terug'}.` : p % 100 === 0 ? `Spring in spronge van 100: ${p / 100} ${p === 100 ? 'sprong' : 'spronge'} ${op === '+' ? 'vorentoe' : 'terug'}.` : p % 10 === 0 ? `Spring in spronge van 10: ${p / 10} ${p === 10 ? 'sprong' : 'spronge'} ${op === '+' ? 'vorentoe' : 'terug'}.` : `Spring ${op === '+' ? 'vorentoe' : 'terug'} op die getallelyn.`),
  },
};

// Concrete tip voor "a op b = ?" (gehele getallen). null = geen voorstel.
export function betterTip(ask, lang = 'nl') {
  const T = TXT[lang] || TXT.nl;
  ask = String(ask).replace(/(?:€\s?|\bR\s?)(?=\d)/g, '').replace(/\s*\([^)]*\)\s*(?==)/g, ' '); // geld: R745 → 745; "65 − 50 (25 × 2) = ?" → "65 − 50 = ?"
  // tijdsduur: "Van 8:00 tot 8:53 = ? minuten" / "6:15 → 7:00 = ? min"
  const td = ask.match(/(\d{1,2}):(\d{2})\s*(?:tot|→|naar)\s*(\d{1,2}):(\d{2})/);
  if (td) { const [h1, m1, h2] = [+td[1], +td[2], +td[3]]; const A = `${td[1]}:${td[2]}`, B = `${td[3]}:${td[4]}`; return h1 === h2 ? T.tijdZelfde(A, B) : +td[4] === 0 && h2 === h1 + 1 ? null : m1 === 0 && +td[4] === 0 ? null : T.tijdOver(A, `${h1 + 1}:00`, B); }
  // kommagetallen (meetlat AF #7: "0,6 × 20 = ?" kreeg als tip het antwoord in tiendes)
  const dm = ask.match(/(\d+,(\d{1,2}))\s*[×x·]\s*(\d+)\s*=\s*\?/);
  if (dm) { const d = dm[2].length, n = Math.round(Number(dm[1].replace(',', '.')) * 10 ** d); return T.desMaal(dm[1], dm[3], n, lang === 'af' ? (d === 1 ? 'tiendes' : 'honderdstes') : (d === 1 ? 'tienden' : 'honderdsten')); }
  // een rij optellingen ("21 + 21 + 15 + 15 = ?", "3 + 8 + 1 = ?"): één voor één, ronde paren eerst
  const rij = ask.match(new RegExp(`(${NUM}(?:\\s*\\+\\s*${NUM}){2,})\\s*=\\s*\\?`));
  if (rij) { const xs = rij[1].split('+').map((x) => x.trim()); const ns = xs.map(toN); const paar = ns.some((x, i) => ns.some((y, j) => j > i && (x + y) % 10 === 0)); return lang === 'af' ? `Tel een vir een: eers ${xs[0]} + ${xs[1]}, tel dan ${xs.slice(2).join(', dan ')} by.${paar ? ' Kyk of twee getalle saam ’n ronde getal maak.' : ''}` : `Tel één voor één: eerst ${xs[0]} + ${xs[1]}, tel daar dan ${xs.slice(2).join(', dan ')} bij.${paar ? ' Kijk of twee getallen samen een rond getal maken.' : ''}`; }
  const dd = ask.match(/(\d+),(\d{1,2})\s*[:÷]\s*(\d+)\s*=\s*\?/);
  if (dd) { const n = Number(dd[1] + dd[2].padEnd(2, '0')); return lang === 'af' ? `Reken in sent (sonder die komma): ${n} ÷ ${dd[3]}. Sit dan die komma terug: 100 sent = R1.` : `Reken in centen (zonder komma): ${n} : ${dd[3]}. Zet daarna de komma terug: 100 cent = 1 euro.`; }
  const dp = ask.match(/(\d+,\d+)\s*([+−–-])\s*(\d+,\d+)\s*=\s*\?/);
  if (dp) return T.desPlus(dp[2] === '+' ? '+' : '−');
  // "3 × ? = 12": welk getal keer 3 is 12?
  const miss = String(ask).match(new RegExp(`${NUM}\\s*[×x·]\\s*\\?\\s*=\\s*${NUM}`));
  if (miss) { const a = toN(miss[1]), c = toN(miss[2]); return a > 0 && c > 0 ? T.deel(c, a) : null; }
  const m = String(ask).match(new RegExp(`(?<![\\d,.]|[\\d]\\s*[×x·:÷−–+-]\\s*)${NUM}\\s*([×x·:÷−–+-])\\s*${NUM}\\s*(?:=\\s*\\?|\\?\\s*$)`));
  // geen kommagetal-staart ("5,60 : 4" is niet "60 : 4") en geen deel van een langere som ("3 + 8 + 1"; kaartcheck NL)
  if (!m) return null;
  let a = toN(m[1]), b = toN(m[3]);
  const op = m[2];
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b <= 0) return null;
  if (['×', 'x', '·'].includes(op)) {
    const zeros = (n) => { let k = 0; while (n >= 10 && n % 10 === 0) { n /= 10; k++; } return [n, k]; };
    const [a0, ka] = zeros(a), [b0, kb] = zeros(b);
    if (ka + kb > 0 && a0 * b0 < 1000) return T.nul(a0, b0, ka + kb);
    if (a <= 10 && b <= 10) {
      // a × b = a keer b (in de volgorde van de som)
      if (a === 1 || b === 1) return T.een;
      if (a === 10) return T.tafel10(b);
      if (a === 9) return T.tafel9(b);
      if (a >= 6) return T.tafelGroot(a, b);
      if (a === 5) return T.tafel5(b);
      return T.tafelKlein(a, b);
    }
    const [big, small] = a >= b ? [a, b] : [b, a];
    if (big > 10 && big < 100 && small <= 10) return T.splits(big, small, big - (big % 10), big % 10);
    if (big >= 100 && small <= 10) { const h = big - (big % 100); return big % 100 ? T.splits(big, small, h, big % 100) : null; }
    return null;
  }
  if ([':', '÷'].includes(op)) return a > 10 * b ? T.deelGroot(a, b) : T.deel(a, b);
  // in stukjes: 345 → 300, 40, 5 (alleen de stukken die er zijn)
  const parts = (n) => [n - (n % 1000), (n % 1000) - (n % 100), (n % 100) - (n % 10), n % 10].filter((x) => x > 0);
  if (['−', '–', '-'].includes(op)) {
    if (b > a) return null;
    if (a === b) return T.alles;
    if (b < 10) return T.min(a, b, 0, 0);
    if (a - b < 20 && a > 50) return T.minBrug(a, b);
    const p = parts(b);
    return p.length >= 2 ? T.min(a, b, p[0], p.slice(1).join(' en ')) : T.sprong(p[0], '−');
  }
  if (op === '+') {
    if (b < 10) return T.plus(a, b, 0, 0);
    const p = parts(b);
    return p.length >= 2 ? T.plus(a, b, p[0], p.slice(1).join(' en ')) : T.sprong(p[0], '+');
  }
  return null;
}

// Vervangt vage tips in de tussenstappen van een som (in place)
const KOLOMSTAP = /^(Eenheden|Tientallen|Honderdtallen|Duizendtallen|Tienduizendtallen|Honderdduizendtallen|Ene|Tiene|Honderde|Duisende|Tienduisende|Honderdduisende|Tienden|Honderdsten|Tiendes|Honderdstes)\b/i;
export function improveTips(q, lang = 'nl') {
  for (const s of q.guide || []) {
    // ook korte tips zonder getal ("Trek het eraf.", "De bovenste getallen.", "Tel stap voor stap."; meetlat #6): als er een
    // concrete aanpak voor de som in de stap is, krijgt het kind die
    const kort = String(s.tip || '').trim().split(/\s+/).length <= 5 && !/\d/.test(s.tip || '');
    // Structureel (meetlat AF #7, 17 sjablonen): een tip zonder één getal zegt niet hoe je DEZE som uitrekent ("Wat oorbly,
    // moet kleiner as die deler wees." bij 65 − 50). Staat er een som in de stap, dan krijgt het kind de rekenaanpak.
    // Kolomstappen ("Ene: 4 + 6 = ?") houden hun tip over oordragen/omruilen: daar hoort de kolommethode bij.
    const askGetallen = String(s.ask).match(/\d+(?:[,:]\d+)?/g) || [];
    const zonderGetal = !askGetallen.some((g) => String(s.tip || '').includes(g)) && !KOLOMSTAP.test(String(s.ask));
    if (s.type !== 'number' || !(isVagueTip(s.tip) || kort || zonderGetal)) continue;
    const t = betterTip(s.ask, lang);
    if (!t) continue;
    // vaag of heel kort: vervangen; anders de uitleg houden ("waarom") en de rekenaanpak ("hoe") erachter zetten
    s.tip = isVagueTip(s.tip) || kort ? t : `${String(s.tip).trim().replace(/([^.!?])$/, '$1.')} ${t}`;
    s.tipAuto = true; // tipAuto: (deels) gemaakt door betterTip, noemt nooit een uitkomst
  }
  return q;
}

// Een makkelijker voorbeeld van dezelfde soort stap, door de app uitgerekend (dus zonder rekenfout), voor Max als het kind
// vastloopt bij een tussenstap. Meetlat #6/#7: in 55% van de gevallen gaf Max geen makkelijker voorbeeld, of een met
// dezelfde getallen. Zelfde bewerking, kleinere getallen, en met dezelfde "moeilijkheid" (over het tiental, lenen).
// Geeft { som, uitkomst } of null. Nooit dezelfde uitkomst als de echte stap.
function makkelijker0(ask, answer) {
  const a0 = String(ask).replace(/(?:€\s?|\bR\s?)(?=\d)/g, '').replace(/\s*\([^)]*\)\s*(?==)/g, ' ');
  // "Hoeveel keer gaan 25 in 65?" / "Hoe vaak past 25 in 65?" (staartdeling, happen)
  const pas = a0.match(new RegExp(`(?:keer gaan|vaak past|keer past)\\s+${NUM}\\s+in\\s+${NUM}`, 'i'));
  if (pas) { const d = toN(pas[1]), n = toN(pas[2]); if (d < 2 || n < d) return null; const dd = d > 10 ? (d % 10 || 5) : d; let nn = dd * 2 + Math.min(dd - 1, 3); if (Math.floor(nn / dd) === answer) nn = dd * 3 + Math.min(dd - 1, 2); if (Math.floor(nn / dd) === answer) return null; return { som: a0.replace(pas[0], pas[0].replace(pas[1], String(dd)).replace(new RegExp(`${pas[2]}$`), String(nn))).replace(/^.*?((?:Hoeveel|Hoe)\b)/i, '$1'), uitkomst: String(Math.floor(nn / dd)), vraag: true }; }
  const gat = a0.match(new RegExp(`${NUM}\\s*[×x·]\\s*\\?\\s*=\\s*${NUM}`));
  if (gat) { const x = toN(gat[1]); const k = toN(gat[2]) / x === 2 ? 3 : 2; return { som: `${x} × ? = ${x * k}`, uitkomst: String(k) }; }
  // breuk gelijkwaardig maken: "3/4 = ?/12" (factor 3) → "1/2 = ?/6" (zelfde factor), "2/3 = □/6"
  const gl = a0.match(/(\d+)\/(\d+)\s*=\s*[?□]\s*\/\s*(\d+)/);
  if (gl) { const [t, n, N] = [+gl[1], +gl[2], +gl[3]]; const k = N / n; if (!Number.isInteger(k) || k < 2) return null; const [t2, n2] = n === 2 ? [1, 3] : [1, 2]; if (t2 * k === answer) return null; return { som: `${t2}/${n2} = ?/${n2 * k}`, uitkomst: String(t2 * k), vraag: true }; }
  // "De helft van 8 = ?"
  const hf = a0.match(/helft van (\d+)/i);
  if (hf) { const n = +hf[1]; const x = n > 10 ? 10 : n > 4 ? 4 : null; if (!x || x / 2 === answer) return null; return { som: `De helft van ${x}`, uitkomst: String(x / 2), vraag: true }; }
  // tijdsduur binnen een uur: "Van 11:00 tot 11:50 = ? minuten" → "Van 3:00 tot 3:20"
  const tdu = a0.match(/(\d{1,2}):(\d{2})\s*(?:tot|→|naar)\s*(\d{1,2}):(\d{2})/);
  if (tdu) { const m1 = +tdu[2], h2 = +tdu[3], m2 = +tdu[4]; const d = (h2 - +tdu[1]) * 60 + m2 - m1; if (d <= 10 || d > 120) return null; const k = d >= 30 ? 20 : 10; return { som: `Van 3:00 tot 3:${String(k).padStart(2, '0')}: hoeveel minuten?`, uitkomst: String(k), vraag: true }; }
  const m = a0.match(new RegExp(`${NUM}(?:,(\\d+))?\\s*([×x·:÷−–+-])\\s*${NUM}\\s*(?:[a-zé]+\\s*)?(?:=\\s*\\?|\\?\\s*$)`));
  if (!m) return null;
  const a = toN(m[1]), dec = m[2], op = m[3], b = toN(m[4]);
  let som = null, uit = null;
  const f = (x) => String(x).replace('.', ',');
  if (dec) { // kommagetal × heel getal: 0,6 × 20 → 0,6 × 2
    if (!['×', 'x', '·'].includes(op) || b < 3) return null;
    const x = Number(`${a}.${dec}`), k = b % 10 && b % 10 !== b ? b % 10 : 2;
    som = `${f(x)} × ${k}`; uit = Math.round(x * k * 1000) / 1000;
  } else if (['×', 'x', '·'].includes(op)) {
    if (a <= 2 && b <= 2) return null;
    const [klein, groot] = a <= b ? [a, b] : [b, a];
    if (groot > 12 && klein <= 10) { som = `12 × ${klein}`; uit = 12 * klein; } // zelfde aanpak (splitsen), kleiner getal
    else if (groot > 10 && klein <= 10) { som = `2 × ${klein}`; uit = 2 * klein; }
    else if (groot > 10) { som = `12 × 11`; uit = 132; }
    else { som = `2 × ${groot}`; uit = 2 * groot; if (klein === 2) { som = `2 × 3`; uit = 6; } }
  } else if ([':', '÷'].includes(op)) {
    if (b < 2 || a <= b) return null;
    const k = Math.round(a / b) === 2 ? 3 : 2;
    som = `${b * k} ${op} ${b}`; uit = k;
  } else {
    // plus en min: ronde getallen blijven rond (900 + 100 → 200 + 100), het getal wordt kleiner, over het tiental / lenen blijft
    const plus = op === '+';
    if (!plus && b > a) return null;
    let z = 0; while (a % 10 ** (z + 1) === 0 && b % 10 ** (z + 1) === 0 && b > 0) z++;
    const A = a / 10 ** z, B = b / 10 ** z, p10 = 10 ** z;
    const kandidaten = [];
    if (A < 10 && B < 10) { if (z === 0) return null; if (plus) { kandidaten.push([A + B >= 10 ? [8, 3] : [2, 1]], [[2, 1]]); } else kandidaten.push([[Math.min(A, 5), Math.max(1, Math.min(B, Math.min(A, 5) - 1))]], [[5, 2]]); }
    else if (A < 20 && B < 20) { // kleine sommen: 16 + 15 → 6 + 5, 4 + 6 → 2 + 3, 16 − 7 → 6 − 2
      const x = A >= 10 ? A % 10 || 5 : Math.max(2, Math.ceil(A / 2)), y = B >= 10 ? (B % 10 || 3) : Math.max(1, Math.floor(B / 2));
      if (plus || y < x) kandidaten.push([[x, plus ? y : Math.min(y, x - 1)]]);
    } else for (const t of [10, 20, 30]) {
      const x = plus ? (A >= 20 ? t + (A % 10) : A) : t + (A % 10) + (A % 10 < B % 10 && B >= 10 ? 10 : 0);
      const y = B >= 20 ? 10 + (B % 10) : B >= 10 && !plus ? B % 10 + 10 : B;
      kandidaten.push([[x, y]]);
    }
    for (const [[x, y]] of kandidaten) {
      const X = x * p10, Y = y * p10, U = plus ? X + Y : X - Y;
      if (U < 0 || (X >= a && Y >= b) || U === answer || X === answer || Y === answer || (plus && X + Y >= a + b)) continue;
      som = `${X} ${plus ? '+' : '−'} ${Y}`; uit = U; break;
    }
  }
  if (som == null || uit === answer || String(uit) === String(answer)) return null;
  return { som, uitkomst: f(uit) };
}

// Het voorbeeld mag geen getal bevatten dat het antwoord van de stap (of van de som) is: meetlat AF #14 "15 − 10" als
// voorbeeld bij 65 − 50 = 15 verklapte zo de uitkomst.
export function makkelijker(ask, answer, verboden = []) {
  const r = makkelijker0(ask, answer);
  if (!r) return null;
  const getallen = (String(r.som).match(/\d+(?:,\d+)?/g) || []).map((x) => Number(x.replace(',', '.')));
  const nee = [answer, ...verboden].map((x) => Number(String(x).replace(/[^\d,.-]/g, '').replace(',', '.'))).filter((x) => Number.isFinite(x));
  return getallen.some((g) => nee.includes(g)) ? null : r;
}
