// "Hoe leert dit kind?" — signalen onder de motorkap (alleen voor ouder/leerkracht en voor Max).
//
// Bewust GEEN leerstijl-labels ("visueel", "auditief"): onderzoek (Pashler e.a., 2008) laat zien dat
// lesgeven in een voorkeursstijl niet beter werkt. Wél goed onderbouwd en meetbaar:
//  - automatisering van basisfeiten (tafels, sommen tot 100): traag-maar-goed = uitgeteld (Geary)
//  - impulsief vs. zorgvuldig: snel fout is iets anders dan langzaam fout
//  - werkgeheugen: fout bij sommen met veel stappen, goed bij korte
//  - leesbelasting: verhaaltjessommen slechter dan kale sommen
//  - zelfvertrouwen / rekenangst (Ashcraft): veel "weet ik niet", stoppen, opgeven na een fout
//  - vastlopers op een bepáálde soort tussenstap
//  - welke uitleg-vorm per onderwerp aantoonbaar helpt (handelingsmodel: concreet → model → abstract)
// Alles deterministisch berekend uit de pogingen; Max krijgt het als feiten met vaste regels.
import { q } from './db.js';
import { catById } from './curriculum.js';
import { isAF } from './i18n.js';
const tx = (nl, af) => (isAF() ? af : nl);

// basissommen (tafels, optellen): Nederlandse en Suid-Afrikaanse onderdeelnamen
const FACT_CATS = ['vermenigvuldigen', 'delen', 'optellen', 'vermenigvuldig', 'deling', 'optel'];
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const pct = (ok, n) => (n ? Math.round((100 * ok) / n) : null);
const sec = (ms) => Math.round(ms / 1000);
// "soort stap": getallen weg, zodat dezelfde soort tussenstap samen geteld wordt
export const stepShape = (ask) => String(ask).replace(/\d+([.,\s ]\d+)*/g, '#').replace(/\s+/g, ' ').trim();
// verhaaltjessom = een echte zin (en niet alleen "Rond 4567 af op ...")
export const isWordProblem = (text) => String(text).split(/\s+/).filter((w) => /[a-zà-ü]{3,}/i.test(w)).length >= 9;

