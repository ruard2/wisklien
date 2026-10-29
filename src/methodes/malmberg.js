import * as WIG from './wig-leerlijn.js';

// Methode "De wereld in getallen" (Malmberg, editie 5/5.1): zoals de methode het in groep 5 t/m 8 aanleert.
// In eigen woorden en met eigen getallen (niets gekopieerd): de rekenroutes, modellen en woorden per onderdeel, en per
// niveau de strategieën van die groep. De leerlijn per groep en blok, per soort som, staat in ./wig-leerlijn.js.
// Dit is de standaardmethode voor Nederlands. De sjablonen en uitlegkaarten in de basis volgen deze routes al; hier staat
// wat de methode vastlegt bovenop het algemene handboek (src/didactiek.js): de aanpak per groep, de woorden en de routes.
//
// S-route = de standaardroute (cijferend, sneller); F-route = de fundamentele route (kolomsgewijs, splitsen, rekenen in
// kleinere maten). De app kiest per niveau: groep 5–6 vooral de F-route, groep 7–8 beide (de sterke route als hoofdroute,
// de F-route als het niet lukt; Max gebruikt die als "concreter").
export default {
  id: 'malmberg',
  lang: 'nl',
  naam: 'De wereld in getallen (Malmberg)',
  leerlijn: WIG,
  beschrijving: 'Groep 5–8 per blok: rijgen, splitsen, aanvullen, rekenen met teveel, halveren en verdubbelen, kleine som, cijferend met inwisselen, kolomsgewijs delen met hulptabel, verhoudingstabel, procentstrook, tijdlijn.',

  // Rekenroutes per soort som (de basis heeft ook een andere route; zie src/methodes/algemeen.js)
  routes: {
    'delen.1c': 'kleine-som',        // 1500 : 30 → 15 : 3 = 5 → 1500 : 3 = 500 → 10 × zo weinig = 50
    schaal: 'meter-per-cm',          // 1 : 100 → 1 cm is 100 cm = 1 m; dan de verhoudingstabel
    'tijdBasis.3a': 'minuten-tabel', // 75 km in 90 min → 25 per 30 → 50 per 60
    'procenten.3c': 'breuk',         // € 5 van € 20 is 1/4 deel → 25%
    'verhoudingen.3b': 'tabel-tien', // 1 → 10 → 20 liter, de rest apart, dan optellen
    lvorm: 'verdelen',               // samengestelde figuur: in rechthoeken verdelen en optellen (zoals het boek)
    'aftrekken.groot': 'cijferend',
    'keer.groot': 'cijferend',      // groep 8: cijferend vermenigvuldigen (eerst de eenheden, dan de tientallen met eerst een 0)
    'procent.hoeveel': 'deel',      // hoeveel procent: welk deel is het (strook/breuk), of via 10%  // aftrekken met grote getallen: cijferend met inwisselen (S); F-route rijgen/kolomsgewijs                  // samengestelde figuur: in rechthoeken verdelen of hele rechthoek min het stuk
  },
  uit: [],
  kaarten: {},
  // Uitlegkaarten die de methode vastlegt (geschreven naar het boek, in src/uitleg/nl.js): een verbetering uit de Kaartcheck
  // (src/uitleg/kaartcheck-nl.json) mag die niet stilletjes vervangen door een andere route. Aanpassen = de kaart in nl.js.
  eigenKaarten: ["optellen.0c", "optellen.1d", "optellen.1e", "optellen.1f", "vermenigvuldigen.1e", "vermenigvuldigen.1f", "delen.1d", "delen.1e", "metriek.0b", "getalbegrip.0b", "breuken.0b", "breuken.0c", "breuken.1c", "breuken.2c", "breuken.2d", "breuken.2e", "breuken.2f", "breuken.3b", "breuken.3c", "breuken.3d", "breuken.3f", "combinaties.b", "delen.0a", "delen.1a", "delen.1b", "delen.1c", "delen.2a", "delen.2c", "delen.2d", "delen.2e", "delen.3a", "delen.3b", "delen.3c", "delen.3d", "digiWoorden.a", "getalbegrip.0a", "getalbegrip.1a", "getalbegrip.1c", "getalbegrip.2d", "getalbegrip.2e", "getalbegrip.2f", "getalbegrip.2g", "getalbegrip.3d", "getalbegrip.3e", "getalbegrip.3f", "grafieken.0b", "grafieken.1b", "grafieken.2f", "grafieken.2g", "grafieken.3e", "grafieken.3f", "grafieken.3g", "grafieken.3h", "klokWoorden.a", "kommagetallen.0b", "kommagetallen.1b", "kommagetallen.1c", "kommagetallen.1d", "kommagetallen.2a", "kommagetallen.2b", "kommagetallen.2c", "kommagetallen.2e", "kommagetallen.2f", "kommagetallen.2k", "kommagetallen.3a", "kommagetallen.3k", "meetkunde.0c", "meetkunde.0e", "meetkunde.1a", "meetkunde.1b", "meetkunde.1c", "meetkunde.1f", "meetkunde.2d", "meetkunde.2f", "meetkunde.2g", "meetkunde.2h", "metriek.0a", "metriek.1a", "metriek.1b", "metriek.2a", "metriek.2b", "metriek.3a", "oppervlakte.0b", "oppervlakte.1a", "oppervlakte.2b", "oppervlakte.2c", "oppervlakte.3c", "oppervlakte.3e", "oppervlakte.3f", "oppervlakte.3g", "optellen.0b", "optellen.1c", "optellen.2d", "optellen.2e", "optellen.3e", "optellen.3f", "procenten.0a", "procenten.1a", "procenten.1c", "procenten.1d", "procenten.1e", "procenten.2a", "procenten.2b", "procenten.2e", "procenten.3c", "procenten.3h", "procenten.3i", "rij.a", "rij.b", "rij.c", "schaal.0a", "schaal.1a", "schaal.2a", "schaal.2b", "schaal.2c", "schaal.3b", "tijdBasis.0a", "tijdBasis.0c", "tijdBasis.1e", "tijdBasis.2b", "tijdBasis.2c", "tijdBasis.2d", "tijdBasis.3a", "tijdBasis.3c", "tijdBasis.3e", "verhoudingen.0a", "verhoudingen.1b", "verhoudingen.2d", "verhoudingen.2e", "verhoudingen.3a", "verhoudingen.3b", "verhoudingen.3d", "vermenigvuldigen.0c", "vermenigvuldigen.0d", "vermenigvuldigen.1c", "vermenigvuldigen.2c", "vermenigvuldigen.2d", "vermenigvuldigen.3a"],

  taal: {
    woorden: {
      bewerkingen: 'de kleine som (65 + 14 bij 6500 + 1400; 3 × 4 bij 30 × 40), "10 × zo veel" en "10 × zo weinig"; cijferend (onder elkaar, rechts beginnen, inwisselen); kolomsgewijs (per plek, begin links); inwisselen (een tientje wisselen voor 10 euro\'s); de hulptabel bij delen (1 ×, 2 ×, 5 ×, 10 × de deler)',
      tijd: 'de tijdlijn (sprongen: eerst hele uren, dan naar het hele uur, dan de rest); begintijd, eindtijd, tijdsduur',
      rekenmachine: 'de rekenmachine: ON/C, de procenttoets (%); een rekenmachine schrijft een punt waar wij een komma schrijven; eerst schatten, dan intoetsen, dan kijken of het kan kloppen',
      verbanden: 'staafdiagram, beelddiagram, cirkeldiagram, lijndiagram, tijd-afstanddiagram; de as met "× 100"',
      meetkunde: 'windrichtingen: noord, noordoost, oost, zuidoost, zuid, zuidwest, west, noordwest (N, NO, O, ZO, Z, ZW, W, NW); de windroos; standpunt; een route beschrijven',
    },
    toestaan: ['tijdlijn'],                       // woorden die het algemene handboek afraadt, maar die deze methode gebruikt
    vervang: [['tijdbalk', 'tijdlijn']],          // in alle teksten van sommen, kaarten en didactiek
  },

  max: 'De school van dit kind rekent met De wereld in getallen (Malmberg): volg de leerlijn op de uitlegkaart (groep, blok, basisstrategie; bij vastlopen terug naar de basisstrategie en de voorkennis); gebruik de routes, modellen en woorden van de uitlegkaart (kleine som, inwisselen, hulptabel, verhoudingstabel, procentstrook, tijdlijn). Kent het kind de S-route (cijferend) nog niet, gebruik dan de F-route van de kaart (kolomsgewijs, splitsen).',

  // Per onderdeel: wat de methode vastlegt bovenop het handboek. niveaus: 0 = groep 5, 1 = groep 6, 2 = groep 7, 3 = groep 8.
  didactiek: {
    optellen: {
      modellen: ['lege getallenlijn (rijgen)', 'geld (euro\'s, tientjes, honderdjes)', 'kleine som in een denkwolkje', 'cijferend en kolomsgewijs onder elkaar'],
      woorden: { rijgen: 'het tweede getal in sprongen erbij doen of eraf halen op de lege getallenlijn', splitsen: 'getallen in stukken verdelen, bijvoorbeeld in tientallen en eenheden', 'kleine som': 'de som zonder de nullen (65 + 14 bij 6500 + 1400); daarna de nullen er weer achter', kolomsgewijs: 'onder elkaar, per plek rekenen, begin links bij de grootste', cijferend: 'onder elkaar, rechts beginnen; gaat het niet, dan inwisselen', inwisselen: 'een tientje wisselen voor 10 euro\'s (of een honderdje voor 10 tientjes)' },
      niveaus: [
        { doel: 'Groep 5: plus en min tot 100 en tot 1000 met ronde getallen: rijgen (basis), aanvullen en rijgen met teveel (varia).', aanpak: ['Rijgen: begin bij het eerste getal en doe het tweede getal er in stukjes bij of af: eerst de tientallen, dan de eenheden.', 'Liggen de getallen dicht bij elkaar (bij min)? Aanvullen: spring van het kleine naar het grote getal, via het ronde getal.', 'Is het tweede getal bijna rond (bijv. 39)? Rekenen met teveel: eerst het ronde getal (40) en dan 1 terug.', 'Tot 1000 met ronde getallen: de kleine som (34 + 5 bij 340 + 50) of eerst de honderdtallen, dan de tientallen.'], voorbeeld: '63 + 28: 63 + 20 = 83, 83 + 8 = 91.' },
        { doel: 'Groep 6: plus en min tot 1000: rijgen, splitsen (zonder overgang), aanvullen en teveel; daarna kolomsgewijs en cijferend.', aanpak: ['Rijgen blijft de basis: het tweede getal in stukjes (honderdtallen, tientallen, eenheden).', 'Splitsen mag alleen als er per plek niets over het tiental heen gaat: H + H, T + T, E + E en dan samen.', 'Kolomsgewijs: per plek onder elkaar, begin links, tel de stukken op.', 'Cijferend: onder elkaar, rechts beginnen, inwisselen (denk aan geld: een tientje wisselen voor 10 euro).', 'Ronde getallen (bijv. 4200 + 600): de kleine som 42 + 6 en de nullen terug.'], voorbeeld: '462 + 325 splitsen: 400 + 300, 60 + 20, 2 + 5 → 787.' },
        { doel: 'Groep 7: grote getallen: de kleine som bij ronde getallen; cijferend of kolomsgewijs.', aanpak: ['Grote ronde getallen: kleine som, en maak met de kleine som een rond duizendtal (bijv. 37 600 + 2400: 600 + 400 = 1000).', 'Niet rond: cijferend (S) of kolomsgewijs (F).', 'Aftrekken: cijferend met inwisselen; lukt dat niet, rijgen in stukjes.'], voorbeeld: '58 300 + 1700: 300 + 700 = 1000, dus 60 000.' },
        { doel: 'Groep 8: verhaaltjessommen; kommagetallen met een maat; vlot kiezen tussen hoofdrekenen en cijferen.', aanpak: ['Wat moet je uitrekenen? Welke sommen maak je, in welke volgorde?', 'Kies: handige getallen uit het hoofd (rijgen, aanvullen, kleine som), anders cijferend.', 'Kommagetallen met een maat: eerst de helen, dan achter de komma, of maak de getallen even lang.'], voorbeeld: '€ 12,85 + € 4,30: 12 + 4 = 16 en 0,85 + 0,30 = 1,15 → € 17,15.' },
      ],
      fouten: [
        { fout: 'Bij een minsom per plek het kleinste cijfer van het grootste aftrekken (52 − 27 = 35).', hulp: 'Het bovenste getal is wat je hebt. 2 − 7 gaat niet: wissel een tientje in (denk aan geld): 12 − 7 = 5.' },
        { fout: 'Na inwisselen vergeten dat er links 1 minder is.', hulp: 'Streep het cijfer links door en schrijf er 1 minder boven.' },
        { fout: 'Bij de kleine som te veel of te weinig nullen erachter.', hulp: 'Tel hoeveel nullen je hebt weggehaald; die komen er weer achter.' },
      ],
      vermijd: ['"lenen" (zeg: inwisselen)', 'cijferend rekenen als splitsen of rijgen nog niet lukt (gebruik dan de F-route)'],
    },

    vermenigvuldigen: {
      woorden: { tafel: 'het rijtje keersommen van een getal', splitsen: 'een getal in stukken verdelen, bijvoorbeeld 13 = 10 en 3', 'kleine som': 'de som zonder de nullen (3 × 4 bij 30 × 40), daarna "10 × zo veel"', cijferend: 'onder elkaar, rechts beginnen met de eenheden; onthouden wat je inwisselt; bij de tientallen eerst een 0 opschrijven', kolomsgewijs: 'per plek: 4 × 500, 4 × 30, 4 × 6, en dan optellen' },
      niveaus: [
        { doel: 'Groep 5: tafels vlot; keer een tiental met de kleine som; twee cijfers keer een tafelgetal door te splitsen; daarna teveel en halveren-verdubbelen (varia).', aanpak: ['Tafels: gebruik een tafel die je kent (2 ×, 5 ×, 10 ×) en doe er één keer bij of af; draai de som om als dat makkelijker is.', 'Keer een tiental: de kleine som (4 × 7 bij 4 × 70) en dan 10 × zo veel.', 'Twee cijfers keer een tafelgetal: splits (bijv. 6 × 23 = 6 × 20 + 6 × 3), met geld als steun.', 'Bijna rond (6 × 39)? Rekenen met teveel: 6 × 40 en dan 6 × 1 eraf.', 'Een getal keer 2 of 4 met een 5 erin (4 × 35)? Halveren en verdubbelen: 2 × 70.'], voorbeeld: '7 × 26: 7 × 20 = 140, 7 × 6 = 42, samen 182.' },
        { doel: 'Groep 6: twee cijfers keer een tafelgetal: splitsen (basis), teveel, halveren-verdubbelen, omkeren; nullen met de kleine som; kolomsgewijs en (eind groep 6) cijferend: drie cijfers keer een tafelgetal.', aanpak: ['Splitsen blijft de basis; teveel en halveren-verdubbelen als de getallen erom vragen.', 'Met nullen: kleine som (3 × 4 bij 30 × 40) en dan 10 × en nog eens 10 × zo veel.', 'Kolomsgewijs: 4 × 300, 4 × 60, 4 × 7 en de stukken optellen.', 'Cijferend: rechts beginnen, het tiental onthouden en bij de volgende plek erbij.'], voorbeeld: '5 × 437 kolomsgewijs: 2000 + 150 + 35 = 2185.' },
        { doel: 'Groep 7: grote keersommen met de kleine som; twee cijfers keer twee cijfers (splitsen of cijferend).', aanpak: ['Ronde getallen (60 × 800): kleine som 6 × 8 = 48 en de nullen erachter (48 000).', 'Twee cijfers keer twee cijfers: splits het tweede getal (bijv. 34 × 26 = 34 × 20 + 34 × 6).', 'Of cijferend: eerst de eenheden, dan de tientallen met eerst een 0.'], voorbeeld: '23 × 14: 23 × 10 = 230, 23 × 4 = 92, samen 322.' },
        { doel: 'Groep 8: cijferend vermenigvuldigen (twee keer twee cijfers, drie cijfers keer een tafelgetal); keer met kommagetallen via de schatting.', aanpak: ['Cijferend (S): eerst de eenheden (bijv. 3 × 47 = 141), dan de tientallen: eerst een 0 omdat je met een tiental keer doet (20 × 47 = 940), dan optellen.', 'F-route: splitsen (20 × 47 + 3 × 47).', 'Kommagetallen: schatten, zonder komma rekenen, de komma plaatsen met de schatting.'], voorbeeld: '23 × 47: 141 + 940 = 1081.' },
      ],
      fouten: [
        { fout: 'Bij cijferend de 0 vergeten bij de tientallen (47 × 13: 141 + 47).', hulp: 'Je doet keer 10 (een tiental): schrijf eerst een 0 op, dan 47 ervoor: 470.' },
        { fout: 'Bij splitsen een stuk vergeten (26 × 73 = 20 × 73 + 6).', hulp: 'Schrijf beide stukken helemaal op: 20 × 73 én 6 × 73.' },
      ],
    },

    delen: {
      modellen: ['eerlijk verdelen met plaatjes/geld', 'de kleine som met "zo veel / zo weinig"', 'kolomsgewijs delen met een hulptabel (1 ×, 2 ×, 5 ×, 10 × de deler)'],
      woorden: { 'kleine som': 'de som zonder nullen (15 : 3 bij 1500 : 30), daarna "zo veel" of "zo weinig"', hulptabel: 'een rijtje uit de tafel van de deler: 1 ×, 2 ×, 5 ×, 10 × (en wat je nodig hebt)', 'kolomsgewijs delen': 'steeds een hap eraf halen met hulp van de hulptabel, in zo min mogelijk stappen', rest: 'wat er overblijft als het niet precies past' },
      niveaus: [
        { doel: 'Groep 5: wat delen is (verdelen en opdelen); delen als steeds hetzelfde eraf halen; de keersom als hulpsom, ook met rest; grote delingen met de kleine som; delen door splitsen.', aanpak: ['Bij een deelsom zoek je de keersom: hoe vaak past de deler erin?', 'Met rest: neem de grootste keersom die nog past; wat overblijft is de rest.', 'Met nullen (bijv. 240 : 6): de kleine som 24 : 6 = 4, dan 10 × zo veel.', 'Groter dan de tafels (bijv. 84 : 3): splits in een stuk dat je makkelijk deelt (10 × of 20 × de deler) en de rest.'], voorbeeld: '72 : 4: 40 : 4 = 10, 32 : 4 = 8, samen 18.' },
        { doel: 'Groep 6: delen door splitsen, met en zonder rest; delen met nullen via de kleine som; delen met teveel.', aanpak: ['Splits in een handig stuk (10 ×, 20 ×, 50 × de deler) en de rest, deel beide en tel op.', 'Met rest: wat er aan het eind overblijft en kleiner is dan de deler, is de rest; kijk in het verhaal wat je met de rest doet.', 'Met nullen (bijv. 3600 : 40): kleine som 36 : 4 = 9; het getal is 100 × zo veel en de deler 10 × zo veel, dus 10 × zo veel: 90.'], voorbeeld: '135 : 6: 120 : 6 = 20, 15 : 6 = 2 rest 3 → 22 rest 3.' },
        { doel: 'Groep 7: kolomsgewijs delen door een getal van twee cijfers (eerst twee, dan drie stappen), ook met rest; de kleine som bij grote ronde getallen.', aanpak: ['Maak een hulptabel: 1 ×, 2 ×, 5 ×, 10 × (20 ×, 50 ×) de deler.', 'Neem een grote hap uit de tabel en haal die eraf; neem dan een volgende hap.', 'Wat overblijft en kleiner is dan de deler, is de rest.', 'Tel de happen bij elkaar: dat is het antwoord.'], voorbeeld: '672 : 24: 20 × 24 = 480, rest 192 = 8 × 24 → 28.' },
        { doel: 'Groep 8: kolomsgewijs delen in drie stappen (herhaling); deelbaarheid; kommagetal delen door splitsen; staartdelen alleen als kolomsgewijs foutloos gaat.', aanpak: ['Hulptabel van de deler; happen van 100 ×, 10 × (of 50 ×, 20 ×) en de rest.', 'Kommagetal delen: splits in een handig deel en de rest (bijv. € 7,50 : 3 = € 6 : 3 + € 1,50 : 3).', 'Deelbaar door 3: tel de cijfers op; deelbaar door 9 net zo.'], voorbeeld: '€ 8,40 : 4 = € 8 : 4 + € 0,40 : 4 = € 2,10.' },
      ],
      vermijd: ['de staartdeling als kolomsgewijs delen nog niet lukt', 'nullen wegstrepen als trucje (gebruik de kleine som met zo veel / zo weinig)'],
    },

    kommagetallen: {
      niveaus: [
        { doel: 'Groep 5: bedragen tot 100 euro schrijven met euroteken en komma; wisselgeld met aanvullen.', aanpak: ['Euro\'s voor de komma, centen erachter: altijd twee cijfers achter de komma.', 'Optellen: eerst de hele euro\'s, dan de centen.', 'Wisselgeld: vul aan van het bedrag tot wat je betaalt (eerst tot een rond bedrag).'], voorbeeld: '€ 6,70 betalen met € 10: tot € 7 is 30 cent, tot € 10 nog € 3 → € 3,30 terug.' },
        { doel: 'Optellen en aftrekken met benoemde kommagetallen: rijgen en splitsen.', aanpak: ['Rijgen: eerst de helen erbij of eraf, dan in stukjes de rest (4,30 + 2,00 + 0,70 + 0,10).', 'Splitsen: helen apart en achter de komma apart (5,00 + 2,00 en 0,40 + 0,45).', 'Teruggeven: vul aan tot een hele euro, dan verder.'], voorbeeld: '5,40 m + 2,45 m: 7,00 m + 0,85 m = 7,85 m.' },
        { doel: '× en : 10, 100, 1000 in het positieschema; keer en delen met splitsen.', aanpak: ['× 10: het getal wordt 10 keer zo groot; in het positieschema schuift elk cijfer één plek naar links (naar een grotere plek), op papier gaat de komma één plek naar rechts. : 10: andersom.', 'Keer: splitsen (2 × € 3,70 = 2 × 3 + 2 × 0,70) of denken aan een breuk (0,25 × 20 = 1/4 van 20).', 'Delen: splits in een handig deel en de rest (16,20 : 3 = 15 : 3 en 1,20 : 3).', 'Cijferend met kommagetallen: komma onder komma; F-route: in een kleinere maat rekenen (kg in grammen).'], voorbeeld: '€ 40,25 : 5: 40 : 5 = 8 en 0,25 : 5 = 0,05, samen € 8,05.' },
        { doel: 'Kommagetal × kommagetal (met de rekenmachine).', aanpak: ['Schat: 2,9 × 8,1 is ongeveer 3 × 8 = 24.', 'Reken zonder komma\'s (met de rekenmachine): 29 × 81 = 2349.', 'Kijk naar de schatting en plaats de komma: 23,49.'], voorbeeld: '2,9 × 8,1: ongeveer 24; 29 × 81 = 2349; dus 23,49.' },
      ],
    },

    getalbegrip: {
      modellen: ['positieschema tot de miljarden (MLD, HM, TM, M, HD, TD, D, H, T, E)', 'getallenlijn (tot 1 miljoen, en tussen miljoenen)', 'geld'],
      niveaus: [
        { doel: 'Groep 5: getallen tot 1000 in honderdtallen, tientallen en eenheden; tellen met sprongen van 1, 10 en 100; op de getallenlijn. (Afronden komt pas in groep 6.)', aanpak: ['Zet het getal in het schema H T E: elk cijfer in zijn eigen vakje.', 'Denk aan geld: honderdjes, tientjes en losse euro\'s.', 'Op de getallenlijn: tussen welke honderdtallen en tientallen ligt het?'], voorbeeld: '538 = 5 honderdtallen, 3 tientallen en 8 eenheden.' },
        { doel: 'Groep 6: getallen tot 10 000 en (blok 5) 100 000; afronden op tientallen, honderdtallen en duizendtallen; schattend rekenen.', aanpak: ['Zet het getal in het positieschema (TD D H T E).', 'De waarde van een cijfer hangt af van zijn plek.', 'Afronden: kijk naar het cijfer rechts van de plek waarop je afrondt; 5 of meer → naar boven.'], voorbeeld: '4672 op honderdtallen: kijk naar de 7 → 4700.' },
        { doel: 'Tot in de miljarden; op 2 manieren schrijven; getallenlijn.', aanpak: ['1 duizend = 1000, 1 miljoen = 1 000 000, 1 miljard = 1 000 000 000.', '5,2 miljoen = 5 200 000; 35,4 duizend = 35 400.', 'Op de getallenlijn: tussen welke honderdduizendtallen (of miljoenen) ligt het getal?'], voorbeeld: '630 000 ligt tussen 600 000 en 700 000.' },
        { doel: 'Afronden op honderdduizendtallen; schattend rekenen; kommagetallen ordenen; negatieve getallen.', aanpak: ['Afronden op honderdduizendtallen: kijk naar het tienduizendtal; 50 000 of meer → naar boven.', 'Schattend rekenen: reken met afgeronde getallen als dat genoeg is (6 × € 195 ≈ 6 × 200).', 'Kommagetallen even lang maken en vergelijken; negatieve getallen via 0.'], voorbeeld: '1 470 000 → 1 500 000 (het tienduizendtal is 7).' },
      ],
    },

    breuken: {
      modellen: ['strook (een reep in gelijke stukken)', 'getallenlijn van 0 tot 1 (en verder) met sprongen', 'geld (1/4 euro = 25 cent)', 'pizza/taart (alleen bij beginnen)'],
      niveaus: [
        { doel: 'Groep 6 (in groep 5 nog geen breuken): een breuk als deel van een lengte of figuur; aanvullen tot een geheel; op de getallenlijn; een deel van een getal.', aanpak: ['Verdeel het geheel in gelijke stukken (de noemer).', 'Tel hoeveel stukken je hebt (de teller).', 'Een deel van een getal: 1/4 van 28 = 28 : 4 = 7.'], voorbeeld: 'Een strook in 6 stukken, 2 gekleurd: 2/6.' },
        { doel: 'Deel van een getal; gelijknamige breuken optellen en aftrekken.', aanpak: ['3/4 van 12: eerst 1/4 (12 : 4 = 3), dan 3 × 3 = 9.', 'Gelijknamig (zelfde noemer): tel of trek alleen de tellers af; de noemer blijft.', 'Ook benoemd: 3/4 liter + 2/4 liter = 5/4 liter = 1 1/4 liter.'], voorbeeld: '5/8 − 2/8 = 3/8.' },
        { doel: 'Breuk als kommagetal, keer een breuk, vergelijken, geheel uit een deel.', aanpak: ['Breuk naar kommagetal via geld: 3/4 euro = 75 cent = 0,75.', 'Heel getal × breuk als sprongen op de getallenlijn: 4 × 3/8 = 12 sprongen van 1/8 = 12/8 = 1 1/2.', 'Vergelijken: ligt de breuk boven of onder 1/2? Of reken met een handig getal (2/3 en 3/4 van 12).', 'Geheel uit een deel: 3/4 is 12 → 1/4 is 4 → 4/4 is 16.'], voorbeeld: '2/5 en 3/4: 2/5 is minder dan 1/2, 3/4 meer, dus 3/4 is groter.' },
        { doel: 'Ongelijknamig, gemengde getallen, ordenen.', aanpak: ['Maak gelijknamig met de tafels (1/3 + 1/4 = 4/12 + 3/12).', 'Heel getal × gemengd getal met hulpsommen: 3 × 2 1/4 = 3 × 2 + 3 × 1/4 = 6 + 3/4.', 'Breuken en kommagetallen ordenen: maak er kommagetallen van of zet ze op de getallenlijn.'], voorbeeld: '3 × 2 1/4 = 6 3/4.' },
      ],
    },

    procenten: {
      modellen: ['procentstrook (bovenaan de aantallen of euro\'s, onderaan 0% tot 100%)', 'breuken, kommagetallen en "1 op de …" bij de strook (25% = 1/4 = 0,25 = 1 op de 4)', 'verhoudingstabel', 'de rekenmachine (via 1%)'],
      niveaus: [
        { doel: 'Procenten komen in de methode pas in groep 7. Voor jongere kinderen alleen: 100% is alles, 50% de helft.', aanpak: ['100% is alles.', '50% is de helft.', 'Gebruik de strook: een balk met 0% aan het begin en 100% aan het eind.'], voorbeeld: '50% van 80 = 40.' },
        { doel: 'Procenten komen in de methode pas in groep 7 (strook en cirkel, koppelen aan breuken).', aanpak: ['Lees op de strook: 25% = 1/4, 50% = 1/2, 75% = 3/4, 10% = 1/10.', 'Reken het procent uit met de breuk: 25% van 200 = 1/4 van 200 = 50.'], voorbeeld: '25% van 36 = 1/4 van 36 = 9.' },
        { doel: 'Procenten ↔ breuken ↔ kommagetallen; hoeveel procent; korting.', aanpak: ['25% = 1/4 = 0,25 = 1 op de 4.', 'Hoeveel procent: welk deel van het geheel is het (125 van 500 = 1/4 = 25%)? Of via 10% en 5%.', 'Korting: reken de korting uit met de breuk (25% van € 60 = 1/4 × 60 = € 15) en haal die van de oude prijs af.'], voorbeeld: '€ 60 met 25% korting: korting € 15, nieuwe prijs € 45.' },
        { doel: 'Kortingspercentage, meer dan 100%, via 1%.', aanpak: ['Kortingspercentage (S): korting in euro, dan welk deel van de oude prijs (€ 5 van € 20 = 1/4 = 25%).', 'Meer dan 100%: "25% meer" → 1/4 van de oude hoeveelheid erbij (200 g + 50 g = 250 g).', 'Via 1%: deel door 100 en doe keer het procent (7% van € 640: 1% = € 6,40, 7 × € 6,40); kies zelf: met een breuk of via 1%.'], voorbeeld: '25% van € 700: met de breuk 1/4 = € 175, of via 1%: 25 × € 7 = € 175.' },
      ],
      vermijd: ['via 1% bij makkelijke procenten als 50%, 25% en 10% (de breuk is dan handiger)', 'de formule "deel : geheel × 100" zonder begrip'],
    },

    verhoudingen: {
      niveaus: [
        { doel: 'Eenvoudig herhalen.', aanpak: ['Maak een verhoudingstabel: 1 → € 3.', 'Wat je boven doet, doe je onder ook.'], voorbeeld: '1 → 3, 2 → 6, 3 → 9.' },
        { doel: 'Groep 6 (blok 7): de verhoudingstabel met keer en terug naar 1. ("1 op de …" komt in groep 7.)', aanpak: ['Zet wat je weet in de tabel.', 'Hoeveel keer zoveel? Doe onder hetzelfde.', 'Lastig? Ga eerst terug naar 1 en dan verder.'], voorbeeld: '3 zakken € 12; 6 zakken: × 2, dus € 24.' },
        { doel: '"3 op de 4" van een aantal; via 1 of 100; prijs bij een gewicht.', aanpak: ['"3 op de 4" van 500: verhoudingstabel (3 op 4 → 300 op 400 → 75 op 100 → 375 op 500) of 3/4 × 500.', 'Ga in de tabel naar een handig getal (1, 10, 100).', 'Prijs bij een gewicht: 1000 g → 220 cent, 100 g → 22 cent, 600 g → 132 cent = € 1,32.'], voorbeeld: '3 op de 4 van 500 = 375.' },
        { doel: 'Verhoudingen in allerlei situaties; vreemd geld; voordeliger.', aanpak: ['Verbruik: 1 liter → 15 km; 10 liter → 150 km; 20 liter → 300 km; de rest apart (90 km = 6 liter); samen 26 liter.', 'Vreemd geld: 1 euro → 1,17 dollar; 100 euro → 117 dollar; 500 euro → 585 dollar.', 'Voordeliger: reken naar dezelfde hoeveelheid (per stuk) en vergelijk.'], voorbeeld: '390 km bij 1 op 15: 26 liter.' },
      ],
    },

    schaal: {
      niveaus: [
        { doel: 'Hokjes op een plattegrond.', aanpak: ['Hoeveel meter is 1 hokje?', 'Keer het aantal hokjes.'], voorbeeld: '1 hokje = 2 m, 6 hokjes = 12 m.' },
        { doel: 'Schaal komt in de methode in groep 7 (schaallijn en 1 : …); in groep 6 al plattegronden met vakken.', aanpak: ['Verhoudingstabel: 1 cm → zoveel in het echt.', 'Keer het aantal cm.'], voorbeeld: '1 cm → 50 m, 4 cm → 200 m.' },
        { doel: 'Schaal 1 : … (kaart en bouwtekening), beide kanten op.', aanpak: ['1 : 100 betekent 1 cm is 100 cm = 1 m in het echt (1 : 200 → 2 m; 1 : 100 000 → 1000 m = 1 km).', 'Verhoudingstabel: foto/kaart in cm boven, echt in m onder.', 'Echt → op schaal: hoe vaak past de meters van 1 cm in de echte lengte?'], voorbeeld: '1 : 100 000, 6 cm: 1 cm = 1 km, dus 6 km.' },
        { doel: 'Van echt naar kaart; schaal bepalen.', aanpak: ['Hoeveel meter is 1 cm op de kaart?', 'Hoe vaak past dat in de echte afstand: zoveel cm.', 'Schaal bepalen: reken alles om naar cm; 1 cm op de kaart is … cm echt.'], voorbeeld: '8 km op 1 : 100 000: 1 cm = 1000 m; 8000 m : 1000 m = 8 cm.' },
      ],
    },

    metriek: {
      modellen: ['de lengtetrap km – hm – dam – m – dm – cm – mm', 'de gewichtstrap kg – hg – dag – g – dg – cg – mg (1 ons = 1 hg = 100 g, 1 pond = 500 g, 1 ton = 1000 kg)', 'de trap van de m² (km² – hm² – dam² – m², elke tree × 100; 1 ha = 1 hm², 1 are = 1 dam²)', 'blokjes: 1 dm³ = 1 liter, 1 cm³ = 1 ml, 1 m³ = 1000 liter'],
      niveaus: [
        { doel: 'Groep 5: lengte nauwkeurig meten in mm, cm en dm; maten vergelijken. (Gewicht en inhoud komen in groep 6, km in groep 7.)', aanpak: ['Hoeveel kleine maten zitten in 1 grote? 1 cm = 10 mm, 1 dm = 10 cm, 1 m = 100 cm.', 'Groot → klein: keer; klein → groot: delen.', 'Denk aan de liniaal: elk streepje is 1 mm.'], voorbeeld: '4 dm = 40 cm.' },
        { doel: 'Groep 6: kilogram en gram; liter, dl, cl en ml; lengtematen omrekenen.', aanpak: ['1 kg = 1000 g; 1 l = 10 dl = 100 cl = 1000 ml.', 'Groot → klein: keer; klein → groot: delen.', 'Ons = 100 g, pond = 500 g.'], voorbeeld: '3 l = 30 dl.' },
        { doel: 'De trap gebruiken; maten optellen.', aanpak: ['Zoek beide maten op de trap en tel de treden.', 'Omlaag = keer 10 per trede, omhoog = delen door 10 per trede.', 'Maten optellen: maak eerst dezelfde maat (6 km + 1530 m = 6000 m + 1530 m).'], voorbeeld: '6 km + 1530 m = 7530 m.' },
        { doel: 'Oppervlakte- en inhoudsmaten.', aanpak: ['m²-trap: elke tree × 100 (are = dam² = 100 m², hectare = hm² = 10 000 m²).', '1 dm³ = 1 liter = 1000 cm³; 1 cm³ = 1 ml; 1 m³ = 1000 dm³ = 1000 liter.'], voorbeeld: '3 ha = 300 are = 30 000 m².' },
      ],
    },

    oppervlakte: {
      niveaus: [
        { doel: 'Hokjes tellen, omtrek van een rechthoek.', aanpak: ['Oppervlakte: hokjes in één rij × aantal rijen.', 'Omtrek: tel alle zijden op.'], voorbeeld: '4 rijen van 7 = 28.' },
        { doel: 'Oppervlakte rechthoek = lengte × breedte.', aanpak: ['Lengte × breedte, in m² (of cm²).'], voorbeeld: '4 m bij 3 m = 12 m².' },
        { doel: 'Driehoek; inhoud met blokjes.', aanpak: ['Driehoek: de helft van de rechthoek eromheen.', 'Inhoud: blokjes van 1 dm³; eerst één laag op de bodem (lengte × breedte), dan × het aantal lagen.', '1 dm³ = 1 liter.'], voorbeeld: 'Doos 4 × 3 × 2 dm: 12 per laag, 2 lagen = 24 dm³ = 24 liter.' },
        { doel: 'Samengestelde figuren; omtrek; blokken van 2 dm³.', aanpak: ['Verdeel de figuur in rechthoeken en tel ze op.', 'Omtrek: tel alle zijden op; reken de zijden zonder maat eerst uit.', 'Blokken van 2 dm³: inhoud in dm³ : 2.'], voorbeeld: 'L-vorm 10 × 6 met hoek 4 × 3 eruit: 10 × 3 + 6 × 3 = 48 m².' },
      ],
    },

    tijd: {
      modellen: ['klok (analoog en digitaal)', 'de tijdlijn met sprongen (hele uren, naar het hele uur, de rest)', 'de kalender (weeknummers)', 'verhoudingstabel bij snelheid'],
      woorden: { kwartier: '15 minuten', tijdlijn: 'een lijn met tijden erop; je springt van de begintijd naar de eindtijd', tijdsduur: 'hoe lang iets duurt' },
      niveaus: [
        { doel: 'Kwartier, half uur, minuten.', aanpak: ['1 uur = 60 minuten.', 'Half uur = 30, kwartier = 15.'], voorbeeld: '11:30 + 45 min = 12:15.' },
        { doel: 'Tijdsduur en 24-uursnotatie.', aanpak: ['Spring op de tijdlijn naar het hele uur, dan verder.'], voorbeeld: '10:30 → 11:35: 30 + 35 = 65 minuten.' },
        { doel: 'Tijdsduur in uren en minuten; begintijd en eindtijd.', aanpak: ['Tijdsduur: spring op de tijdlijn eerst hele uren (06:52 → 19:52 = 13 uur), dan naar het hele uur (8 min), dan de rest (28 min).', 'Begintijd: terugrekenen, eerst de hele uren terug, dan de minuten via het hele uur.', 'Afstand bij een snelheid: verhoudingstabel (1 uur → 80 km).'], voorbeeld: '06:52 tot 20:28: 13 uur en 36 minuten.' },
        { doel: 'Gemiddelde snelheid; meter per seconde; tijdzones.', aanpak: ['Gemiddelde snelheid met de verhoudingstabel in minuten: 75 km in 90 min → 25 km in 30 min → 50 km in 60 min = 50 km per uur.', 'Meter per seconde: eerst per minuut, dan : 60.', 'Tijdzones: later = erbij, vroeger = eraf.'], voorbeeld: '3600 m in 10 min: 360 m per minuut, 6 m per seconde.' },
      ],
    },

    meetkunde: {
      modellen: ['windroos met 8 richtingen', 'blad papier (rechte hoek)', 'kaart met hokjes en een schaallijntje', 'zelf draaien'],
      niveaus: [
        { doel: 'Figuren, kwartslag draaien.', aanpak: ['Tel zijden en hoeken.', 'Rechtsom: noord – oost – zuid – west.'], voorbeeld: 'Noord, kwartslag rechts: oost.' },
        { doel: 'Soorten hoeken, symmetrie, ribben; standpunt.', aanpak: ['Vergelijk met de rechte hoek (90°).', 'Standpunt: sta je ten oosten van het huis, dan kijk je naar het westen.'], voorbeeld: 'Foto vanuit het oosten: je kijkt naar het westen.' },
        { doel: 'Hoeken uitrekenen; routes met windrichtingen.', aanpak: ['Driehoek samen 180°, vierhoek 360°.', 'Route: tel de hokjes per stuk en doe keer de meters per hokje; noord en oost samen is noordoost.'], voorbeeld: '60 m noord en 40 m oost: de bushalte ligt noordoost.' },
        { doel: 'Cirkels, kubussen, route terug.', aanpak: ['Omtrek cirkel ≈ 3,14 × de middellijn.', 'Route terug: het laatste stuk eerst, en elke richting wordt de andere kant op.'], voorbeeld: 'Heen noord dan oost; terug eerst west, dan zuid.' },
      ],
    },

    grafieken: {
      modellen: ['staafdiagram (ook met twee jaren naast elkaar)', 'beelddiagram', 'lijndiagram (ook met twee lijnen)', 'cirkeldiagram', 'tijd-afstanddiagram', 'tabel'],
      niveaus: [
        { doel: 'Een staafdiagram aflezen; rijtjes.', aanpak: ['Lees de titel en de as.', 'Zoek de goede staaf en lees af.'], voorbeeld: '6, 8, 10, 12 → 14.' },
        { doel: 'Aflezen met de stapgrootte; verschillen.', aanpak: ['Hoeveel is elk streepje waard?', 'Lees beide waarden af en bereken het verschil.'], voorbeeld: '50 en 35: verschil 15.' },
        { doel: 'As met × 100; gemiddelde; combinaties.', aanpak: ['Staat er "× 100" bij de as? Lees af en doe × 100 (44 → 4400).', 'Gemiddelde: tel alles op en deel door het aantal (ook met de rekenmachine).'], voorbeeld: '8 + 8 + 4 + 12 = 32, 32 : 4 = 8.' },
        { doel: 'Lijndiagram, cirkeldiagram, tijd-afstanddiagram.', aanpak: ['Lijndiagram: waar de lijn het steilst omhoog gaat, steeg het het meest.', 'Cirkeldiagram: 30% = 3/10; 1/10 van 500 = 50; dus 150.', 'Tijd-afstand: lees af hoe ver iemand na een tijd is; waar de lijnen kruisen, haalt de een de ander in.'], voorbeeld: '30% van 500 pannenkoeken = 150.' },
      ],
    },
  },
};
