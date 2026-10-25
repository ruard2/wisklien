// Gespreksplan voor het gesprek NA EEN FOUT antwoord: de app beslist de didactische zet, Max verwoordt hem.
// Zelfde idee als src/stapgesprek.js (bij een tussenstap), maar dan door de hele som heen: de app loopt met het kind de
// tussenstappen van de som af (dezelfde route als de app laat invullen), kijkt elk antwoord na tegen de vraag die Max echt
// stelde ([VB: vraag = antwoord] op zijn bericht) en kiest per beurt: fout zoeken in de uitleg van het kind, samen
// beginnen, volgende stap, tip bij een fout, makkelijker voorbeeld, brug terug, of "nu klopt het — wat ging er anders?".
//
// De opening (eerste bericht na de fout) is een vaste beurt (src/vast.js); vanaf het antwoord van het kind neemt dit plan
// het over. Een eigen vraag van het kind, of iets wat de app niet kan nakijken, gaat naar de gewone Max.
import { makkelijker } from './tips.js';
import { snaptNiet } from './kwaliteit.js';
import { antwoordVan, isZelfde, WEET_NIET, ZETTEN, ZETTEN_AF } from './stapgesprek.js';

const GOKT = /gegokt|gegok|geraai|raai|zomaar|maar wat|weet (ik )?niet (meer|precies)|weet nie (meer|mooi)|geen idee|ek weet nie|vergist|vergis|snel gedaan|vinnig gedoen|fout gemaak|in mijn hoofd|in my kop/i;
const VRAAG = /^\s*(waarom|hoe(?!\s+kwam)|wat|wie|welke|wanneer|kan|mag|moet|hoekom|watter|is dit omdat)\b/i;
const vb = (st) => (st.type === 'choice' ? st.options[st.answer] : st.display);

export const FOUTZETTEN = {
  diagnose: {
    doel: 'Het kind vertelde hoe het aan zijn foute antwoord kwam. Zoek de fout in DIE uitleg: zeg kort wat goed ging en waar het precies misging (concreet, met de getallen van het kind). Stel daarna de eerste stap van de juiste route als vraag (de tussenstap hieronder).',
    opties: ['"Dit deed je goed: … Maar hier ging het mis: …"', 'zet de manier van het kind en de juiste manier kort naast elkaar'],
    regels: 'Raad niet als de uitleg het niet laat zien; zeg dan wat je niet snapt. Noem het eindantwoord niet.',
  },
  samen_begin: {
    doel: 'Het kind weet niet hoe het aan zijn antwoord kwam (of gokte). Stel het gerust (gokken is niet erg) en begin samen bij de eerste stap: stel de tussenstap hieronder als vraag.',
    opties: ['kort geruststellen + de eerste stap als vraag', 'zeg in één zin wat de som vraagt, dan de eerste stap als vraag'],
    regels: 'Noem het eindantwoord en de uitkomst van de stap niet.',
  },
  volgende: {
    doel: 'Het kind had de vorige stap GOED. Zeg kort en gemeend dat het klopt en stel de volgende tussenstap hieronder als vraag.',
    opties: ['"Klopt! Nu …"', 'zet de stappen tot nu toe kort onder elkaar en vraag de volgende'],
    regels: 'Noem de uitkomst van de nieuwe stap en het eindantwoord niet.',
  },
  laatste: {
    doel: 'Alle tussenstappen zijn goed. Zeg dat het klopt en laat het kind nu zelf het laatste stukje doen (het SLOT hieronder) om het eindantwoord te vinden.',
    opties: ['"Top! Nu het laatste stukje: …"', 'zet de stappen kort onder elkaar en vraag het slot'],
    regels: 'Noem het eindantwoord NIET; het kind rekent dat zelf uit.',
  },
  stap_hint: {
    doel: 'Het kind gaf een fout antwoord op de stap. Zeg vriendelijk dat het nog niet klopt (noem het getal van het kind) en geef de hulp van de TIP hieronder, concreet voor deze stap. Vraag de stap opnieuw.',
    opties: ['de tip in eigen woorden, met de getallen van de stap', 'knip de stap in twee kleine stukjes volgens de tip en vraag het eerste'],
    regels: 'Noem de uitkomst van de stap niet. Zeg niets onwaars over het getal van het kind.',
  },
  stap_concreet: {
    doel: 'Het kind snapt deze stap nog niet. Help BIJ DEZE STAP, concreter en op een ándere manier dan je vorige bericht: laat met een heel klein voorbeeld zien hoe het gaat (dat voorbeeld mag je helemaal voordoen, mét uitkomst; gebruik het makkelijker voorbeeld hieronder als dat er is), of knip de stap in een kleiner stukje, of gebruik het model van de kaart (geld, plaatje). Vraag daarna in hetzelfde bericht meteen de stap zelf (of het eerste kleine stukje ervan).',
    opties: ['klein voorbeeld voordoen + "en bij jouw som?"', 'de stap in een kleiner stukje, met een plaatje of geld'],
    regels: 'Noem de uitkomst van de stap zelf niet. Geen apart voorbeeld waar het kind eerst op moet antwoorden: na dit bericht doet het kind de stap.',
    vbUitkomst: true,
  },
  goed_nu: {
    doel: 'Het kind heeft nu het GOEDE eindantwoord. Zeg dat het nu klopt, en vraag kort wat er de eerste keer anders ging (noem het eerste, foute antwoord).',
    opties: ['"Nu klopt het! Eerst had je … Wat ging er toen anders?"', 'compliment over de aanpak + de vraag wat er anders ging'],
    regels: 'Schrijf het goede getal of de som met uitkomst niet nog eens op. Vul-maar-in zeg je pas daarna.',
    vbUitkomst: true, geenVraagLabel: true,
  },
};

