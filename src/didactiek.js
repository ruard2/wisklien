// Didactisch handboek: per onderwerp één vaste aanpak, zoals op Nederlandse basisscholen.
// Eén bron voor alles: Max (gesprekken en lessen), hints, tussenstappen en voorbeelden.
//
// Gebaseerd op:
//  - TAL-leerlijnen / SLO-tussendoelen (Freudenthal Instituut): eerst betekenis (geld, meten), dan modellen,
//    dan kale sommen. Bij problemen: een stap terug in de leerlijn.
//  - Handelingsmodel (Protocol ERWD, Van Groenestijn e.a. 2011): informeel handelen → concreet voorstellen
//    (plaatje, geld) → abstract voorstellen (model: getallenlijn, strook, positieschema, verhoudingstabel)
//    → formeel (kale som). Snapt het kind het niet: één niveau concreter, en de niveaus aan elkaar koppelen.
//  - Drieslag (ERWD) voor verhaaltjessommen: plannen (wat wordt er gevraagd?) → uitvoeren → controleren.
//  - Kwaliteitskaarten breuken/procenten (UU): strook als hoofdmodel; procenten via 50/25/10/5% (ankers),
//    de 1%-regel pas later; breuken vergelijken met strook/getallenlijn.
//  - Directe instructie (IGDI): voorkennis → voordoen (hardop) → samen → zelf → terugkijken.
//
// Schatten: in de Nederlandse leerlijn belangrijk, maar voor een kind dat achterloopt NOOIT als
// onuitgelegde eerste stap. Schatten = "met makkelijke, ronde getallen ongeveer uitrekenen".
// We gebruiken het als CONTROLE achteraf ("klopt het ongeveer?"), en alleen in groep 8-kommasommen
// (kommagetal × kommagetal) om de komma te plaatsen — dan altijd uitgelegd en met keuzes.

export const ALGEMEEN = {
  schatten: 'Schatten = met makkelijke, ronde getallen ongeveer uitrekenen. Bijvoorbeeld 2,4 × 3: 2,4 is bijna 2, en 2 × 3 = 6, dus het antwoord is "ongeveer 6". Zo kun je controleren of je echte antwoord ongeveer klopt.',
  handelingsmodel: 'Begrijpt het kind de som niet? Maak de som dan stap voor stap concreter. Kale som → model (getallenlijn, strook, tabel, positieschema) → plaatje of geld/meten → echte situatie. Laat daarna zien hoe dit bij de som hoort.',
  drieslag: 'Verhaaltjessom: 1) Wat wordt er gevraagd? Welke getallen heb je nodig? 2) Reken het uit. 3) Klopt het antwoord bij het verhaal?',
};

