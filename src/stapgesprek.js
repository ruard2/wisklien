// Gespreksplan voor "vast bij een tussenstap": de app beslist de didactische zet, Max verwoordt hem.
//
// Waarom: met één grote prompt vol regels koos Max zelf de route, en dan herhaalde hij zich, luisterde hij niet naar het
// antwoord van het kind, koos hij een andere aanpak dan de kaart, of sloot zijn voorbeeld niet aan (meetlat #17/#18:
// max_stap 3,8–4,0). Nu bepaalt de app per beurt WAT er gebeurt (voorbeeld, concreter, brug terug, samen doen, klaar) en
// WELKE getallen erin mogen; Max kiest alleen HOE hij het zegt (toon, woorden, een verhaaltje, een plaatje).
//
// Het plan is staatloos: het speelt het hele gesprek opnieuw af (de berichten van het kind, en het voorbeeld dat Max gaf),
// zodat er niets extra bewaard hoeft te worden en elke beurt hetzelfde uitkomt als je hem opnieuw berekent.
import { makkelijker } from './tips.js';
import { snaptNiet } from './kwaliteit.js';

const norm = (x) => String(x ?? '').toLowerCase().replace(/[€r$]\s?(?=\d)/g, '').replace(/\s+/g, ' ').trim();
const getallen = (s) => (String(s ?? '').replace(/(\d)[  ](?=\d{3}\b)/g, '$1').match(/-?\d+(?:[.,]\d+)?/g) || []).map((x) => Number(x.replace(',', '.')));
// Het getal dat het kind als antwoord bedoelt: na het laatste "=", anders het laatste getal
function antwoordVan(s) {
  const t = String(s ?? '');
  const na = t.includes('=') ? t.slice(t.lastIndexOf('=') + 1) : t;
  const g = getallen(na);
  return g.length ? g.at(-1) : null;
}
const isZelfde = (kind, goed) => {
  if (goed == null) return false;
  const n = antwoordVan(kind), g = typeof goed === 'number' ? goed : Number(String(goed).replace(/[^\d,.-]/g, '').replace(',', '.'));
  if (n != null && Number.isFinite(g) && String(goed).match(/\d/)) return Math.abs(n - g) < 1e-9;
  // tekstantwoord ("tientallen", "na", "ja"): het woord komt voor in wat het kind zegt
  const w = norm(goed);
  return !!w && new RegExp(`(^|[^a-zà-ÿ])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-zà-ÿ])`).test(norm(kind));
};
const WEET_NIET = /^\s*\?+\s*$|weet (het )?niet|geen idee|ek weet nie|geen flauw|huh|hè\??$|wat\??$/i;

