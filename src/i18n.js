// Teksten van de server in de taal van het kind (Nederlands is de bron; Afrikaans voor Suid-Afrika).
import { currentLang } from './db.js';

export const isAF = () => currentLang() === 'af';
export function ts(s, vars) {
  let out = isAF() && AFS[s] != null ? AFS[s] : s;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return out;
}
// Naam van de leraar: in een Afrikaanse klas zeg je "Meneer"
export const teacherName = () => (isAF() ? (process.env.TEACHER_NAME_AF || 'Meneer Max') : (process.env.TEACHER_NAME || 'Meester Max'));
export const dayNames = () => (isAF() ? ['Sondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrydag', 'Saterdag'] : ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']);
export const defaultRewards = () => (isAF()
  ? ['🍬 ’n Ekstra lekkertjie', '🎮 ’n Halfuur ekstra speeltyd', '💶 R10 ekstra', '🎁 ’n Klein geskenkie']
  : ['🍬 Een extra snoepje', '🎮 Een half uur extra gametijd', '💶 1 euro extra', '🎁 Een klein cadeautje']);

const AFS = {
  // fouten en meldingen
  'Er ging iets mis op de server.': 'Iets het op die bediener skeefgeloop.',
  'Hoe heet je? (minstens 2 letters)': 'Wat is jou naam? (minstens 2 letters)',
  'Er zijn al heel veel profielen.': 'Daar is al baie profiele.',
  'Er is al een {n}. Kies die hierboven!': 'Daar is al ’n {n}. Kies dié een hierbo!',
  'Dat profiel bestaat niet meer.': 'Daardie profiel bestaan nie meer nie.',
  'Verkeerde pincode': 'Verkeerde PIN-kode',
  'Verkeerd wachtwoord': 'Verkeerde wagwoord',
  'Vandaag is er geen dagtaak. Je kunt wel extra oefenen of vooruitwerken!': 'Vandag is daar geen dagtaak nie. Jy kan wel ekstra oefen of vooruitwerk!',
  'De starttoets is al gedaan.': 'Die begintoets is al gedoen.',
  'Doe eerst de starttoets.': 'Doen eers die begintoets.',
  'Maak eerst je dagtaak van vandaag af.': 'Maak eers vandag se dagtaak klaar.',
  'In het weekend is er geen dagtaak. Je kunt wel extra oefenen of vooruitwerken!': 'Oor die naweek is daar geen dagtaak nie. Jy kan wel ekstra oefen of vooruitwerk!',
  'Onbekende sessie': 'Onbekende soort sessie',
  'Niet gevonden': 'Nie gevind nie',
  'Geen hint mogelijk.': 'Geen wenk moontlik nie.',
  'Hier zijn geen tussenstappen.': 'Hier is geen tussenstappe nie.',
  'Niets te kiezen.': 'Niks om te kies nie.',
  'Er staat geen stap open.': 'Geen stap oop nie.',
  'Vul eerst iets in.': 'Vul eers iets in.',
  'Deze som bestaat niet.': 'Deze som bestaat niet.',
  'Vul eerst een antwoord in.': 'Vul eers ’n antwoord in.',
  'weet ik niet': 'weet nie',
  'Tijdens de starttoets helpt {m} nog niet: we willen eerst zien wat jij al kunt. Daarna wel! 😉': 'Tydens die begintoets help {m} nog nie: ons wil eers sien wat jy al kan. Daarna wel! 😉',
  '{m} (AI) staat nog niet aan. Vraag papa of mama om een OpenAI-sleutel in te stellen.': '{m} (KI) is nog nie aangeskakel nie. Vra jou pa of ma om ’n OpenAI-sleutel op te stel.',
  '{m} heeft vandaag al heel veel uitgelegd. Morgen weer!': '{m} het vandag al baie verduidelik. Môre weer!',
  '{m} kon nu even niet antwoorden. Probeer het straks nog eens.': '{m} kon nou nie antwoord nie. Probeer netnou weer.',
  'Onbekend onderdeel': 'Onbekende onderwerp',
  'De sessie is nog niet klaar.': 'Die sessie is nog nie klaar nie.',
  'Waar spaar je voor?': 'Waarvoor spaar jy?',
  'Kies een bedrag tussen {a} en {b}.': 'Kies ’n bedrag tussen {a} en {b}.',
  'Schrijf eerst kort op hoe je hebt gerekend.': 'Skryf eers kortliks hoe jy dit gedoen het.',
  'Dit bedrag klopt niet.': 'Ongeldige bedrag',
  'Zet OPENAI_API_KEY in de instellingen (.env) om AI-advies te krijgen.': 'Voeg OPENAI_API_KEY by die .env-lêer in die instellings om KI-advies te kry.',
  'AI-limiet voor vandaag bereikt.': 'KI-limiet vir vandag bereik.',
  'AI staat niet aan.': 'KI is nie aangeskakel nie.',
  'Bevestig het verwijderen.': 'Bevestig die verwydering.',
  'Bevestig met RESET': 'Bevestig met RESET',
  'Starttoets': 'Begintoets',
  'Dagtaak {d}': 'Dagtaak {d}',
  'Weekbonus: week van {d}': 'Weekbonus vir die week van {d}',
  'Uitbetaald': 'Uitbetaal',
  'Verrassing: {r}': 'Verrassing: {r}',
  // badges
  'Gestart!': 'Aan die gang!', 'Je hebt de starttoets gedaan.': 'Jy het die begintoets gedoen.',
  'Eerste dagtaak': 'Eerste dagtaak', 'Je eerste dagtaak is af.': 'Jou eerste dagtaak is klaar.',
  '3 dagen op rij': '3 dae aaneen', 'Drie schooldagen achter elkaar geoefend.': 'Drie skooldae agtereenvolgens geoefen.',
  'Hele week!': 'Hele week!', 'Vijf schooldagen op rij.': 'Vyf skooldae aaneen.',
  '10 dagen op rij': '10 dae aaneen', 'Twee weken volgehouden!': 'Twee weke volgehou!',
  '5 op rij': '5 aaneen', 'Vijf sommen achter elkaar goed.': 'Vyf somme agtereenvolgens reg.',
  '10 op rij': '10 aaneen', 'Tien sommen achter elkaar goed!': 'Tien somme agtereenvolgens reg!',
  'Niveau omhoog': 'Vlak gestyg', 'Je bent bij een onderdeel een niveau gestegen.': 'Jy het in een onderwerp ’n vlak opgeskuif.',
  'Klimmer': 'Klimmer', 'Van het laagste niveau omhoog geklommen!': 'Van die laagste vlak af opgeklim!',
  'Sterk!': 'Sterk!', 'Een onderdeel staat op "Sterk".': '’n Onderwerp staan op "Sterk".',
  'Weer op dreef': 'Herstel', 'Eerst fout, daarna de herkansing goed.': 'Eers verkeerd, toe reg met ’n tweede kans.',
  'Zelf gedaan': 'Self gedoen', 'Je koos "helemaal zelf" en had het goed.': 'Jy het "heeltemal self" gekies en dit reggekry.',
  'Foutloos': 'Foutloos', 'Een hele dagtaak zonder fouten.': '’n Hele dagtaak sonder foute.',
  'Nieuw record': 'Nuwe rekord', 'Meer sommen goed dan ooit in een dagtaak.': 'Meer somme reg as ooit tevore in ’n dagtaak.',
  'Doorzetter': 'Vasbyter', 'Een lastige dag, maar je hebt hem afgemaakt.': '’n Moeilike dag, maar jy het dit klaargemaak.',
  'Stappenmeester': 'Stappemeester', '10 sommen goed met tussenstappen.': '10 somme reg met tussenstappe.',
  'Weekbonus': 'Weekbonus', 'Alle vijf dagtaken van een week af.': 'Al vyf dagtake van ’n week klaar.',
  'Spaardoel gehaald': 'Spaardoel bereik', 'Genoeg gespaard voor je doel!': 'Genoeg gespaar vir jou doel!',
  'Doel bereikt': 'Doel bereik', 'Je hebt je eigen oefendoel gehaald!': 'Jy het jou eie oefendoel gehaal!',
  'Uitlegger': 'Verduideliker', 'Je hebt uitgelegd hoe jij een som oplost.': 'Jy het verduidelik hoe jy ’n som oplos.',
  // antwoord-controle
  'Klopt! We rekenen verder met het kleinste getal: {x}.': 'Reg! Ons werk verder met die kleinste: {x}.',
  'Bijna! Je kunt de breuk nog verder vereenvoudigen tot {x}.': 'Amper! Dit kan nog verder vereenvoudig word tot {x}.',
  'Goed! Korter opgeschreven is het {x}.': 'Goed! Netjieser geskryf, lyk dit so: {x}.',
};