export async function computeSignals() {
  const rows = (await q(`SELECT cat, level, correct, hints, guided, time_ms, given, text, nsteps, word, step_errors, scratch_note, created_at
                         FROM attempts WHERE created_at > now() - interval '30 days' ORDER BY id DESC LIMIT 400`)).rows;
  const sessions = (await q(`SELECT status, kind FROM sessions WHERE created_at > now() - interval '30 days' AND kind <> 'intake'`)).rows;
  for (const r of rows) if (r.word == null) r.word = isWordProblem(r.text); // oudere pogingen: afleiden uit de tekst
  const solo = rows.filter((r) => !r.guided && !r.hints);
  const dunno = (r) => r.given === 'weet ik niet' || r.given === 'weet nie';
  const out = [];
  const add = (key, title, status, text, evidence, action) => out.push({ key, title, status, text, evidence, action });

  // 1. Tempo: te snel (impulsief)
  const wrong = solo.filter((r) => !r.correct && !dunno(r));
  const fastWrong = wrong.filter((r) => r.time_ms > 0 && r.time_ms < 6000);
  if (wrong.length < 6) add('impulsief', tx('Tempo: te snel?', 'Tempo: te vinnig?'), 'onbekend', tx('Nog te weinig foute antwoorden om iets te zeggen.', 'Nog te min verkeerde antwoorde om iets te sê.'), tx(`${wrong.length} foute antwoorden`, `${wrong.length} verkeerde antwoorde`), null);
  else if (fastWrong.length / wrong.length >= 0.3) add('impulsief', tx('Tempo: vaak te snel', 'Tempo: dikwels te vinnig'), 'let op',
    tx('Een flink deel van de fouten wordt binnen een paar seconden gegeven: eerder haast dan niet-kunnen.', '’n Groot deel van die foute word binne ’n paar sekondes gegee: eerder haastigheid as nie-kan-nie.'),
    tx(`${fastWrong.length} van de ${wrong.length} foute antwoorden binnen 6 seconden`, `${fastWrong.length} van die ${wrong.length} verkeerde antwoorde binne 6 sekondes`),
    tx('Na een snelle fout vraagt de app rustig om eerst te schatten; Max laat eerst schatten en dan pas rekenen.', 'Ná ’n vinnige fout vra die toep rustig om eers te skat; Max laat eers skat en dan eers uitwerk.'));
  else add('impulsief', tx('Tempo: niet te snel', 'Tempo: nie te vinnig nie'), 'ok', tx('Fouten komen meestal niet door haast.', 'Foute kom meestal nie van haastigheid nie.'), tx(`${fastWrong.length} van de ${wrong.length} fouten binnen 6 seconden`, `${fastWrong.length} van die ${wrong.length} foute binne 6 sekondes`), null);

  // 2. Automatisering basisfeiten: goed maar traag = uittellen
  const facts = solo.filter((r) => FACT_CATS.includes(r.cat) && r.level <= 1 && r.correct && r.time_ms > 0);
  const mFacts = median(facts.map((r) => r.time_ms));
  if (facts.length < 6) add('automatiseren', tx('Tafels en basissommen', 'Tafels en basiese somme'), 'onbekend', tx('Nog te weinig makkelijke tafel- en plussommen gezien.', 'Nog te min maklike tafel- en plussomme gesien.'), tx(`${facts.length} sommen`, `${facts.length} somme`), null);
  else if (mFacts > 12000) add('automatiseren', tx('Tafels en basissommen: goed maar langzaam', 'Tafels en basiese somme: reg maar stadig'), 'let op',
    tx('De basissommen gaan meestal goed, maar duren lang. Waarschijnlijk worden ze uitgeteld in plaats van geweten. Dat kost werkgeheugen bij grotere sommen.', 'Die basiese somme gaan meestal reg, maar duur lank. Waarskynlik word hulle uitgetel in plaas van geken. Dit kos werkgeheue by groter somme.'),
    tx(`gemiddeld ${sec(mFacts)} seconden per basissom (${facts.length} sommen)`, `gemiddeld ${sec(mFacts)} sekondes per basiese som (${facts.length} somme)`),
    tx('Max plant korte, snelle tafelrondjes in; geen extra uitleg nodig, wel vaker oefenen.', 'Max beplan kort, vinnige tafelrondtes (hoofrekene); geen ekstra verduideliking nodig nie, wel meer oefen.'));
  else add('automatiseren', tx('Tafels en basissommen: vlot', 'Tafels en basiese somme: vlot'), 'ok', tx('Basissommen gaan vlot.', 'Basiese somme gaan vlot.'), tx(`gemiddeld ${sec(mFacts)} seconden (${facts.length} sommen)`, `gemiddeld ${sec(mFacts)} sekondes (${facts.length} somme)`), null);

  // 3. Lang bezig en dan toch fout (verdwaalt in de som)
  const slowWrong = wrong.filter((r) => r.time_ms > 90000);
  if (wrong.length >= 6 && slowWrong.length / wrong.length >= 0.3) add('verdwaalt', tx('Lang bezig en dan toch fout', 'Lank besig en dan tog verkeerd'), 'let op',
    tx('Bij een deel van de fouten is er lang gerekend: het overzicht raakt kwijt onderweg.', 'By ’n deel van die foute is lank gewerk: die oorsig raak onderweg weg.'),
    tx(`${slowWrong.length} van de ${wrong.length} fouten na meer dan anderhalve minuut`, `${slowWrong.length} van die ${wrong.length} foute ná meer as ’n minuut en ’n half`),
    tx('De app zet het kladblok open bij die onderdelen en Max werkt in kleinere stappen.', 'Die toep maak die kladblok oop by daardie onderwerpe en Max werk in kleiner stappies.'));

  // 4. Werkgeheugen: lange sommen (veel stappen) vs korte
  const long = solo.filter((r) => r.nsteps >= 4), short = solo.filter((r) => r.nsteps > 0 && r.nsteps <= 2);
  const pl = pct(long.filter((r) => r.correct).length, long.length), ps = pct(short.filter((r) => r.correct).length, short.length);
  if (long.length < 6 || short.length < 6) add('werkgeheugen', tx('Sommen met veel stappen', 'Somme met baie stappe'), 'onbekend', tx('Nog te weinig lange én korte sommen om te vergelijken.', 'Nog te min lang én kort somme om te vergelyk.'), tx(`${long.length} lange, ${short.length} korte`, `${long.length} lang, ${short.length} kort`), null);
  else if (ps - pl >= 25) add('werkgeheugen', tx('Sommen met veel stappen gaan veel slechter', 'Somme met baie stappe gaan baie swakker'), 'let op',
    tx('Korte sommen gaan goed, lange (4+ stappen) duidelijk minder. Dat wijst op overbelasting van het werkgeheugen, niet op niet-snappen.', 'Kort somme gaan goed, lang somme (4+ stappe) duidelik minder. Dit dui op ’n oorlaaide werkgeheue, nie op nie-verstaan nie.'),
    tx(`korte sommen ${ps}% goed, lange ${pl}% goed`, `kort somme ${ps}% reg, lang ${pl}% reg`),
    tx('Max knipt uitleg in kleinere stapjes en laat tussenresultaten opschrijven in het kladblok.', 'Max sny verduidelikings in kleiner stappies en laat tussenantwoorde in die kladblok neerskryf.'));
  else add('werkgeheugen', tx('Sommen met veel stappen', 'Somme met baie stappe'), 'ok', tx('Lange sommen gaan ongeveer even goed als korte.', 'Lang somme gaan omtrent ewe goed as kort somme.'), tx(`korte ${ps}%, lange ${pl}% goed`, `kort ${ps}%, lang ${pl}% reg`), null);

  // 5. Lezen: verhaaltjessommen vs kale sommen (zelfde onderdelen)
  const cats = new Set(solo.filter((r) => r.word).map((r) => r.cat));
  const w = solo.filter((r) => r.word), b = solo.filter((r) => !r.word && cats.has(r.cat));
  const pw = pct(w.filter((r) => r.correct).length, w.length), pb = pct(b.filter((r) => r.correct).length, b.length);
  if (w.length < 6 || b.length < 6) add('lezen', tx('Verhaaltjessommen', 'Woordprobleme'), 'onbekend', tx('Nog te weinig verhaaltjessommen en kale sommen om te vergelijken.', 'Nog te min woordprobleme en kaal somme om te vergelyk.'), tx(`${w.length} verhaaltjes, ${b.length} kaal`, `${w.length} woordprobleme, ${b.length} kaal`), null);
  else if (pb - pw >= 20 || (pb - pw >= 15 && w.length >= 10 && b.length >= 10)) add('lezen', tx('Verhaaltjessommen gaan slechter', 'Woordprobleme gaan swakker'), 'let op',
    tx('Dezelfde soort som gaat kaal beter dan in een verhaaltje. Het lezen of het vertalen naar een som is waarschijnlijk het struikelblok.', 'Dieselfde soort som gaan kaal beter as in ’n woordprobleem. Die lees of die omsit na ’n som is waarskynlik die struikelblok.'),
    tx(`kaal ${pb}% goed, verhaaltjes ${pw}% goed`, `kaal ${pb}% reg, woordprobleme ${pw}% reg`),
    tx('Verhaaltjessommen worden automatisch voorgelezen; Max vraagt eerst "wat wordt er gevraagd?" voor het rekenen.', 'Woordprobleme word outomaties voorgelees; Max vra eers "wat word gevra?" voor die uitwerk.'));
  else add('lezen', tx('Verhaaltjessommen', 'Woordprobleme'), 'ok', tx('Verhaaltjessommen gaan ongeveer even goed als kale sommen.', 'Woordprobleme gaan omtrent ewe goed as kaal somme.'), tx(`kaal ${pb}%, verhaaltjes ${pw}%`, `kaal ${pb}%, woordprobleme ${pw}%`), null);

  // 6. Zelfvertrouwen / spanning
  const nd = rows.filter(dunno).length, stopped = sessions.filter((s) => s.status === 'stopped').length;
  let giveUp = 0, afterWrong = 0;
  const chrono = [...rows].reverse();
  for (let i = 1; i < chrono.length; i++) if (!chrono[i - 1].correct) { afterWrong++; if (dunno(chrono[i]) || (chrono[i].time_ms > 0 && chrono[i].time_ms < 4000 && !chrono[i].correct)) giveUp++; }
  if (rows.length < 15) add('zelfvertrouwen', tx('Zelfvertrouwen', 'Selfvertroue'), 'onbekend', tx('Nog te weinig sommen gezien.', 'Nog te min somme gesien.'), tx(`${rows.length} sommen`, `${rows.length} somme`), null);
  else if (nd / rows.length >= 0.15 || stopped >= 3 || (afterWrong >= 6 && giveUp / afterWrong >= 0.35)) add('zelfvertrouwen', tx('Zelfvertrouwen: kwetsbaar', 'Selfvertroue: kwesbaar'), 'let op',
    tx('Er wordt vaak "weet ik niet" gekozen, gestopt, of opgegeven na een fout. Spanning of weinig vertrouwen zit het leren dan in de weg.', 'Daar word dikwels "weet nie" gekies, gestop, of opgegee ná ’n fout. Spanning of min selfvertroue staan die leer dan in die pad.'),
    tx(`${nd}× "weet ik niet" op ${rows.length} sommen · ${stopped} keer gestopt · na een fout ${giveUp} van de ${afterWrong} keer opgegeven`, `${nd}× "weet nie" uit ${rows.length} somme · ${stopped} keer gestop · ná ’n fout ${giveUp} van die ${afterWrong} keer opgegee`),
    tx('Rustige modus: eerder makkelijkere sommen tussendoor, meer succeservaringen, Max extra kalm en geruststellend, geen druk.', 'Rustige modus: gouer makliker somme tussenin, meer suksesbelewenisse, Max ekstra kalm en gerusstellend, geen druk nie.'));
  else add('zelfvertrouwen', tx('Zelfvertrouwen', 'Selfvertroue'), 'ok', tx('Geen tekenen van opgeven of veel spanning.', 'Geen tekens van opgee of baie spanning nie.'), tx(`${nd}× "weet ik niet" op ${rows.length} sommen · ${stopped} keer gestopt`, `${nd}× "weet nie" uit ${rows.length} somme · ${stopped} keer gestop`), null);

  // 7. Vastlopers op een bepaalde soort tussenstap
  const steps = {};
  for (const r of rows) for (const s of r.step_errors || []) { const k = `${r.cat}|${stepShape(s)}`; (steps[k] ||= { cat: r.cat, step: s, n: 0 }).n++; }
  const stuck = Object.values(steps).filter((s) => s.n >= 2).sort((a, b) => b.n - a.n).slice(0, 4);
  if (stuck.length) add('stappen', tx('Loopt vast bij een bepaalde stap', 'Sit vas by ’n sekere stap'), 'let op',
    tx('Dezelfde soort tussenstap gaat steeds mis. Precies daar zit het probleem, niet in de hele som.', 'Dieselfde soort tussenstap gaan elke keer verkeerd. Presies daar lê die probleem, nie in die hele som nie.'),
    stuck.map((s) => `${catById[s.cat]?.label}: "${s.step}" (${s.n}×)`).join(' · '),
    tx('Max legt juist deze stap anders uit, met een makkelijker voorbeeld.', 'Max verduidelik juis hierdie stap anders, met ’n makliker voorbeeld.'));

  // 8. Waar we nog niet zien wáár het misgaat → kladblok en stappen nodig
  const needWork = await needWorkCats();
  if (needWork.length) add('laatzien', tx('Hier willen we de uitwerking zien', 'Hier wil ons die uitwerking sien'), 'let op',
    tx('Bij deze onderdelen gaat het vaak fout, maar we zien nog niet precies waar. Daarom vraagt de app om de tussenstappen in het kladblok (of samen stap voor stap).', 'By hierdie onderwerpe gaan dit dikwels verkeerd, maar ons sien nog nie presies waar nie. Daarom vra die toep vir die stappe in die kladblok (of saam stap vir stap).'),
    needWork.map((c) => catById[c]?.label).join(', '),
    tx('Kladblok gaat vanzelf open bij deze onderdelen; Max kijkt mee en wijst de foute stap aan. Stopt vanzelf zodra duidelijk is waar het misgaat.', 'Die kladblok gaan vanself oop by hierdie onderwerpe; Max kyk saam en wys die verkeerde stap uit. Stop vanself sodra dit duidelik is waar dit skeefloop.'));

  // 9. Wat helpt (uitleg-vormen per onderwerp)
  const helps = await whatHelps();
  if (helps.length) add('wathelpt', tx('Welke uitleg helpt', 'Watter verduideliking help'), 'info',
    tx('Per onderwerp: na welke soort uitleg de volgende som goed ging. Geen vast "type", maar per onderwerp bewijs.', 'Per onderwerp: ná watter soort verduideliking die volgende som reg was. Geen vaste "tipe" nie, maar bewys per onderwerp.'),
    helps.map((h) => `${h.label}: ${h.forms.map((f) => `${formName(f.form)} ${f.ok}/${f.n}`).join(', ')}`).join(' · '), null);

  return { at: new Date().toISOString(), n: rows.length, signals: out };
}

