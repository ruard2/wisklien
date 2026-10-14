// Ezelsbruggetjes en geheugensteuntjes per onderdeel.
// "ezelsbrug": echt gangbaar op Nederlandse basisscholen (o.a. Schooltv, Wijzer over de basisschool).
// "steun": eenvoudige geheugensteun (geen vast rijmpje, wel hoe leerkrachten het vaak zeggen).
export const MNEMONICS = {
  metriek: [
    { soort: 'ezelsbrug', kort: 'Kan Het Dametje Met De Centimeter Meten?', uitleg: 'De eerste letters zijn de trap van groot naar klein: km – hm – dam – m – dm – cm – mm.' },
    { soort: 'steun', kort: 'Trap af = keer 10, trap op = delen door 10', uitleg: 'Elke trede naar beneden: × 10. Naar boven: : 10. Van m naar cm zijn het 2 treden: × 100.' },
    { soort: 'steun', kort: 'Een pak melk = 1 liter = 1 dm³', uitleg: 'Een doosje van 10 × 10 × 10 cm past precies 1 liter in.' },
    { soort: 'steun', kort: 'm² = twee nullen per stap, m³ = drie nullen per stap', uitleg: 'Bij vierkante maten is elke trede × 100, bij kubieke maten × 1000.' },
  ],
  meetkunde: [
    { soort: 'ezelsbrug', kort: 'Nooit Oorlog Zonder Wapens (of: Nooit Opstaan Zonder Wekker)', uitleg: 'N – O – Z – W: zo gaan de windrichtingen met de klok mee.' },
    { soort: 'steun', kort: 'Een rechte hoek is het hoekje van je schrift', uitleg: 'Kleiner = scherp, groter = stomp, een rechte lijn = gestrekt (180°).' },
    { soort: 'steun', kort: 'Driehoek 180°, vierhoek 360°', uitleg: 'Een vierhoek kun je in 2 driehoeken knippen: 2 × 180 = 360.' },
  ],
  vermenigvuldigen: [
    { soort: 'ezelsbrug', kort: 'Tafel van 9: de cijfers samen zijn altijd 9', uitleg: '18 → 1 + 8 = 9, 27 → 2 + 7 = 9. Tientallen gaan 1 omhoog, eenheden 1 omlaag.' },
    { soort: 'ezelsbrug', kort: 'Vingertruc voor de tafel van 9', uitleg: 'Leg 10 vingers neer, buig vinger nummer 3 bij 3 × 9: links 2 vingers, rechts 7 → 27.' },
    { soort: 'steun', kort: 'Tafel van 5 = de helft van de tafel van 10', uitleg: '5 × 8: 10 × 8 = 80, de helft is 40.' },
    { soort: 'steun', kort: 'Tafel van 4 = dubbel en nog eens dubbel', uitleg: '4 × 7: 7 + 7 = 14, 14 + 14 = 28.' },
    { soort: 'steun', kort: 'Keer 10 = een nul erachter', uitleg: '6 × 40: reken 6 × 4 = 24 en zet de nul erachter: 240.' },
  ],
  delen: [
    { soort: 'steun', kort: 'Delen = happen: hoe vaak past het erin?', uitleg: 'Haal steeds een grote hap (10 ×, 100 ×) weg en tel de happen op.' },
    { soort: 'steun', kort: 'Controle: antwoord keer deler = het getal', uitleg: '864 : 6 = 144? Check: 144 × 6 = 864 ✓' },
    { soort: 'steun', kort: 'Rest bij bussen? Dan één bus extra!', uitleg: 'Kinderen kun je niet achterlaten: bij een rest rond je naar boven af.' },
  ],
  optellen: [
    { soort: 'steun', kort: 'Eerst de grote stukken, dan de kleine', uitleg: '486 + 37 = 486 + 30 + 7.' },
    { soort: 'steun', kort: 'Aftrekken checken? Terug optellen!', uitleg: '700 − 248 = 452? Check: 452 + 248 = 700 ✓' },
  ],
  kommagetallen: [
    { soort: 'steun', kort: 'Komma onder komma, net als bij geld', uitleg: '3,5 is hetzelfde als 3,50 (3 euro 50). Vul aan met een 0.' },
    { soort: 'steun', kort: 'Keer 10 = 10 keer zo groot: elk cijfer schuift één plek op (het lijkt of de komma naar rechts gaat)', uitleg: '2,45 × 100 = 245. Met geld: 100 keer € 2,45 = € 245.' },
    { soort: 'steun', kort: 'Delen met een komma? Denk aan geld eerlijk verdelen', uitleg: '27,6 : 6 = € 27,60 over 6: eerst € 24 : 6 = € 4, dan 360 cent : 6 = 60 cent. Samen € 4,60.' },
    { soort: 'steun', kort: 'Groep 8, kommagetal keer kommagetal: schat met ronde getallen waar de komma moet', uitleg: 'Schatten = ongeveer uitrekenen met ronde getallen. 2,9 × 8,1 is ongeveer 3 × 8 = 24. 29 × 81 = 2349, dus 23,49 (dat ligt bij 24), niet 2,349.' },
  ],
  getalbegrip: [
    { soort: 'steun', kort: '0 t/m 4: laten liggen. 5 t/m 9: naar boven', uitleg: 'Kijk naar het cijfer rechts van de plek waarop je afrondt.' },
    { soort: 'steun', kort: 'Een miljoen heeft 6 nullen', uitleg: '1 000 000. Duizend heeft er 3.' },
  ],
  breuken: [
    { soort: 'steun', kort: 'Teller boven, noemer onder (noemer = naar beneden)', uitleg: 'Het getal onder de streep zegt in hoeveel stukken. Boven: hoeveel stukken je hebt.' },
    { soort: 'steun', kort: 'Optellen? Eerst dezelfde stukjes!', uitleg: 'Je kunt halve en derde pizzapunten pas optellen als ze even groot zijn gemaakt.' },
    { soort: 'ezelsbrug', kort: 'Delen door een breuk = keer het omgekeerde', uitleg: '3 : 1/4 = 3 × 4/1 = 12.' },
    { soort: 'steun', kort: 'Wat je onder doet, doe je ook boven', uitleg: '1/2 = 3/6: onder × 3, dus boven ook × 3.' },
  ],
  procenten: [
    { soort: 'steun', kort: 'Procent = per honderd', uitleg: '25% = 25 van de 100 = 1/4.' },
    { soort: 'steun', kort: '50% = helft, 25% = kwart, 10% = delen door 10', uitleg: 'Van 10% maak je alles: 20% = 2 × 10%, 5% = de helft van 10%.' },
    { soort: 'steun', kort: 'Korting: eerst de korting, dan eraf', uitleg: 'Of slim: 20% korting = je betaalt 80%.' },
  ],
  verhoudingen: [
    { soort: 'steun', kort: 'Wat je links doet, doe je ook rechts', uitleg: 'In een tabelletje: links × 3, dan rechts ook × 3.' },
    { soort: 'steun', kort: 'Eerst naar 1', uitleg: 'Wat kost 1 stuk? Wat heeft 1 persoon nodig? Daarna is alles makkelijk.' },
  ],
  schaal: [
    { soort: 'steun', kort: '1 : 100 betekent: 1 cm op papier = 100 cm echt', uitleg: 'Reken eerst alles in cm, daarna terug naar m of km.' },
    { soort: 'ezelsbrug', kort: 'Kan Het Dametje Met De Centimeter Meten?', uitleg: 'Van cm naar m: 2 treden (: 100). Van m naar km: 3 treden (: 1000).' },
  ],
  oppervlakte: [
    { soort: 'steun', kort: 'Omtrek = om de rand lopen, oppervlakte = vloer vol tegels', uitleg: 'Omtrek: alle kanten optellen. Oppervlakte: lengte × breedte (in m²).' },
    { soort: 'steun', kort: 'Inhoud = hoeveel er in de doos past', uitleg: 'Lengte × breedte × hoogte. 1 dm³ = 1 liter.' },
  ],
  tijd: [
    { soort: 'steun', kort: 'Een uur is 60 minuten, niet 100!', uitleg: 'Kwart = 15, half = 30, driekwart = 45 minuten.' },
    { soort: 'steun', kort: 'Tel eerst door naar het hele uur', uitleg: 'Van 10:40 naar 12:15: eerst naar 11:00 (20 min), dan verder.' },
  ],
  grafieken: [
    { soort: 'steun', kort: 'Gemiddelde: alles op één hoop, dan eerlijk verdelen', uitleg: 'Tel alle getallen op en deel door hoeveel het er zijn.' },
    { soort: 'steun', kort: 'Eerst de titel en de as lezen', uitleg: 'Waar gaat het over, en met hoeveel gaat elk streepje omhoog?' },
  ],
};

export const mnemonicsFor = (cat) => MNEMONICS[cat] || [];
export const mnemonicText = (cat) => mnemonicsFor(cat).map((m) => `- ${m.kort} (${m.soort === 'ezelsbrug' ? 'bekend ezelsbruggetje' : 'geheugensteuntje'}): ${m.uitleg}`).join('\n');
