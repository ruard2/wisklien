// Graad 8–12-vraagopwekkers per leerknop.
//
// Elke leerknop het hier ’n eksplisiete bloudruk. Die app kies en skommel die
// antwoordopsies, maar die KI bereken of beoordeel nooit die antwoord nie. Dit maak
// die antwoordkontrole deterministies en hou die metode by die brongekoppelde
// leerpad in leerpad-data.js.
import crypto from 'node:crypto';
import { LEERPAD_DATA } from './leerpad-data.js';
import { maakToepassingsItem } from './hoerskool-toepassings.js';

const Q = (vraag, reg, afleiers, stappe) => ({ vraag, reg, afleiers, stappe });

const BLOUDRUKKE = Object.freeze({
  // Graad 8
  '8-N1': Q('Wat is die KGV van 12 en 18?', '36', ['6', '30', '216'], ['12 = 2² × 3 en 18 = 2 × 3².', 'Neem elke priemfaktor met die hoogste mag: 2² × 3² = 36.', 'Kontroleer dat 36 deur 12 én 18 deelbaar is.']),
  '8-N2': Q('R180 word in die verhouding 2 : 3 verdeel. Hoeveel rand is die kleiner deel?', 'R72', ['R60', 'R90', 'R108'], ['Daar is 2 + 3 = 5 dele.', 'Een deel is R180 ÷ 5 = R36.', 'Die kleiner deel is 2 × R36 = R72.']),
  '8-N3': Q('Bereken: −7 − 5.', '−12', ['−2', '2', '12'], ['Begin by −7 op die getallelyn.', 'Aftrek 5 beteken beweeg 5 plekke links.', 'Jy land by −12.']),
  '8-N4': Q('Bereken en vereenvoudig: 3/4 + 1/6.', '11/12', ['4/10', '5/12', '7/12'], ['Die KGV van 4 en 6 is 12.', '3/4 = 9/12 en 1/6 = 2/12.', '9/12 + 2/12 = 11/12.']),
  '8-N5': Q('Wat is 15% van 240?', '36', ['24', '30', '40'], ['10% van 240 is 24.', '5% is die helfte van 10%, dus 12.', '15% = 24 + 12 = 36.']),
  '8-P1': Q('Die patroon is 5; 9; 13; … Wat is term 20?', '81', ['77', '80', '85'], ['Die konstante verskil is 4.', 'Die reël is Tₙ = 4n + 1.', 'T₂₀ = 4(20) + 1 = 81.']),
  '8-A1': Q('Vereenvoudig: 2³ × 2⁴.', '2⁷', ['2¹²', '4⁷', '2¹'], ['Die grondtalle is dieselfde.', 'Tel die eksponente op: 3 + 4 = 7.', 'Dus 2³ × 2⁴ = 2⁷.']),
  '8-A2': Q('Bereken 3x + 2 wanneer x = −4.', '−10', ['−14', '10', '14'], ['Vervang x met −4 en behou die hakies.', '3(−4) + 2 = −12 + 2.', 'Die waarde is −10.']),
  '8-A3': Q('Vereenvoudig: 4a + 3a − 2.', '7a − 2', ['7a − 5', '12a − 2', '7a'], ['4a en 3a is gelyksoortige terme.', 'Tel die koëffisiënte: 4 + 3 = 7.', 'Die konstante −2 bly: 7a − 2.']),
  '8-A4': Q('Los op: 3x − 5 = 16.', 'x = 7', ['x = 3', 'x = 11/3', 'x = 21'], ['Tel 5 aan albei kante: 3x = 21.', 'Deel albei kante deur 3.', 'x = 7; substitusie gee 16.']),
  '8-F1': Q('Watter verwantskap is ’n funksie?', 'Elke inset het presies een uitset.', ['Elke uitset het presies een inset.', 'Elke inset het twee uitsette.', 'Daar mag geen herhaalde uitsette wees nie.'], ['Kyk na elke inset afsonderlik.', 'Een inset mag nie aan twee verskillende uitsette gekoppel wees nie.', 'Verskillende insette mag wel dieselfde uitset hê.']),
  '8-F2': Q('Wat is die gradiënt van die lyn deur (1; 2) en (4; 8)?', '2', ['1/2', '3', '6'], ['Verandering in y is 8 − 2 = 6.', 'Verandering in x is 4 − 1 = 3.', 'Gradiënt = 6 ÷ 3 = 2.']),
  '8-D1': Q('Wat is die mediaan van 2; 4; 4; 5; 10?', '4', ['2', '5', '25'], ['Die data is reeds gerangskik.', 'Daar is 5 waardes; die middelste is die derde.', 'Die derde waarde is 4.']),
  '8-D2': Q('Wat is die waarskynlikheid om ’n ewe getal met ’n gewone dobbelsteen te gooi?', '1/2', ['1/3', '2/3', '1/6'], ['Die ewe uitkomste is 2; 4; 6: drie gunstige uitkomste.', 'Daar is ses ewe waarskynlike uitkomste.', 'P(ewe) = 3/6 = 1/2.']),
  '8-G1': Q('Een hoek op ’n reguit lyn is 118°. Wat is die aangrensende hoek?', '62°', ['72°', '118°', '242°'], ['Hoeke op ’n reguit lyn is saam 180°.', 'Trek af: 180° − 118°.', 'Die hoek is 62°.']),
  '8-G2': Q('Watter voorwaarde bewys twee driehoeke is kongruent?', 'Al drie ooreenstemmende sye is gelyk (SSS).', ['Hulle het dieselfde oppervlakte.', 'Een hoek is gelyk.', 'Hulle het dieselfde omtrek.'], ['Kongruent beteken dieselfde vorm én grootte.', 'SSS bepaal die driehoek volledig.', 'Ooreenstemmende sye en hoeke val dan saam.']),
  '8-G3': Q('’n Reghoekige driehoek het loodregte sye 6 cm en 8 cm. Hoe lank is die skuinssy?', '10 cm', ['7 cm', '14 cm', '100 cm'], ['Gebruik a² + b² = c².', '6² + 8² = 36 + 64 = 100.', 'c = √100 = 10 cm.']),
  '8-G4': Q('Wat is die beeld van (3; −2) ná refleksie in die y-as?', '(−3; −2)', ['(3; 2)', '(−3; 2)', '(2; −3)'], ['Refleksie in die y-as verander die teken van x.', 'Die y-koördinaat bly dieselfde.', '(3; −2) word (−3; −2).']),
  '8-M1': Q('Wat is die volume van ’n silinder met radius 3 cm en hoogte 5 cm?', '45π cm³', ['15π cm³', '30π cm³', '90π cm³'], ['Volume = oppervlakte van grondvlak × hoogte.', 'πr²h = π(3²)(5).', 'Die volume is 45π cm³.']),

  // Graad 9
  '9-N1': Q('Tussen watter twee opeenvolgende heelgetalle lê √50?', '7 en 8', ['6 en 7', '8 en 9', '24 en 26'], ['7² = 49 en 8² = 64.', '50 lê tussen 49 en 64.', 'Dus lê √50 tussen 7 en 8.']),
  '9-N2': Q('Bereken die enkelvoudige rente op R1 200 teen 10% per jaar vir 2 jaar.', 'R240', ['R120', 'R242', 'R1 440'], ['Rente per jaar = 10% van R1 200 = R120.', 'Vir 2 jaar: 2 × R120.', 'Die rente is R240.']),
  '9-N3': Q('Bereken: −4 × 6 + 10.', '−14', ['−34', '14', '34'], ['Doen vermenigvuldiging eerste: −4 × 6 = −24.', 'Tel dan 10 by.', '−24 + 10 = −14.']),
  '9-A1': Q('Skryf met ’n positiewe eksponent: 2⁻³.', '1/8', ['−8', '1/6', '8'], ['’n Negatiewe eksponent beteken die omgekeerde.', '2⁻³ = 1/2³.', '2³ = 8, dus 1/8.']),
  '9-P1': Q('Vir Tₙ = 3n − 2, wat is T₁₂?', '34', ['32', '36', '38'], ['Vervang n met 12.', '3(12) − 2 = 36 − 2.', 'T₁₂ = 34.']),
  '9-A2': Q('Wat is die graad van 5x³ − 2x + 7?', '3', ['1', '5', '7'], ['Die graad is die hoogste eksponent van die veranderlike.', 'Die eksponente is 3, 1 en 0.', 'Die hoogste is 3.']),
  '9-A3': Q('Brei uit: (x + 4)(x − 2).', 'x² + 2x − 8', ['x² + 2x + 8', 'x² − 6x − 8', 'x² − 8'], ['Vermenigvuldig elke term in die eerste binoom met elke term in die tweede.', 'x² − 2x + 4x − 8.', 'Kombineer middelterme: x² + 2x − 8.']),
  '9-A4': Q('Faktoriseer volledig: x² − 9.', '(x − 3)(x + 3)', ['(x − 9)(x + 1)', '(x − 3)²', 'x(x − 9)'], ['Dit is ’n verskil van twee kwadrate: x² − 3².', 'Gebruik a² − b² = (a − b)(a + b).', 'Dus (x − 3)(x + 3).']),
  '9-A5': Q('Vereenvoudig 6x²/(3x), met x ≠ 0.', '2x', ['2x²', '3x', '2'], ['Faktoriseer teller en noemer.', '6/3 = 2 en x²/x = x.', 'Die antwoord is 2x; x ≠ 0 bly ’n beperking.']),
  '9-A6': Q('Los op: 2(x − 3) = 10.', 'x = 8', ['x = 2', 'x = 5', 'x = 13'], ['Deel albei kante deur 2: x − 3 = 5.', 'Tel 3 aan albei kante.', 'x = 8.']),
  '9-F1': Q('Wat is die y-afsnit van y = −2x + 5?', '5', ['−2', '2', '−5'], ['Die vorm is y = mx + c.', 'Die y-afsnit is c.', 'Hier is c = 5.']),
  '9-G1': Q('Twee reguit lyne sny. Watter hoeke is altyd gelyk?', 'Regoorstaande hoeke', ['Aangrensende hoeke', 'Ko-binnehoeke', 'Alle vier hoeke'], ['Reguit lyne vorm pare regoorstaande hoeke.', 'Elke regoorstaande paar is gelyk.', 'Aangrensende hoeke is saam 180°, maar nie noodwendig gelyk nie.']),
  '9-G2': Q('Watter gegewens is genoeg om ’n unieke driehoek te konstrueer?', 'Drie sylengtes wat die driehoeksongelykheid bevredig', ['Net een sylengte', 'Net een hoek', 'Twee hoeke sonder ’n sy'], ['Drie geldige sye bepaal ’n driehoek volgens SSS.', 'Die langste sy moet korter wees as die som van die ander twee.', 'Dan is die konstruksie uniek, afgesien van refleksie.']),
  '9-G3': Q('Driehoeke met sye 3; 4; 5 en 6; 8; 10 is …', 'gelykvormig met skaalfaktor 2', ['kongruent', 'nie verwant nie', 'gelykvormig met skaalfaktor 3'], ['Vergelyk ooreenstemmende sye.', '6/3 = 8/4 = 10/5 = 2.', 'Al die sye is in dieselfde verhouding.']),
  '9-M1': Q('’n Figuur word met skaalfaktor 3 vergroot. Met watter faktor verander sy oppervlakte?', '9', ['3', '6', '27'], ['Lengtes verander met faktor 3.', 'Oppervlakte het twee dimensies.', 'Die faktor is 3² = 9.']),
  '9-D1': Q('Datastel A is 5; 5; 5; 5; 5. Datastel B is 1; 3; 5; 7; 9. Watter stelling is waar?', 'Hulle het dieselfde gemiddelde, maar B het groter verspreiding.', ['A het ’n groter gemiddelde.', 'B het ’n kleiner gemiddelde.', 'Hulle het dieselfde verspreiding.'], ['Albei totale is 25 en albei het 5 waardes: gemiddelde 5.', 'A se omvang is 0.', 'B se omvang is 8, dus is B meer verspreid.']),
  '9-D2': Q('’n Munt en dobbelsteen word onafhanklik gebruik. Wat is P(kop en ’n 6)?', '1/12', ['1/8', '1/6', '1/2'], ['P(kop) = 1/2 en P(6) = 1/6.', 'Onafhanklik: vermenigvuldig die waarskynlikhede.', '1/2 × 1/6 = 1/12.']),
  '9-G4': Q('Hoeveel vlakke het ’n driehoekige prisma?', '5', ['4', '6', '9'], ['Daar is twee driehoekige eindvlakke.', 'Daar is drie reghoekige syvlakke.', 'Totaal: 2 + 3 = 5 vlakke.']),
  '9-M2': Q('Wat is die volume van ’n reghoekige prisma van 4 cm × 3 cm × 2 cm?', '24 cm³', ['9 cm³', '18 cm³', '52 cm³'], ['Volume = lengte × breedte × hoogte.', '4 × 3 × 2 = 24.', 'Gebruik kubieke eenhede: 24 cm³.']),
  '9-G5': Q('Wat is die beeld van (2; 1) ná ’n rotasie van 90° antikloksgewys om die oorsprong?', '(−1; 2)', ['(1; −2)', '(−2; −1)', '(1; 2)'], ['Vir 90° antikloksgewys: (x; y) → (−y; x).', 'Vervang x = 2 en y = 1.', 'Die beeld is (−1; 2).']),

  // Graad 10
  '10-A1': Q('Vereenvoudig √72.', '6√2', ['3√8', '8√2', '36√2'], ['72 = 36 × 2.', '√72 = √36 × √2.', 'Dus √72 = 6√2.']),
  '10-A2': Q('Faktoriseer: x² − 5x + 6.', '(x − 2)(x − 3)', ['(x + 2)(x + 3)', '(x − 1)(x − 6)', '(x + 2)(x − 3)'], ['Soek twee getalle met produk 6 en som −5.', 'Die getalle is −2 en −3.', 'Dus (x − 2)(x − 3).']),
  '10-A3': Q('Vereenvoudig 1/x + 1/(2x), met x ≠ 0.', '3/(2x)', ['2/(3x)', '2/x', '1/(3x)'], ['Die gemene noemer is 2x.', '1/x = 2/(2x).', '2/(2x) + 1/(2x) = 3/(2x).']),
  '10-A4': Q('Los op: 3ˣ⁺¹ = 27.', 'x = 2', ['x = 1', 'x = 3', 'x = 9'], ['Skryf 27 as 3³.', 'Met dieselfde grondtal: x + 1 = 3.', 'x = 2.']),
  '10-E1': Q('Los op: x² − 5x + 6 = 0.', 'x = 2 of x = 3', ['x = −2 of x = −3', 'x = 1 of x = 6', 'x = 5 of x = 6'], ['Faktoriseer: (x − 2)(x − 3) = 0.', 'Stel elke faktor gelyk aan 0.', 'x = 2 of x = 3.']),
  '10-E2': Q('Los op: 3x − 2 < 10.', 'x < 4', ['x > 4', 'x < 8/3', 'x > 8/3'], ['Tel 2 aan albei kante: 3x < 12.', 'Deel deur die positiewe getal 3; die teken bly dieselfde.', 'x < 4.']),
  '10-T1': Q('In ’n reghoekige driehoek is sin θ gelyk aan …', 'teenoorstaande sy / skuinssy', ['aangrensende sy / skuinssy', 'teenoorstaande sy / aangrensende sy', 'skuinssy / teenoorstaande sy'], ['Identifiseer die sye relatief tot θ.', 'SOH: sinus = Opposite/Hypotenuse.', 'Dus teenoorstaande sy ÷ skuinssy.']),
  '10-T2': Q('Wat is sin 150°?', '1/2', ['−1/2', '√3/2', '−√3/2'], ['150° = 180° − 30°.', 'Sinus is positief in kwadrant II.', 'sin 150° = sin 30° = 1/2.']),
  '10-G1': Q('Watter eienskap geld altyd vir ’n parallelogram?', 'Albei pare teenoorstaande sye is parallel.', ['Al vier sye is gelyk.', 'Al vier hoeke is 90°.', 'Die hoeklyne is altyd ewe lank.'], ['Gebruik die definisie van ’n parallelogram.', 'Elke paar teenoorstaande sye is parallel.', 'Die ander eienskappe geld net vir spesiale parallelogramme.']),
  '10-AG1': Q('Bereken die afstand tussen (1; 2) en (4; 6).', '5', ['3', '4', '7'], ['Δx = 3 en Δy = 4.', 'Afstand = √(3² + 4²).', '√25 = 5.']),
  '10-F1': Q('Wat is die draaipunt van y = (x − 2)²?', '(2; 0)', ['(−2; 0)', '(0; 2)', '(0; −2)'], ['Vergelyk met y = (x − p)² + q.', 'Hier is p = 2 en q = 0.', 'Die draaipunt is (2; 0).']),
  '10-F2': Q('Wat is die amplitude van y = 3 sin x?', '3', ['1', '−3', '360°'], ['Vir y = a sin x is die amplitude |a|.', 'Hier is a = 3.', 'Die amplitude is 3.']),
  '10-T3': Q('Van ’n punt 20 m van ’n toring af is die hoogtehoek θ. Watter verhouding gee die toringhoogte h?', 'tan θ = h/20', ['sin θ = h/20', 'cos θ = h/20', 'tan θ = 20/h'], ['Die hoogte h is teenoor θ.', 'Die 20 m is aangrensend aan θ.', 'tan θ = teenoorstaande/aangrensende = h/20.']),
  '10-S1': Q('Wat is die mediaan van 1; 2; 4; 8; 20?', '4', ['2', '7', '20'], ['Daar is vyf gerangskikte waardes.', 'Die middelste posisie is die derde.', 'Die mediaan is 4.']),
  '10-PB1': Q('P(A)=0,6; P(B)=0,5 en P(A∩B)=0,3. Wat is P(A∪B)?', '0,8', ['0,2', '0,3', '1,1'], ['Gebruik P(A∪B)=P(A)+P(B)−P(A∩B).', '0,6 + 0,5 − 0,3.', 'Die antwoord is 0,8.']),
  '10-FM1': Q('R1 000 groei vir 2 jaar teen 10% saamgestelde rente per jaar. Wat is die eindbedrag?', 'R1 210', ['R1 020', 'R1 200', 'R1 220'], ['Gebruik A = P(1 + i)ⁿ.', 'A = 1 000(1,10)².', 'A = R1 210.']),
  '10-M1': Q('Wat is die volume van ’n sfeer met radius 3 cm?', '36π cm³', ['12π cm³', '27π cm³', '108π cm³'], ['V = 4/3 πr³.', 'V = 4/3 π(3³) = 4/3 π(27).', 'V = 36π cm³.']),
  '10-NP1': Q('Die lineêre patroon is 7; 11; 15; … Watter formule gee Tₙ?', 'Tₙ = 4n + 3', ['Tₙ = 4n + 7', 'Tₙ = 7n + 4', 'Tₙ = 3n + 4'], ['Die konstante verskil is 4, dus Tₙ = 4n + c.', 'Gebruik n=1: 7 = 4 + c.', 'c=3, dus Tₙ = 4n + 3.']),

  // Graad 11
  '11-A1': Q('Vereenvoudig: 27^(2/3).', '9', ['3', '6', '18'], ['27^(1/3) = 3.', 'Kwadreer die resultaat: 3².', 'Die antwoord is 9.']),
  '11-E1': Q('Los op: x² − 6x + 5 = 0.', 'x = 1 of x = 5', ['x = −1 of x = −5', 'x = 2 of x = 3', 'x = 5 of x = 6'], ['Faktoriseer: (x − 1)(x − 5)=0.', 'Gebruik die nulproduk-eienskap.', 'x=1 of x=5.']),
  '11-E2': Q('Los op: x² − 9 > 0.', 'x < −3 of x > 3', ['−3 < x < 3', 'x > −3', 'x < 3'], ['Die kritieke waardes is −3 en 3.', 'Toets die intervalle of gebruik die parabool.', 'Die uitdrukking is positief buite die wortels.']),
  '11-E3': Q('Los gelyktydig op: x + y = 7 en x − y = 1.', 'x = 4; y = 3', ['x = 3; y = 4', 'x = 6; y = 1', 'x = 7; y = 1'], ['Tel die vergelykings: 2x = 8.', 'x = 4.', 'Substitueer: 4 + y = 7, dus y = 3.']),
  '11-E4': Q('Wat is die aard van die wortels van x² + 4x + 5 = 0?', 'Geen reële wortels nie', ['Twee gelyke reële wortels', 'Twee verskillende rasionele wortels', 'Een wortel is 0'], ['Bereken Δ = b² − 4ac.', 'Δ = 16 − 20 = −4.', 'Δ < 0, dus is daar geen reële wortels nie.']),
  '11-T1': Q('Vereenvoudig (1 − sin²x)/cos x, waar cos x ≠ 0.', 'cos x', ['sin x', 'tan x', '1'], ['Gebruik 1 − sin²x = cos²x.', 'cos²x/cos x.', 'Die antwoord is cos x.']),
  '11-T2': Q('Los sin x = 0 op vir 0° ≤ x ≤ 360°.', 'x = 0°; 180°; 360°', ['x = 90°; 270°', 'x = 0°; 360°', 'x = 180°'], ['Sinus is die y-koördinaat op die eenheidsirkel.', 'Dit is 0 op die x-as.', 'In die interval: 0°, 180° en 360°.']),
  '11-G1': Q('Die hoek tussen ’n raaklyn en ’n koord is gelyk aan …', 'die hoek in die teenoorstaande segment', ['die hoek by die middelpunt', '90° in alle gevalle', 'die supplement van die koordhoek'], ['Identifiseer die raaklyn en koord by die raakpunt.', 'Gebruik die raaklyn-koordstelling.', 'Die gelyke hoek lê in die teenoorstaande segment.']),
  '11-AG1': Q('’n Lyn het gradiënt 2. Wat is die gradiënt van ’n loodregte lyn?', '−1/2', ['1/2', '−2', '2'], ['Vir loodregte nie-vertikale lyne is m₁m₂ = −1.', '2m₂ = −1.', 'm₂ = −1/2.']),
  '11-F1': Q('Wat is die asimptote van y = 2/(x − 1) + 3?', 'x = 1 en y = 3', ['x = −1 en y = −3', 'x = 2 en y = 3', 'x = 1 en y = 2'], ['Die noemer is 0 by x=1: vertikale asimptoot.', 'Die grafiek is 3 eenhede op geskuif.', 'Die horisontale asimptoot is y=3.']),
  '11-F2': Q('Wat is die middellyn van y = sin x + 2?', 'y = 2', ['x = 2', 'y = 1', 'y = −2'], ['Die +2 skuif die sinusgrafiek vertikaal op.', 'Die gewone middellyn y=0 skuif na y=2.', 'Dus is die middellyn y=2.']),
  '11-T3': Q('Watter reël is geskik wanneer twee sye en die ingeslote hoek van ’n driehoek bekend is?', 'Cosinusreël', ['Sinusreël', 'Pythagoras slegs', 'Dubbelhoekreël'], ['Twee sye en die ingeslote hoek is SAS.', 'Die cosinusreël verbind drie sye met ’n hoek.', 'Gebruik a²=b²+c²−2bc cos A.']),
  '11-S1': Q('Wat is die bevolkingsvariansie van 2; 4; 6; 8?', '5', ['4', '√5', '20'], ['Die gemiddelde is 5.', 'Kwadratiese afwykings: 9; 1; 1; 9, totaal 20.', 'Bevolkingsvariansie = 20 ÷ 4 = 5.']),
  '11-PB1': Q('’n Sak het 3 rooi en 2 blou balle. Twee balle word sonder terugplasing getrek. Wat is P(albei rooi)?', '3/10', ['6/25', '9/25', '1/2'], ['Eerste rooi: 3/5.', 'Dan bly 2 rooi uit 4 balle: 2/4.', '3/5 × 2/4 = 3/10.']),
  '11-FM1': Q('’n Motor van R10 000 verloor jaarliks 20% op die verminderde saldo. Wat is die waarde ná 2 jaar?', 'R6 400', ['R6 000', 'R8 000', 'R9 600'], ['Behoudfaktor = 1 − 0,20 = 0,80.', 'Waarde = 10 000(0,80)².', 'Die waarde is R6 400.']),
  '11-NP1': Q('Die kwadratiese patroon is 2; 6; 12; 20; … Wat is die volgende term?', '30', ['28', '32', '42'], ['Eerste verskille: 4; 6; 8.', 'Tweede verskil is konstant 2; volgende eerste verskil is 10.', '20 + 10 = 30.']),
  '11-M1': Q('Wat is die volume van ’n keël met radius 3 cm en hoogte 12 cm?', '36π cm³', ['12π cm³', '108π cm³', '324π cm³'], ['V = 1/3 πr²h.', 'V = 1/3 π(9)(12).', 'V = 36π cm³.']),

  // Graad 12
  '12-SEQ1': Q('’n Rekenkundige ry het eerste term 5 en konstante verskil 3. Wat is S₁₀?', '185', ['95', '180', '320'], ['Sₙ = n/2[2a + (n−1)d].', 'S₁₀ = 10/2[10 + 27].', 'S₁₀ = 5(37) = 185.']),
  '12-SEQ2': Q('Bereken die som van die eerste 6 terme van 3; 6; 12; …', '189', ['96', '126', '192'], ['Dit is meetkundig met a=3 en r=2.', 'Sₙ = a(rⁿ−1)/(r−1).', 'S₆ = 3(64−1)=189.']),
  '12-F1': Q('As f(x)=2x−5, wat is f⁻¹(x)?', '(x + 5)/2', ['(x − 5)/2', '2x + 5', '1/(2x − 5)'], ['Skryf y=2x−5 en ruil x en y.', 'x=2y−5.', 'Los vir y op: y=(x+5)/2.']),
  '12-F2': Q('Los op: log₂32 = x.', 'x = 5', ['x = 4', 'x = 16', 'x = 30'], ['Skryf in eksponensiële vorm: 2ˣ=32.', '32=2⁵.', 'Dus x=5.']),
  '12-T1': Q('Watter identiteit is gelyk aan cos 2x?', 'cos²x − sin²x', ['2cos x', 'cos²x + sin²x', '2sin x cos x'], ['Gebruik die saamgesteldehoekformule vir cos(x+x).', 'cos(x+x)=cos²x−sin²x.', 'Dit is een vorm van cos 2x.']),
  '12-T2': Q('’n Reghoekige blok het afmetings 3 m, 4 m en 12 m. Wat is die ruimtelike hoeklyn?', '13 m', ['12 m', '15 m', '19 m'], ['Grondvlakhoeklyn: √(3²+4²)=5.', 'Gebruik Pythagoras met 5 en 12.', '√(5²+12²)=13 m.']),
  '12-G1': Q('’n Lyn parallel aan een sy van ’n driehoek sny die ander twee sye. Wat volg?', 'Die onderskeie sysegmente is eweredig.', ['Die twee kleiner driehoeke is kongruent.', 'Alle hoeke is 90°.', 'Die parallelle lyn halveer altyd die derde sy.'], ['Parallelle lyne gee gelyke ooreenstemmende hoeke.', 'Die gevormde driehoeke is gelykvormig.', 'Daarom is ooreenstemmende sye eweredig.']),
  '12-AG1': Q('Wat is die vergelyking van ’n sirkel met middelpunt (2; −1) en radius 3?', '(x − 2)² + (y + 1)² = 9', ['(x + 2)² + (y − 1)² = 9', '(x − 2)² + (y + 1)² = 3', 'x² + y² = 9'], ['Gebruik (x−a)²+(y−b)²=r².', 'a=2, b=−1 en r=3.', '(x−2)²+(y+1)²=9.']),
  '12-C1': Q('Hoe gedra f(x)=x³−2x vir baie groot positiewe en negatiewe x?', 'f(x)→∞ as x→∞ en f(x)→−∞ as x→−∞', ['f(x)→∞ aan albei kante', 'f(x)→−∞ aan albei kante', 'f(x)→0 aan albei kante'], ['Die hoogste term x³ bepaal die eindgedrag.', 'Dit het onewe graad en positiewe leidende koëffisiënt.', 'Links daal die grafiek; regs styg dit.']),
  '12-C2': Q('Wat is die gemiddelde veranderingstempo van f(x)=x² vanaf x=1 tot x=3?', '4', ['2', '3', '8'], ['Gebruik [f(3)−f(1)]/(3−1).', '(9−1)/2.', 'Die gemiddelde tempo is 4.']),
  '12-C3': Q('As f(x)=3x²−4x+1, wat is f′(x)?', '6x − 4', ['3x − 4', '6x + 1', '6x'], ['Gebruik die magreël term vir term.', 'd/dx(3x²)=6x en d/dx(−4x)=−4.', 'Die konstante se afgeleide is 0.']),
  '12-C4': Q('Waar is die buigpunt van f(x)=x³−3x se x-koördinaat?', 'x = 0', ['x = −1', 'x = 1', 'x = 3'], ['f′(x)=3x²−3.', 'f″(x)=6x.', 'Stel f″(x)=0: x=0; die konkaafheid verander daar.']),
  '12-C5': Q('’n Reghoek het omtrek 20 m. Watter afmetings gee die maksimum oppervlakte?', '5 m × 5 m', ['1 m × 9 m', '2 m × 8 m', '4 m × 6 m'], ['Laat die sye x en 10−x wees.', 'A(x)=x(10−x)=10x−x².', 'Die parabool se maksimum is by x=5.']),
  '12-FM1': Q('Watter formule gee die huidige waarde P van ’n lening met paaiement x, rentekoers i en n betalings agterna?', 'P = x[1 − (1 + i)⁻ⁿ]/i', ['P = x(1 + i)ⁿ', 'P = x[(1 + i)ⁿ − 1]/i', 'P = x/i'], ['’n Lening se huidige waarde is die som van toekomstige verdiskonteerde paaiemente.', 'Dit vorm ’n eindige meetkundige reeks.', 'Vir betalings agterna: P=x[1−(1+i)⁻ⁿ]/i.']),
  '12-S1': Q('’n Korrelasiekoëffisiënt is r = −0,92. Hoe beskryf jy die verband?', 'Sterk negatiewe lineêre verband', ['Swak negatiewe verband', 'Sterk positiewe verband', 'Geen lineêre verband'], ['Die teken bepaal die rigting: negatief.', '|r|=0,92 is naby 1.', 'Die lineêre verband is dus sterk negatief.']),
  '12-PB1': Q('Hoeveel verskillende rangskikkings het die letters van BOOK?', '12', ['4', '16', '24'], ['Daar is 4 letters, maar O herhaal twee keer.', 'Gebruik 4!/2!.', '24/2 = 12.']),
});