export const FORM = { plaatje: 'plaatje/model', verhaal: 'verhaaltje/geld', regel: 'regel/trucje', stappen: 'stap voor stap', voorbeeld: 'voordoen' };
const FORM_AF = { plaatje: 'prent/model', verhaal: 'storie/geld', regel: 'reël/truuk', stappen: 'stap vir stap', voorbeeld: 'voordoen' };
const formName = (f) => (isAF() ? FORM_AF : FORM)[f] || f;

// Onderdelen waar het vaak fout gaat zonder dat we weten waar: laatste 8 sommen ≥ 4 fout (zelf gedaan),
// en geen herkende denkfout en (bijna) geen kladblok-analyse van de laatste week.
export async function needWorkCats() {
  const rows = (await q(`SELECT cat, correct, guided, misconception, scratch_note, created_at FROM (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY cat ORDER BY id DESC) rn FROM attempts) t WHERE rn <= 8`)).rows;
  const by = {};
  for (const r of rows) (by[r.cat] ||= []).push(r);
  const out = [];
  for (const [cat, list] of Object.entries(by)) {
    const solo = list.filter((r) => !r.guided);
    const wrong = solo.filter((r) => !r.correct).length;
    if (solo.length < 5 || wrong < 4) continue;
    const known = list.filter((r) => !r.correct && r.misconception).length;
    const seen = list.filter((r) => r.scratch_note && Date.now() - new Date(r.created_at) < 7 * 864e5).length;
    if (known >= 2 || seen >= 2) continue; // we weten al waar het misgaat
    out.push(cat);
  }
  return out;
}

