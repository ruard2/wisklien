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
// getallen in een tekst, ook als woord ("2 kom drie keer voor" → 2 en 3; Tussenstappen AF #22 zag alleen de 2)
const WOORDGETAL = { nul: 0, een: 1, één: 1, twee: 2, drie: 3, vier: 4, vijf: 5, vyf: 5, zes: 6, ses: 6, zeven: 7, sewe: 7, acht: 8, ag: 8, negen: 9, nege: 9, tien: 10, elf: 11, twaalf: 12 };
const getallen = (s) => (String(s ?? '').replace(/(\d)[  ](?=\d{3}\b)/g, '$1').match(/-?\d+(?:[.,]\d+)?|\b(?:nul|één|twee|drie|vier|vijf|vyf|zes|ses|zeven|sewe|acht|negen|nege|tien|elf|twaalf)\b|\b(?:een|ag)\b(?=\s+(?:keer|maal|stuk|stukke|stukken|kere|ure|uur|minute|minuten|euro|rand|combinaties|kombinasies))/gi) || [])
  .map((x) => (/\d/.test(x) ? Number(x.replace(',', '.')) : WOORDGETAL[x.toLowerCase()]));
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
    doel: 'Het kind gaf een fout antwoord op het voorbeeld. Zeg vriendelijk dat het nog niet klopt en help bij HETZELFDE VOORBEELD (dezelfde getallen; geen nieuw voorbeeld en nog niet de echte stap): één kleiner stapje of een concrete hulp (geld, een plaatje, tellen), en vraag het voorbeeld opnieuw. Zeg niets onwaars over het getal van het kind (2 deelt wél in 8 en 12, het is alleen niet de grootste) en raad niet hoe het kind eraan kwam.',
    opties: ['maak het voorbeeld in twee kleinere stukjes', 'gebruik geld of een plaatje bij het voorbeeld'],
    regels: 'Reageer op het getal dat het kind noemde (zeg het getal). Noem de uitkomst van het voorbeeld nog niet.',
  },
  vb_concreter: {
    doel: 'Het kind snapt het voorbeeld niet. Maak HET VOORBEELD concreter op een ándere manier dan je vorige bericht (zie het model op de kaart), en vraag het voorbeeld opnieuw.',
    opties: ['met geld of echte dingen (munten, snoepjes, stappen)', 'met een plaatje van het model op de kaart'],
    regels: 'Gebruik niet dezelfde uitleg als in je vorige bericht. Noem de uitkomst van het voorbeeld nog niet.',
  },
  vb_voordoen: {
    doel: 'Het voorbeeld lukt nog niet. Doe HET VOORBEELD nu zelf helemaal voor, kort en stap voor stap, met een concrete hulp (geld, een plaatje, tellen op de getallenlijn) en mét de uitkomst. Zet daarna alleen het EERSTE kleine stukje van de echte stap klaar volgens de tip (bijv. "Bij jouw som: eerst 279 − 200. Hoeveel is dat?") en vraag dat stukje. Vraag niet de hele echte stap in één keer: dit kind loopt vast.',
    opties: ['voordoen in 2-3 korte stapjes, dan het eerste stukje van de echte stap', 'voordoen met een plaatje erbij, dan het eerste stukje van de echte stap'],
    regels: 'De uitkomst van het VOORBEELD mag je nu noemen; de uitkomst van de echte stap niet.',
    vbUitkomst: true,
  },
  brug: {
    doel: 'Het kind rekende het voorbeeld GOED uit. Zeg dat het klopt (kort, gemeend), en leg dan de brug: de echte stap gaat precies zo. Laat zien welke getallen nu op de plek van de voorbeeld-getallen komen (zet voorbeeld en echte stap kort naast elkaar). Bestaat de echte stap volgens de tip uit stukjes (bijv. eerst × 20 en dan × 8), vraag dan alleen het eerste stukje; anders de hele stap.',
    opties: ['"Bij het voorbeeld deed je …, nu doe je hetzelfde met …"', 'zet voorbeeld en echte stap onder elkaar'],
    regels: 'Noem de uitkomst van de echte stap niet.',
    vbUitkomst: true,
  },
  deel_goed: {
    doel: 'Het kind had het stukje dat je vroeg GOED. Zeg kort dat het klopt, en ga één stukje verder richting de echte stap (volgens de tip): vraag het volgende stukje, of de hele stap als alle stukjes er nu zijn.',
    opties: ['"Klopt! En nu …"', 'zet de stukjes onder elkaar en vraag wat er nog mist'],
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
// chat: [{role:'kid'|'teacher', text, vb?}]. vb op een bericht van Max = de vraag die hij stelde met het juiste antwoord
// ([VB: vraag = antwoord], onzichtbaar voor het kind, door de app nagerekend). Zo kijkt de app élk antwoord van het kind
// na tegen de vraag die er écht gesteld werd (Tussenstappen #19: "2" op het voorbeeld werd als goed antwoord op de echte
// stap gezien; "67 + 103 = 170" op een deelvraag als fout, omdat het niet de hele stap was).
export function stapPlan({ question: q, step, chat = [] }) {
  if (!step || step.type === 'choice' && !step.options) return null;
  const appVb = step.type !== 'choice' ? makkelijker(step.ask, step.answer, [q.answer]) : null;
  const s = { fase: 'start', vb: appVb ? { som: appVb.vraag || appVb.som.includes('?') ? appVb.som : `${appVb.som} = ?`, uitkomst: appVb.uitkomst, vanApp: true, opstap: !!appVb.opstap } : null, snap: 0, foutVb: 0, foutStap: 0, zetten: [] };
  const goedStap = step.type === 'choice' ? step.options[step.answer] : step.display;
  const kindBeurten = [];
  chat.forEach((m, i) => { if (m.role !== 'teacher') kindBeurten.push(i); });
  if (!kindBeurten.length || chat.at(-1)?.role === 'teacher') return null;
  let zet = null, vorigeZet = null;
  for (const i of kindBeurten) {
    const tekst = chat[i].text;
    const vorigeMax = [...chat.slice(0, i)].reverse().find((m) => m.role === 'teacher');
    // het voorbeeld dat Max zelf bedacht (zijn vraag bij de zet eigen_voorbeeld) wordt hét voorbeeld
    if (vorigeZet === 'eigen_voorbeeld' && vorigeMax?.vb) s.vb = vorigeMax.vb;
    const verwacht = vorigeMax?.vb || (s.fase === 'voorbeeld' ? s.vb : s.fase === 'stap' ? { som: step.ask, uitkomst: goedStap } : null);
    const heeftAntwoord = antwoordVan(tekst) != null || (verwacht && isZelfde(tekst, verwacht.uitkomst)) || isZelfde(tekst, goedStap);
    if (s.fase === 'start') zet = s.vb ? 'voorbeeld' : 'eigen_voorbeeld';
    else if (s.fase === 'klaar') zet = null;
    else if (/\b(ik snap het|ek verstaan dit)\b/i.test(tekst) && !/\b(niet|nie)\b/i.test(tekst)) zet = null; // "Ik snap het!": de gewone Max
    else if (/^\s*(waarom|hoe|wat|wie|welke|wanneer|kan|mag|moet|hoekom|watter)\b/i.test(tekst) && !(verwacht && isZelfde(tekst, verwacht.uitkomst)) && !snaptNiet(tekst) && !WEET_NIET.test(tekst)) zet = null; // eigen vraag: de gewone Max
    else if (!heeftAntwoord && (snaptNiet(tekst) || WEET_NIET.test(tekst))) {
      s.snap++;
      if (s.fase === 'voorbeeld') zet = s.snap >= 2 || s.foutVb >= 1 ? 'vb_voordoen' : 'vb_concreter';
      else zet = s.snap >= 3 || s.foutStap >= 1 ? 'stap_samen' : 'stap_concreter';
    } else if (heeftAntwoord && verwacht) {
      const goed = isZelfde(tekst, verwacht.uitkomst);
      if (goed && s.fase === 'stap' && isZelfde(verwacht.uitkomst, goedStap)) zet = 'klaar';
      else if (goed && s.fase === 'voorbeeld') zet = 'brug';
      else if (goed) zet = 'deel_goed';
      else if (s.fase === 'voorbeeld') { s.foutVb++; zet = s.foutVb >= 2 ? 'vb_voordoen' : 'vb_fout'; }
      else { s.foutStap++; zet = s.foutStap >= 2 ? 'stap_samen' : 'stap_fout'; }
    } else zet = null; // eigen vraag, of een antwoord dat de app niet kan nakijken: de gewone Max (de fase blijft)
    if (zet) {
      s.zetten.push(zet);
      s.fase = ['voorbeeld', 'eigen_voorbeeld', 'vb_fout', 'vb_concreter'].includes(zet) ? 'voorbeeld' : zet === 'klaar' ? 'klaar' : 'stap';
    }
    vorigeZet = zet;
  }
  if (!zet) return null;
  return { zet, ...ZETTEN[zet], voorbeeld: s.vb, goedStap, fase: s.fase, eerdereZetten: s.zetten.slice(0, -1) };
}

// Kan de app de vraag van Max narekenen? "30% van 12", "de helft van 18", "een kwart van 20", of een gewone som.
// Geeft het juiste getal, of null als het geen rekensom is (bijv. "op welke plek staat de 4").
export function rekenVraag(som) {
  const t = String(som || '').toLowerCase().replace(/(\d)[  ](?=\d{3}\b)/g, '$1').replace(/€\s?|\br\s?(?=\d)/g, '');
  const n = (x) => Number(String(x).replace(',', '.'));
  let m;
  if ((m = t.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:van|of)\s*(\d+(?:[.,]\d+)?)/))) return (n(m[1]) * n(m[2])) / 100;
  if ((m = t.match(/\b(helft|helfte)\s+van\s+(\d+(?:[.,]\d+)?)/))) return n(m[2]) / 2;
  if ((m = t.match(/\b(kwart)\s+van\s+(\d+(?:[.,]\d+)?)/))) return n(m[2]) / 4;
  if ((m = t.match(/\b(derde)\s+van\s+(\d+(?:[.,]\d+)?)/))) return n(m[2]) / 3;
  if ((m = t.match(/^\s*(?:wat is\s*)?(-?\d+(?:[.,]\d+)?(?:\s*[+−\-×x·:÷]\s*-?\d+(?:[.,]\d+)?)+)\s*(?:=\s*\??)?\s*\??\s*$/))) {
    const expr = m[1].replace(/,/g, '.').replace(/−/g, '-').replace(/[×x·]/g, '*').replace(/[:÷]/g, '/');
    if (!/^[\d.\s+\-*/]+$/.test(expr)) return null;
    try { const v = Function(`"use strict";return (${expr})`)(); return Number.isFinite(v) ? Math.round(v * 1e6) / 1e6 : null; } catch { return null; }
  }
  return null;
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
export { getallen, antwoordVan, isZelfde, WEET_NIET };