const nodes = Object.values(LEERPAD_DATA.grades).flatMap((g) => g.nodes);
const nodeById = new Map(nodes.map((n) => [n.id, n]));

const shuffle = (items) => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

export const HOERSKOOL_GENERATOR_IDS = Object.freeze(Object.keys(BLOUDRUKKE));
export const hetHoerskoolGenerator = (nodeId) => !!BLOUDRUKKE[String(nodeId)];

export const HOERSKOOL_VARIANTE = Object.freeze(['toepassing', 'metode', 'bewys']);

export function generateHoerskoolVraag(nodeId, { variant = null, avoidTexts = [] } = {}) {
  const id = String(nodeId), node = nodeById.get(id), b = BLOUDRUKKE[id];
  if (!node || !b) return null;
  const soort = HOERSKOOL_VARIANTE.includes(variant) ? variant : HOERSKOOL_VARIANTE[Math.floor(Math.random() * HOERSKOOL_VARIANTE.length)];
  const metodeReg = b.stappe.map((s, i) => `${i + 1}. ${s}`).join(' ');
  const metodeAfleiers = [
    [...b.stappe].reverse().map((s, i) => `${i + 1}. ${s}`).join(' '),
    [b.stappe[1], b.stappe[0], b.stappe[2]].filter(Boolean).map((s, i) => `${i + 1}. ${s}`).join(' '),
    `1. ${b.stappe[0]} 2. Gee die finale antwoord sonder ’n kontrole of rede.`,
  ];
  const bewysReg = node.masteryEvidence.af;
  const bewysAfleiers = [
    'Die leerder memoriseer net die finale antwoord van een voorbeeld.',
    'Die leerder kopieer die formule sonder om die veranderlikes, beperkings of eenhede te verduidelik.',
    'Die leerder kry een item reg, maar kan nie die metode kies of die antwoord kontroleer nie.',
  ];
  let toepassing = maakToepassingsItem(id) || b;
  if (soort === 'toepassing' && avoidTexts.length) {
    const vermy = new Set(avoidTexts.map(String));
    for (let poging = 0; poging < 24 && vermy.has(toepassing.vraag); poging++) toepassing = maakToepassingsItem(id) || b;
  }
  const item = soort === 'metode'
    ? {
      vraag: `Watter volgorde volg die KABV-metode vir “${node.concept.af}” in hierdie item?`,
      reg: metodeReg,
      afleiers: metodeAfleiers,
      stappe: [...b.stappe],
    }
    : soort === 'bewys'
      ? {
        vraag: `Watter prestasie wys die beste dat “${node.concept.af}” bemeester word?`,
        reg: bewysReg,
        afleiers: bewysAfleiers,
        stappe: [
          `Stel die begrip korrek voor: ${node.concept.af}.`,
          `Verduidelik en voer die metode uit sonder om ’n stap oor te slaan.`,
          `Kontroleer die antwoord en pas die begrip in ’n nuwe situasie toe.`,
        ],
      }
      : toepassing;
  const options = shuffle([item.reg, ...item.afleiers]);
  const answer = options.indexOf(item.reg);
  return {
    id: `hs-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`,
    nodeId: id,
    generatorId: `za-hs:${id}:v2`,
    variant: soort,
    family: item.familie || soort,
    grade: node.grade,
    term: node.term,
    cat: `hoerskool:${node.strand}`,
    tpl: `hoerskool.${id}`,
    text: item.vraag,
    type: 'choice',
    options,
    answer,
    display: item.reg,
    steps: [...item.stappe],
    guide: [],
    guideFinal: null,
    wrong: options.map((option, index) => index === answer ? null : ({ answer: index, label: `Die keuse “${option}” toon nog nie die hele metode vir ${node.concept.af} nie.`, fix: item.stappe[0] })).filter(Boolean),
    methodProtocolId: node.methodProtocolId,
    concept: structuredClone(node.concept),
    prerequisite: structuredClone(node.prerequisite),
    sourceRefs: [...node.sourceRefs],
  };
}