// target: de stap waar het gesprek nu over gaat ({ask, answer, display, type, tip}); bij k == guide.length het slot.
const doelStap = (q, k) => (k < q.guide.length ? q.guide[k] : { ask: q.guideFinal || q.text, answer: q.answer, display: q.display, type: q.type === 'choice' ? 'choice' : 'number', options: q.options, slot: true });

export function foutPlan({ question: q, given, chat = [] }) {
  const g = (q.guide || []).filter((s) => s.type !== 'choice' || s.options);
  if (!g.length || !chat.length || chat.at(-1)?.role === 'teacher') return null;
  const s = { fase: 'open', k: 0, vb: null, snap: 0, fout: 0, foutVb: 0, zetten: [] };
  let zet = null, vorigeZet = 'opening';
  const kindIdx = chat.map((m, i) => (m.role !== 'teacher' ? i : -1)).filter((i) => i >= 0);
  for (const i of kindIdx) {
    const tekst = chat[i].text;
    const vorigeMax = [...chat.slice(0, i)].reverse().find((m) => m.role === 'teacher');
    if (!vorigeMax) return null; // het kind begon zelf: gewone Max
    const doel = doelStap(q, s.k);
    if (vorigeZet === 'eigen_voorbeeld' && vorigeMax.vb) s.vb = vorigeMax.vb;
    if (vorigeZet === 'opening') s.fase = vorigeMax.vb || !/hoe (kwam|heb|deed|ben)|hoe het jy|hoe kom jy|wat het jy gedoen|wat deed je/i.test(vorigeMax.text) ? 'vraag' : 'hoe';
    const verwacht = vorigeMax.vb || (s.fase === 'voorbeeld' ? s.vb : s.fase === 'vraag' ? { som: doel.ask, uitkomst: vb(doel) } : null);
    const heeftAntwoord = antwoordVan(tekst) != null || (verwacht && isZelfde(tekst, verwacht.uitkomst));
    const eind = isZelfde(tekst, q.type === 'choice' ? q.options[q.answer] : q.display) && !isZelfde(tekst, given);
    zet = null;
    if (s.fase === 'klaar') zet = null;
    else if (/\b(ik snap het|ek verstaan dit)\b/i.test(tekst) && !/\b(niet|nie)\b/i.test(tekst)) zet = null;
    else if (VRAAG.test(tekst) && !WEET_NIET.test(tekst) && !snaptNiet(tekst) && !(verwacht && isZelfde(tekst, verwacht.uitkomst))) zet = null; // eigen vraag ("waarom 50?"): de gewone Max
    else if (s.fase === 'hoe') {
      if (eind) zet = 'goed_nu';
      else if (GOKT.test(tekst) || snaptNiet(tekst) || WEET_NIET.test(tekst)) zet = 'samen_begin';
      else zet = 'diagnose';
    } else if (!heeftAntwoord && (snaptNiet(tekst) || WEET_NIET.test(tekst))) {
      s.snap++;
      if (s.fase === 'voorbeeld') zet = s.snap >= 3 || s.foutVb >= 1 ? 'vb_voordoen' : 'vb_concreter';
      else {
        // Na een fout geen apart voorbeeld-omweggetje (Na een fout #23/#24: dat kostte twee beurten en het kind kwam niet
        // verder): concreter bij de stap zelf, met een voorgedaan mini-voorbeeld; lukt het dan nog niet, samen doen.
        const app = doel.type !== 'choice' && makkelijker(doel.ask, doel.answer, [q.answer]);
        s.vb = app ? { som: app.vraag || app.som.includes('?') ? app.som : `${app.som} = ?`, uitkomst: app.uitkomst, vanApp: true, opstap: !!app.opstap } : null;
        s.hulp = (s.hulp || 0) + 1; zet = s.hulp >= 2 ? 'stap_samen' : 'stap_concreet';
      }
    } else if (heeftAntwoord && verwacht) {
      const goed = isZelfde(tekst, verwacht.uitkomst);
      if (eind || (goed && doel.slot && s.fase !== 'voorbeeld')) zet = 'goed_nu';
      else if (goed && s.fase === 'voorbeeld') zet = 'brug';
      else if (goed) {
        // welke stap was dit? een tussenstap uit de som → door naar de volgende; anders een deelvraag van Max
        const j = q.guide.findIndex((st, x) => x >= s.k && isZelfde(String(verwacht.uitkomst), vb(st)));
        if (j >= 0) { s.k = j + 1; s.fout = 0; s.hulp = 0; s.vb = null; zet = s.k >= q.guide.length ? 'laatste' : 'volgende'; } else zet = 'deel_goed';
      } else if (s.fase === 'voorbeeld') { s.foutVb++; zet = s.foutVb >= 2 ? 'vb_voordoen' : 'vb_fout'; }
      else {
        s.fout++;
        if (s.fout >= 2) { const app = doel.type !== 'choice' && makkelijker(doel.ask, doel.answer, [q.answer]); s.vb = app ? { som: app.vraag || app.som.includes('?') ? app.som : `${app.som} = ?`, uitkomst: app.uitkomst, vanApp: true, opstap: !!app.opstap } : null; s.hulp = (s.hulp || 0) + 1; }
        zet = s.fout === 1 ? 'stap_hint' : s.hulp >= 2 || s.fout >= 3 ? 'stap_samen' : 'stap_concreet';
      }
    }
    if (zet) {
      s.zetten.push(zet);
      s.fase = zet === 'goed_nu' ? 'klaar' : ['voorbeeld', 'eigen_voorbeeld', 'vb_fout', 'vb_concreter'].includes(zet) ? 'voorbeeld' : 'vraag';
      if (zet === 'brug' || zet === 'vb_voordoen') s.fout = 0;
    }
    vorigeZet = zet;
  }
  if (!zet) return null;
  const doel = doelStap(q, s.k);
  return { zet, doel, voorbeeld: s.vb, k: s.k, fase: s.fase, eerdereZetten: s.zetten.slice(0, -1) };
}