// Zetten. Per zet: wat Max moet doen (instructie), welke manieren hij mag kiezen (opties), en of hij het antwoord van het
// voorbeeld mag noemen. Teksten zijn voor Max (in het Nederlands; Max schrijft zelf in de taal van het kind).
export const ZETTEN = {
  voorbeeld: {
    doel: 'Het kind loopt vast bij deze stap. Geef het MAKKELIJKER VOORBEELD hieronder (precies die som, door de app nagerekend) en laat het kind dát uitrekenen.',
    opties: ['vraag het voorbeeld kaal', 'zet het voorbeeld in een mini-verhaaltje (geld, snoep, stappen) met precies dezelfde getallen'],
    regels: 'Zeg in één korte zin dat jullie het eerst makkelijker maken, en dat de echte stap daarna precies zo gaat. Noem de uitkomst van het voorbeeld niet.',
  },
  eigen_voorbeeld: {
    doel: 'Het kind loopt vast bij deze stap. Bedenk zelf een MAKKELIJKER VOORBEELD van precies dezelfde soort stap (zelfde vraag, zelfde aanpak als de tip en de kaart), met andere, kleinere of rondere getallen, en laat het kind dát doen.',
    opties: ['een kaal makkelijker voorbeeld', 'een mini-verhaaltje (geld, snoep, een klok, een rij) met kleine getallen'],
    regels: 'Zeg in één korte zin dat jullie het eerst makkelijker maken en dat de echte stap daarna precies zo gaat. Noem de uitkomst van je voorbeeld niet. Zet op de allerlaatste regel, onzichtbaar voor het kind, precies: [VB: <je voorbeeldvraag kort> = <de uitkomst>] (bijv. [VB: 30 − 10 = 20] of [VB: plek van de 4 in 345 = tientallen]).',
    vb: true,
  },
  vb_fout: {
    doel: 'Het kind gaf een fout antwoord op het voorbeeld. Zeg vriendelijk dat het nog niet klopt en help bij HET VOORBEELD (niet de echte stap): één kleiner stapje of een concrete hulp (vingers, geld, een plaatje), en vraag het voorbeeld opnieuw.',
    opties: ['maak het voorbeeld in twee kleinere stukjes', 'gebruik geld of een plaatje bij het voorbeeld'],
    regels: 'Reageer op het getal dat het kind noemde (zeg het getal). Noem de uitkomst van het voorbeeld nog niet.',
  },
  vb_concreter: {
    doel: 'Het kind snapt het voorbeeld niet. Maak HET VOORBEELD concreter op een ándere manier dan je vorige bericht (zie het model op de kaart), en vraag het voorbeeld opnieuw.',
    opties: ['met geld of echte dingen (munten, snoepjes, stappen)', 'met een plaatje van het model op de kaart'],
    regels: 'Gebruik niet dezelfde uitleg als in je vorige bericht. Noem de uitkomst van het voorbeeld nog niet.',
  },
  vb_voordoen: {
    doel: 'Het voorbeeld lukt nog niet. Doe HET VOORBEELD nu zelf helemaal voor, kort en stap voor stap (mag met de uitkomst van het voorbeeld). Vraag daarna de ECHTE stap: "doe jij het nu precies zo bij …".',
    opties: ['voordoen in 2-3 korte stapjes', 'voordoen met een plaatje erbij'],
    regels: 'De uitkomst van het VOORBEELD mag je nu noemen; de uitkomst van de echte stap niet.',
    vbUitkomst: true,
  },
  brug: {
    doel: 'Het kind rekende het voorbeeld GOED uit. Zeg dat het klopt (kort, gemeend), en leg dan de brug: de echte stap gaat precies zo. Noem welke getallen nu op de plek van de voorbeeld-getallen komen, en vraag de echte stap.',
    opties: ['"Bij het voorbeeld deed je …, nu doe je hetzelfde met …"', 'zet voorbeeld en echte stap onder elkaar'],
    regels: 'Noem de uitkomst van de echte stap niet.',
    vbUitkomst: true,
  },
  stap_fout: {
    doel: 'Het kind gaf een fout antwoord op de ECHTE stap. Zeg vriendelijk dat het nog niet klopt (noem het getal van het kind) en wijs aan waar het verschilt met hoe het bij het voorbeeld ging, of welk stukje van de aanpak (tip) nog mist. Vraag de echte stap opnieuw.',
    opties: ['vergelijk met het voorbeeld', 'knip de echte stap in twee stukjes en vraag het eerste stukje'],
    regels: 'Noem de uitkomst van de echte stap niet.',
    vbUitkomst: true,
  },
  stap_concreter: {
    doel: 'Het kind snapt de echte stap nog niet (na het voorbeeld). Maak het concreter op een ándere manier dan je vorige bericht: knip de echte stap in twee kleine stukjes volgens de tip, of gebruik het model van de kaart (geld, plaatje). Vraag alleen het eerste stukje.',
    opties: ['in twee stukjes knippen', 'met geld of een plaatje'],
    regels: 'Gebruik niet dezelfde uitleg als in je vorige bericht. Noem de uitkomst van de echte stap niet.',
    vbUitkomst: true,
  },
  stap_samen: {
    doel: 'Het lukt nog steeds niet. Doe de echte stap samen: schrijf hem in heel kleine stapjes uit (maximaal 3), reken alles voor behalve het allerlaatste kleine stukje, en laat het kind alleen dat laatste stukje doen.',
    opties: ['kleine stapjes onder elkaar', 'met een plaatje en de stapjes erbij'],
    regels: 'De uitkomst van de echte stap zelf noem je niet; het kind doet het laatste stukje.',
    vbUitkomst: true,
  },
  klaar: {
    doel: 'Het kind heeft de echte stap GOED. Zeg kort en gemeend dat het klopt en dat het dit nu in het vakje kan invullen. Prijs de aanpak (wat het kind goed deed), niet "slim zijn".',
    opties: ['kort compliment + "vul maar in"', 'compliment over hoe het voorbeeld hielp + "vul maar in"'],
    regels: 'Schrijf het getal of de som met uitkomst niet nog eens op.',
    vbUitkomst: true,
  },
};

