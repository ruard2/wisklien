// Didaktiese handboek vir Suid-Afrikaanse kinders (Afrikaans), volgens die KABV (CAPS) Wiskunde
// Intermediêre Fase (gr 4–6) en Senior Fase (gr 7), en die DBE-werkboeke (Rainbow Workbooks, Afrikaans).
// Een vaste aanpak per onderwerp: Meneer Max, wenke, tussenstappe en voorbeelde volg almal hierdie kaart.
//
// Bronne (afgelaai en deurgewerk):
//  - KABV Wiskunde Intermediêre Fase gr 4–6 en Senior Fase gr 7–9 (Departement van Basiese Onderwys).
//    Gewig: Getalle, bewerkings en verwantskappe 50%, Patrone/funksies/algebra 10%, Ruimte en vorm 15%,
//    Meting 15%, Datahantering 10%. Hoofrekene ±10 minute per dag.
//  - DBE-werkboeke graad 5, 6 en 7 (Afrikaans): "Voltooi tot die volgende 10/100/1000", uitgebreide notasie en
//    die distributiewe eienskap (8 × 4 362 = 8 × (4 000 + 300 + 60 + 2)), daarna die vertikale kolommetode,
//    langdeling met "res" en die deelprodukte, deelbaarheidsreëls, breuke van heelgetalle via groepe,
//    persentasie = "uit 100", probleemoplossing met vrae (Wat is die vraag? Watter getalle? Watter bewerking?
//    Wat is die getallesin?).
//  - ANA-toetse gr 4/6 en riglyne gr 7 (vraagsoorte en notasie: ÷, R46,38, getalle in 'n ry met ; tussenin).
//
// Skatting ("beraam") is in die KABV 'n aangeleerde tegniek: rond die getalle af, reken die maklike som
// uit, en gebruik dit om die antwoord te kontroleer. Altyd sê WAT jy afrond en HOE (nooit "skat eers" sonder uitleg).

export const ALGEMEEN = {
  // (ook gebruikt in Max se prompt, net soos by die Nederlandse handboek)
  schatten: 'Skatting (beraam) = rond die getalle af en reken die maklike som uit, bv. 243 × 36 is omtrent 200 × 40 = 8 000. Sê altyd wat jy afrond en hoe. Gebruik dit om die antwoord te kontroleer.',
  drieslag: 'Woordprobleem: (1) Wat is die vraag? Watter getalle het ek nodig? (2) Watter bewerking? Skryf die getallesin en reken uit. (3) Kontroleer: maak die antwoord sin?',
  stappe: 'Elke som: (1) Wat is die vraag? (2) Watter getalle het ek nodig? (3) Watter bewerking? (4) Skryf die getallesin. (5) Reken uit. (6) Kontroleer: maak dit sin?',
  modelle: 'Gebruik die modelle uit die werkboeke: getallelyn, plekwaardetabel (D H T E), uitgebreide notasie, kolomme, breukstroke en sirkels, 100-blokkies vir persentasie, inset-uitset-vloeidiagramme.',
  notasie: 'Suid-Afrikaanse notasie: desimale komma (2,5), ÷ vir deel, × vir maal, geld as R12,50, groot getalle met spasies (4 362; 12 500), getalle in \'n ry met ; tussenin.',
  terug: 'Sukkel jy? Een stap terug: van die kaal som na geld of ’n prentjie, of na die vorige graad se metode.',
};