export const FOUTZETTEN_AF = {
  diagnose: { doel: 'Die kind het vertel hoe hy by sy verkeerde antwoord uitgekom het. Soek die fout in DAARDIE verduideliking: sê kort wat reg was en waar dit presies verkeerd geloop het (konkreet, met die kind se getalle). Vra daarna die eerste stap van die regte roete (die tussenstap hieronder).', opties: ['"Dit het jy reg gedoen: … Maar hier het dit verkeerd geloop: …"', 'sit die kind se manier en die regte manier kort langs mekaar'], regels: 'Raai nie as die verduideliking dit nie wys nie; sê dan wat jy nie verstaan nie. Moenie die finale antwoord noem nie.' },
  samen_begin: { doel: 'Die kind weet nie hoe hy by sy antwoord uitgekom het nie (of het geraai). Stel hom gerus (raai is nie erg nie) en begin saam by die eerste stap: vra die tussenstap hieronder.', opties: ['kort gerusstel + die eerste stap as vraag', 'sê in een sin wat die som vra, dan die eerste stap as vraag'], regels: 'Moenie die finale antwoord of die antwoord van die stap noem nie.' },
  volgende: { doel: 'Die kind het die vorige stap REG. Sê kort en gemeend dat dit klop en vra die volgende tussenstap hieronder.', opties: ['"Reg! Nou …"', 'sit die stappe tot dusver kort onder mekaar en vra die volgende'], regels: 'Moenie die antwoord van die nuwe stap of die finale antwoord noem nie.' },
  laatste: { doel: 'Al die tussenstappe is reg. Sê dat dit klop en laat die kind nou self die laaste stukkie doen (die SLOT hieronder) om die finale antwoord te kry.', opties: ['"Puik! Nou die laaste stukkie: …"', 'sit die stappe kort onder mekaar en vra die slot'], regels: 'Moenie die finale antwoord noem nie; die kind werk dit self uit.' },
  stap_hint: { doel: 'Die kind het die stap verkeerd. Sê vriendelik dat dit nog nie reg is nie (noem die kind se getal) en gee die hulp van die WENK hieronder, konkreet vir hierdie stap. Vra die stap weer.', opties: ['die wenk in eie woorde, met die getalle van die stap', 'breek die stap in twee klein stukkies volgens die wenk en vra die eerste'], regels: 'Moenie die antwoord van die stap noem nie. Sê niks wat nie waar is oor die kind se getal nie.' },
  stap_concreet: { doel: 'Die kind verstaan hierdie stap nog nie. Help BY HIERDIE STAP, meer konkreet en op ’n ánder manier as jou vorige boodskap: wys met ’n baie klein voorbeeld hoe dit gaan (daardie voorbeeld mag jy heeltemal voordoen, mét antwoord; gebruik die makliker voorbeeld hieronder as dit daar is), of breek die stap in ’n kleiner stukkie, of gebruik die model van die kaart (geld, prentjie). Vra daarna in dieselfde boodskap dadelik die stap self (of die eerste klein stukkie daarvan).', opties: ['klein voorbeeld voordoen + "en by jou som?"', 'die stap in ’n kleiner stukkie, met ’n prentjie of geld'], regels: 'Moenie die antwoord van die stap self noem nie. Geen aparte voorbeeld waarop die kind eers moet antwoord nie: ná hierdie boodskap doen die kind die stap.' },
  goed_nu: { doel: 'Die kind het nou die REGTE finale antwoord. Sê dat dit nou klop, en vra kort wat die eerste keer anders was (noem die eerste, verkeerde antwoord).', opties: ['"Nou is dit reg! Eers het jy … gehad. Wat was toe anders?"', 'kompliment oor die aanpak + die vraag wat anders was'], regels: 'Moenie die regte getal of die som met antwoord weer neerskryf nie. "Vul dit maar in" sê jy eers daarna.' },
};