// Speelt het gesprek af en geeft de zet voor deze beurt, of null (dan antwoordt de gewone Max, bijv. op een eigen vraag).
// chat: [{role:'kid'|'teacher', text, vb?}]  · vb: het voorbeeld dat Max eerder zelf gaf ({som, uitkomst}) staat op zijn bericht.
export function stapPlan({ question: q, step, chat = [] }) {
  if (!step || step.type === 'choice' && !step.options) return null;
  const appVb = step.type !== 'choice' ? makkelijker(step.ask, step.answer, [q.answer]) : null;
  const s = { fase: 'start', vb: appVb ? { som: appVb.vraag || appVb.som.includes('?') ? appVb.som : `${appVb.som} = ?`, uitkomst: appVb.uitkomst, vanApp: true } : null, snap: 0, foutVb: 0, foutStap: 0, zetten: [] };
  const goedStap = step.type === 'choice' ? step.options[step.answer] : step.display;
  let zet = null;
  const kindBeurten = [];
  chat.forEach((m, i) => { if (m.role !== 'teacher') kindBeurten.push(i); });
  if (!kindBeurten.length || chat.at(-1)?.role === 'teacher') return null;
  for (const i of kindBeurten) {
    const tekst = chat[i].text;
    // een voorbeeld dat Max zelf bedacht (eerdere beurt) wordt het voorbeeld
    const vorigeMax = [...chat.slice(0, i)].reverse().find((m) => m.role === 'teacher');
    if (!s.vb?.vanApp && vorigeMax?.vb) s.vb = vorigeMax.vb;
    if (s.fase === 'start') zet = s.vb ? 'voorbeeld' : 'eigen_voorbeeld';
    else if (isZelfde(tekst, goedStap) && !(s.fase === 'voorbeeld' && s.vb && isZelfde(tekst, s.vb.uitkomst))) zet = 'klaar';
    else if (s.fase === 'klaar') zet = null;
    else if (/\b(ik snap het|ek verstaan dit)\b(?!\s*(nog\s*)?(niet|nie))/i.test(tekst) && !/niet|nie\b/i.test(tekst)) zet = null; // "Ik snap het!": de gewone Max
    else if (snaptNiet(tekst) || WEET_NIET.test(tekst)) {
      s.snap++;
      if (s.fase === 'voorbeeld') zet = s.snap >= 2 || s.foutVb >= 1 ? 'vb_voordoen' : 'vb_concreter';
      else zet = s.snap >= 3 || s.foutStap >= 1 ? 'stap_samen' : 'stap_concreter';
    } else if (s.fase === 'voorbeeld' && s.vb && antwoordVan(tekst) != null || s.fase === 'voorbeeld' && s.vb && isZelfde(tekst, s.vb.uitkomst)) {
      if (isZelfde(tekst, s.vb.uitkomst)) zet = 'brug';
      else { s.foutVb++; zet = s.foutVb >= 2 ? 'vb_voordoen' : 'vb_fout'; }
    } else if (s.fase === 'stap' && antwoordVan(tekst) != null) {
      s.foutStap++; zet = s.foutStap >= 2 ? 'stap_samen' : 'stap_fout';
    } else zet = null; // eigen vraag of iets anders: de gewone Max (de fase blijft)
    if (zet) {
      s.zetten.push(zet);
      s.fase = ['voorbeeld', 'eigen_voorbeeld', 'vb_fout', 'vb_concreter'].includes(zet) ? 'voorbeeld' : zet === 'klaar' ? 'klaar' : 'stap';
      if (zet === 'eigen_voorbeeld' && !s.vb) s.vb = null; // pas na het antwoord van Max bekend ([VB: …])
    }
  }
  if (!zet) return null;
  return { zet, ...ZETTEN[zet], voorbeeld: s.vb, goedStap, eerdereZetten: s.zetten.slice(0, -1) };
}

// Getallen die Max in deze zet mag gebruiken. Alles wat het kind zelf ziet of zei mag, kleine getallen voor een verhaaltje
// mogen; de uitkomst van de echte stap en het eindantwoord nooit (tenzij het kind ze zelf al zei).
export function getallenRegel({ question: q, step, chat, plan }) {
  const kind = chat.filter((m) => m.role !== 'teacher').map((m) => m.text).join(' ');
  const verboden = [];
  const zegt = (x) => getallen(kind).some((g) => Math.abs(g - x) < 1e-9);
  const goed = getallen(plan.goedStap)[0];
  if (goed != null && !zegt(goed) && plan.zet !== 'klaar') verboden.push(goed);
  const eind = typeof q.answer === 'number' ? q.answer : getallen(q.display)[0];
  if (eind != null && !zegt(eind)) verboden.push(eind);
  const vbU = plan.voorbeeld ? getallen(plan.voorbeeld.uitkomst)[0] : null;
  if (vbU != null && !plan.vbUitkomst && !zegt(vbU)) verboden.push(vbU);
  return { verboden: [...new Set(verboden)].filter((x) => !(Math.abs(x) <= 2 && Number.isInteger(x))) };
}
export { getallen, antwoordVan };
