// Afrikaanse opdragte vir Max se agtergrondtake.
// JSON-sleutels bly onveranderd omdat die bestaande stoorkode hulle lees; alle
// onderrigtaal, kriteria en notas aan die leerder/ouer is egter Afrikaans.

export function sessieplanOpdrag({ name, groep, rows, n, levelNames }) {
  const tabel = rows.map((r) => `${r.cat} | ${r.label} | nou: ${r.levelName} | telling ${r.score}/100 | laaste 14 dae: ${r.recent || 'nog nie geoefen nie'} | neiging ${r.trend ?? '-'}${r.struggling ? ' | HAAK VAS' : ''}${r.calib ? ' | VLAK NOG ONSEKER' : ''}`).join('\n');
  return `Maak die lesplan vir vandag se oefensessie (${n} somme). ${name} is in graad ${groep || 7}.
Vlakke: ${[...levelNames].map((l, i) => `${i} = ${l}`).join(', ')} (die laaste een is die eindvlak). Elke onderwerp het sy eie vlak.

Onderwerpe (cat-id | naam | huidige vlak | telling | resultate | neiging):
${tabel}

Reëls:
- Differensieer werklik per onderwerp. Kies die vlak waarop ${name} vandag die meeste leer: uitdagend maar haalbaar (omtrent 70–80% reg).
- Jy mag hoogstens 1 vlak van die huidige vlak afwyk. Kies laer wanneer minder as die helfte onlangs reg was; hoër by minstens 85% met genoeg somme; anders bly dit dieselfde.
- "VLAK NOG ONSEKER" beteken die begintoets was kort. Gee 1 of 2 somme om die vlak beter te bepaal.
- Verdeel presies ${n} somme. Moeilike onderwerpe kry meer (3 tot 6); sterk onderwerpe min (0 of 1). Hoogstens 6 per onderwerp. Gebruik minstens 5 verskillende onderwerpe.
- Skryf per onderwerp ’n kort nota AAN ${name} (hoogstens 15 woorde): ’n konkrete kompliment of eerlike aanmoediging, sonder vaktaal.
- Skryf ’n boodskap aan ${name} (hoogstens 55 woorde): begin met wat goed gaan, sê waaraan julle vandag werk en waarom, en moedig aan.

Gee JSON: {"bericht": "...", "onderdelen": [{"cat": "cat-id", "niveau": 0-3, "aantal": 0-6, "notitie": "..."}]} (noem alle onderwerpe, ook met aantal 0). Alle tekswaardes moet Afrikaans wees.`;
}

export const besinningOpdrag = ({ name, summary }) => `${summary}\n\nSkryf vir ${name} ’n kort persoonlike boodskap (hoogstens 60 woorde) ná hierdie sessie: 1) wat konkreet goed gegaan het, 2) waaraan julle nog saam gaan werk, 3) ’n aanmoediging. Moenie vrae vra nie. Skryf net in Afrikaans.`;

export function vorderingOpdrag({ name, strong, practice, streak }) {
  return `Skryf vir ${name} ’n kort Afrikaanse boodskap (hoogstens 55 woorde) vir die vorderingskerm.
Goed met: ${strong.join(', ') || '(nog te min data)'}.
Nog oefen: ${practice.join(', ') || '(niks besonders nie)'}.
${streak ? `Reeds ${streak} dae aaneen geoefen.` : ''}
Reëls: 1) noem konkreet waarmee ${name} goed is, 2) noem rustig wat julle nog saam leer, 3) eindig met ’n kort aanmoediging.
Noem NOOIT ’n vlak, graad, telling, persentasie of punt oor hoe goed ${name} is nie. Geen vrae of prentjies nie.`;
}