export async function whatHelps() {
  const rows = (await q(`SELECT cat, form, COUNT(*)::int n, SUM(CASE WHEN outcome THEN 1 ELSE 0 END)::int ok
                         FROM explanations WHERE outcome IS NOT NULL GROUP BY cat, form`)).rows;
  const by = {};
  for (const r of rows) (by[r.cat] ||= []).push(r);
  return Object.entries(by).map(([cat, forms]) => ({ cat, label: catById[cat]?.label || cat, forms: forms.sort((a, b) => b.ok / b.n - a.ok / a.n) }))
    .filter((x) => x.forms.reduce((a, f) => a + f.n, 0) >= 3);
}

// Wat de app zelf aanpast (stille schakelaars; het kind ziet geen labels)
export function adaptFlags(sig) {
  const on = (k) => sig?.signals?.some((s) => s.key === k && s.status === 'let op');
  return { calm: on('zelfvertrouwen'), impulsive: on('impulsief'), readAloud: on('lezen'), smallSteps: on('werkgeheugen') || on('verdwaalt'), fluency: on('automatiseren') };
}

// Voor Max: feiten + vaste regels. Nooit benoemen tegen het kind.
export function signalsForMax(sig, helps = []) {
  const lines = (sig?.signals || []).filter((s) => s.status === 'let op').map((s) => `- ${s.title}: ${s.evidence}. Doe: ${s.action}`);
  const h = helps.map((x) => `- ${x.label}: ${x.forms.map((f) => `${f.form} ${f.ok}/${f.n} keer daarna goed`).join(', ')}`);
  if (!lines.length && !h.length) return '';
  return `HOE DIT KIND LEERT (onder de motorkap — noem dit NOOIT tegen het kind, geen labels; pas alleen je aanpak aan):
${lines.join('\n') || '- (nog geen bijzonderheden)'}
${h.length ? `Welke uitleg-vorm hielp per onderwerp (daarna goed / keer gebruikt):\n${h.join('\n')}\nKies meestal de vorm die het best werkt bij dit onderwerp; probeer af en toe (ongeveer 1 op 4) een andere vorm, en combineer gerust (bijv. plaatje + stappen).` : ''}`;
}

