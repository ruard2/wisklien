// Methode "Algemeen": de algemene Nederlandse leerlijnen (TAL/SLO, het handboek in src/didactiek.js), zonder de keuzes
// van een bepaalde rekenmethode. Ook het voorbeeld voor een nieuwe methode: alleen wat anders is dan de basis staat hier.
// Een nieuwe methode maken: kopieer dit bestand naar src/methodes/<naam>.js, pas id, naam en de verschillen aan, en zet
// hem in de lijst in src/methodes/index.js. Daarna is hij per kind te kiezen (ouderscherm → Instellingen → Rekenmethode).
export default {
  id: 'algemeen',
  lang: 'nl',
  naam: 'Algemeen (TAL/SLO-leerlijnen)',
  beschrijving: 'Geen bepaalde methode: de algemene leerlijnen. Andere routes bij een paar soorten sommen (nullen wegstrepen, schaal via cm, snelheid via halve uren, korting via 5%, verbruik door delen).',
  routes: {
    'delen.1c': 'nullen-weg',
    schaal: 'cm',
    'tijdBasis.3a': 'halve-uren',
    'procenten.3c': 'vijf-procent',
    'verhoudingen.3b': 'delen',
    lvorm: 'aftrekken',
    'aftrekken.groot': 'rijgen',
    'keer.groot': 'splitsen',
    'procent.hoeveel': 'noemer100',
  },
  uit: [],
  // De uitlegkaarten die bij de andere routes horen
  kaarten: {
  "delen.1c": {
    "naam": "Nullen wegstrepen",
    "aanpak": [
      "Deel beide getallen door 10 voor elke nul die ze allebei hebben.",
      "Reken de makkelijke deelsom uit.",
      "Neem de plaatswaarde mee: als het deeltal nog 10 keer zo groot is als bij de makkelijke deelsom en de deler gelijk blijft, wordt de uitkomst ook 10 keer zo groot."
    ],
    "model": "Verhoudingstabel om beide getallen door 10 te delen; daarna plaatswaarde: 10 keer zo groot deeltal bij dezelfde deler geeft 10 keer zo grote uitkomst.",
    "valkuilen": [
      "Alleen bij één getal een nul weggestreept → deel beide getallen door hetzelfde getal.",
      "De uitkomst niet aangepast als alleen het deeltal voor de makkelijke deelsom kleiner is gemaakt → kijk hoeveel keer zo groot het deeltal eerst was."
    ],
    "concreter": "Gebruik plaatswaarde: reken eerst met een kleiner deeltal en bedenk daarna hoeveel keer zo groot het oorspronkelijke deeltal was."
  },
  "schaal.2a": {
    "naam": "Schaal (1 : …) naar km",
    "aanpak": [
      "1 cm op de kaart is zoveel cm in het echt als het schaalgetal.",
      "Vermenigvuldig de afstand op de kaart in cm met het schaalgetal.",
      "Reken de uitkomst om: cm → m (: 100) → km (: 1000)."
    ],
    "model": "De maten-trap: cm → m → km.",
    "valkuilen": [
      "Vergeten om te rekenen naar km → volg de maten-trap stap voor stap."
    ],
    "concreter": "Reken eerst de kaartafstand om naar cm in het echt. Zet die cm daarna om naar km."
  },
  "schaal.3b": {
    "naam": "Echte afstand naar kaart",
    "aanpak": [
      "Reken de echte afstand om naar cm.",
      "Bij schaal 1 : n is 1 cm op de kaart n cm in het echt. Deel de echte afstand in cm door n."
    ],
    "model": "Verhoudingstabel met rijen ‘kaart (cm)’ en ‘echt (cm)’: 1 cm op de kaart hoort bij n cm in het echt.",
    "valkuilen": [
      "Keer in plaats van delen → bedenk dat de kaart kleiner is dan de werkelijkheid: deel de echte afstand in cm door het schaalgetal."
    ],
    "concreter": "Eerst een klein voorbeeld (bijv. 1 km op schaal 1 : 100 000), dan terug naar de som."
  },
  "tijdBasis.3a": {
    "naam": "Gemiddelde snelheid",
    "aanpak": [
      "Zet de tijd uit de som om naar 1 uur in de verhoudingstabel.",
      "Reken met dezelfde factor uit welke afstand daarbij hoort: dat is de snelheid in km per uur."
    ],
    "model": "Verhoudingstabel met tijd boven en afstand onder: wat je met de tijd doet om op 1 uur te komen, doe je ook met de afstand.",
    "valkuilen": [
      "Alleen de tijd veranderen → verander de afstand met dezelfde factor.",
      "Afstand delen door een tijd met komma lastig vinden → gebruik de verhoudingstabel om eerst naar 1 uur te rekenen."
    ],
    "concreter": "Vul de bekende tijd en afstand in de tabel in. Reken in kleine, gelijke stappen naar 1 uur en pas elke stap op beide rijen toe."
  },
  "procenten.3c": {
    "naam": "Hoeveel procent korting?",
    "aanpak": [
      "Bereken de korting in euro: oude prijs − nieuwe prijs.",
      "Bereken 10% van de oude prijs en daarna 5%.",
      "Kijk hoe vaak 5% in de korting past; dat aantal keer 5% is het kortingspercentage."
    ],
    "model": "Procentenstrook: de oude prijs is 100%; laat zien hoeveel euro 5% is en hoeveel van die stukken de korting is.",
    "valkuilen": [
      "Een kortingsbedrag in euro verwarren met het kortingspercentage → vergelijk het bedrag met 5% van de oude prijs."
    ],
    "concreter": "Reken eventueel eerst met een klein voorbeeld, bijv. van € 20 naar € 18: de korting is € 2, oftewel 10%."
  },
  "verhoudingen.3b": {
    "naam": "Verbruik (1 op …)",
    "aanpak": [
      "Lees af hoeveel km bij 1 liter hoort.",
      "Deel de totale afstand door het aantal km per liter.",
      "Noteer het antwoord in liters."
    ],
    "model": "Verhoudingstabel met twee rijen: kilometers en liters. Bij 1 liter hoort het aantal km uit de som; deel de totale afstand door dat aantal.",
    "valkuilen": [
      "Vermenigvuldigen in plaats van delen → bedenk hoeveel keer de afstand per liter in de totale afstand past."
    ],
    "concreter": "Begin met: 1 liter rijdt … km. Vraag daarna hoe vaak die afstand in de totale afstand past."
  }
},
  taal: { vervang: [['tijdlijn', 'tijdbalk']] },
  max: '',
  didactiek: {},
};