// ---------- TAALGIDS: zo praten Nederlandse rekenmethodes en leerkrachten ----------
// Bronnen: De wereld in getallen (basisstrategieën en leerlijnen groep 3-8), Alles telt / Cito-rekentaal
// per jaargroep (LOWAN-rekenkist), SLO-inhoudslijn Bewerkingen. Eén bron voor sommen, hints, app-teksten
// en Max. Vertaald Engels (calques) staat in VERMIJD, met de gewone Nederlandse vorm erbij.
export const TAALGIDS = {
  woorden: {
    sommen: 'plussom, minsom, keersom, deelsom; kale som (alleen getallen) en verhaaltjessom; het antwoord (of de uitkomst); een tussenantwoord; het kladblaadje',
    optellen: 'erbij, samen; rijgen (in sprongen op de lege getallenlijn: eerst de tientallen, dan de eenheden); splitsen (beide getallen in stukken, dan "samen: 700 + 40 + 2"); kolomsgewijs (onder elkaar, per positie, begin links bij de grootste); cijferend (onder elkaar, rechts beginnen, onthouden; vanaf groep 7)',
    aftrekken: 'eraf, haal weg, het verschil; rijgen (het tweede getal in stukken eraf); aanvullen ("hoeveel moet erbij om bij … te komen?"); rijgen met te veel / handig rekenen (− 99 = − 100 en dan 1 erbij, "je hebt 1 te veel eraf gehaald")',
    keer: 'keer (niet "vermenigvuldigen" tegen kinderen); de tafels; omkeren (4 × 7 = 7 × 4); verdubbelen, halveren; één keer meer / één keer minder; tientallentafels (5 × 40); een nul erachter; splitsen: 7 × 65 = 7 × 60 en 7 × 5, samen 455',
    delen: 'eerlijk verdelen (iedereen evenveel), opdelen (hoe vaak past … erin?); de rest (wat overblijft); happen: haal steeds een grote hap eraf ("de grootste hap"), herhaald aftrekken; staartdeling alleen voor sterke rekenaars',
    kommagetallen: 'kommagetal; cijfers achter de komma; helen, tienden, honderdsten, duizendsten; het positieschema (D H T E , t h d); komma onder komma; afronden op een heel getal / op één cijfer achter de komma',
    breuken: 'teller (het getal boven de streep), noemer (onder de streep); "3/4 deel van € 12"; gelijknamig maken (zelfde noemer); gelijkwaardige breuken (1/2 = 2/4); vereenvoudigen; helen uit een breuk halen; gemengd getal (2 1/2); de strook',
    procenten: 'procent = per honderd (van de 100); 100% is alles; via 50%, 25%, 10% (en 1%); korting, nieuwe prijs; de procentenstrook',
    verhoudingen: 'verhoudingstabel (twee rijen: wat je boven doet, doe je onder ook); per stuk, per persoon; schaal: 1 : 100 betekent 1 cm op de kaart is 100 cm in het echt',
    schatten: 'schatten / ongeveer uitrekenen / globaal rekenen: met ronde getallen ("29 × 42 is ongeveer 30 × 40"); ≈ betekent "is ongeveer"; afronden op tientallen, honderdtallen',
    getallen: 'getal (niet "nummer"), cijfer (de tekens 0-9), de waarde van een cijfer (de 4 in 347 is 40 waard); duizendtallen, honderdtallen, tientallen, eenheden; even, oneven',
    meten: 'lengte, gewicht, inhoud; omtrek (de rand rondom), oppervlakte (hoeveel vierkantjes erin passen), inhoud in kubusjes; maten omrekenen (de metriek-trap: km hm dam m dm cm mm)',
    tijd: 'kwart over, half, kwart voor; een kwartier; de tijdbalk (niet "tijdlijn"); de tijdsduur ("hoe lang duurt het?"); analoge en digitale klok',
    notatie: 'geld als € 2,40 (met een spatie na €); komma in kommagetallen (2,5); × voor keer en : voor delen; grote getallen met een spatie (12 500)',
    grafieken: 'staafgrafiek (staafdiagram), lijngrafiek, cirkeldiagram, tabel; aflezen; gemiddelde (alles bij elkaar en eerlijk verdelen)',
  },
  // [patroon, betere Nederlandse vorm]; patronen zonder hoofdletters, op hele woorden
  vermijd: [
    ['nummerlijn', 'getallenlijn'],
    ['nummer(s)?', 'getal (een nummer is een huisnummer of telefoonnummer)'],
    ['plaatswaarde', 'de waarde van een cijfer (de 4 in 347 is 40 waard)'],
    ['fractie(s)?', 'breuk'],
    ['decima(al|le|len)', 'kommagetal, cijfers achter de komma'],
    ['lange deling', 'staartdeling (of: delen met happen)'],
    ['tijdlijn', 'tijdbalk'],
    ['incorrect', 'fout'],
    ['correct', 'goed, klopt'],
    ['check(en|t|te)?', 'controleer, kijk na'],
    ['level(s)?', 'niveau'],
    ['focus(sen)?', 'let op'],
    ['laten we', 'we gaan …, kom, we …'],
    ['(geweldige|goede|leuke|mooie) vraag', '(weglaten, geen vertaald "great question")'],
    ['goed punt', '(weglaten, vertaald "good point")'],
    ['(geweldig|goed|knap) werk', 'goed zo, knap gedaan'],
    ['je hebt het( goed)?!', 'goed zo, klopt'],
    ['dichtstbijzijnde', 'afronden op tientallen (honderdtallen, …)'],
    ['(maakt|maak) (geen )?sense', 'klopt (niet), is (niet) logisch'],
    ['heel nummer', 'heel getal'],
    ['product', 'het antwoord van de keersom'],
    ['quoti[eë]nt', 'het antwoord van de deelsom'],
    ['(deler|deeltal)', 'het getal waardoor je deelt (deler), het getal dat je verdeelt'],
    ['vergelijking(en)?', 'som (in de basisschool heten het sommen)'],
    ['wiskunde', 'rekenen'],
    ['kruislings', '(niet gebruiken, geen schooltruc: gebruik de verhoudingstabel)'],
    ['dat is (helemaal )?oké', 'dat geeft niks, geeft niet'],
    ['hoe voel je je', 'hoe gaat het?'],
    ['je bent op de goede weg', 'je zit goed, je bent goed bezig'],
  ],
  complimenten: ['Goed zo!', 'Klopt!', 'Helemaal goed.', 'Knap gedaan.', 'Ja, dat is het.', 'Netjes uitgerekend.', 'Mooi, dat klopt.', 'Precies.', 'Goed gezien!', 'Dat gaat lekker.'],
};
export const vermijdRe = () => TAALGIDS.vermijd.map(([p, beter]) => ({ re: new RegExp(`(^|[^\\p{L}])(${p})(?=$|[^\\p{L}])`, 'iu'), p, beter }));
// Voor de prompt van Max (alleen NL)
export function taalgidsText() {
  return `TAAL (zo praten Nederlandse rekenmethodes zoals De wereld in getallen en Alles telt; gebruik ALTIJD deze woorden)
${Object.entries(TAALGIDS.woorden).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
VERMIJD vertaald Engels en ongebruikelijke woorden (links fout → rechts goed):
${TAALGIDS.vermijd.map(([p, b]) => `- "${p.replace(/\(([^)]*)\)\??/g, (m, x) => x.split('|')[0])}" → ${b}`).join('\n')}
Schrijf zoals een Nederlandse juf of meester praat, niet zoals een vertaling: korte, gewone zinnen. Wissel je complimenten af (${TAALGIDS.complimenten.join(' / ')}); begin NIET elk bericht met "Ja! Precies." en niet met "Laten we". Een som heet een som (plussom, minsom, keersom, deelsom), geen "vraag" of "opgave" en zeker geen "probleem".`;
}