// Feiten over DIT kind bij DIT onderwerp, voor Max (gestructureerd, uit de eigen gegevens van de app; geen AI-gok):
// welke denkfouten het kind hier de laatste tijd maakte, en welke uitleg-vorm daarna hielp. Max gebruikt het om sneller
// de goede ingang te kiezen ("weet je nog, de 1 die je moet onthouden?"), nooit als label tegen het kind.
export async function kindFeiten(cat, { af = false } = {}) {
  const fouten = (await q(`SELECT misconception AS m, COUNT(*)::int n, MAX(created_at) AS laatst FROM attempts
      WHERE cat=$1 AND misconception IS NOT NULL AND created_at > now() - interval '60 days' GROUP BY 1 ORDER BY 2 DESC, 3 DESC LIMIT 3`, [cat]).catch(() => ({ rows: [] }))).rows;
  const vormen = (await q(`SELECT form, COUNT(*)::int n, SUM(CASE WHEN outcome THEN 1 ELSE 0 END)::int ok FROM explanations
      WHERE cat=$1 AND outcome IS NOT NULL GROUP BY form HAVING COUNT(*) >= 2 ORDER BY SUM(CASE WHEN outcome THEN 1 ELSE 0 END)::float / COUNT(*) DESC`, [cat]).catch(() => ({ rows: [] }))).rows;
  const recent = (await q(`SELECT COUNT(*)::int n, SUM(CASE WHEN correct THEN 1 ELSE 0 END)::int ok FROM attempts WHERE cat=$1 AND created_at > now() - interval '14 days'`, [cat]).catch(() => ({ rows: [{}] }))).rows[0] || {};
  if (!fouten.length && !vormen.length && !recent.n) return '';
  const dagen = (d) => Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 864e5));
  const L = af
    ? { kop: 'WAT DIE APP VAN HIERDIE KIND BY HIERDIE ONDERWERP WEET (feite; noem dit nooit as ’n etiket nie)', fout: 'Denkfoute wat die kind hier al gemaak het', keer: 'keer', dag: (n) => (n === 0 ? 'vandag' : n === 1 ? 'gister' : `${n} dae gelede`), vorm: 'Verduideliking wat daarna gehelp het (daarna reg / gebruik)', laatste: 'Laaste 14 dae', goed: 'reg' }
    : { kop: 'WAT DE APP OVER DIT KIND BIJ DIT ONDERWERP WEET (feiten; noem het nooit als label)', fout: 'Denkfouten die het kind hier al maakte', keer: 'keer', dag: (n) => (n === 0 ? 'vandaag' : n === 1 ? 'gisteren' : `${n} dagen geleden`), vorm: 'Uitleg die daarna hielp (daarna goed / gebruikt)', laatste: 'Laatste 14 dagen', goed: 'goed' };
  return [L.kop,
    fouten.length ? `- ${L.fout}: ${fouten.map((f) => `"${f.m}" (${f.n} ${L.keer}, laatst ${L.dag(dagen(f.laatst))})`).join('; ')}` : '',
    vormen.length ? `- ${L.vorm}: ${vormen.map((v) => `${v.form} ${v.ok}/${v.n}`).join(', ')}` : '',
    recent.n ? `- ${L.laatste}: ${recent.ok}/${recent.n} ${L.goed}` : ''].filter(Boolean).join('\n');
}