const norm = (x) => String(x ?? '').trim().toLocaleLowerCase('af-ZA').replace(/\s+/g, ' ').replace(/−/g, '-');

export function checkHoerskoolAntwoord(question, input) {
  if (!question || !hetHoerskoolGenerator(question.nodeId)) return { correct: false, invalid: true };
  const raw = String(input ?? '').trim();
  if (!raw) return { correct: false, empty: true };
  let chosen = /^\d+$/.test(raw) ? Number(raw) : question.options.findIndex((o) => norm(o) === norm(raw));
  const correct = chosen === question.answer;
  const diagnosed = correct ? null : question.wrong?.find((w) => w.answer === chosen) || null;
  return {
    correct,
    chosen: chosen >= 0 ? chosen : null,
    display: question.display,
    misconception: diagnosed ? { label: diagnosed.label, fix: diagnosed.fix } : null,
    explanation: correct ? null : question.steps,
  };
}

export function publicHoerskoolVraag(question) {
  if (!question) return null;
  const { answer, display, steps, wrong, ...safe } = question;
  return safe;
}

export function hoerskoolGeneratorOorsig() {
  return nodes.map((node) => ({ nodeId: node.id, grade: node.grade, concept: structuredClone(node.concept), enabled: hetHoerskoolGenerator(node.id), generatorId: `za-hs:${node.id}:v2`, parameterised: true }));
}