// Per onderwerp. niveaus: 0 = groep 5, 1 = groep 6, 2 = groep 7, 3 = groep 8.
export const DIDACTIEK = {
  optellen: {
    kern: 'Getallen zijn opgebouwd uit duizendtallen, honderdtallen, tientallen en eenheden. Je telt op of trekt af per stukje.',
    voorkennis: 'Getallen splitsen (47 = 40 en 7) en sommen tot 20 vlot uitrekenen.',
    modellen: ['lege getallenlijn (sprongen maken)', 'geld (briefjes en munten)', 'positieschema (D H T E)'],
    woorden: { rijgen: 'het tweede getal in sprongen erbij doen of eraf halen op de lege getallenlijn', splitsen: 'getallen in stukken verdelen, bijvoorbeeld in tientallen en eenheden', kolomsgewijs: 'onder elkaar, per positie rekenen, begin links bij de grootste', 'handig rekenen': 'bijvoorbeeld − 99 als − 100 en dan 1 erbij' },
    niveaus: [
      { doel: 'Optellen en aftrekken tot 100.', aanpak: ['Splits het tweede getal in tientallen en eenheden.', 'Rijg op de getallenlijn: eerst de tientallen erbij of eraf.', 'Dan de eenheden.'], voorbeeld: '56 + 17: 56 + 10 = 66, 66 + 7 = 73.' },
      { doel: 'Optellen en aftrekken tot 1000, ook handig rekenen.', aanpak: ['Splits het tweede getal (honderdtallen, tientallen, eenheden).', 'Rijg: stukje voor stukje.', 'Ligt een getal vlak bij een rond getal (75 bij 80)? Reken met het ronde getal en pas je antwoord daarna aan.'], voorbeeld: '669 − 75: 669 − 80 = 589. Je hebt 5 te veel eraf gehaald, dus tel er 5 bij op: 594.' },
      { doel: 'Tot 10 000, kolomsgewijs.', aanpak: ['Zet de getallen onder elkaar.', 'Reken per positie. Begin links bij de grootste: duizendtallen, honderdtallen, tientallen, eenheden.', 'Tel de stukken op.', 'Bij aftrekken: haal het tweede getal er in stukken af, eerst de duizendtallen.'], voorbeeld: '6599 + 1655: 7000 + 1100 + 140 + 14 = 8254.' },
      { doel: 'Grote getallen en verhaaltjessommen in meerdere stappen.', aanpak: ['Wat moet je uitrekenen? Welke sommen moet je maken?', 'Reken elke som kolomsgewijs of door te rijgen.', 'Controleer: klopt je antwoord bij het verhaal? Bij een minsom tel je het antwoord en het getal dat eraf is gehaald op.'], voorbeeld: 'Je spaart 232 + 92 = 324. Voor de fiets van 368 kom je 368 − 324 = 44 tekort.' },
    ],
    fouten: [
      { fout: 'Bij een minsom trek je per cijfer het kleinste cijfer van het grootste cijfer af (52 − 27 = 35).', hulp: 'Rijg op de getallenlijn: 52 − 20 = 32, 32 − 7 = 25.' },
      { fout: 'Een plek vergeten bij kolomsgewijs (honderdtallen overgeslagen).', hulp: 'Schrijf elke positie apart op, ook de nullen: 500 + 600.' },
    ],
    controle: 'Bij een minsom: tel het antwoord en het getal dat eraf is gehaald op. Dan krijg je weer het begingetal.',
    vermijd: ['"lenen" of "onthouden" zonder dat het kind snapt waarom', 'meteen cijferend rekenen als splitsen nog niet lukt'],
  },

  vermenigvuldigen: {
    kern: 'Keer is herhaald optellen: 4 × 7 = 7 + 7 + 7 + 7. Grote keersommen splits je in makkelijke stukken.',
    voorkennis: 'De tafels van 1 t/m 10.',
    modellen: ['groepjes (4 zakjes van 7)', 'rechthoek met rijen en kolommen', 'geld'],
    woorden: { tafel: 'het rijtje keersommen van een getal: 1 keer, 2 keer, 3 keer …', splitsen: 'een getal in stukken verdelen, bijvoorbeeld 26 = 20 en 6' },
    niveaus: [
      { doel: 'Tafels van 1 t/m 10.', aanpak: ['Gebruik een tafel die je wél kent.', 'Bij keer 10 zet je een nul achter het andere getal. Bij keer 5 neem je de helft daarvan.', 'Bij 9 × reken je eerst 10 × en haal je één keer het andere getal eraf. Bij 6 × reken je eerst 5 × en tel je het andere getal erbij.'], voorbeeld: '9 × 7: 10 × 7 = 70, min één 7: 70 − 7 = 63.' },
      { doel: 'De tafels vlot uitrekenen en keersommen met tientallen.', aanpak: ['Haal de nul er even af: bij 5 × 30 reken je eerst 5 × 3 = 15.', 'Zet de nul weer achter het antwoord: 150.', 'Bij 11 × of 12 × splits je het getal, bijvoorbeeld: 12 = 10 + 2.'], voorbeeld: '12 × 8: 10 × 8 = 80, 2 × 8 = 16, samen 96.' },
      { doel: 'Keersommen met grotere getallen, splitsen.', aanpak: ['Splits één getal in stukken (honderdtallen, tientallen, eenheden).', 'Reken elk stuk keer het andere getal.', 'Tel de stukken op.'], voorbeeld: '26 × 73: 20 × 73 = 1460, 6 × 73 = 438, samen 1898.' },
      { doel: 'Grote keersommen en verhaaltjessommen.', aanpak: ['Wat moet je uitrekenen? Hoeveel keer wat?', 'Splits het kleinste getal in tientallen en eenheden.', 'Reken elk stuk keer het andere getal en tel de antwoorden op.', 'Controleer met ronde getallen of het ongeveer klopt.'], voorbeeld: '283 × 64: 283 × 60 = 16 980, 283 × 4 = 1132, samen 18 112.' },
    ],
    fouten: [
      { fout: 'Bij × 10 "een nul erbij" ook bij kommagetallen (2,5 × 10 = 2,50).', hulp: 'Keer 10 betekent: 10 keer zo groot. 2,5 × 10 = 25 (geld: 10 × € 2,50 = € 25).' },
      { fout: 'Bij splitsen vergeten om een stuk keer het andere getal te doen (26 × 73 = 20 × 73 + 6).', hulp: 'Schrijf beide stukken helemaal op: 20 × 73 én 6 × 73.' },
    ],
    controle: 'Rond af en reken ongeveer: 26 × 73 is ongeveer 30 × 70 = 2100. 1898 ligt in de buurt, dus je antwoord kan kloppen.',
    vermijd: ['een tafel laten opzeggen als het kind vastloopt: gebruik een tafel die het wél kent'],
  },

  delen: {
    kern: 'Delen is eerlijk verdelen (24 snoepjes over 6 kinderen) of opdelen: kijken hoe vaak 6 in 24 past.',
    voorkennis: 'De tafels; keer en delen horen bij elkaar (6 × 4 = 24, dus 24 : 6 = 4).',
    modellen: ['eerlijk verdelen met plaatjes/geld', 'happen: steeds een groot stuk eraf (kolomsgewijs delen)'],
    woorden: { 'kolomsgewijs delen (happen)': 'steeds een zo groot mogelijke hap eraf halen tot er niets (of een rest) over is', rest: 'wat er overblijft als het niet precies past' },
    niveaus: [
      { doel: 'Deelsommen uit de tafels.', aanpak: ['Welke keersom uit de tafel geeft dit getal?', 'Begin met een makkelijke: 2 × of 5 × of 10 ×.', 'Hoeveel blijft er over? Hoe vaak past het daar nog in?'], voorbeeld: '15 : 5: 3 × 5 = 15, dus 15 : 5 = 3.' },
      { doel: 'Delen met nullen en met rest.', aanpak: ['Denk aan de tafel zonder de nul: 360 : 9 → 36 : 9 = 4.', '360 is 10 keer zo groot als 36, dus het antwoord is ook 10 keer zo groot: 40.', 'Past het niet precies? Wat overblijft is de rest.'], voorbeeld: '360 : 9 = 40.' },
      { doel: 'Kolomsgewijs delen (happen).', aanpak: ['Neem een grote hap: 100 keer, 10 keer of 5 keer het getal waardoor je deelt.', 'Haal de hap eraf. Wat blijft er over?', 'Neem een nieuwe hap, tot er niets (of een rest) over is.', 'Tel alle happen op.'], voorbeeld: '768 : 3: hap 200 × 3 = 600 (168 over), hap 50 × 3 = 150 (18 over), hap 6 × 3 = 18. 200 + 50 + 6 = 256.' },
      { doel: 'Grotere delers en verhaaltjes met rest.', aanpak: ['Wat moet je uitrekenen? Wat doe je met de rest (een bus extra of niet?)', 'Deel kolomsgewijs: neem happen van 10 keer of 100 keer het getal waardoor je deelt.', 'Controleer je antwoord: het antwoord keer het getal waardoor je deelde is het getal waarmee je begon.'], voorbeeld: '250 kinderen, 48 per bus: 5 bussen = 240, nog 10 kinderen, dus 6 bussen.' },
    ],
    fouten: [
      { fout: 'De rest negeren als die ertoe doet (bussen).', hulp: 'Teken het: wie blijft er over? Moeten die ook mee?' },
      { fout: 'Happen niet optellen (alleen de laatste hap als antwoord).', hulp: 'Schrijf de happen onder elkaar en tel ze op.' },
    ],
    controle: 'Controleer je antwoord: 256 × 3 = 768. Klopt!',
    vermijd: ['meteen de staartdeling (cijferend delen) als happen nog niet lukt'],
  },

  kommagetallen: {
    kern: 'Een kommagetal bestaat uit een heel deel en cijfers achter de komma. Het eerste cijfer na de komma zijn tienden, het tweede honderdsten. Net als bij geld: € 2,45 = 2 euro en 45 cent.',
    voorkennis: 'Geld (euro en cent), tientallen en eenheden, × 10 en : 10 met hele getallen.',
    modellen: ['geld (euro en cent)', 'positieschema: T E , t h (tientallen, eenheden, komma, tienden, honderdsten)', 'getallenlijn tussen twee hele getallen', 'meten (1,5 meter = 1 meter en 50 centimeter)'],
    woorden: { tienden: 'tienden zijn stukjes van 1/10; het eerste cijfer na de komma (0,1 = 10 cent)', honderdsten: 'honderdsten zijn stukjes van 1/100; het tweede cijfer na de komma (0,01 = 1 cent)', positieschema: 'een tabel met voor elk cijfer een vakje: tientallen, eenheden, komma, tienden, honderdsten' },
    niveaus: [
      { doel: 'Tienden begrijpen en geld optellen.', aanpak: ['Denk aan geld: 3,4 is als € 3,40.', 'Tel eerst de hele euro\'s, dan de centen (of de tienden).', 'Tel de euro\'s en de centen bij elkaar op.'], voorbeeld: '€ 4,20 + € 2,20: 4 + 2 = 6 euro, 20 + 20 = 40 cent, samen € 6,40.' },
      { doel: 'Optellen, aftrekken en geld teruggeven.', aanpak: ['Zet de getallen in het positieschema: komma onder komma.', 'Schrijf er zo nodig een 0 achter: 4,8 = 4,80.', 'Tel per plek op of af: helen, dan tienden, dan honderdsten.', 'Teruggeven: vul aan tot een hele euro, dan verder.'], voorbeeld: '€ 20 − € 12,18: van 12,18 naar 13 is 0,82; van 13 naar 20 is 7; samen € 7,82.' },
      { doel: 'Keersommen en deelsommen met een heel getal; × 10/100/1000.', aanpak: ['Denk aan geld: 2,4 × 3 is 3 keer € 2,40 = € 7,20.', 'Of in tienden: 2,4 is 24 tienden. 24 tienden × 3 = 72 tienden = 7,2.', 'Delen: verdeel eerlijk, eerst de helen, dan de rest in centen (of tienden).', '× 10: elk cijfer schuift één plek naar links in het positieschema (het getal wordt 10 keer zo groot).'], voorbeeld: '27,6 : 6: verdeel € 27,60 over 6 personen. € 24 : 6 = € 4, de rest € 3,60 = 360 cent : 6 = 60 cent. Samen € 4,60 = 4,6.' },
      { doel: 'Kommagetal × kommagetal en delen door een kommagetal (groep 8).', aanpak: ['Schatten (met ronde getallen ongeveer uitrekenen): 5,7 × 2,4 is ongeveer 6 × 2 = 12.', 'Reken zonder komma: 57 × 24 = 1368.', 'Zet de komma zo dat het antwoord in de buurt van je schatting komt: 13,68 (niet 1,368 of 136,8).', 'Delen door een kommagetal: maak er een makkelijkere som van door beide getallen × 10 te doen; het antwoord blijft hetzelfde.'], voorbeeld: '5,7 × 2,4: ongeveer 12; 57 × 24 = 1368; dus 13,68.' },
    ],
    fouten: [
      { fout: 'Komma\'s niet onder elkaar (3,5 + 1,25 = 1,60).', hulp: 'Positieschema: helen onder helen, tienden onder tienden. Of geld: € 3,50 + € 1,25.' },
      { fout: 'Meer cijfers achter de komma betekent niet dat het getal groter is: 0,125 is kleiner dan 0,5.', hulp: 'Je kunt de kommagetallen even lang maken: 0,500 en 0,125. Je kunt ook denken aan geld of meten: 0,5 meter = 50 cm, 0,125 m = 12,5 cm.' },
      { fout: 'Bij × 10 een nul achteraan zetten (2,5 × 10 = 2,50).', hulp: 'Geld: 10 keer € 2,50 is € 25. Het getal wordt 10 keer zo groot.' },
    ],
    controle: 'Klopt het ongeveer? Reken met ronde getallen (dat heet schatten) en kijk of je antwoord in de buurt ligt.',
    vermijd: ['"schat eerst" als eerste stap in groep 5–7, en schatten nooit zonder uit te leggen wat het is', '"doe alsof de komma er niet is" zonder te zeggen waarom het antwoord dan kleiner moet', 'de regel "tel de cijfers achter de komma" als enige uitleg'],
  },

  getalbegrip: {
    kern: 'Elk cijfer heeft een waarde door zijn plek: in 6821 is de 6 wel 6000 waard.',
    voorkennis: 'Tellen in sprongen van 10, 100, 1000.',
    modellen: ['positieschema (M HD TD D H T E)', 'getallenlijn', 'geld'],
    woorden: { afronden: 'naar het ronde getal dat er het dichtst bij ligt (afronden op tientallen, honderdtallen …)', positieschema: 'tabel met een vakje voor elk cijfer: duizendtallen, honderdtallen, tientallen, eenheden' },
    niveaus: [
      { doel: 'Getallen tot 1 000 en tot 10 000; afronden op tientallen.', aanpak: ['Zet het getal in het positieschema.', 'Afronden op tientallen: kijk naar het cijfer van de eenheden.', '5 of meer → naar boven. Minder dan 5 → naar beneden.'], voorbeeld: '985 afronden op tientallen: het cijfer van de eenheden is 5, dus je rondt af op 990.' },
      { doel: 'Grotere getallen, afronden op honderdtallen.', aanpak: ['Zoek de plek waarop je afrondt.', 'Kijk naar het cijfer rechts daarvan.', '5 of meer → omhoog.'], voorbeeld: '8584 afronden op honderdtallen: kijk naar het cijfer rechts van de 5. Dat is 8, dus je rondt af op 8600.' },
      { doel: 'Miljoenen, getallenlijn, schatten.', aanpak: ['Schrijf miljoenen in groepjes van 3 cijfers (5 902 000).', 'Zoek het getal midden tussen twee getallen: bereken het verschil, neem de helft daarvan en tel die erbij op.', 'Schatten (met ronde getallen ongeveer uitrekenen): rond eerst af, reken dan.'], voorbeeld: '599 × 31 is ongeveer 600 × 30. 600 × 30 = 18 000.' },
      { doel: 'Kommagetallen ordenen, negatieve getallen.', aanpak: ['Maak kommagetallen even lang met nullen (0,3 = 0,300) en vergelijk.', 'Bij negatieve getallen kun je denken aan een thermometer. Tel via 0.'], voorbeeld: 'Van −7 naar 14 graden: je gaat 7 graden omhoog tot 0 en daarna nog 14 graden. Samen is dat 21 graden.' },
    ],
    fouten: [
      { fout: 'Het cijfer zelf noemen als waarde (de 6 in 6821 = 6).', hulp: 'Positieschema: de 6 staat bij de duizendtallen, dus 6000.' },
      { fout: 'Afronden de verkeerde kant op.', hulp: 'Getallenlijn: kijk tussen welke tientallen het getal ligt en rond af op het juiste tiental.' },
    ],
    controle: 'Lees het getal hardop. Klopt de waarde van elk cijfer?',
    vermijd: [],
  },

  breuken: {
    kern: 'Een breuk is een deel van een geheel. Het getal onder de streep (de noemer) zegt in hoeveel gelijke stukken het geheel is verdeeld. Het getal boven de streep (de teller) zegt hoeveel stukken je hebt.',
    voorkennis: 'Eerlijk verdelen, de tafels (voor gelijknamig maken), de helft en een kwart.',
    modellen: ['strook (een reep verdeeld in gelijke stukken)', 'getallenlijn van 0 tot 1', 'pizza/taart (alleen bij beginnen)', 'verhoudingstabel'],
    woorden: { noemer: 'het getal onder de streep: in hoeveel gelijke stukken het geheel is verdeeld', teller: 'het getal boven de streep: hoeveel stukken je hebt', gelijknamig: 'de breuken dezelfde noemer geven (even grote stukjes)', vereenvoudigen: 'teller en noemer door hetzelfde getal delen, zodat de breuk eenvoudiger wordt' },
    niveaus: [
      { doel: 'Wat is een breuk; de helft, een kwart, deel van een getal.', aanpak: ['Verdeel het geheel in gelijke stukken (de noemer).', 'Tel hoeveel stukken je hebt (de teller).', '1/4 van 28: verdeel 28 in 4 gelijke stukken: 28 : 4 = 7.'], voorbeeld: 'Pizza in 8 stukken, 1 opgegeten: 1/8.' },
      { doel: 'Deel van een getal, gelijke noemers optellen, vereenvoudigen.', aanpak: ['3/4 deel van 12: eerst 1/4 (12 : 4 = 3), dan 3 van die stukken (3 × 3 = 9).', 'Als de noemers gelijk zijn, tel je de tellers op. De noemer blijft gelijk.', 'Vereenvoudigen: boven en onder door hetzelfde getal delen.'], voorbeeld: '1/12 + 6/12 = 7/12 (stukjes van 1/12 tel je op: 1 + 6 = 7).' },
      { doel: 'Ongelijke noemers optellen/aftrekken, vergelijken, breuk als kommagetal.', aanpak: ['Maak de stukjes even groot: zoek een getal waar beide noemers in passen (tafels).', 'Reken elke breuk om: doe de teller en de noemer keer hetzelfde getal.', 'Tel de tellers op; de noemer blijft gelijk.', 'Vergelijk de breuken: maak ze gelijknamig of gebruik de strook.'], voorbeeld: '4/5 + 1/2: stukjes van 1/10: 8/10 + 5/10 = 13/10 = 1 3/10.' },
      { doel: 'Gemengde getallen, breuk × breuk, delen door een breuk.', aanpak: ['Gemengde getallen: tel eerst de hele getallen op, dan de breuken (maak ze gelijknamig). Tel de uitkomsten bij elkaar op.', 'Breuk × breuk: teller × teller en noemer × noemer.', 'Delen door een breuk: hoeveel keer past 1/3 in 3? In 1 past 1/3 drie keer, dus in 3 past 1/3 negen keer.'], voorbeeld: '2 3/4 + 1 5/6: 2 + 1 = 3; 9/12 + 10/12 = 19/12 = 1 7/12; samen 4 7/12.' },
    ],
    fouten: [
      { fout: 'Boven én onder optellen (1/4 + 2/4 = 3/8).', hulp: 'Op de strook: 1/4 + 2/4 = 3/4. De stukjes blijven even groot.' },
      { fout: 'Breuk met grotere noemer is groter (1/8 > 1/4).', hulp: 'Strook of pizza: in 8 stukken verdeeld zijn de stukken kleiner.' },
      { fout: 'Bij 3/4 van 12 alleen 12 : 4 doen: het antwoord is dan 3.', hulp: 'Eerst reken je uit hoeveel 1/4 is: 3. Dan neem je 3 van die stukken: samen 9.' },
    ],
    controle: 'Teken een strook: past je antwoord? Is de uitkomst kleiner of groter dan 1, en klopt dat?',
    vermijd: ['regels zonder plaatje ("kruiselings vermenigvuldigen")', 'meteen met de kleinste gemene veelvoud werken zonder strook/tafels'],
  },

  procenten: {
    kern: 'Procent betekent "per honderd". 100% is alles. 50% is de helft, 25% een kwart, 10% een tiende.',
    voorkennis: 'De helft, een kwart, delen door 10, breuken als 1/2, 1/4, 1/10.',
    modellen: ['procentenstrook (boven de strook de aantallen, onder de procenten)', 'verhoudingstabel', 'geld'],
    woorden: { procent: 'per honderd: 10% is 10 van elke 100', korting: 'zoveel gaat er van de prijs af' },
    niveaus: [
      { doel: '100%, 50%, 10%.', aanpak: ['100% is alles.', '50% is de helft: deel door 2.', '10% is een tiende: deel door 10.'], voorbeeld: '10% van 120: 120 : 10 = 12.' },
      { doel: '25%, 20% en breuken en procenten omrekenen.', aanpak: ['25% is een kwart: deel door 4.', '20% is 2 × 10%.', 'Breuk naar procent: maak de noemer 100 (1/4 = 25/100 = 25%).'], voorbeeld: '25% van 28: 28 : 4 = 7.' },
      { doel: 'Handige percentages, korting en uitrekenen hoeveel procent iets is.', aanpak: ['Begin bij 10% (deel door 10). 5% is de helft van 10%.', 'Bouw het percentage op: 15% = 10% + 5%; 30% = 3 × 10%.', 'Korting: reken de korting uit en haal die van de prijs af.', 'Hoeveel procent: schrijf als breuk en maak de noemer 100.'], voorbeeld: '20% korting op € 60: 10% = 6, 20% = 12, nieuwe prijs 60 − 12 = € 48.' },
      { doel: 'Terugrekenen, prijsstijging, percentage uitrekenen (groep 8).', aanpak: ['Gebruik de strook of verhoudingstabel: zet bekende procenten en aantallen tegenover elkaar.', 'Ga naar een handig percentage (10%, 25%, 50%) en dan naar 100%.', 'Alleen als het niet anders kan: via 1% (deel door 100).'], voorbeeld: 'Na 25% korting is de prijs € 24: je betaalt 75% = € 24, dus 25% = € 8, 100% = € 32.' },
    ],
    fouten: [
      { fout: 'Bij korting de korting als antwoord geven i.p.v. de nieuwe prijs.', hulp: 'Wat wordt er gevraagd? De nieuwe prijs is de oude prijs min de korting.' },
      { fout: 'Het percentage als bedrag nemen (15% van 40 = 15).', hulp: 'Strook: 100% is 40, dus 10% is 4. 5% is 2, dus 15% is 4 + 2 = 6.' },
    ],
    controle: 'Klopt het met de strook? 50% moet de helft zijn. Bij korting moet je antwoord lager zijn dan de oude prijs.',
    vermijd: ['de 1%-regel als eerste aanpak', 'de formule "deel : geheel × 100" zonder begrip'],
  },

  verhoudingen: {
    kern: 'Bij een verhouding horen twee hoeveelheden bij elkaar. Als je het aantal pakken verdubbelt, verdubbelt ook de prijs: 2 pakken kosten € 6, dan kosten 4 pakken € 12.',
    voorkennis: 'Keer en delen, de tafels.',
    modellen: ['verhoudingstabel (bovenste rij en onderste rij horen bij elkaar)', 'strook bij verdelen'],
    woorden: { verhoudingstabel: 'een tabelletje met twee rijen; wat je boven doet, doe je onder ook', 'per stuk': 'voor 1' },
    niveaus: [
      { doel: 'Eenvoudig herhalen (1 zakje kost € 3, hoeveel 3 zakjes?).', aanpak: ['Maak een verhoudingstabel: 1 → € 3.', 'Hoeveel keer zoveel? Doe boven en onder hetzelfde.'], voorbeeld: '1 → 3, 2 → 6, 3 → 9.' },
      { doel: 'Verhoudingstabel met keer, "1 op de 5".', aanpak: ['Zet wat je weet in de tabel.', 'Hoeveel keer zoveel is het nieuwe getal? Doe onder hetzelfde.', '"1 op de 5": van elke 5 is er 1.'], voorbeeld: '4 zakken € 12, 8 zakken: 8 is 2 × 4, dus 2 × € 12 = € 24.' },
      { doel: 'Via 1 rekenen, verdelen in een verhouding.', aanpak: ['Ga in de tabel eerst naar 1 (per persoon, per stuk).', 'Dan naar het gevraagde aantal.', 'Verdelen in 2 : 6: samen 8 delen, één deel = totaal : 8.'], voorbeeld: '2 personen 300 g, 1 persoon 150 g, 3 personen 450 g.' },
      { doel: 'Vergelijken (wat is voordeliger), snelheid, mengen.', aanpak: ['Reken alles om naar dezelfde eenheid: prijs per stuk, kilometer per uur.', 'Vergelijk dan.'], voorbeeld: '3 voor € 5,10 = € 1,70 per stuk; 5 voor € 7,50 = € 1,50 per stuk.' },
    ],
    fouten: [
      { fout: 'Erbij tellen i.p.v. keer (2 → 6, dan 4 → 8).', hulp: 'Verhoudingstabel: van 2 naar 4 is × 2, dus onder ook × 2.' },
    ],
    controle: 'Kijk in de tabel: heb je boven en onder hetzelfde gedaan?',
    vermijd: ['kruislings vermenigvuldigen', 'regel van drie als formule'],
  },

  schaal: {
    kern: 'Een kaart is een verkleining. Schaal 1 : 100 000 betekent: 1 cm op de kaart is 100 000 cm in het echt.',
    voorkennis: 'Maten omrekenen (cm, m, km), keer met nullen.',
    modellen: ['verhoudingstabel (kaart ↔ echt)', 'de maten-trap'],
    woorden: { schaal: 'hoeveel cm in het echt hoort bij 1 cm op de kaart' },
    niveaus: [
      { doel: 'Hokjes op een plattegrond.', aanpak: ['Hoeveel meter is 1 hokje?', 'Keer het aantal hokjes.'], voorbeeld: '1 hokje = 2 m, 6 hokjes = 12 m.' },
      { doel: '"1 cm is … in het echt".', aanpak: ['Verhoudingstabel: 1 cm → 50 m.', 'Keer het aantal cm.'], voorbeeld: '1 cm → 50 m, 5 cm → 250 m.' },
      { doel: 'Schaal 1 : … met omrekenen.', aanpak: ['1 cm op de kaart is … cm in het echt (het getal achter de dubbele punt).', 'Keer het aantal cm.', 'Reken de cm om naar m (: 100) en km (: 1000).'], voorbeeld: '1 : 100 000, 6 cm → 600 000 cm = 6000 m = 6 km.' },
      { doel: 'Schaal zelf bepalen, van echt naar kaart.', aanpak: ['Reken alles om naar cm.', 'Hoeveel cm in het echt hoort bij 1 cm op de kaart? Dat is de schaal.'], voorbeeld: '5 cm op de kaart = 1000 m = 100 000 cm. 1 cm op de kaart = 20 000 cm in het echt: schaal 1 : 20 000.' },
    ],
    fouten: [{ fout: 'Vergeten om te rekenen naar meter of km.', hulp: 'Schrijf de eenheid bij elke stap: cm → m → km.' }],
    controle: 'Kan dat in het echt? Een weg van 6 km op een fietskaart klopt; 600 000 km niet.',
    vermijd: [],
  },

  metriek: {
    kern: 'Maten hangen samen met 10, 100 en 1000. Een grotere maat bestaat uit meer kleinere maten (1 m = 100 cm).',
    voorkennis: 'Keer en delen door 10, 100, 1000.',
    modellen: ['de maten-trap (km – hm – dam – m – dm – cm – mm)', 'meetlint en liniaal', 'pak melk (1 liter = 10 bekertjes van 1 dl)'],
    woorden: { trap: 'de rij maten van groot naar klein; elke trede is × 10 of : 10' },
    niveaus: [
      { doel: 'Bekende maten: m en cm, kg en g, l en dl.', aanpak: ['Hoeveel kleine maten zitten er in 1 grote? (1 m = 100 cm)', 'Keer dat getal (van groot naar klein) of deel erdoor (van klein naar groot).'], voorbeeld: '3 m = 3 × 100 = 300 cm.' },
      { doel: 'km, m; kommagetallen bij maten.', aanpak: ['1 km = 1000 m, 1 kg = 1000 g, 1 l = 1000 ml.', 'Groot → klein: keer. Klein → groot: delen.'], voorbeeld: '7700 g = 7700 : 1000 = 7,7 kg.' },
      { doel: 'De metriek-trap gebruiken.', aanpak: ['Zoek beide maten op de trap.', 'Tel de treden.', 'Omlaag (naar een kleinere maat) = keer 10 per trede. Omhoog (naar een grotere maat) = delen door 10 per trede.'], voorbeeld: '361 mm naar m: 3 treden omhoog = : 1000 = 0,361 m.' },
      { doel: 'Oppervlakte- en inhoudsmaten, ton, hectare.', aanpak: ['Bij m² is elke trede × 100 (10 × 10).', '1 liter = 1 dm³ = 1000 cm³.', '1 hectare = 100 m × 100 m = 10 000 m².'], voorbeeld: '1,9 m² = 190 dm².' },
    ],
    fouten: [{ fout: 'De verkeerde kant op (keer i.p.v. delen).', hulp: 'Wordt het getal groter of kleiner? Kleinere maat → meer stuks → groter getal.' }],
    controle: 'Kleinere maat = groter getal. Klopt dat bij je antwoord?',
    vermijd: [],
  },

  oppervlakte: {
    kern: 'Omtrek is de lengte van de rand rondom. Oppervlakte is hoeveel vierkantjes erin passen. Inhoud is hoeveel kubusjes erin passen.',
    voorkennis: 'Keersommen, maten.',
    modellen: ['ruitjespapier (hokjes tellen)', 'rechthoek met rijen hokjes', 'blokjes (kubusjes)'],
    woorden: { omtrek: 'de lengte van de rand helemaal rondom', oppervlakte: 'hoeveel vierkantjes erin passen', inhoud: 'hoeveel kubusjes erin passen' },
    niveaus: [
      { doel: 'Hokjes tellen, omtrek van een rechthoek.', aanpak: ['Oppervlakte: tel de hokjes in één rij, keer het aantal rijen.', 'Omtrek: loop de rand rond en tel alle kanten op.'], voorbeeld: '4 rijen van 7 hokjes = 28.' },
      { doel: 'Oppervlakte rechthoek = lengte × breedte.', aanpak: ['Hoeveel vierkante meters in één rij? (de lengte)', 'Hoeveel rijen? (de breedte)', 'Keer.'], voorbeeld: '4 m bij 3 m = 12 m².' },
      { doel: 'Driehoek, inhoud.', aanpak: ['Driehoek: teken de rechthoek eromheen; de driehoek is de helft.', 'Inhoud: grondvlak (lengte × breedte) keer de hoogte.', '1000 cm³ = 1 liter.'], voorbeeld: 'Driehoek met basis 8 en hoogte 6: rechthoek 48, de helft is 24 cm².' },
      { doel: 'Samengestelde figuren, omrekenen.', aanpak: ['Teken een grote rechthoek om de figuur heen en haal het ontbrekende stuk eraf.', 'Of knip in rechthoeken en tel op.'], voorbeeld: 'L-vorm: 9 × 6 = 54, hoek 3 × 3 = 9, 54 − 9 = 45 m².' },
    ],
    fouten: [{ fout: 'Omtrek en oppervlakte verwisselen.', hulp: 'Omtrek = hekje om de tuin (rand). Oppervlakte = gras in de tuin (tegels).' }],
    controle: 'Hoort er m of m² of m³ bij? Rand = m, vlak = m², ruimte = m³.',
    vermijd: [],
  },

  tijd: {
    kern: 'Een uur heeft 60 minuten (niet 100!). Op de klok zitten 60 minuten in een uur.',
    voorkennis: 'Klokkijken, kwartier = 15 min, half uur = 30 min.',
    modellen: ['klok (de grote wijzer gaat één rondje per uur)', 'tijdbalk (een lijn met tijden erop)'],
    woorden: { kwartier: '15 minuten, een kwart van een uur', '24-uursnotatie': 'na 12 uur ’s middags tel je door: 1 uur ’s middags = 13:00' },
    niveaus: [
      { doel: 'Kwartier, half uur en minuten omrekenen naar uren.', aanpak: ['1 uur = 60 minuten.', 'Half uur = 30, kwartier = 15.', 'Tel verder op de klok.'], voorbeeld: '11:30 + 45 min: + 30 = 12:00, + 15 = 12:15.' },
      { doel: 'Tijdsduur, 24-uursnotatie, kommagetallen bij uren.', aanpak: ['Tel op de tijdbalk eerst door tot het hele uur en tel daarna verder.', '0,5 uur = half uur = 30 min; 0,25 uur = kwartier = 15 min.'], voorbeeld: '10:30 → 11:35: 30 min + 35 min = 65 minuten.' },
      { doel: 'Reistijden, snelheid.', aanpak: ['Eerst de hele uren erbij, dan de minuten.', 'Snelheid "80 km per uur": in 1 uur 80 km. Verhoudingstabel: 1 uur → 80, ½ uur → 40.'], voorbeeld: '2,5 uur × 80 km per uur = 160 + 40 = 200 km.' },
      { doel: 'Gemiddelde snelheid, tijdzones.', aanpak: ['Verhoudingstabel naar 1 uur.', 'Later = erbij, vroeger = eraf.'], voorbeeld: '180 km in 1,5 uur: ½ uur 60 km, 1 uur 120 km.' },
    ],
    fouten: [{ fout: 'Een uur als 100 minuten (2,5 uur = 250 min).', hulp: 'Klok: één rondje = 60 minuten. 0,5 uur = half rondje = 30 minuten.' }],
    controle: 'Kijk op de klok of de tijdbalk: klopt de tijd?',
    vermijd: ['tijd als kommagetal rekenen zonder klok'],
  },

  meetkunde: {
    kern: 'Figuren hebben eigenschappen (zijden, hoeken). Een kwartslag is 90°, een heel rondje 360°.',
    voorkennis: 'Rechte hoek (hoekje van een blad papier), windrichtingen.',
    modellen: ['blad papier (rechte hoek)', 'kompasroos', 'zelf draaien'],
    woorden: { 'rechte hoek': 'een hoek van 90°, zoals het hoekje van een blad', symmetrieas: 'een lijn waarlangs je vouwt zodat beide helften precies op elkaar passen' },
    niveaus: [
      { doel: 'Figuren herkennen, kwartslag draaien.', aanpak: ['Tel zijden en hoeken.', 'Kompas rechtsom: noord – oost – zuid – west (Nooit Oorlog Zonder Wapens).'], voorbeeld: 'Noord, kwartslag rechts: oost.' },
      { doel: 'Soorten hoeken, symmetrie, ribben.', aanpak: ['Vergelijk met de rechte hoek (90°): kleiner = scherp, groter = stomp, 180° = gestrekt.', 'Symmetrie: vouw in gedachten.'], voorbeeld: '180° is een gestrekte hoek.' },
      { doel: 'Hoeken uitrekenen.', aanpak: ['Driehoek: samen 180°. Vierhoek: samen 360°.', 'Tel de bekende hoeken op en haal ze van 180 of 360 af.'], voorbeeld: '43° + 52° = 95°, 180 − 95 = 85°.' },
      { doel: 'Cirkels, kubussen en samengestelde figuren.', aanpak: ['Omtrek cirkel ≈ 3,14 × de middellijn (diameter).', 'Tel de blokken in één laag en doe dat aantal keer het aantal lagen.'], voorbeeld: '4 × 3 = 12 per laag, 3 lagen = 36.' },
    ],
    fouten: [{ fout: 'Hoeken van een driehoek samen 360°.', hulp: 'Scheur de hoeken af en leg ze naast elkaar: een rechte lijn = 180°.' }],
    controle: 'Teken het, of draai zelf mee.',
    vermijd: [],
  },

  grafieken: {
    kern: 'Een tabel of grafiek laat getallen zien. Eerst lezen wat er staat (titel, assen), dan pas rekenen.',
    voorkennis: 'Getallen aflezen op een getallenlijn.',
    modellen: ['staafgrafiek', 'lijngrafiek', 'cirkeldiagram (procenten)', 'tabel'],
    woorden: { as: 'de lijn met getallen bij de grafiek', gemiddelde: 'alles bij elkaar optellen en eerlijk verdelen' },
    niveaus: [
      { doel: 'Een staafgrafiek aflezen en rijtjes aanvullen.', aanpak: ['Lees de titel en wat er langs de as staat.', 'Zoek de goede staaf en kijk tot waar hij komt.', 'Rijtje: wat komt er steeds bij?'], voorbeeld: '6, 8, 10, 12: steeds + 2, dus 14.' },
      { doel: 'Waarden aflezen met de stapgrootte op de as en verschillen berekenen.', aanpak: ['Hoeveel is elk streepje op de as waard?', 'Lees beide waarden af en bereken het verschil.'], voorbeeld: 'Drukste 50, rustigste 35: verschil 15.' },
      { doel: 'Tabellen aflezen, gemiddelden berekenen en combinaties maken.', aanpak: ['Tel alles op en deel door het aantal.', 'Combinaties: elk van het ene kan samen met elk van het andere. Reken: keer.'], voorbeeld: '4 soorten ijs × 3 sauzen = 12.' },
      { doel: 'Lijngrafieken en cirkeldiagrammen aflezen en lastige rijtjes aanvullen.', aanpak: ['Cirkeldiagram: reken het percentage van het totaal uit (via 10%, 25%, 50%).', 'Rijtje: kijk naar de verschillen. Worden die steeds groter?'], voorbeeld: '30% van 200: 10% = 20, 30% = 60.' },
    ],
    fouten: [{ fout: 'Gemiddelde = alles optellen en niet delen.', hulp: 'Gemiddelde = eerlijk verdelen: alles samen, dan delen door het aantal.' }],
    controle: 'Kijk nog eens naar de grafiek: past je antwoord bij de staaf of de lijn?',
    vermijd: [],
  },
};