export const DIDACTIEK = {
  optel: {
    kern: 'Getalle bestaan uit duisende, honderde, tiene en ene. Jy tel op of trek af volgens plekwaarde.',
    voorkennis: 'Ken getalbande tot 20 vinnig en breek getalle op (356 = 300 + 50 + 6).',
    modellen: ['getallelyn (spronge)', 'plekwaardetabel (D H T E)', 'uitgebreide notasie', 'geld (note en munte)'],
    woorden: { opbou: 'tel die getalle per plekwaarde op: honderde, tiene, ene', afbreek: 'breek die tweede getal in stukke op en trek dit stuk vir stuk af', kolomme: 'onder mekaar, ene onder ene, begin by die ene', oordra: 'meer as 9 in \'n kolom? Dra 1 oor na die volgende kolom.', kompensering: 'reken met \'n ronde getal en maak dan reg (− 99 is − 100 en dan + 1)' },
    niveaus: [
      { doel: 'Optel en aftrek tot 1 000 (graad 4).', aanpak: ['Breek albei getalle op in honderde, tiene en ene.', 'Tel die honderde op, dan die tiene, dan die ene.', 'Tel die drie antwoorde bymekaar.'], voorbeeld: '356 + 238 = (300 + 200) + (50 + 30) + (6 + 8) = 500 + 80 + 14 = 594.' },
      { doel: 'Tot 10 000, in kolomme met oordra (graad 5).', aanpak: ['Skryf die getalle onder mekaar: ene onder ene, tiene onder tiene.', 'Begin by die ene. Is dit 10 of meer? Skryf die ene neer en dra 1 oor na die tiene.', 'Doen dieselfde vir die tiene, honderde en duisende.'], voorbeeld: '4 367 + 2 858: ene 7 + 8 = 15 (skryf 5, dra 1 oor), tiene 6 + 5 + 1 = 12 … = 7 225.' },
      { doel: 'Getalle met tot 6 syfers en kompensering (graad 6).', aanpak: ['Skryf die getalle in kolomme.', 'Aftrek: Is die boonste syfer kleiner as die onderste een? Ruil 1 uit die volgende kolom vir 10 in hierdie kolom.', 'Naby aan \'n ronde getal (998)? Reken met 1 000 en pas dan die antwoord aan.', 'Kontroleer aftrek deur terug op te tel.'], voorbeeld: '4 365 − 998 = 4 365 − 1 000 + 2 = 3 367.' },
      { doel: 'Woordprobleme in meer as een stap (graad 7).', aanpak: ['Wat is die vraag? Watter getalle het jy nodig?', 'Skryf die getallesinne neer.', 'Reken elke stap in kolomme uit.', 'Kontroleer: rond af en kyk of die antwoord omtrent reg is.'], voorbeeld: 'Begroting R2 500: uitgawes R875 + R1 240 = R2 115; oor: R2 500 − R2 115 = R385.' },
    ],
    fouten: [
      { fout: 'Trek die kleinste syfer van die grootste af, ongeag in watter kolom hulle staan (52 − 27 = 35).', hulp: 'Trek die onderste syfer af. Kan jy dit nie doen nie? Ruil 1 uit die volgende kolom vir 10 in hierdie kolom.' },
      { fout: 'Vergeet om oor te dra (47 + 38 = 75).', hulp: 'Skryf die oorgedraagde 1 klein bo die volgende kolom.' },
    ],
    controle: 'Aftrek: tel die antwoord en die getal wat jy afgetrek het op; jy moet weer die eerste getal kry. Of rond af en kyk of dit omtrent reg is.',
    vermijd: ['"leen" sonder om te verduidelik dat jy 1 tien omruil in 10 ene', 'die Nederlandse metode (rijgen/kolomsgewijs van links)'],
  },

  vermenigvuldig: {
    kern: 'Maal beteken herhaalde optelling: 4 × 7 = 7 + 7 + 7 + 7. Vir groter berekeninge kan jy getalle met uitgebreide notasie ontbind (die distributiewe eienskap).',
    voorkennis: 'Ken die maaltafels tot 10 × 10 en weet hoe om met 10 en 100 te maal.',
    modellen: ['groepe (4 sakkies van 7)', 'reghoek (rye en kolomme)', 'uitgebreide notasie', 'vertikale kolommetode'],
    woorden: { 'uitgebreide notasie': 'skryf die getal as duisende + honderde + tiene + ene', 'distributiewe eienskap': 'vermenigvuldig elke deel apart en tel die produkte op', verdubbel: 'maal 2', halveer: 'deel deur 2', produk: 'die antwoord van \'n maalsom' },
    niveaus: [
      { doel: 'Maaltafels en 2-syfer × 1-syfer (graad 4).', aanpak: ['Gebruik \'n maaltafel wat jy ken: verdubbel of halveer.', 'Breek die groot getal op in tiene en ene.', 'Maal elke deel en tel op.'], voorbeeld: '34 × 6 = (30 × 6) + (4 × 6) = 180 + 24 = 204.' },
      { doel: '3-syfer × 1-syfer en 2-syfer × 2-syfer (graad 5).', aanpak: ['Skryf die getal in uitgebreide notasie.', 'Vermenigvuldig elke deel (onthou: 300 × 6 = 3 × 6 met twee nulle agter).', 'Tel die deelprodukte op.'], voorbeeld: '346 × 7 = (300 × 7) + (40 × 7) + (6 × 7) = 2 100 + 280 + 42 = 2 422.' },
      { doel: '4-syfer × 1-syfer en 3-syfer × 2-syfer (graad 6).', aanpak: ['Breek op met uitgebreide notasie (die distributiewe eienskap).', 'Wanneer jy met \'n 2-syfergetal maal: maal eers met die tiene, dan met die ene.', 'Tel die deelprodukte in kolomme op.'], voorbeeld: '8 × 4 362 = 8 × (4 000 + 300 + 60 + 2) = 32 000 + 2 400 + 480 + 16 = 34 896.' },
      { doel: 'Groter somme en woordprobleme, met skatting (graad 7).', aanpak: ['Beraam eers: rond albei getalle af en bereken \'n maklike produk.', 'Reken presies uit met die kolommetode (eers × tiene, dan × ene).', 'Vergelyk met jou skatting: is dit omtrent ewe groot?'], voorbeeld: '243 × 36: skatting 200 × 40 = 8 000. 243 × 30 = 7 290, 243 × 6 = 1 458, saam 8 748.' },
    ],
    fouten: [
      { fout: 'Vermenigvuldig net ene met ene en tiene met tiene (23 × 14 = 2 | 12).', hulp: 'Elke deel van die een getal moet met elke deel van die ander getal gemaal word: skryf al vier deelprodukte neer.' },
      { fout: 'Vergeet die nulle (40 × 6 = 24).', hulp: 'Reken 4 × 6 = 24 en sit die nul terug: 240.' },
    ],
    controle: 'Rond af en beraam: 243 × 36 is omtrent 200 × 40 = 8 000.',
    vermijd: ['die standaard-algoritme sonder dat die kind die uitgebreide notasie verstaan'],
  },

  deling: {
    kern: 'Deling is die omgekeerde van vermenigvuldiging: 56 ÷ 8 = 7, want 8 × 7 = 56. Wat oorbly, is die res.',
    voorkennis: 'Maaltafels, en weet dat maal en deel omgekeerde bewerkings is.',
    modellen: ['groepe maak (deel gelyk uit)', 'afbreek in maklike stukke', 'langdeling met deelprodukte'],
    woorden: { res: 'wat oorbly as jy nie meer \'n hele groep kan maak nie', langdeling: 'deel stap vir stap, van links na regs, en skryf die deelprodukte neer', deelbaar: 'kan sonder ’n res deur ’n ander getal gedeel word', 'omgekeerde bewerking': 'maal en deel maak mekaar ongedaan' },
    niveaus: [
      { doel: 'Deel met die maaltafels, ook met \'n res (graad 4).', aanpak: ['Dink aan die maaltafel: watter getal × die deler gee die getal?', 'Gaan dit nie presies nie? Kies die grootste veelvoud wat nie groter as die deeltal is nie; wat oorbly, is die res.'], voorbeeld: '47 ÷ 5 = 9 res 2, want 5 × 9 = 45 en 47 − 45 = 2.' },
      { doel: '3-syfergetal ÷ 1-syfergetal deur af te breek (graad 5).', aanpak: ['Breek die getal op in dele wat maklik deelbaar is (bv. 300 en 84).', 'Deel elke deel.', 'Tel die antwoorde op.'], voorbeeld: '384 ÷ 6 = (300 ÷ 6) + (84 ÷ 6) = 50 + 14 = 64.' },
      { doel: 'Langdeling: 3- en 4-syfergetalle ÷ 2-syfergetalle (graad 6).', aanpak: ['Hoeveel keer pas die deler in die eerste syfers?', 'Maal en skryf die deelproduk onder; trek af.', 'Bring die volgende syfer af en herhaal.', 'Wat aan die einde oorbly, is die res.'], voorbeeld: '560 ÷ 24: 24 in 56 gaan 2 keer (48), 56 − 48 = 8, bring 0 af: 80; 24 in 80 gaan 3 keer (72), res 8. Antwoord: 23 res 8.' },
      { doel: 'Langdeling in woordprobleme; wat doen jy met die res? (graad 7)', aanpak: ['Skryf die getallesin.', 'Doen die langdeling.', 'Dink oor die res: moet jy opwaarts afrond (busse, bokse) of dit weglaat (volle pakkies)?'], voorbeeld: '345 kinders, 48 per bus: 345 ÷ 48 = 7 res 9, dus 8 busse.' },
    ],
    fouten: [
      { fout: '’n Res groter as die deler laat staan.', hulp: 'Die res moet altyd kleiner wees as die deler; anders pas daar nog \'n groep in.' },
      { fout: '\'n Nul in die antwoord vergeet (816 ÷ 8 = 12).', hulp: 'Gaan die deler nie in die getal in nadat jy die volgende syfer afgebring het nie? Skryf 0 in die antwoord en bring die volgende syfer af.' },
    ],
    controle: 'Maal die antwoord met die deler en tel die res by; jy moet die oorspronklike getal kry.',
    vermijd: ['die Nederlandse "happen"-metode', 'die res as desimaal skryf voordat dit geleer is'],
  },

  getalbegrip: {
    kern: 'Die waarde van ’n syfer hang af van sy plek: in 4 728 het die 7 ’n waarde van 700.',
    voorkennis: 'Tel in tiene, honderde en duisende.',
    modellen: ['plekwaardetabel (HD TD D H T E)', 'getallelyn (vir afronding)', 'faktorboompie'],
    woorden: { plekwaarde: 'die waarde van ’n syfer op grond van sy plek', afronding: '’n getal na die naaste ronde getal verander', faktor: '’n getal wat ’n ander getal sonder ’n res deel', veelvoud: '’n getal in ’n maaltafel', priemgetal: '\'n getal met net twee faktore: 1 en homself' },
    niveaus: [
      { doel: 'Plekwaarde van getalle tot 4 syfers en afronding tot die naaste 10 (graad 4).', aanpak: ['Sit die getal in \'n plekwaardetabel.', 'Afronding: kyk na die syfer regs van die plek waarna jy afrond. 5 of meer: rond op. Minder as 5: rond af.'], voorbeeld: '4 728 afgerond tot die naaste 10 = 4 730 (die 8 is 5 of meer).' },
      { doel: 'Afronding tot die naaste 5, 10, 100 en 1 000; faktore en veelvoude (graad 5).', aanpak: ['Teken \'n getallelyn met die twee ronde getalle; aan watter kant is jy nader?', 'Faktore: soek getalpare wat die getal gee as jy hulle met mekaar maal (1 × 12, 2 × 6, 3 × 4).'], voorbeeld: '12 het 6 faktore: 1; 2; 3; 4; 6; 12.' },
      { doel: 'Getalle tot 6 syfers; priemgetalle (graad 6).', aanpak: ['Plekwaarde: skryf die getal in uitgebreide notasie.', 'Priemgetal: het ’n priemgetal net 1 en homself as faktore?', 'Gebruik die deelbaarheidsreëls om vinnig te toets.'], voorbeeld: '37 is \'n priemgetal; 39 nie, want 3 × 13 = 39.' },
      { doel: 'GGF, KGV, kwadrate en derdemagte (graad 7).', aanpak: ['GGF: skryf die faktore van albei getalle; kies die grootste faktor wat albei getalle het.', 'KGV: skryf veelvoude van albei getalle; kies die kleinste veelvoud wat ’n veelvoud van albei is.', 'Kwadraat: 5² = 5 × 5. Derdemag: 3³ = 3 × 3 × 3.'], voorbeeld: 'GGF van 12 en 18 = 6; KGV van 4 en 6 = 12; 4³ = 64.' },
    ],
    fouten: [
      { fout: 'Tot die verkeerde plek afgerond (4 728 tot 100 → 4 730).', hulp: 'Onderstreep die plek waarna jy afrond en kyk net na die syfer regs daarvan.' },
      { fout: '1 as priemgetal beskou.', hulp: '1 het net een faktor; \'n priemgetal het presies twee.' },
    ],
    controle: 'Afronding: lê die afgeronde getal naby die oorspronklike? Faktore: vermenigvuldig die getalpare om te kyk of hulle die getal gee.',
    vermijd: ['afronding "van regs na links deur te rol"'],
  },

  breuke: {
    kern: '’n Breuk is ’n deel van ’n geheel of van ’n groep. Die noemer sê in hoeveel ewe groot dele die geheel verdeel is; die teller sê hoeveel daarvan geneem word.',
    voorkennis: 'Ewe groot dele (halwes, kwarte), en deel met die maaltafels.',
    modellen: ['sirkel- en reghoekdiagramme', 'breukstrook', 'getallelyn', 'versamelings (groepe voorwerpe)'],
    woorden: { teller: 'die getal bo die streep; dit sê hoeveel dele', noemer: 'die getal onder die streep; dit sê in hoeveel ewe groot dele die geheel verdeel is', 'ekwivalente breuke': 'breuke wat dieselfde waarde het (1/2 = 2/4)', 'gemengde getal': '\'n heelgetal met \'n breuk (2 1/3)', 'onegte breuk': 'teller groter as of gelyk aan die noemer (7/4)', 'eenvoudigste vorm': 'teller en noemer so klein as moontlik' },
    niveaus: [
      { doel: 'Breuk van ’n versameling; vergelyking van breuke met dieselfde noemer (graad 4).', aanpak: ['1/3 van 12: deel die 12 in 3 ewe groot groepe.', 'Een groep is die antwoord.'], voorbeeld: '1/4 van 20 = 5, want 20 ÷ 4 = 5.' },
      { doel: 'Breuk van \'n heelgetal; ekwivalente breuke; optel met dieselfde noemer (graad 5).', aanpak: ['3/5 van 20: eers 1/5 (20 ÷ 5 = 4), dan × 3 = 12.', 'Ekwivalent: maal die teller en noemer met dieselfde getal.', 'Dieselfde noemer: tel net die tellers op.'], voorbeeld: '2/7 + 3/7 = 5/7; 1/2 = 4/8.' },
      { doel: 'Optel en aftrek van breuke wanneer die een noemer \'n veelvoud van die ander is; gemengde getalle (graad 6).', aanpak: ['Maak die noemers dieselfde: verander die breuk met die kleiner noemer (1/4 = 2/8).', 'Tel die tellers op of trek hulle van mekaar af; die noemer bly dieselfde.', 'Gemengde getalle: eers die heelgetalle, dan die breuke.'], voorbeeld: '1/4 + 3/8 = 2/8 + 3/8 = 5/8. 2 1/3 + 1 1/3 = 3 2/3.' },
      { doel: 'Breuke met enige noemers, breuk × breuk en die eenvoudigste vorm (graad 7).', aanpak: ['Verskillende noemers: soek die KGV van die noemers.', 'Breuk × breuk: teller × teller en noemer × noemer.', 'Vereenvoudig: deel teller en noemer deur die GGF.'], voorbeeld: '2/3 + 1/4 = 8/12 + 3/12 = 11/12. 2/3 × 3/4 = 6/12 = 1/2.' },
    ],
    fouten: [
      { fout: 'Tellers én noemers opgetel (1/2 + 1/4 = 2/6).', hulp: 'Teken die breukstroke: die stukke moet eers ewe groot wees. Net die tellers word opgetel.' },
      { fout: 'Net deur 5 gedeel by 3/5 van 20 (antwoord 4).', hulp: '4 is 1/5. Jy wil 3 daarvan hê: × 3.' },
    ],
    controle: 'Teken \'n breukstrook of sirkel en kyk of die antwoord sin maak (is 5/8 meer as 1/2?).',
    vermijd: ['kruisvermenigvuldiging as truuk', 'reëls vir vereenvoudiging voor graad 7'],
  },

  desimale: {
    kern: '\'n Desimale breuk is \'n ander manier om tiendes en honderdstes te skryf: 0,7 = 7/10 en 0,25 = 25/100. Geld werk net so: R4,35 = 4 rand en 35 sent.',
    voorkennis: 'Tiendes en honderdstes as gewone breuke; geld (100 sent = R1).',
    modellen: ['geld (rand en sent)', 'plekwaardetabel met tiendes en honderdstes', 'getallelyn', 'liniaal (mm en cm)'],
    woorden: { tiendes: 'die eerste syfer ná die komma', honderdstes: 'die tweede syfer ná die komma', 'desimale komma': 'skei die heelgetaldeel van die desimale deel' },
    niveaus: [
      { doel: 'Geld: rand en sent (graad 4).', aanpak: ['R1 = 100 sent.', 'Die syfers ná die komma wys hoeveel sent daar is.', 'Tel rande by rande en sent by sent; 100 sent word R1.'], voorbeeld: 'R4,35 = 435 sent. R2,50 + R1,75 = R4,25.' },
      { doel: 'Tiendes en honderdstes as breuke (graad 5).', aanpak: ['Tien ewe groot dele: elke deel is 1/10 = 0,1.', 'Skryf die breuk met noemer 10 of 100 as desimaal: 7/10 = 0,7; 23/100 = 0,23.'], voorbeeld: '3 7/10 = 3,7.' },
      { doel: 'Optel en aftrek van desimale breuke; × 10 en × 100 (graad 6).', aanpak: ['Skryf in kolomme met die kommas presies onder mekaar.', 'Voeg nulle aan die einde by (3,5 = 3,50).', '× 10: elke syfer skuif een plek na links (3,45 × 10 = 34,5).'], voorbeeld: '12,6 + 3,45 = 12,60 + 3,45 = 16,05.' },
      { doel: 'Vermenigvuldiging en deling van desimale breuke met heelgetalle (graad 7).', aanpak: ['Reken in tiendes of honderdstes: 0,4 × 3 = 4 tiendes × 3 = 12 tiendes = 1,2.', 'Groter getalle: uitgebreide notasie: 5,27 × 30 = (5 × 30) + (0,2 × 30) + (0,07 × 30).', 'Kontroleer met afronding.'], voorbeeld: '5,276 × 30 = 150 + 6 + 2,1 + 0,18 = 158,28.' },
    ],
    fouten: [
      { fout: 'Kommas nie onder mekaar nie (12,6 + 3,45 = 4,71).', hulp: 'Kommas presies onder mekaar; vul aan met 0.' },
      { fout: '0,4 × 3 = 0,12.', hulp: 'Dink in tiendes: 4 tiendes × 3 = 12 tiendes = 1,2.' },
      { fout: '0,25 is groter as 0,3 "want 25 is groter as 3".', hulp: 'Maak die aantal desimale plekke dieselfde: 0,25 en 0,30. Of dink aan geld: 25c en 30c.' },
    ],
    controle: 'Dink aan geld of rond af: 12,6 + 3,45 is omtrent 13 + 3 = 16.',
    vermijd: ['"tel die syfers ná die komma" sonder begrip', 'die Nederlandse woord kommagetal'],
  },

  persentasie: {
    kern: 'Persent beteken "uit 100": 25% is 25 uit elke 100, dit is 25/100 = 1/4.',
    voorkennis: 'Breuke van heelgetalle (1/4 van 300) en ekwivalente breuke met noemer 100.',
    modellen: ['100-blokkie (ingekleur)', 'breukstrook met 0%, 50%, 100%', 'verband breuk – desimaal – persent'],
    woorden: { persentasie: 'hoeveel uit 100', afslag: 'hoeveel minder jy betaal', toename: 'hoeveel meer dit word', afname: 'hoeveel minder dit word' },
    niveaus: [
      { doel: 'Uit 100 (opstap).', aanpak: ['Tel hoeveel van die 100 blokkies ingekleur is.', 'Dit is die persentasie.'], voorbeeld: '37 van 100 blokkies = 37%.' },
      { doel: 'Bekende persentasies as breuke: 50%, 25%, 10% (opstap).', aanpak: ['50% = 1/2, 25% = 1/4, 10% = 1/10.', 'Neem daardie breuk van die getal.'], voorbeeld: '50% van R80 = 1/2 van 80 = R40.' },
      { doel: 'Persentasie van heelgetalle met behulp van breuke (graad 6).', aanpak: ['Skryf die persent as breuk (25% = 1/4, 20% = 1/5, 75% = 3/4).', 'Neem die breuk van die getal: eers deel, dan maal.'], voorbeeld: '75% van R300 = 3/4 van 300: 300 ÷ 4 = 75, × 3 = R225.' },
      { doel: 'Afslag, persentasietoename en -afname, en persentasie van \'n deel (graad 7).', aanpak: ['Bereken die persentasie van die bedrag met behulp van 10%.', 'Afslag/afname: trek af. Toename: tel by.', 'Watter persentasie is 18 van 24? Skryf as \'n breuk: 18/24 = 3/4 = 75%.'], voorbeeld: 'R450 met 20% afslag: 10% = R45, 20% = R90, nuwe prys R360.' },
    ],
    fouten: [
      { fout: 'Jy het net die afslag gegee, nie die nuwe prys nie.', hulp: 'Lees die vraag weer: wat moet jy nou betaal? Trek die afslag van die prys af.' },
      { fout: 'Jy het 20% afslag as R20 afslag beskou.', hulp: '20% is \'n deel van die prys, nie rande nie. Begin by 10%: deel deur 10.' },
    ],
    controle: '50% is die helfte: is jou antwoord meer of minder as die helfte? Maak dit sin?',
    vermijd: ['die 1%-reël as eerste stap', 'formules sonder die "uit 100"-betekenis'],
  },

  finansies: {
    kern: 'Geld en verhoudings: hoeveel kos een item en hoeveel kos verskeie items (koers); wins of verlies hang af van die verkoopprys in vergelyking met die kosprys.',
    voorkennis: 'Optel en aftrek met geld (rand en sent), maal en deel.',
    modellen: ['tabel (koerstabel)', 'geld', 'getallelyn'],
    woorden: { koers: 'hoeveel of watter bedrag daar per eenheid is (R9 per pakkie, 60 km per uur)', verhouding: 'hoe twee hoeveelhede met mekaar vergelyk (2 : 3)', wins: 'verkoopprys − kosprys (as jy meer kry as wat jy betaal het)', verlies: 'kosprys − verkoopprys', begroting: 'plan van inkomste en uitgawes', kleingeld: 'wat jy terugkry' },
    niveaus: [
      { doel: 'Kleingeld en totale bedrae (graad 4).', aanpak: ['Tel eers alles wat jy koop bymekaar.', 'Kleingeld: tel op van die prys tot by die bedrag wat jy betaal.'], voorbeeld: 'R50 − R37,50: R37,50 + R2,50 = R40, + R10 = R50; kleingeld R12,50.' },
      { doel: 'Koers: van een na baie (graad 5).', aanpak: ['Deel om eers die prys vir een te bereken.', 'Maal dan met die aantal wat jy wil hê.'], voorbeeld: '3 pakkies kos R27, een kos R9, 5 kos R45.' },
      { doel: 'Wins/verlies en verhouding (graad 6).', aanpak: ['Wins = verkoopprys − kosprys.', 'Verdeel volgens die verhouding 2 : 3: dit is 5 dele altesaam. Deel die bedrag deur 5 en maal met elke deel.'], voorbeeld: 'R250 in die verhouding 2 : 3: een deel = R50, dus R100 en R150.' },
      { doel: 'Afslag, enkelvoudige rente, wisselkoers (graad 7).', aanpak: ['Rente per jaar = persent van die bedrag; maal met die aantal jare.', 'Wisselkoers: $1 = R18, dus $5 = 5 × R18.'], voorbeeld: 'R2 000 teen 5% per jaar vir 3 jaar: R100 per jaar, R300 rente.' },
    ],
    fouten: [
      { fout: 'Jy vermenigvuldig by \'n koers sonder om eers die prys vir een te bereken.', hulp: 'Maak \'n tabel: 3 → R27, 1 → ?, 5 → ?' },
      { fout: 'Jy behandel die verhouding 2 : 3 van R250 as R2 en R3, of bereken 250 ÷ 2.', hulp: 'Tel die dele op: 2 + 3 = 5 dele. Een deel = 250 ÷ 5.' },
    ],
    controle: 'Is die antwoord realisties? Kleingeld + prys moet die bedrag gee wat jy betaal het.',
    vermijd: ['formules sonder \'n tabel of konteks'],
  },

  patrone: {
    kern: '\'n Patroon volg \'n reël. Met \'n vloeidiagram (inset → reël → uitset) of \'n getallesin met \'n □ vind jy die ontbrekende getal.',
    voorkennis: 'Optel en aftrek, maal en deel; weet dat optel en aftrek, en maal en deel, omgekeerde bewerkings is.',
    modellen: ['getalry met die verskil tussen terme', 'inset-uitset vloeidiagram', 'tabel (posisie en term)', 'getallesin met □'],
    woorden: { term: '\'n getal in die patroon', reël: 'wat jy elke keer doen', inset: 'die getal wat ingaan', uitset: 'die getal wat uitkom', getallesin: '\'n wiskundige sin met \'n gelyk-aan-teken, soms met \'n □ vir die onbekende', BODMAS: 'volgorde van bewerkings: hakies, magte, deling en vermenigvuldiging, optelling en aftrekking' },
    niveaus: [
      { doel: 'Getalpatrone voortsit en eenvoudige vloeidiagramme (graad 4).', aanpak: ['Kyk wat elke keer bygetel of afgetrek word (die verskil).', 'Doen dit nog een keer.'], voorbeeld: '3; 7; 11; 15; … verskil 4, dus 19.' },
      { doel: 'Vloeidiagram met twee stappe; getallesin met □ (graad 5).', aanpak: ['Vloeidiagram: doen die reëls in volgorde.', '□ + 37 = 92: gebruik die omgekeerde bewerking: 92 − 37.'], voorbeeld: 'Inset 6 → × 3 → + 2 → uitset 20.' },
      { doel: 'Terugwerk met \'n vloeidiagram; volgorde van bewerkings (graad 6).', aanpak: ['Is die uitset gegee? Werk terug met die omgekeerde bewerkings, van agter na voor.', 'Volgorde: eers hakies, dan × en ÷, dan + en −.'], voorbeeld: '4 + 6 × 3 = 4 + 18 = 22 (nie 30 nie).' },
      { doel: 'Reëls soos 3n + 2 en eenvoudige vergelykings (graad 7).', aanpak: ['Vervang n met die posisie van die term: term 20 = 3 × 20 + 2.', 'Vergelyking 5x − 3 = 32: werk terug: + 3, dan ÷ 5.'], voorbeeld: '5x − 3 = 32 → 5x = 35 → x = 7.' },
    ],
    fouten: [
      { fout: 'Van links na regs bereken (4 + 6 × 3 = 30).', hulp: 'BODMAS: eers maal, dan optel. Sit hakies om die maalsom: 4 + (6 × 3).' },
      { fout: 'Dieselfde bewerking gebruik in plaas van die omgekeerde bewerking wanneer jy terugwerk.', hulp: 'Wanneer jy terugwerk, gebruik jy die omgekeerde bewerking: + word −, × word ÷.' },
    ],
    controle: 'Sit jou antwoord terug in die getallesin of vloeidiagram: kom die regte uitset uit?',
    vermijd: ['algebra-reëls ("oorbring na die ander kant") sonder die terugwerk-idee'],
  },

  meetkunde: {
    kern: 'Vorms herken aan hul eienskappe: sye, hoekpunte, hoeke; 3D-voorwerpe aan vlakke, rande en hoekpunte.',
    voorkennis: 'Name van basiese vorms; \'n regte hoek (die hoek van \'n bladsy).',
    modellen: ['tekening of foto', 'die hoek van \'n bladsy as regte hoek', 'gradeboog', 'modelle van 3D-voorwerpe'],
    woorden: { 'regte hoek': '90°, soos die hoek van \'n bladsy', skerphoek: 'kleiner as 90°', stomphoek: 'tussen 90° en 180°', 'reguit hoek': '180°', reflekshoek: 'tussen 180° en 360°', vlak: '\'n plat kant van \'n 3D-voorwerp', rand: 'waar twee vlakke bymekaarkom', hoekpunt: '\'n punt waar sye of rande bymekaarkom' },
    niveaus: [
      { doel: '2D-vorms en 3D-voorwerpe benoem en tel (graad 4).', aanpak: ['Tel die sye en hoekpunte.', 'Benoem: driehoek (3), vierhoek (4), vyfhoek (5), seshoek (6), agthoek (8).'], voorbeeld: '\'n Seshoek het 6 sye en 6 hoekpunte.' },
      { doel: 'Hoeke vergelyk met \'n regte hoek; simmetrie (graad 5).', aanpak: ['Hou die hoek van ’n bladsy daarteen: kleiner as 90° = skerp, 90° = reg, groter as 90° maar kleiner as 180° = stomp.'], voorbeeld: '\'n Hoek van 120° is stomp.' },
      { doel: 'Hoeke in grade; prismas en piramides (graad 6).', aanpak: ['Ken die grenswaardes: 90°, 180°, 360°.', 'Prisma: twee identiese, parallelle eindvlakke. Piramide: een grondvlak en ’n toppunt.'], voorbeeld: '\'n Driehoekige prisma het 5 vlakke, 9 rande en 6 hoekpunte.' },
      { doel: 'Hoeke bereken: in ’n driehoek 180°, op ’n reguit lyn 180°, om ’n punt 360° (graad 7).', aanpak: ['Tel die bekende hoeke op.', 'Trek die som van die bekende hoeke af van 180° (driehoek of reguit lyn) of 360° (om ’n punt).'], voorbeeld: 'Driehoek met 50° en 70°: derde hoek = 180° − 120° = 60°.' },
    ],
    fouten: [
      { fout: 'Om ’n hoek stomp te noem omdat dit “groot lyk”.', hulp: 'Vergelyk met die hoek van \'n bladsy, nie met die lengte van die sye nie.' },
    ],
    controle: 'Tel die hoeke van \'n driehoek op: kom jy by 180°?',
    vermijd: ['formules sonder \'n tekening'],
  },

  meting: {
    kern: 'Eenhede omskakel: km, m, cm, mm; kg en g; ℓ en mℓ. Groot na klein: maal; klein na groot: deel.',
    voorkennis: '× en ÷ met 10, 100 en 1 000.',
    modellen: ['omskakeltabel', 'liniaal en maatband', 'maatbeker en skaal'],
    woorden: { omskakel: 'dieselfde hoeveelheid in ’n ander eenheid skryf', massa: 'hoe swaar iets is (g, kg)', kapasiteit: 'hoeveel iets kan hou (mℓ, ℓ)' },
    niveaus: [
      { doel: 'Heel eenhede omskakel (graad 4).', aanpak: ['Ken die feite: 1 m = 100 cm, 1 km = 1 000 m, 1 kg = 1 000 g, 1 ℓ = 1 000 mℓ, 1 cm = 10 mm.', 'Groot na klein eenheid: maal.'], voorbeeld: '3 m = 300 cm.' },
      { doel: 'Gemengde eenhede (graad 5).', aanpak: ['Skakel die groot eenheid om.', 'Tel die klein eenheid by.'], voorbeeld: '3 km 250 m = 3 000 m + 250 m = 3 250 m.' },
      { doel: 'Met desimale breuke (graad 6).', aanpak: ['1,25 ℓ = 1 ℓ + 0,25 ℓ = 1 000 mℓ + 250 mℓ.', 'Klein na groot: deel deur 1 000 (3 450 g = 3,45 kg).'], voorbeeld: '2,5 km = 2 500 m.' },
      { doel: 'Woordprobleme met omskakeling (graad 7).', aanpak: ['Maak eers alles dieselfde eenheid.', 'Reken dan uit.', 'Gee die antwoord in die eenheid wat gevra word.'], voorbeeld: '2 ℓ koeldrank in glase van 250 mℓ: 2 000 ÷ 250 = 8 glase.' },
    ],
    fouten: [
      { fout: 'Verkeerde getal gebruik (1 m = 1 000 cm).', hulp: 'Dink aan die liniaal: 1 m is 100 cm.' },
      { fout: 'Verkeerde kant toe (3 km = 0,003 m).', hulp: 'Kleiner eenheid = meer van hulle, dus \'n groter getal.' },
    ],
    controle: 'Kleiner eenheid → groter getal. Maak dit sin?',
    vermijd: ['ezelsbrug-trappe uit Nederland'],
  },

  omtrek: {
    kern: 'Omtrek is die lengte rondom ’n vorm. Oppervlakte is die aantal vierkante eenhede wat binne ’n vorm pas. Volume is hoeveel kubusse in ’n voorwerp pas.',
    voorkennis: 'Optel en maal; lengtes in cm en m.',
    modellen: ['ruitjiespapier (vierkante tel)', 'tekening met mates', 'kubusse stapel'],
    woorden: { omtrek: 'die lengte rondom die vorm', oppervlakte: 'hoeveel vierkante eenhede binne-in pas (cm²)', volume: 'hoeveel kubusse binne-in pas (cm³)' },
    niveaus: [
      { doel: 'Omtrek deur sye op te tel; oppervlakte deur vierkante te tel (graad 4).', aanpak: ['Omtrek: loop rondom en tel al die sye op.', 'Oppervlakte: tel die vierkante.'], voorbeeld: 'Reghoek 6 cm by 4 cm: omtrek 6 + 4 + 6 + 4 = 20 cm.' },
      { doel: 'Oppervlakte van ’n reghoek: lengte × breedte (graad 5).', aanpak: ['Hoeveel vierkante in een ry? (lengte)', 'Hoeveel rye? (breedte)', 'Maal.'], voorbeeld: '8 cm × 6 cm = 48 cm².' },
      { doel: 'Volume van \'n reghoekige prisma (graad 6).', aanpak: ['Tel die kubusse in een laag: lengte × breedte.', 'Maal met die aantal lae (hoogte).'], voorbeeld: '4 × 3 × 2 = 24 cm³.' },
      { doel: 'Oppervlakte van ’n driehoek; bereken terug (graad 7).', aanpak: ['Oppervlakte van ’n driehoek = die helfte van ’n reghoek: ½ × basis × hoogte.', 'Ken jy die omtrek van ’n vierkant? Deel dit deur 4 om die lengte van een sy te kry.'], voorbeeld: 'Basis 10 cm, hoogte 6 cm: ½ × 10 × 6 = 30 cm².' },
    ],
    fouten: [
      { fout: 'Omtrek en oppervlakte verwar.', hulp: 'Omtrek = ’n draad rondom (cm). Oppervlakte = teëls binne-in (cm²).' },
      { fout: 'Vergeet om basis × hoogte vir ’n driehoek te halveer.', hulp: 'Teken die reghoek om die driehoek: die driehoek is net die helfte.' },
    ],
    controle: 'Kyk na die eenheid: omtrek in cm, oppervlakte in cm², volume in cm³.',
    vermijd: ['formules sonder die vierkante/kubusse te sien'],
  },

  tyd: {
    kern: '1 uur = 60 minute, 1 minuut = 60 sekondes, 1 dag = 24 uur. Jy kan ’n tydsduur bereken deur aan te tel tot die volgende heel uur.',
    voorkennis: 'Lees analoog- en digitale horlosies; tel in 5\'e.',
    modellen: ['tydlyn (spronge na die heel uur)', 'analoog klok', 'kalender'],
    woorden: { tydsduur: 'hoe lank iets duur', '24-uur-tyd': '1 nm = 13:00, 8 nm = 20:00', vm: 'voormiddag (voor 12 uur)', nm: 'namiddag (na 12 uur)' },
    niveaus: [
      { doel: 'Ure en minute; bepaal die tyd ná ’n tydsduur (graad 4).', aanpak: ['1 uur = 60 minute.', 'Tel die minute by; 60 minute word \'n uur.'], voorbeeld: '45 minute ná 10:30 is 11:15.' },
      { doel: 'Tydsduur en 24-uur-tyd (graad 5).', aanpak: ['Spring op ’n tydlyn na die volgende heel uur.', 'Tel dan die heel ure en daarna die minute wat oorbly.'], voorbeeld: '08:15 tot 11:40: tot 09:00 is 45 min, tot 11:00 is 2 uur, tot 11:40 is 40 min. Saam: 3 uur 25 min.' },
      { doel: 'Tydsduur oor baie ure; sekondes (graad 6).', aanpak: ['Tydlyn: spring eers na die volgende heel uur, dan ure en dan minute.', 'Tel ure en minute apart op.'], voorbeeld: '07:45 tot 15:20 = 7 uur 35 minute.' },
      { doel: 'Tyd in desimale vorm en woordprobleme (graad 7).', aanpak: ['0,5 uur = 30 min, 0,25 uur = 15 min, 0,1 uur = 6 min.', 'Werk met minute en skakel aan die einde na ure om.'], voorbeeld: '1,5 uur = 90 minute.' },
    ],
    fouten: [
      { fout: 'Tye afgetrek asof dit gewone getalle is (10:10 − 8:50 = 1:60, of 160 minute).', hulp: 'Gebruik die tydlyn: spring eers na die volgende heel uur.' },
      { fout: '1 uur = 100 minute.', hulp: '1 uur = 60 minute. ’n Halfuur = 30 minute; ’n kwartier = 15 minute.' },
    ],
    controle: 'Tel die tydsduur by die begintyd: kom jy by die eindtyd?',
    vermijd: ['tye as desimale getalle aftrek'],
  },

  data: {
    kern: 'Data is versamelde inligting. Jy lees dit uit tabelle en grafieke en beskryf dit met die modus, mediaan en gemiddelde.',
    voorkennis: 'Tel, optel en deel.',
    modellen: ['tallietabel', 'staafgrafiek', 'lys gesorteer van klein na groot'],
    woorden: { modus: 'die waarde wat die meeste voorkom', mediaan: 'die middelste waarde as die data gesorteer is', gemiddelde: 'tel alles op en deel deur hoeveel daar is', omvang: 'grootste − kleinste', waarskynlikheid: 'hoe groot die kans is dat iets gebeur' },
    niveaus: [
      { doel: 'Tabelle en staafgrafieke lees (graad 4).', aanpak: ['Lees die getalle uit die grafiek.', 'Wat word gevra: hoeveel meer, hoeveel saam?'], voorbeeld: 'Sokker 12, netbal 8: 4 meer kinders hou van sokker.' },
      { doel: 'Die modus (graad 5).', aanpak: ['Tel hoeveel keer elke waarde voorkom.', 'Die waarde wat die meeste voorkom, is die modus.'], voorbeeld: '3; 5; 5; 2; 5; 4: modus is 5.' },
      { doel: 'Mediaan en uitkomste (graad 6).', aanpak: ['Sorteer van klein na groot.', 'Die middelste getal is die mediaan.', 'Waarskynlikheid: lys al die moontlike uitkomste.'], voorbeeld: '2; 3; 4; 5; 5 → mediaan 4. \'n Dobbelsteen het 6 uitkomste.' },
      { doel: 'Gemiddelde, omvang en waarskynlikheid as breuk (graad 7).', aanpak: ['Gemiddelde: tel op en deel deur die aantal.', 'Waarskynlikheid = aantal gunstige uitkomste / aantal moontlike uitkomste.'], voorbeeld: 'Kans op \'n ewe getal met \'n dobbelsteen = 3/6 = 1/2.' },
    ],
    fouten: [
      { fout: 'Mediaan sonder om eers te sorteer.', hulp: 'Sorteer altyd eers van klein na groot.' },
      { fout: 'Modus is die grootste getal.', hulp: 'Modus is die getal wat die meeste kere voorkom.' },
    ],
    controle: 'Die gemiddelde lê altyd tussen die kleinste en die grootste waarde.',
    vermijd: ['formules sonder data om na te kyk'],
  },
};

