// Geheuehulpies per onderwerp (Afrikaans). "ezelsbrug" = algemeen gebruik in Suid-Afrikaanse skole;
// "steun" = eenvoudige hulpmiddel soos onderwysers dit sê (nie 'n vaste rympie nie).
export const MNEMONICS = {
  optel: [
    { soort: 'steun', kort: 'Ene onder ene, tiene onder tiene', uitleg: 'In kolomme staan elke plekwaarde presies onder mekaar. Begin altyd by die ene.' },
    { soort: 'steun', kort: 'Bo min onder', uitleg: 'By aftrek in kolomme trek jy altyd die onderste syfer van die boonste af. Gaan dit nie, ruil 1 van die kolom links om.' },
  ],
  vermenigvuldig: [
    { soort: 'steun', kort: 'Breek die getal op, vermenigvuldig elke deel en tel die antwoorde bymekaar', uitleg: '8 × 4 362 = 8 × 4 000 + 8 × 300 + 8 × 60 + 8 × 2.' },
    { soort: 'steun', kort: '× 4 = verdubbel die getal twee keer', uitleg: '× 8 is die getal drie keer verdubbel; × 9 = maal met 10 en trek die getal af.' },
  ],
  deling: [
    { soort: 'steun', kort: 'Deel, maal, trek af, bring af', uitleg: 'Die vier stappe van langdeling. Herhaal dan die stappe.' },
    { soort: 'steun', kort: 'Die res is altyd kleiner as die deler', uitleg: 'Is dit groter? Dan pas daar nog \'n groep in.' },
  ],
  getalbegrip: [
    { soort: 'steun', kort: '5 of meer: rond op. Minder as 5: rond af', uitleg: 'Kyk net na die syfer regs van die plekwaarde waarna jy afrond.' },
  ],
  breuke: [
    { soort: 'steun', kort: 'Noemer = die aantal gelyke dele, teller = die aantal dele wat jy neem', uitleg: '3/5: die geheel is in 5 ewe groot dele verdeel, en jy neem 3.' },
    { soort: 'steun', kort: 'Van = deel deur die noemer, maal met die teller', uitleg: '3/5 van 20: 20 ÷ 5 = 4, 4 × 3 = 12.' },
  ],
  desimale: [
    { soort: 'steun', kort: 'Komma onder komma', uitleg: 'By optel en aftrek staan die kommas presies onder mekaar.' },
    { soort: 'steun', kort: 'Dink aan geld', uitleg: '0,25 is soos 25 sent; 0,3 is soos 30 sent.' },
  ],
  persentasie: [
    { soort: 'steun', kort: 'Persent = uit 100', uitleg: '50% = 1/2, 25% = 1/4, 10% = 1/10, 20% = 1/5, 75% = 3/4.' },
  ],
  finansies: [
    { soort: 'steun', kort: 'Eers vir een, dan vir baie', uitleg: 'Deel om die prys per eenheid te kry en vermenigvuldig dan met die aantal eenhede.' },
    { soort: 'steun', kort: 'Wins = verkoopprys − koopprys', uitleg: 'Is dit negatief? Dan is dit verlies.' },
  ],
  patrone: [
    { soort: 'ezelsbrug', kort: 'BODMAS', uitleg: 'Hakies (Brackets), magte (Of/Orders), Deel en Maal, dan Optel en Aftrek.' },
    { soort: 'steun', kort: 'Terugwerk beteken om die omgekeerde bewerking te doen', uitleg: 'In ’n vloeidiagram word + − en × ÷; begin by die einde.' },
  ],
  meetkunde: [
    { soort: 'steun', kort: 'Die hoeke in ’n driehoek: 180°; op ’n reguit lyn: 180°; om ’n punt: 360°', uitleg: 'Tel die bekende hoeke op en trek af.' },
  ],
  meting: [
    { soort: 'steun', kort: 'Van groot na klein: vermenigvuldig. Van klein na groot: deel', uitleg: '1 m = 100 cm, 1 km = 1 000 m, 1 kg = 1 000 g, 1 ℓ = 1 000 mℓ.' },
  ],
  omtrek: [
    { soort: 'steun', kort: 'Omtrek = afstand rondom; oppervlakte = ruimte binne-in', uitleg: 'Omtrek in cm, oppervlakte in cm², volume in cm³.' },
  ],
  tyd: [
    { soort: 'steun', kort: '1 uur = 60 minute, nie 100 nie', uitleg: '0,5 uur = 30 min, 0,25 uur = 15 min.' },
  ],
  data: [
    { soort: 'steun', kort: 'Modus = die waarde wat die meeste voorkom, mediaan = die middelste waarde', uitleg: 'Vir die mediaan sorteer jy eers van klein na groot.' },
  ],
};
export const mnemonicsFor = (cat) => MNEMONICS[cat] || [];
export const mnemonicText = (cat) => mnemonicsFor(cat).map((m) => `- ${m.kort} (${m.soort === 'ezelsbrug' ? 'bekende geheuehulp' : 'hulpmiddel'}): ${m.uitleg}`).join('\n');