// Dieselfde skuiwe in Afrikaans (vir die Afrikaanse Max: instruksies in sy eie taal, nie Nederlands om te vertaal nie)
export const ZETTEN_AF = {
  voorbeeld: { doel: 'Die kind sit vas by hierdie stap. Gee die MAKLIKER VOORBEELD hieronder (presies daardie som, deur die app nagewerk) en laat die kind dít uitwerk.', opties: ['vra die voorbeeld kaal', 'sit die voorbeeld in ’n mini-storie (geld, lekkers, treë) met presies dieselfde getalle'], regels: 'Sê in een kort sin dat julle dit eers makliker maak, en dat die regte stap daarna presies so werk. Moenie die antwoord van die voorbeeld noem nie.' },
  eigen_voorbeeld: { doel: 'Die kind sit vas by hierdie stap. Bedink self ’n MAKLIKER VOORBEELD van presies dieselfde soort stap (dieselfde vraag, dieselfde aanpak as die wenk en die kaart), met ander, kleiner of ronder getalle, en laat die kind dít doen.', opties: ['’n kaal makliker voorbeeld', '’n mini-storie (geld, lekkers, ’n klok, ’n ry) met klein getalle'], regels: 'Sê in een kort sin dat julle dit eers makliker maak en dat die regte stap daarna presies so werk. Moenie die antwoord van jou voorbeeld noem nie.' },
  vb_fout: { doel: 'Die kind het die voorbeeld verkeerd. Sê vriendelik dat dit nog nie reg is nie en help met DIESELFDE VOORBEELD (dieselfde getalle; geen nuwe voorbeeld en nog nie die regte stap nie): een kleiner treetjie of ’n konkrete hulp (geld, ’n prentjie, tel), en vra die voorbeeld weer. Sê niks wat nie waar is oor die kind se getal nie (2 deel wél in 8 en 12, dis net nie die grootste nie) en raai nie hoe die kind daarby uitgekom het nie.', opties: ['breek die voorbeeld in twee kleiner stukkies', 'gebruik geld of ’n prentjie by die voorbeeld'], regels: 'Reageer op die getal wat die kind genoem het (sê die getal). Moenie die antwoord van die voorbeeld al noem nie.' },
  vb_concreter: { doel: 'Die kind verstaan die voorbeeld nie. Maak DIE VOORBEELD meer konkreet op ’n ánder manier as jou vorige boodskap (sien die model op die kaart), en vra die voorbeeld weer.', opties: ['met geld of regte dinge (munte, lekkers, treë)', 'met ’n prentjie van die model op die kaart'], regels: 'Moenie dieselfde verduideliking as in jou vorige boodskap gebruik nie. Moenie die antwoord van die voorbeeld al noem nie.' },
  vb_voordoen: { doel: 'Die voorbeeld lukt nog nie. Doen DIE VOORBEELD nou self heeltemal voor, kort en stap vir stap, met ’n konkrete hulp (geld, ’n prentjie, tel op die getallelyn) en mét die antwoord. Sit daarna net die EERSTE klein stukkie van die regte stap reg volgens die wenk (bv. "By jou som: eers 279 − 200. Hoeveel is dit?") en vra daardie stukkie. Moenie die hele regte stap op een slag vra nie: hierdie kind sit vas.', opties: ['voordoen in 2-3 kort treetjies, dan die eerste stukkie van die regte stap', 'voordoen met ’n prentjie, dan die eerste stukkie van die regte stap'], regels: 'Die antwoord van die VOORBEELD mag jy nou noem; die antwoord van die regte stap nie.' },
  brug: { doel: 'Die kind het die voorbeeld REG uitgewerk. Sê dat dit klop (kort, gemeend), en lê dan die brug: die regte stap werk presies so. Wys watter getalle nou op die plek van die voorbeeld se getalle kom (sit voorbeeld en regte stap kort langs mekaar). Bestaan die regte stap volgens die wenk uit stukkies (bv. eers × 20 en dan × 8), vra dan net die eerste stukkie; anders die hele stap.', opties: ['"By die voorbeeld het jy … gedoen, nou doen jy dieselfde met …"', 'sit voorbeeld en regte stap onder mekaar'], regels: 'Moenie die antwoord van die regte stap noem nie.' },
  deel_goed: { doel: 'Die kind het die stukkie wat jy gevra het REG. Sê kort dat dit klop, en gaan een stukkie verder na die regte stap (volgens die wenk): vra die volgende stukkie, of die hele stap as al die stukkies daar is.', opties: ['"Reg! En nou …"', 'sit die stukkies onder mekaar en vra wat nog ontbreek'], regels: 'Moenie die antwoord van die regte stap noem nie.' },
  stap_fout: { doel: 'Die kind het die REGTE stap verkeerd. Sê vriendelik dat dit nog nie reg is nie (noem die kind se getal) en wys waar dit verskil met hoe dit by die voorbeeld gegaan het, of watter stukkie van die aanpak (wenk) nog ontbreek. Vra die regte stap weer.', opties: ['vergelyk met die voorbeeld', 'breek die regte stap in twee stukkies en vra die eerste stukkie'], regels: 'Moenie die antwoord van die regte stap noem nie.' },
  stap_concreter: { doel: 'Die kind verstaan die regte stap nog nie (ná die voorbeeld). Maak dit meer konkreet op ’n ánder manier as jou vorige boodskap: breek die regte stap in twee klein stukkies volgens die wenk, of gebruik die model van die kaart (geld, prentjie). Vra net die eerste stukkie.', opties: ['in twee stukkies breek', 'met geld of ’n prentjie'], regels: 'Moenie dieselfde verduideliking as in jou vorige boodskap gebruik nie. Moenie die antwoord van die regte stap noem nie.' },
  stap_samen: { doel: 'Dit lukt nog steeds nie. Doen die regte stap saam: skryf dit in baie klein treetjies uit (hoogstens 3), werk alles voor behalwe die heel laaste klein stukkie, en laat die kind net daardie laaste stukkie doen.', opties: ['klein treetjies onder mekaar', 'met ’n prentjie en die treetjies'], regels: 'Die antwoord van die regte stap self noem jy nie; die kind doen die laaste stukkie.' },
  klaar: { doel: 'Die kind het die regte stap REG. Sê kort en gemeend dat dit klop en dat hy dit nou in die blokkie kan invul. Prys die aanpak (wat die kind goed gedoen het), nie "slim wees" nie.', opties: ['kort kompliment + "vul dit maar in"', 'kompliment oor hoe die voorbeeld gehelp het + "vul dit maar in"'], regels: 'Moenie die getal of die som met antwoord weer neerskryf nie.' },
};