const NIVEAU = ['graad 4', 'graad 5', 'graad 6', 'graad 7'];

export function hintAanpak(cat, level) {
  const d = DIDACTIEK[cat];
  const n = d?.niveaus?.[Math.max(0, Math.min(3, level))];
  return n ? n.aanpak.join(' ') : '';
}

// Volledige kaart vir Max: aanpak op hierdie vlak + die vlak daaronder (as dit nie lukt nie)
export function didactiekText(cat, level = 2) {
  const d = DIDACTIEK[cat];
  if (!d) return '';
  const L = Math.max(0, Math.min(3, level));
  const nu = d.niveaus[L], lager = L > 0 ? d.niveaus[L - 1] : null;
  return `DIDAKTIESE KAART "${cat}" (so leer Suid-Afrikaanse skole dit volgens KABV en die DBO-werkboeke; volg dit, moenie ’n ander metode uitdink nie, gebruik GEEN Nederlandse metodes nie)
Kern: ${d.kern}
Voorkennis: ${d.voorkennis}
Modelle (gebruik hierdie, verkieslik met ’n prentjie): ${d.modellen.join('; ')}
Woorde (soos op skool gebruik; verduidelik hulle so): ${Object.entries(d.woorden).map(([w, u]) => `${w} = ${u}`).join('; ')}
Aanpak op ${NIVEAU[L]}-vlak (${nu.doel}):
${nu.aanpak.map((a, i) => `  ${i + 1}. ${a}`).join('\n')}
  Voorbeeld: ${nu.voorbeeld}
${lager ? `Lukt dit nie? Stap terug na ${NIVEAU[L - 1]}: ${lager.aanpak.join(' ')} (bv. ${lager.voorbeeld})` : ''}
Tipiese foute en wat help: ${d.fouten.map((f) => `${f.fout} → ${f.hulp}`).join(' | ')}
Kontrole agterna: ${d.controle}
Moenie: ${[...d.vermijd, '’n ander aanpak as hierbo uitdink'].join('; ')}
Algemeen: ${ALGEMEEN.stappe} ${ALGEMEEN.notasie}`;
}
