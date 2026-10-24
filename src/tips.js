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
    deel: (a, b) => `Welk getal keer ${b} is ${a}? Zeg de tafel van ${b} op: ${b}, ${2 * b}, ${3 * b}, … tot je bij ${a} bent.`,
    deelGroot: (a, b) => `Welk getal keer ${b} is ${a}? Probeer eerst 10 × ${b} = ${10 * b}: is dat te veel of te weinig?`,
    min: (a, b, t, e) => (t && e ? `Trek het in stukjes af: eerst ${t} eraf, dan nog ${e}.` : `Spring terug op de getallenlijn: vanaf ${a} ${b} terug.`),
    minBrug: (a, b) => `Vul aan: van ${b} naar ${a}, hoeveel is dat? Spring eerst naar een rond getal.`,
    plus: (a, b, t, e) => (t && e ? `Tel het in stukjes op: eerst ${t} erbij, dan nog ${e}.` : `Spring vooruit op de getallenlijn: vanaf ${a} ${b} verder.`),
    een: 'Iets 1 keer is gewoon dat getal zelf.',
    alles: 'Je haalt er precies evenveel af als er is. Hoeveel blijft er dan over?',
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
    deel: (a, b) => `Watter getal maal ${b} is ${a}? Sê die tafel van ${b}: ${b}; ${2 * b}; ${3 * b}; … tot jy by ${a} kom.`,
    deelGroot: (a, b) => `Watter getal maal ${b} is ${a}? Probeer eers 10 × ${b} = ${10 * b}: is dit te veel of te min?`,
    min: (a, b, t, e) => (t && e ? `Trek dit in stukkies af: eers ${t}, dan nog ${e}.` : `Spring terug op die getallelyn: van ${a} af ${b} terug.`),
    minBrug: (a, b) => `Tel aan: van ${b} tot ${a}, hoeveel is dit? Spring eers na ’n ronde getal.`,
    plus: (a, b, t, e) => (t && e ? `Tel dit in stukkies op: eers ${t} by, dan nog ${e}.` : `Spring vorentoe op die getallelyn: van ${a} af ${b} verder.`),
    een: 'Iets 1 keer is net daardie getal self.',
    alles: 'Jy trek presies soveel af as wat daar is. Hoeveel bly dan oor?',
    sprong: (p, op) => (p % 1000 === 0 ? `Spring in spronge van 1000: ${p / 1000} ${p === 1000 ? 'sprong' : 'spronge'} ${op === '+' ? 'vorentoe' : 'terug'}.` : p % 100 === 0 ? `Spring in spronge van 100: ${p / 100} ${p === 100 ? 'sprong' : 'spronge'} ${op === '+' ? 'vorentoe' : 'terug'}.` : p % 10 === 0 ? `Spring in spronge van 10: ${p / 10} ${p === 10 ? 'sprong' : 'spronge'} ${op === '+' ? 'vorentoe' : 'terug'}.` : `Spring ${op === '+' ? 'vorentoe' : 'terug'} op die getallelyn.`),
  },
};

// Concrete tip voor "a op b = ?" (gehele getallen). null = geen voorstel.
export function betterTip(ask, lang = 'nl') {
  const T = TXT[lang] || TXT.nl;
  // "3 × ? = 12": welk getal keer 3 is 12?
  const miss = String(ask).match(new RegExp(`${NUM}\\s*[×x·]\\s*\\?\\s*=\\s*${NUM}`));
  if (miss) { const a = toN(miss[1]), c = toN(miss[2]); return a > 0 && c > 0 ? T.deel(c, a) : null; }
  const m = String(ask).match(new RegExp(`${NUM}\\s*([×x·:÷−–+-])\\s*${NUM}\\s*(?:=\\s*\\?|\\?\\s*$)`));
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
export function improveTips(q, lang = 'nl') {
  for (const s of q.guide || []) {
    if (s.type !== 'number' || !isVagueTip(s.tip)) continue;
    const t = betterTip(s.ask, lang);
    if (t) { s.tip = t; s.tipAuto = true; } // tipAuto: gemaakt door betterTip, noemt nooit een uitkomst
  }
  return q;
}