const NIVEAU = ['groep 5', 'groep 6', 'groep 7', 'groep 8'];

// Korte aanpak voor een hint (kindertaal, zonder antwoord)
export function hintAanpak(cat, level) {
  const d = DIDACTIEK[cat];
  const n = d?.niveaus?.[Math.max(0, Math.min(3, level))];
  return n ? n.aanpak.join(' ') : '';
}

// Volledige didactiekkaart voor Max: aanpak op dit niveau + het niveau eronder (voor als het niet lukt)
export function didactiekText(cat, level = 2) {
  const d = DIDACTIEK[cat];
  if (!d) return '';
  const L = Math.max(0, Math.min(3, level));
  const nu = d.niveaus[L], lager = L > 0 ? d.niveaus[L - 1] : null;
  return `DIDACTIEKKAART "${cat}" (zo leren Nederlandse scholen het; volg dit, verzin geen andere methode)
Kern: ${d.kern}
Voorkennis: ${d.voorkennis}
Modellen (gebruik deze, liefst met een plaatje): ${d.modellen.join('; ')}
Woorden (zo gebruikt op school; leg ze uit zoals hier): ${Object.entries(d.woorden).map(([w, u]) => `${w} = ${u}`).join('; ')}
Aanpak op ${NIVEAU[L]}-niveau (${nu.doel}):
${nu.aanpak.map((a, i) => `  ${i + 1}. ${a}`).join('\n')}
  Voorbeeld: ${nu.voorbeeld}
${lager ? `Lukt het niet? Stap terug naar ${NIVEAU[L - 1]}: ${lager.aanpak.join(' ')} (bijv. ${lager.voorbeeld})` : ''}
Typische fouten en wat helpt: ${d.fouten.map((f) => `${f.fout} → ${f.hulp}`).join(' | ')}
Controle achteraf: ${d.controle}
Niet doen: ${[...d.vermijd, 'een andere aanpak dan hierboven bedenken'].join('; ')}`;
}