export function profielOpdrag({ name, oldProfile, attempts, stats, misconceptions, memory, signals }) {
  const system = `Jy is ’n ervare remediërende wiskunde-onderwyser in ’n Suid-Afrikaanse KABV-skool. Jy hou ’n leerderprofiel by vir ’n kind wat met wiskunde sukkel. Wees presies en eerlik: noem net wat die data wys. Gebruik die naam of "die kind", nooit hy of sy nie. Skryf alle tekswaardes in Afrikaans.`;
  const user = `HUIDIGE PROFIEL (kan leeg wees):
${oldProfile || '(leeg)'}

STAND PER ONDERWERP (vlak nou | totale somme | % reg totaal | % reg laaste 14 dae | neiging):
${stats.map((x) => `${x.label} | ${x.level} | ${x.n} | ${x.pct}% | ${x.pct14 == null ? '-' : x.pct14 + '%'} | ${x.trend}`).join('\n') || '(nog niks nie)'}

HERKENDE DENKFOUTE (hoe dikwels, alles):
${misconceptions.map((m) => `${m.misconception} (${m.n}×)`).join('\n') || '(geen)'}

NOTAS VAN DIE ONDERWYSER:
${memory || '(geen)'}

GEMETE SEINE (tempo, outomatisering, werkgeheue, lees, selfvertroue, vashaakplekke, watter verduideliking gehelp het):
${signals || '(nog geen)'}

ONLANGSE POGINGS (onderwerp | vlak | som | kind se antwoord | regte antwoord | reg? | hulp | kladwerk):
${attempts.map((a) => `${a.label} | ${a.level} | ${a.text} | ${a.given} | ${a.display} | ${a.correct ? 'reg' : 'VERKEERD'} | ${a.guided ? 'tussenstappe' : a.hints ? 'wenke' : 'self'}${a.scratch_note ? ` | ${a.scratch_note}` : ''}`).join('\n')}

Werk ${name} se profiel by. Reëls:
- Behou swak punte, tensy die data wys dit gaan nou beter; stel dan die status op "gaat beter" of "opgelost" en gee die bewys.
- ’n Swak punt is spesifiek, nie net die naam van ’n onderwerp nie.
- "bewijs" noem werklike voorbeelde of hoeveelhede uit die data.
- Hoogstens 8 swak punte; hoogstens 3 opgeloste punte.
Gee JSON met presies hierdie sleutels:
{"samenvatting":"2-3 Afrikaanse sinne","sterk":["onderwerp + rede"],"zwakke_punten":[{"onderdeel":"naam","punt":"presiese probleem","bewijs":"data","status":"nieuw|mee bezig|gaat beter|opgelost","wat_helpt":"werkende KABV-aanpak","prioriteit":"hoog|midden|laag"}],"leerstijl":"hoe die kind die beste leer, net uit die gemete seine; geen leerstyl-etikette nie","aanpak_tips":["kort wenk, hoogstens 3"]}`;
  return { system, user };
}

export function onthouOpdrag({ name, transcript }) {
  return {
    system: `Jy is Meneer Max, ${name} se wiskunde-onderwyser in ’n Suid-Afrikaanse KABV-skool. Jy maak kort Afrikaanse notas vir jouself sodat jy volgende keer kan voortbou.`,
    user: `Dit het pas gebeur:\n${transcript}\n\nSkryf 1 tot 4 kort Afrikaanse notas (elk hoogstens 20 woorde): wat ${name} nou verstaan, waar die kind presies vasgehaak het, watter KABV-verduideliking of voorbeeld gewerk het, en relevante belangstellings of voorkeure. Noem net dinge wat werklik sigbaar was. Gee JSON: {"notities":["..."]}`,
  };
}

export const terugverduidelikOpdrag = ({ name, vraag, reg, stappe, explanation }) => `${vraag}\nRegte antwoord: ${reg}\nStappe van die app: ${stappe.join(' / ')}\n\n${name} het die som reg en verduidelik nou self:\n"""${explanation}"""\n\nGee kort Afrikaanse terugvoer (hoogstens 60 woorde): noem wat goed is in ${name} se eie woorde, of die metode klop, en of ’n stap ontbreek. Eindig met aanmoediging. Geen vraag nie.`;

export const ouerOpdrag = ({ name, summary, profile }) => `Oefendata van ${name}:\n${summary}\n\nLeerderprofiel wat deur die KI-onderwyser bygehou word:\n${profile || '(nog leeg)'}\n\nGee in hoogstens 300 Afrikaanse woorde:\n1. ’n Eerlike opsomming van waar ${name} staan.\n2. Die belangrikste denkfoute en moontlike oorsprong wat deur die data gesteun word.\n3. Drie konkrete dinge wat die ouer tuis kan doen (5–10 minute, daaglikse lewe, dieselfde KABV-metode).\n4. Wat die ouer met die onderwyser kan bespreek.`;

