// Uitlegkaarten per sjabloon — Afrikaans (Suid-Afrikaanse laerskool, KABV/CAPS, DBE-werkboeke).
// Die metodes en woorde soos in Suid-Afrikaanse skole (sien ook src/za/didactiek.js). Die aanpak volg die stappe
// wat die app wys. Velde: naam · aanpak · model · woorden · valkuilen · concreter · niet (sien src/uitleg/nl.js).

const K = (naam, aanpak, extra = {}) => ({ naam, aanpak, ...extra });
const GELD = 'Maak dit konkreet met geld: R1-munte, R10- en R100-note.';
const LYN = 'die getallelyn: spring eers die groot sprong, dan die klein sprongetjies';
const KOLOM = 'kolomme (ene onder ene, tiene onder tiene), begin by die ene';
const KLOK = '’n horlosie met wysers: die lang wyser tel in spronge van 5 minute';
const VTABEL = '’n verhoudingstabel (twee rye: wat jy bo doen, doen jy onder ook)';
const STROOK = '’n breukstrook (’n strook in ewe groot dele)';

export const KAARTEN = {
  // ================= OPTEL EN AFTREK =================
  'optel.0a': K('Optel deur albei getalle op te breek', ['Breek albei getalle op in honderde, tiene en ene.', 'Tel die honderde bymekaar, dan die tiene, dan die ene.', 'Tel die drie antwoorde bymekaar.'], { model: 'plekwaardekaartjies of base-tien-blokke', woorden: 'opbreek, honderde, tiene, ene, bymekaartel', valkuilen: ['Tiene en ene deurmekaar → sê die waarde hardop: "tagtig plus sewentig".'], concreter: GELD }),
  'optel.0b': K('Aftrek met opbreek en terugspring', ['Breek die getal wat afgetrek word op.', 'Spring terug op die getallelyn: eers die honderde, dan die tiene, dan die ene.', 'Kontroleer met optel.'], { model: LYN + ' (terug)', valkuilen: ['Kleinste syfer van die grootste afgetrek in elke kolom → spring terug op die getallelyn.'], concreter: GELD }),
  'optel.0c': K('Woordsom: altesaam (opbreek)', ['Wat word gevra? Altesaam → optel.', 'Breek albei getalle op en tel honderde, tiene en ene apart.', 'Tel alles bymekaar.'], { model: 'plekwaardekaartjies', valkuilen: ['Afgetrek → "Altesaam beteken bymekaar."'], concreter: 'Met kaartjies van R100 en R10.' }),
  'optel.1a': K('Kolomoptelling met oordra', ['Skryf die getalle onder mekaar: ene onder ene.', 'Begin by die ene; is die antwoord 10 of meer, skryf die ene en dra 1 oor.', 'Gaan so voort na links.'], { model: KOLOM, woorden: 'oordra, kolomme', valkuilen: ['Oordra vergeet → skryf die 1 klein bo die volgende kolom.'], concreter: 'Base-tien-blokke: 10 ene word 1 tien.' }),
  'optel.1b': K('Kompensering', ['Die getal is amper ’n rond getal.', 'Trek die ronde getal af.', 'Jy het te veel afgetrek: tel die verskil weer by.'], { model: LYN, woorden: 'kompensering', valkuilen: ['Die verskil ook afgetrek → "Het jy te veel of te min afgetrek?"'], concreter: 'Met geld: jy betaal die ronde bedrag in plaas van die regte een.' }),
  'optel.1c': K('Voltooi tot die volgende 1 000', ['Spring eers na die volgende honderd.', 'Dan na die volgende duisend.', 'Tel die spronge bymekaar.'], { model: LYN, valkuilen: ['Na die verkeerde duisend gespring.'], concreter: 'Eers ’n kleiner voorbeeld, dan terug na die som.' }),
  'optel.2a': K('Woordsom: kolomoptelling (groot getalle)', ['Wat word gevra? Altesaam.', 'Kolomoptelling: ene onder ene, begin by die ene, dra oor.'], { model: KOLOM, valkuilen: ['Kolomme verskuif → skryf in ’n plekwaardetabel.'], concreter: 'Begin met kleiner getalle.' }),
  'optel.2b': K('Kolomaftrekking met omruil', ['Skryf onder mekaar; begin by die ene.', 'Die onderste syfer word altyd afgetrek.', 'Gaan dit nie? Ruil 1 van die kolom links om vir 10.'], { model: KOLOM + '; base-tien-blokke', woorden: 'omruil (nie "leen" nie)', valkuilen: ['Kleinste syfer van die grootste afgetrek → "Die onderste syfer word altyd afgetrek."', 'Vergeet dat die kolom links nou 1 minder het.'], concreter: 'Base-tien-blokke: ruil ’n tien om vir 10 ene.' }),
  'optel.2c': K('Kolomoptelling (groot getalle)', ['Ene onder ene; begin by die ene.', 'Dra oor as dit 10 of meer is.'], { model: KOLOM, valkuilen: ['Oordra vergeet.'], concreter: 'Plekwaardetabel.' }),
  'optel.3a': K('Woordsom: getallesin met twee bewerkings', ['Skryf ’n getallesin.', 'Werk van links na regs.'], { woorden: 'getallesin', valkuilen: ['Alles opgetel → "Verkoop hy of koop hy?"'], concreter: 'Klein getalle: 10 skape, verkoop 3, koop 2.' }),
  'optel.3b': K('Woordsom: uitgawes en wat oorbly', ['Wat word gevra? Hoeveel bly oor.', 'Tel eers die uitgawes bymekaar.', 'Trek dit van die totaal af.'], { valkuilen: ['Net een uitgawe afgetrek.'], concreter: 'Met R100 en twee aankope.' }),
  'optel.3c': K('Kolomaftrekking met groot getalle', ['Onder mekaar; begin by die ene.', 'Onderste syfer word afgetrek; ruil om as dit nie gaan nie.'], { model: KOLOM, valkuilen: ['Omruil oor ’n 0 heen.'], concreter: 'Base-tien-blokke.' }),

  // ================= VERMENIGVULDIG =================
  'vermenigvuldig.0a': K('Maaltafel via ’n tafel wat jy ken', ['Gebruik ’n maaltafel wat jy ken (× 2, × 5, × 10).', 'Verdubbel, halveer of een groep meer/minder.'], { model: 'groepe teken of spronge', woorden: 'maal, maaltafel, verdubbel, halveer', valkuilen: ['Opgetel.'], concreter: 'Teken die groepe (bv. 9 groepe van 5).' }),
  'vermenigvuldig.0b': K('Woordsom: uitgebreide notasie', ['Wat word gevra? Dosies × potlode per dosie.', 'Skryf die getal in uitgebreide notasie.', 'Maal elke deel en tel die deelprodukte op.'], { woorden: 'uitgebreide notasie, deelprodukte', valkuilen: ['Net die tiene gemaal.'], concreter: 'Eers 10 dosies.' }),
  'vermenigvuldig.0c': K('2-syfer × 1-syfer: uitgebreide notasie', ['Skryf die getal as tiene + ene.', 'Maal elke deel.', 'Tel die deelprodukte op.'], { valkuilen: ['Net die tiene gemaal en die ene bygetel.'], concreter: 'Geld: R10-note en R1-munte, soveel keer as die ander getal.' }),
  'vermenigvuldig.1a': K('3-syfer × 1-syfer: uitgebreide notasie', ['Skryf die getal in uitgebreide notasie.', 'Maal elke deel.', 'Tel die deelprodukte op.'], { valkuilen: ['’n Deel vergeet.'], concreter: GELD }),
  'vermenigvuldig.1b': K('2-syfer × 2-syfer: breek op', ['Breek die tweede getal op in tiene en ene.', 'Maal eers met die tiene, dan met die ene.', 'Tel op.'], { model: 'die area-model (reghoek in dele)', valkuilen: ['Tiene × tiene en ene × ene.'], concreter: 'Area-model teken.' }),
  'vermenigvuldig.1c': K('× 10, 100, 1000', ['× 10: elke syfer skuif een plek na links; daar kom ’n nul agter.'], { model: 'plekwaardetabel', valkuilen: ['Nul vergeet.'], concreter: 'Geld: tien keer soveel rand.' }),
  'vermenigvuldig.2a': K('4-syfer × 1-syfer: uitgebreide notasie', ['Uitgebreide notasie.', 'Maal elke deel.', 'Tel op.'], { valkuilen: ['Nulle vergeet by duisende × die getal.'], concreter: GELD }),
  'vermenigvuldig.2b': K('3-syfer × 2-syfer: breek op', ['Breek die 2-syfergetal op.', 'Maal met die tiene en met die ene.', 'Tel op; beraam om te kontroleer.'], { model: 'area-model', valkuilen: ['Nul vergeet by × die tiene.'], concreter: 'Eers net die ene van die 2-syfergetal.' }),
  'vermenigvuldig.2c': K('Woordsom: 3-syfer × 2-syfer', ['Wat word gevra? Bokse × tamaties per boks.', 'Breek op en maal.', 'Tel op.'], { valkuilen: ['Opgetel.'], concreter: 'Eers 10 bokse.' }),
  'vermenigvuldig.3a': K('Beraam, dan breek op', ['Beraam eers (rond af).', 'Breek die 2-syfergetal op en maal.', 'Tel op en vergelyk met die beraming.'], { woorden: 'beraam (omtrent uitreken met ronde getalle)', valkuilen: ['Antwoord ver van die beraming.'], concreter: 'Begin met die beraming.' }),

  // ================= DELING =================
  'deling.0a': K('Deling met die maaltafel', ['Dink aan die maaltafel: deler × ? = die getal.', 'Begin by ’n maklike een en tel verder.'], { model: 'groepe maak; spronge', woorden: 'deel, maaltafel, res', valkuilen: ['Afgetrek.'], concreter: 'Deel die lekkers gelyk tussen die kinders (met die getalle van die som).' }),
  'deling.0b': K('Deling met res (woordsom)', ['Watter getal in die tafel is die naaste aan die getal, maar nie meer nie?', 'Dit is hoeveel elkeen kry; wat oorbly is die res.'], { valkuilen: ['Afgerond na bo.'], concreter: 'Met lekkers.' }),
  'deling.0c': K('Die res vind', ['Maal: deler × kwosiënt.', 'Trek af van die getal: dit is die res.'], { woorden: 'res (wat oorbly)', valkuilen: ['Kwosiënt as res gegee.'], concreter: 'Met lekkers.' }),
  'deling.1a': K('Deelbaarheidsreël (2, 5, 10)', ['Kyk na die laaste syfer.', '2: ewe; 5: 0 of 5; 10: 0.'], { valkuilen: ['Na die hele getal gekyk.'], concreter: 'Klein getalle.' }),
  'deling.1b': K('Deling deur opbreek', ['Breek die getal op in dele wat maklik deelbaar is.', 'Deel elke deel.', 'Tel die antwoorde op.'], { valkuilen: ['Dele wat nie maklik deel nie.'], concreter: 'Met geld.' }),
  'deling.2a': K('Deelbaarheidsreël (3, 9)', ['Tel die syfers op.', 'Is die som deelbaar deur 3 (of 9)?'], { valkuilen: ['Laaste syfer gebruik.'], concreter: 'Met 12.' }),
  'deling.2b': K('Langdeling', ['Werk van links na regs: hoeveel keer gaan die deler in die eerste syfers?', 'Maal en trek die deelproduk af.', 'Bring die volgende syfer af; herhaal.', 'Kontroleer met maal.'], { model: 'die langdeling-uitleg (soos in die werkboek)', woorden: 'Deel, maal, trek af, bring af', valkuilen: ['Afbring vergeet.', 'Deelproduk groter as die getal.'], concreter: 'Eers met ’n klein getal.' }),
  'deling.2c': K('Langdeling met res (vol bokse)', ['Langdeling.', 'Net vol bokse tel: die res bly oor.'], { valkuilen: ['Res as ekstra boks getel.'], concreter: 'Met eiers.' }),
  'deling.3a': K('Langdeling met res: rond op (busse)', ['Langdeling.', 'Die leerders wat oorbly moet ook saam: nog ’n bus.'], { valkuilen: ['Res weggelaat.'], concreter: 'Met motors.' }),
  'deling.3b': K('Langdeling (groot getal)', ['Deel, maal, trek af, bring af.', 'Kontroleer.'], { valkuilen: ['0 in die antwoord vergeet as die deler nie ingaan nie.'], concreter: 'Klein getalle.' }),

  // ================= GETALBEGRIP =================
  'getalbegrip.0b': K('Waarde van ’n syfer', ['Skryf die getal in ’n plekwaardetabel (D H T E).', 'By watter plek staan die syfer?', 'So veel is dit werd.'], { model: 'plekwaardetabel', valkuilen: ['Net die syfer gegee.'], concreter: GELD }),
  'getalbegrip.0c': K('Afronding tot die naaste 10', ['Tussen watter twee tiene lê die getal?', 'Kyk na die ene: 5 of meer, rond op.'], { model: 'getallelyn', valkuilen: ['Na die tiene gekyk.'], concreter: 'Op die getallelyn.' }),
  'getalbegrip.0d': K('Getalle vergelyk', ['Vergelyk eers die duisende, dan die honderde, dan die tiene.'], { model: 'plekwaardetabel', valkuilen: ['Na die laaste syfer gekyk.'], concreter: 'Met geld.' }),
  'getalbegrip.1a': K('Afronding tot die naaste 100', ['Tussen watter twee honderde lê die getal?', 'Die middel: op of verby die middel, rond op.'], { model: 'getallelyn', valkuilen: ['Na die ene gekyk.'], concreter: 'Getallelyn.' }),
  'getalbegrip.1b': K('Faktore', ['Soek pare wat saam die getal gee.', 'Tel al die faktore.'], { woorden: 'faktore (getalle wat sonder res in die getal deel)', valkuilen: ['1 en die getal self vergeet.'], concreter: 'Maak reghoeke met 12 blokkies.' }),
  'getalbegrip.1c': K('Getal skryf uit plekwaarde', ['Plekwaardetabel: D, H, T, E.', 'Elke plek kry ’n syfer, ook 0.'], { valkuilen: ['0 vergeet.'], concreter: GELD }),
  'getalbegrip.2a': K('Priemgetalle', ['’n Priemgetal het net twee faktore: 1 en homself.', 'Toets of die getal deur 2, 3, 5 of 7 deelbaar is.'], { valkuilen: ['Elke onewe getal as priem.'], concreter: 'Eers ’n klein voorbeeld: 9 = 3 × 3, dus nie priem nie.' }),
  'getalbegrip.2b': K('Afronding tot die naaste 1 000', ['Onderstreep die duisende.', 'Kyk na die honderde: 5 of meer, rond op.'], { valkuilen: ['Syfers regs nie 0 gemaak nie.'], concreter: 'Getallelyn.' }),
  'getalbegrip.2c': K('Veelvoude', ['Die veelvoude is die getalle in die maaltafel.', 'Soek die eerste een wat groter is.'], { valkuilen: ['Kleiner een gekies.'], concreter: 'Sê die tafel op.' }),
  'getalbegrip.3a': K('GGF', ['Skryf die faktore van albei.', 'Die grootste een wat in albei voorkom.'], { woorden: 'GGF (grootste gemene faktor)', valkuilen: ['KGV gesoek.'], concreter: 'Eers ’n klein voorbeeld: 6 en 9.' }),
  'getalbegrip.3b': K('KGV', ['Skryf die veelvoude van albei.', 'Die kleinste een wat in albei voorkom.'], { woorden: 'KGV (kleinste gemene veelvoud)', valkuilen: ['Die getalle net gemaal.'], concreter: 'Eers ’n klein voorbeeld: 4 en 6.' }),
  'getalbegrip.3c': K('Kwadraat', ['’n Getal kwadraat beteken die getal maal homself.'], { valkuilen: ['Maal 2 in plaas van maal homself.'], concreter: 'Eers ’n klein voorbeeld: 3² = 3 × 3, ’n vierkant van 3 by 3.' }),
  'getalbegrip.3d': K('Negatiewe getalle (temperatuur)', ['Begin by die negatiewe getal op die getallelyn.', 'Spring tot by 0, dan verder.'], { model: 'termometer', valkuilen: ['Afgetrek.'], concreter: 'Teken ’n termometer.' }),

  // ================= BREUKE =================
  'breuke.0a': K('Breuk van ’n getal', ['Verdeel die getal in soveel ewe groot groepe as die noemer.', 'Een groep is die antwoord.'], { model: STROOK + ' of groepe voorwerpe', woorden: 'teller (die getal bo die streep), noemer (die getal onder die streep)', valkuilen: ['Gemaal.'], concreter: 'Eers ’n klein voorbeeld: 25 lekkers tussen 5 kinders.' }),
  'breuke.0b': K('Breuk aflees (sirkel)', ['Noemer: in hoeveel ewe groot dele.', 'Teller: hoeveel dele ingekleur.'], { model: 'sirkeldiagram', valkuilen: ['Teller en noemer omgeruil.'], concreter: 'Teken en kleur.' }),
  'breuke.0c': K('Breuke vergelyk (dieselfde noemer)', ['Is die dele ewe groot? (dieselfde noemer)', 'Meer dele = groter.'], { model: STROOK, valkuilen: ['Na die noemer gekyk.'], concreter: 'Breukstroke.' }),
  'breuke.1a': K('Breuk van ’n getal', ['Eers een deel: deel deur die noemer.', 'Dan maal met die teller.'], { model: STROOK, valkuilen: ['Net gedeel.'], concreter: 'Met lekkers.' }),
  'breuke.1b': K('Ekwivalente breuke (□)', ['Met hoeveel is die noemer gemaal?', 'Maal die teller met dieselfde getal.'], { model: STROOK, woorden: 'ekwivalente breuke', valkuilen: ['Bygetel in plaas van gemaal.'], concreter: 'Breukstroke onder mekaar.' }),
  'breuke.1c': K('Breuke optel (dieselfde noemer)', ['Die dele is ewe groot: tel net die tellers op.', 'Die noemer bly dieselfde.'], { model: STROOK, valkuilen: ['Noemers ook opgetel.'], concreter: 'Pizza.' }),
  'breuke.2a': K('Breuke optel (een noemer is ’n veelvoud)', ['Maak die noemers dieselfde: verander die breuk met die kleiner noemer.', 'Tel die tellers op.', 'Vereenvoudig.'], { model: STROOK, valkuilen: ['Tellers én noemers opgetel.'], concreter: 'Breukstroke.' }),
  'breuke.2c': K('Gemengde getalle optel', ['Tel eers die heelgetalle.', 'Dan die breuke.', 'Vereenvoudig.'], { valkuilen: ['2/4 nie vereenvoudig nie.'], concreter: 'Pizza.' }),
  'breuke.2d': K('Breuk van ’n bedrag (woordsom)', ['Eers een deel: deel deur die noemer.', 'Maal met die teller.'], { model: STROOK, valkuilen: ['Net gedeel.'], concreter: 'Met R10-note.' }),
  'breuke.3a': K('Breuke optel (verskillende noemers, KGV)', ['Soek die KGV van die noemers.', 'Skakel albei breuke om.', 'Tel op; maak ’n gemengde getal.'], { valkuilen: ['Noemers net gemaal en nie vereenvoudig nie.'], concreter: 'Klein noemers.' }),
  'breuke.3b': K('Breuk × breuk', ['Teller × teller.', 'Noemer × noemer.', 'Vereenvoudig as dit kan.'], { valkuilen: ['Gelykbenoemd gemaak.'], concreter: 'Die helfte van ’n halwe pizza.' }),
  'breuke.3c': K('Eenvoudigste vorm (GGF)', ['Soek die GGF van teller en noemer.', 'Deel albei deur die GGF.'], { valkuilen: ['Net die teller gedeel.'], concreter: 'Breukstrook.' }),
  'breuke.3d': K('Onegte breuk na gemengde getal', ['Deel die teller deur die noemer: dit is die heelgetalle.', 'Die res is die teller van die breuk.'], { valkuilen: ['Res as heelgetal.'], concreter: 'Pizzastukke.' }),

  // ================= DESIMALE BREUKE =================
  'desimale.0a': K('Rande na sent', ['R1 = 100 sent.', 'Rande × 100, plus die sent.'], { valkuilen: ['Komma weggelaat sonder om te maal.'], concreter: GELD }),
  'desimale.0b': K('Geld optel (rande en sent)', ['Tel die rande op.', 'Tel die sent op (100 sent = R1).'], { valkuilen: ['Sent oor 100.'], concreter: GELD }),
  'desimale.1a': K('Breuk na desimale breuk (tiendes)', ['Tiendes staan op die eerste plek ná die komma.'], { model: 'plekwaardetabel met komma', valkuilen: ['Teller en noemer met ’n komma tussen.'], concreter: 'Geld: tiendes is 10 sent-stukke.' }),
  'desimale.1b': K('Gemengde getal na desimale breuk', ['Heelgetalle voor die komma.', 'Honderdstes: twee plekke ná die komma.'], { valkuilen: ['Honderdstes op die verkeerde plek.'], concreter: 'Geld: rande en sent.' }),
  'desimale.1c': K('Desimale breuke vergelyk', ['Maak die aantal syfers ná die komma gelyk.', 'Vergelyk soos sent.'], { valkuilen: ['Langste getal = grootste.'], concreter: 'Geld.' }),
  'desimale.2a': K('Desimale optel (kolomme)', ['Kommas onder mekaar; maak ewe lank met nulle.', 'Tel op soos gewone getalle.'], { valkuilen: ['Kommas nie onder mekaar.'], concreter: 'Geld.' }),
  'desimale.2b': K('Desimale aftrek (kolomme)', ['Kommas onder mekaar; vul aan met nulle.', 'Trek af.'], { valkuilen: ['Tiendes as honderdstes gelees.'], concreter: 'Geld.' }),
  'desimale.2c': K('× 10, 100, 1000 (desimaal)', ['× 100: elke syfer skuif twee plekke na links.'], { model: 'plekwaardetabel', valkuilen: ['Verkeerde kant.'], concreter: 'Geld: honderd keer soveel rand.' }),
  'desimale.2e': K('Waarde van ’n syfer ná die komma', ['Eerste plek: tiendes; tweede plek: honderdstes.'], { valkuilen: ['Plekke omgeruil.'], concreter: 'Geld: sent.' }),
  'desimale.3a': K('Desimaal × heelgetal (tiendes)', ['Lees die desimale getal as tiendes.', 'Maal die tiendes met die heelgetal.', 'Skryf die tiendes terug as desimale getal.'], { valkuilen: ['Komma verkeerd.'], concreter: 'Geld: sent maal die getal.' }),
  'desimale.3b': K('Desimaal × heelgetal (uitgebreide notasie)', ['Uitgebreide notasie: + +.', 'Tel op.'], { valkuilen: ['Komma vergeet.'], concreter: 'Geld.' }),
  'desimale.3c': K('Desimaal ÷ heelgetal (woordsom)', ['Hoeveel mense deel?', 'Dink in tiendes en deel.'], { valkuilen: ['Komma vergeet.'], concreter: 'Geld.' }),
  'desimale.3d': K('Afronding tot een desimale plek', ['Kyk na die tweede syfer ná die komma.', '5 of meer: op.'], { valkuilen: ['Verkeerde syfer.'], concreter: 'Geld.' }),

  // ================= PERSENTASIE =================
  'persentasie.0a': K('Persentasie op ’n 100-blokkie', ['Persent beteken "uit 100".', 'Hoeveel uit 100 is ingekleur?'], { model: '100-blokkie', concreter: 'Tel die blokkies.' }),
  'persentasie.0b': K('Persentasie nie ingekleur nie', ['Altesaam 100 blokkies.', '100 − ingekleur.'], { model: '100-blokkie', valkuilen: ['Ingekleur gegee.'], concreter: 'Tel.' }),
  'persentasie.1a': K('Persentasie as breuk', ['25% = 25/100.', 'Vereenvoudig.'], { valkuilen: ['25/1.'], concreter: '100-blokkie.' }),
  'persentasie.1b': K('10% van ’n getal', ['10% = 1/10.', 'Deel deur 10.'], { valkuilen: ['− 10.'], concreter: 'Geld.' }),
  'persentasie.1c': K('Maklike persentasie van ’n bedrag (10%, 25%, 50%)', ['Watter breuk is die persentasie? (10% = 1/10, 25% = 1/4, 50% = 1/2)', 'Deel deur die noemer.'], { valkuilen: ['Die persentasie afgetrek.'], concreter: 'Geld.' }),
  'persentasie.2a': K('Persentasie as breuk (vereenvoudig)', ['Persent = /100.', 'Vereenvoudig.'], { concreter: '100-blokkie.' }),
  'persentasie.2b': K('Persentasie van ’n bedrag via ’n breuk', ['Skryf die persentasie as ’n breuk (bv. 40% = 2/5).', 'Eers een deel: deel deur die noemer.', 'Maal met die teller.'], { valkuilen: ['Net een deel uitgereken.'], concreter: 'Geld.' }),
  'persentasie.3a': K('Afslag: nuwe prys', ['Begin by 10% en bou die persentasie op.', 'Dit is die afslag.', 'Nuwe prys = prys − afslag.'], { woorden: 'afslag, nuwe prys', valkuilen: ['Afslag as antwoord.'], concreter: 'Winkeltjie.' }),
  'persentasie.3b': K('Punte as persentasie', ['Skryf as breuk.', 'Maak die noemer 100.'], { valkuilen: ['Die punte as persentasie gegee.'], concreter: 'Eers ’n klein voorbeeld: 1 uit 10 = 10%.' }),
  'persentasie.3c': K('Prysverhoging', ['Bereken die persentasie.', 'Tel dit by die prys.'], { valkuilen: ['Net die toename.'], concreter: 'Geld.' }),

  // ================= FINANSIES =================
  'finansies.0a': K('Kleingeld (optel tot)', ['Tel op van die prys tot die noot.'], { model: 'getallelyn; geld', valkuilen: ['Prys plus noot.'], concreter: GELD }),
  'finansies.0b': K('Pryse optel (rande en sent)', ['Eers die rande.', 'Dan die sent.'], { concreter: GELD }),
  'finansies.1a': K('Prys van meer pakkies (via een)', ['Eers vir een: deel.', 'Dan vir die aantal: maal.'], { model: VTABEL, valkuilen: ['Opgetel.'], concreter: 'Tabel.' }),
  'finansies.2a': K('Wins', ['Wins = verkoopprys − kosprys.'], { woorden: 'wins, kosprys, verkoopprys', valkuilen: ['Opgetel.'], concreter: 'Klein bedrae.' }),
  'finansies.2b': K('Verdeel in ’n verhouding', ['Hoeveel dele altesaam?', 'Een deel = totaal ÷ dele.', 'Maal met die aantal dele.'], { model: STROOK, valkuilen: ['Totaal net deur die een getal van die verhouding gedeel.'], concreter: 'Teken die dele.' }),
  'finansies.3a': K('Enkelvoudige rente', ['Rente vir een jaar: persentasie van die bedrag.', 'Maal met die aantal jare.'], { valkuilen: ['Net een jaar.'], concreter: 'R100 teen 10%.' }),
  'finansies.3b': K('Wisselkoers', ['Kyk na die koers: $1 = soveel rand.', 'Maal: aantal dollar × koers (breek op).'], { model: VTABEL, valkuilen: ['Gedeel.'], concreter: 'Tabel.' }),
  'finansies.3c': K('Spoed (km per uur)', ['Koers: km in 1 uur.', 'Maal met die ure.'], { model: VTABEL, valkuilen: ['Opgetel.'], concreter: 'Tabel.' }),

  // ================= PATRONE =================
  'patrone.0a': K('Getalpatroon (+)', ['Wat is die verskil tussen twee terme?', 'Tel dit by die laaste term.'], { valkuilen: ['Verkeerde verskil.'], concreter: 'Getallelyn.' }),
  'patrone.0b': K('Vloeidiagram (een reël)', ['Pas die reël toe op die inset.'], { woorden: 'inset, uitset, reël', concreter: 'Masjien-prentjie.' }),
  'patrone.1a': K('Ontbrekende getal (omgekeerde bewerking)', ['Die omgekeerde van + is −.', 'Kontroleer.'], { woorden: 'omgekeerde bewerking', valkuilen: ['Opgetel.'], concreter: 'Klein getalle.' }),
  'patrone.1b': K('Vloeidiagram (twee reëls)', ['Eers die eerste reël, dan die tweede.'], { valkuilen: ['Volgorde omgeruil.'], concreter: 'Masjien-prentjie.' }),
  'patrone.1c': K('Getalpatroon (×)', ['Hoe verander elke getal? (verdubbel)', 'Doen dit met die laaste term.'], { valkuilen: ['Opgetel.'], concreter: 'Deel twee bure.' }),
  'patrone.2a': K('Vloeidiagram terugwerk', ['Werk terug met die omgekeerde bewerkings, van agter na voor.'], { valkuilen: ['Vorentoe gewerk.'], concreter: 'Klein getalle.' }),
  'patrone.2b': K('Hakies eerste', ['Hakies eerste.', 'Dan die res.'], { woorden: 'volgorde van bewerkings', valkuilen: ['Van links na regs sonder hakies.'], concreter: 'Klein getalle.' }),
  'patrone.2c': K('Volgorde van bewerkings', ['× en ÷ voor + en −.'], { valkuilen: ['Van links na regs.'], concreter: 'Klein getalle.' }),
  'patrone.2d': K('Patroon: ’n term ver vorentoe', ['Wat is die verskil?', 'Van term 1 na die gevraagde term is een sprong minder as die posisie.', 'Eerste term + (posisie − 1) × verskil.'], { valkuilen: ['Een sprong te veel (posisie × verskil).'], concreter: 'Skryf die terme uit.' }),
  'patrone.3a': K('Reël met n (3n + 2)', ['Vervang n met die posisie.', 'Eers maal, dan optel.'], { valkuilen: ['Die posisie langs die getal geskryf in plaas van gemaal.'], concreter: 'n = 1.' }),
  'patrone.3b': K('Vergelyking oplos', ['Werk terug met omgekeerde bewerkings.', 'Kontroleer.'], { valkuilen: ['Opgetel.'], concreter: 'Raai en toets.' }),
  'patrone.3c': K('Magte eerste', ['Magte eerste.', 'Dan × en ÷, dan + en −.'], { valkuilen: ['Mag as maal 2 gelees.'], concreter: '’n Kwadraat is die getal maal homself.' }),

  // ================= MEETKUNDE =================
  'meetkunde.0a': K('Hoekpunte van vorms tel', ['Hoeveel hoekpunte het een vorm?', 'Maal met die aantal vorms.', 'Tel die groepe op.'], { valkuilen: ['Vorms opgetel.'], concreter: 'Teken een vorm.' }),
  'meetkunde.0b': K('Vlakke van kubusse', ['’n Kubus het 6 vlakke.', 'Maal met die aantal.'], { model: '’n dobbelsteen', concreter: 'Dobbelsteen.' }),
  'meetkunde.0c': K('Hoekpunte van ’n vorm', ['Tel die hoekpunte.'], { concreter: 'Teken.' }),
  'meetkunde.0d': K('Hoekpunte van ’n kubus', ['4 bo en 4 onder.'], { model: 'dobbelsteen', concreter: 'Dobbelsteen.' }),
  'meetkunde.1a': K('Soort hoek', ['Skerphoek < 90°; regte hoek = 90°; stomphoek tussen 90° en 180°.'], { model: '’n papierhoek', concreter: 'Papier.' }),
  'meetkunde.1b': K('Simmetrielyne', ['’n Simmetrielyn deel die vorm in twee spieëlbeelde.', 'Probeer elke vou.'], { concreter: 'Vou papier.' }),
  'meetkunde.2a': K('Rande van ’n piramide', ['Grondvlak se rande + die rande na die punt.'], { concreter: 'Bou dit.' }),
  'meetkunde.2b': K('Hoeke op ’n reguit lyn', ['Saam 180°.', '180° − die bekende hoek.'], { valkuilen: ['360° gebruik.'], concreter: 'Teken.' }),
  'meetkunde.2c': K('Soort hoek (ook refleks)', ['Skerp < 90°; stomp tussen 90° en 180°; refleks tussen 180° en 360°.'], { concreter: 'Papier.' }),
  'meetkunde.3a': K('Derde hoek van ’n driehoek', ['Saam 180°.', 'Tel die bekende hoeke op en trek af van 180°.'], { valkuilen: ['360°.'], concreter: 'Skeur die hoeke af.' }),
  'meetkunde.3b': K('Hoeke om ’n punt', ['Saam 360°.', 'Trek die bekende hoeke af.'], { valkuilen: ['180°.'], concreter: 'Teken.' }),
  'meetkunde.3c': K('Gelykbenige driehoek', ['180° − tophoek = die twee basishoeke saam.', 'Halveer.'], { valkuilen: ['Nie gehalveer.'], concreter: 'Teken.' }),

  // ================= METING =================
  'meting.0a': K('g na kg', ['1 000 g = 1 kg.', 'Deel deur 1 000.'], { valkuilen: ['Gemaal.'], concreter: 'Pak suiker van 1 kg.' }),
  'meting.0b': K('ℓ na mℓ', ['1 ℓ = 1 000 mℓ.', 'Maal met 1 000.'], { valkuilen: ['Gedeel.'], concreter: 'Bottel van 1 ℓ.' }),
  'meting.1a': K('kg en g na g', ['kg × 1 000.', 'Tel die g by.'], { valkuilen: ['Plekwaarde van die gram verkeerd.'], concreter: 'Geld.' }),
  'meting.1b': K('Gemengde getal ℓ na mℓ', ['Heel ℓ × 1 000.', '1/2 ℓ = 500 mℓ.', 'Tel op.'], { concreter: 'Bottels.' }),
  'meting.2a': K('Desimale maat na die klein eenheid (km→m, kg→g, ℓ→mℓ)', ['1 km = 1 000 m, 1 kg = 1 000 g, 1 ℓ = 1 000 mℓ.', '× 1 000: syfers skuif 3 plekke.'], { valkuilen: ['Komma verkeerd geskuif.'], concreter: 'Eers net die hele getal (sonder die desimale deel).' }),
  'meting.2b': K('mℓ na ℓ', ['Klein na groot eenheid: deel deur 1 000.'], { valkuilen: ['Gemaal.'], concreter: 'Bottels.' }),
  'meting.3a': K('Glase uit ’n kan (eenhede)', ['Skakel om na dieselfde eenheid.', 'Deel.'], { valkuilen: ['Nie eers na dieselfde eenheid omgeskakel nie.'], concreter: 'Bottel.' }),
  'meting.3b': K('Stukke uit ’n lint (eenhede, res)', ['Skakel om na cm.', 'Deel; net hele stukke tel.'], { valkuilen: ['Afgerond na bo.'], concreter: 'Meetlint.' }),

  // ================= OMTREK, OPPERVLAKTE, VOLUME =================
  'omtrek.0a': K('Omtrek van ’n reghoek', ['Omtrek = die lengte rondom.', 'Tel al die sye op.'], { valkuilen: ['Gemaal.'], concreter: 'Vinger om die rand.' }),
  'omtrek.0b': K('Vierkante tel (oppervlakte)', ['Een ry × aantal rye.'], { concreter: 'Tel ry vir ry.' }),
  'omtrek.1a': K('Oppervlakte van ’n reghoek', ['Oppervlakte = lengte × breedte.'], { woorden: 'oppervlakte (hoeveel vierkante binne-in pas)', valkuilen: ['Opgetel.'], concreter: 'Rooster.' }),
  'omtrek.1b': K('Omtrek van ’n vierkant', ['4 ewe lang sye: 4 × sy.'], { valkuilen: ['sy × sy.'], concreter: 'Teken.' }),
  'omtrek.2a': K('Volume van ’n reghoekige prisma', ['Een laag: lengte × breedte.', '× die aantal lae (hoogte).'], { model: 'kubusse in lae', concreter: 'Bou met blokkies.' }),
  'omtrek.3a': K('Oppervlakte van ’n driehoek', ['Die driehoek is die helfte van die reghoek om hom.', '½ × basis × hoogte.'], { valkuilen: ['Nie gehalveer.'], niet: ['Moenie sê die reghoek word in twee gelyke driehoeke verdeel nie; sê die driehoek is presies die helfte van die reghoek.'], concreter: 'Vou papier.' }),
  'omtrek.3b': K('Sy van ’n vierkant uit die omtrek', ['4 ewe lang sye.', 'Omtrek ÷ 4.'], { valkuilen: ['Omtrek deur 2 gedeel in plaas van deur 4.'], concreter: 'Teken.' }),
  'omtrek.3c': K('Breedte uit die oppervlakte', ['Oppervlakte = lengte × breedte, dus lengte × □ = oppervlakte.', 'Deel.'], { valkuilen: ['Afgetrek.'], concreter: 'Rooster.' }),

  // ================= TYD =================
  'klokLees.a': K('Horlosie lees', ['Na watter getal wys die lang wyser? Elke getal is 5 minute.', 'Watter uur is die kort wyser verby?', 'Sê die tyd.'], { model: KLOK, woorden: 'lang wyser (minute), kort wyser (ure), kwart oor, half, kwart voor', valkuilen: ['Wysers omgeruil.'], concreter: 'Tel in spronge van 5.' }),
  'klokWoorde.a': K('Tyd in woorde', ['Hoeveel minute ná die heel uur?', 'Tot by half sê jy "oor" die uur wat verby is; ná half "voor" die volgende uur.'], { model: KLOK, woorden: 'half', valkuilen: ['"Half vyf" as 5:30 gelees (dit is 4:30).'], concreter: 'Wys op die horlosie.' }),
  'digiWoorde.a': K('Digitale tyd in woorde', ['Bo 12: trek 12 af.', 'Sê die minute in woorde; vm/nm.'], { model: KLOK, concreter: 'Wysers.' }),
  'oondSom.a': K('Hoe laat klaar (oond)', ['Tel eers tot by die heel uur.', 'Hoeveel minute nog?', 'Tel dit by.'], { model: 'tydlyn met die heel uur as stop', valkuilen: ['Uur as 100 minute.'], concreter: 'Tydlyn.' }),
  'tydBasis.0a': K('Hoe laat ná … minute', ['Tel die minute by.', 'Oor die heel uur: 60 minute.'], { model: KLOK, valkuilen: ['100 minute.'], concreter: 'Draai die lang wyser.' }),
  'tydBasis.0b': K('Ure na minute', ['1 uur = 60 minute.', 'Maal met 60.'], { valkuilen: ['× 100.'], concreter: 'Horlosie.' }),
  'tydBasis.1a': K('24-uur-tyd (nm)', ['nm = namiddag.', 'Tel 12 by die uur.'], { valkuilen: ['Minute verander.'], concreter: '1 nm = 13:00.' }),
  'tydBasis.1b': K('Tydsduur met ’n tydlyn', ['Van die begin tot die heel uur.', 'Van die heel uur tot die einde.', 'Tel op.'], { model: 'tydlyn', valkuilen: ['Tye soos getalle afgetrek.'], concreter: 'Tydlyn.' }),
  'tydBasis.2a': K('Minute en sekondes na sekondes', ['1 minuut = 60 sekondes.', 'Maal en tel die sekondes by.'], { valkuilen: ['× 100.'], concreter: 'Stophorlosie.' }),
  'tydBasis.2b': K('Lang tydsduur (werkdag)', ['Tot by die heel uur.', 'Hele ure × 60.', 'Laaste minute.', 'Tel op.'], { model: 'tydlyn', concreter: 'Tydlyn.' }),
  'tydBasis.3a': K('Desimale ure na minute', ['1 uur = 60 minute.', 'Deel ná die komma × 60.'], { valkuilen: ['Die deel ná die komma as minute gelees.'], concreter: 'Horlosie in kwarte.' }),
  'tydBasis.3b': K('Eindtyd (ure en minute by)', ['Eers die ure by.', 'Dan die minute.'], { model: 'tydlyn', valkuilen: ['Minute oor 60.'], concreter: 'Tydlyn.' }),

  // ================= DATA =================
  'data.0b': K('Staafgrafiek: hoeveel meer', ['Lees albei stawe af.', 'Trek af.'], { valkuilen: ['Opgetel.'], concreter: 'Vinger op die stawe.' }),
  'data.1b': K('Modus', ['Tel hoeveel keer elke waarde voorkom.', 'Die waarde wat die meeste voorkom.'], { woorden: 'modus', valkuilen: ['Grootste getal.'], concreter: 'Merk elke getal af.' }),
  'data.2a': K('Mediaan', ['Sorteer van klein na groot.', 'Die middelste getal.'], { woorden: 'mediaan', valkuilen: ['Nie gesorteer nie.'], concreter: 'Skryf op kaartjies.' }),
  'data.2b': K('Moontlike uitkomste', ['Lys al die uitkomste.', 'Tel hulle.'], { valkuilen: ['Opgetel in plaas van gemaal.'], concreter: 'Gooi regtig.' }),
  'data.3b': K('Gemiddelde', ['Tel al die waardes op.', 'Deel deur die aantal.'], { woorden: 'gemiddelde', valkuilen: ['Deur die grootste gedeel.'], concreter: 'Lekkers gelyk deel.' }),
  'data.3c': K('Omvang', ['Grootste − kleinste.'], { woorden: 'omvang', valkuilen: ['Gemiddelde.'], concreter: 'Sorteer.' }),
  'data.3d': K('Waarskynlikheid as breuk', ['Hoeveel uitkomste altesaam?', 'Hoeveel gunstig?', 'Gunstig / altesaam.'], { woorden: 'waarskynlikheid, gunstige uitkomste', valkuilen: ['Omgeruil.'], concreter: 'Dobbelsteen.' }),
};