// ADVIES-modus (Na een fout #23–#26): het strakke plan voorzegt veel minder (≈ 10 tegen 30), maar de vrije Max scoort
// beter op didactiek en luisteren, omdat hij zelf de beste zet kiest voor wat het kind net zei; het plan herhaalde zich
// vaker. Dus: de app geeft Max wat ze ZEKER weet (nagekeken antwoord, waar jullie in de route zijn, welke getallen niet
// mogen) en wat ze zou doen (advies), en Max kiest zelf. De verboden getallen bewaakt de app daarna wel hard.
export function foutAdvies({ question: q, given, chat = [], name = 'het kind', af = false }) {
  if (!(q.guide || []).length) return null;
  const fp = foutPlan({ question: q, given, chat });
  const laatste = chat.at(-1)?.role !== 'teacher' ? chat.at(-1)?.text || '' : '';
  const vorigeMax = [...chat].reverse().find((m) => m.role === 'teacher');
  const eindGoed = q.type === 'choice' ? q.options[q.answer] : q.display;
  const zei = (x) => chat.some((m) => m.role !== 'teacher' && isZelfde(m.text, x));
  const T = af ? {
    kop: 'WAT DIE APP SEKER WEET (net vir jou)', na: (v, k, ok) => `Nagegaan deur die app: jy het gevra "${v.som}" (reg: ${v.uitkomst}); ${name} het gesê "${k}": ${ok ? 'REG' : 'NOG NIE REG NIE'}.`,
    eind: `${name} het nou die REGTE finale antwoord gesê.`, gedaan: 'Klaar in die roete', nu: 'Volgende in die roete', slot: 'die slot', geheim: 'GEHEIM',
    advies: 'Wat die app sou doen (advies)', vry: `Jy kies self wat die beste help vir wat ${name} nou sê (’n vraag van ${name}, frustrasie of ’n half reg antwoord gaan voor); die advies is net ’n wegwyser.`,
    verbode: 'Hierdie getalle kom NIE in jou boodskap nie (die kind moet dit self vind)', vb: `Sit op die heel laaste reël, onsigbaar vir die kind, die vraag wat jy vra met die regte antwoord: [VB: <vraag> = <antwoord>].`,
  } : {
    kop: 'WAT DE APP ZEKER WEET (alleen voor jou)', na: (v, k, ok) => `Nagekeken door de app: je vroeg "${v.som}" (goed: ${v.uitkomst}); ${name} zei "${k}": ${ok ? 'GOED' : 'NOG NIET GOED'}.`,
    eind: `${name} zei nu het GOEDE eindantwoord.`, gedaan: 'Klaar in de route', nu: 'Volgende in de route', slot: 'het slot', geheim: 'GEHEIM',
    advies: 'Wat de app zou doen (advies)', vry: `Je kiest zelf wat het best helpt bij wat ${name} nu zegt (een vraag van ${name}, frustratie of een half goed antwoord gaat voor); het advies is alleen een wegwijzer.`,
    verbode: 'Deze getallen komen NIET in je bericht (het kind moet ze zelf vinden)', vb: `Zet op de allerlaatste regel, onzichtbaar voor het kind, de vraag die je stelt met het juiste antwoord: [VB: <vraag> = <antwoord>].`,
  };
  const L = [T.kop];
  if (laatste && isZelfde(laatste, eindGoed) && !isZelfde(laatste, given)) L.push(`- ${T.eind}`);
  else if (laatste && vorigeMax?.vb && (antwoordVan(laatste) != null || isZelfde(laatste, vorigeMax.vb.uitkomst))) L.push(`- ${T.na(vorigeMax.vb, laatste.slice(0, 80), isZelfde(laatste, vorigeMax.vb.uitkomst))}`);
  const k = fp ? fp.k : 0;
  if (k > 0) L.push(`- ${T.gedaan}: ${q.guide.slice(0, k).map((g, i) => `${i + 1}. ${g.ask.replace(/\s*=\s*\?.*$/, '')} = ${vb(g)} ✓`).join(' / ')}`);
  const doel = doelStap(q, k);
  L.push(`- ${T.nu}: ${doel.slot ? `${T.slot}: "${doel.ask}"` : `"${doel.ask}" (${T.geheim}: ${vb(doel)})`}${doel.tip ? ` — tip: "${doel.tip}"` : ''}`);
  if (fp?.voorbeeld) L.push(`- ${af ? 'Makliker voorbeeld (deur die app nagewerk)' : 'Makkelijker voorbeeld (door de app nagerekend)'}: ${fp.voorbeeld.som} → ${fp.voorbeeld.uitkomst}`);
  const t = fp && (af ? FOUTZETTEN_AF[fp.zet] || ZETTEN_AF[fp.zet] : FOUTZETTEN[fp.zet] || ZETTEN[fp.zet]);
  if (t) L.push(`- ${T.advies}: ${t.doel}`);
  L.push(`- ${T.vry}`);
  // verboden: het eindantwoord en de uitkomst van de stap waar jullie nu zijn, tenzij het kind ze zelf al zei
  const getal = (x) => { const m = String(x).replace(/(\d)[  ](?=\d{3}\b)/g, '$1').match(/-?\d+(?:,\d+)?/); return m ? Number(m[0].replace(',', '.')) : null; };
  const verboden = [];
  for (const x of [eindGoed, doel.slot ? null : vb(doel)]) { const g = x != null ? getal(x) : null; if (g != null && Math.abs(g) > 2 && !zei(x) && !(fp?.zet === 'goed_nu')) verboden.push(g); }
  if (verboden.length) L.push(`- ${T.verbode}: ${[...new Set(verboden)].map((x) => String(x).replace('.', ',')).join('; ')}.`);
  L.push(`- ${T.vb}`);
  return { blok: L.join('\n'), verboden: [...new Set(verboden)], zet: fp?.zet || null };
}
