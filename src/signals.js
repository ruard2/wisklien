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

const FACT_CATS = ['vermenigvuldigen', 'delen', 'optellen'];
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
  const dunno = (r) => r.given === 'weet ik niet';
  const out = [];
  const add = (key, title, status, text, evidence, action) => out.push({ key, title, status, text, evidence, action });

  // 1. Tempo: te snel (impulsief)
  const wrong = solo.filter((r) => !r.correct && !dunno(r));
  const fastWrong = wrong.filter((r) => r.time_ms > 0 && r.time_ms < 6000);
  if (wrong.length < 6) add('impulsief', 'Tempo: te snel?', 'onbekend', 'Nog te weinig foute antwoorden om iets te zeggen.', `${wrong.length} foute antwoorden`, null);
  else if (fastWrong.length / wrong.length >= 0.3) add('impulsief', 'Tempo: vaak te snel', 'let op',
    'Een flink deel van de fouten wordt binnen een paar seconden gegeven: eerder haast dan niet-kunnen.',
    `${fastWrong.length} van de ${wrong.length} foute antwoorden binnen 6 seconden`,
    'Na een snelle fout vraagt de app rustig om eerst te schatten; Max laat eerst schatten en dan pas rekenen.');
  else add('impulsief', 'Tempo: niet te snel', 'ok', 'Fouten komen meestal niet door haast.', `${fastWrong.length} van de ${wrong.length} fouten binnen 6 seconden`, null);

  // 2. Automatisering basisfeiten: goed maar traag = uittellen
  const facts = solo.filter((r) => FACT_CATS.includes(r.cat) && r.level <= 1 && r.correct && r.time_ms > 0);
  const mFacts = median(facts.map((r) => r.time_ms));
  if (facts.length < 6) add('automatiseren', 'Tafels en basissommen', 'onbekend', 'Nog te weinig makkelijke tafel- en plussommen gezien.', `${facts.length} sommen`, null);
  else if (mFacts > 12000) add('automatiseren', 'Tafels en basissommen: goed maar langzaam', 'let op',
    'De basissommen gaan meestal goed, maar duren lang. Waarschijnlijk worden ze uitgeteld in plaats van geweten. Dat kost werkgeheugen bij grotere sommen.',
    `gemiddeld ${sec(mFacts)} seconden per basissom (${facts.length} sommen)`,
    'Max plant korte, snelle tafelrondjes in; geen extra uitleg nodig, wel vaker oefenen.');
  else add('automatiseren', 'Tafels en basissommen: vlot', 'ok', 'Basissommen gaan vlot.', `gemiddeld ${sec(mFacts)} seconden (${facts.length} sommen)`, null);

  // 3. Lang bezig en dan toch fout (verdwaalt in de som)
  const slowWrong = wrong.filter((r) => r.time_ms > 90000);
  if (wrong.length >= 6 && slowWrong.length / wrong.length >= 0.3) add('verdwaalt', 'Lang bezig en dan toch fout', 'let op',
    'Bij een deel van de fouten is er lang gerekend: het overzicht raakt kwijt onderweg.',
    `${slowWrong.length} van de ${wrong.length} fouten na meer dan anderhalve minuut`,
    'De app zet het kladblok open bij die onderdelen en Max werkt in kleinere stappen.');

  // 4. Werkgeheugen: lange sommen (veel stappen) vs korte
  const long = solo.filter((r) => r.nsteps >= 4), short = solo.filter((r) => r.nsteps > 0 && r.nsteps <= 2);
  const pl = pct(long.filter((r) => r.correct).length, long.length), ps = pct(short.filter((r) => r.correct).length, short.length);
  if (long.length < 6 || short.length < 6) add('werkgeheugen', 'Sommen met veel stappen', 'onbekend', 'Nog te weinig lange én korte sommen om te vergelijken.', `${long.length} lange, ${short.length} korte`, null);
  else if (ps - pl >= 25) add('werkgeheugen', 'Sommen met veel stappen gaan veel slechter', 'let op',
    'Korte sommen gaan goed, lange (4+ stappen) duidelijk minder. Dat wijst op overbelasting van het werkgeheugen, niet op niet-snappen.',
    `korte sommen ${ps}% goed, lange ${pl}% goed`,
    'Max knipt uitleg in kleinere stapjes en laat tussenresultaten opschrijven in het kladblok.');
  else add('werkgeheugen', 'Sommen met veel stappen', 'ok', 'Lange sommen gaan ongeveer even goed als korte.', `korte ${ps}%, lange ${pl}% goed`, null);

  // 5. Lezen: verhaaltjessommen vs kale sommen (zelfde onderdelen)
  const cats = new Set(solo.filter((r) => r.word).map((r) => r.cat));
  const w = solo.filter((r) => r.word), b = solo.filter((r) => !r.word && cats.has(r.cat));
  const pw = pct(w.filter((r) => r.correct).length, w.length), pb = pct(b.filter((r) => r.correct).length, b.length);
  if (w.length < 6 || b.length < 6) add('lezen', 'Verhaaltjessommen', 'onbekend', 'Nog te weinig verhaaltjessommen en kale sommen om te vergelijken.', `${w.length} verhaaltjes, ${b.length} kaal`, null);
  else if (pb - pw >= 20 || (pb - pw >= 15 && w.length >= 10 && b.length >= 10)) add('lezen', 'Verhaaltjessommen gaan slechter', 'let op',
    'Dezelfde soort som gaat kaal beter dan in een verhaaltje. Het lezen of het vertalen naar een som is waarschijnlijk het struikelblok.',
    `kaal ${pb}% goed, verhaaltjes ${pw}% goed`,
    'Verhaaltjessommen worden automatisch voorgelezen; Max vraagt eerst "wat wordt er gevraagd?" voor het rekenen.');
  else add('lezen', 'Verhaaltjessommen', 'ok', 'Verhaaltjessommen gaan ongeveer even goed als kale sommen.', `kaal ${pb}%, verhaaltjes ${pw}%`, null);

  // 6. Zelfvertrouwen / spanning
  const nd = rows.filter(dunno).length, stopped = sessions.filter((s) => s.status === 'stopped').length;
  let giveUp = 0, afterWrong = 0;
  const chrono = [...rows].reverse();
  for (let i = 1; i < chrono.length; i++) if (!chrono[i - 1].correct) { afterWrong++; if (dunno(chrono[i]) || (chrono[i].time_ms > 0 && chrono[i].time_ms < 4000 && !chrono[i].correct)) giveUp++; }
  if (rows.length < 15) add('zelfvertrouwen', 'Zelfvertrouwen', 'onbekend', 'Nog te weinig sommen gezien.', `${rows.length} sommen`, null);
  else if (nd / rows.length >= 0.15 || stopped >= 3 || (afterWrong >= 6 && giveUp / afterWrong >= 0.35)) add('zelfvertrouwen', 'Zelfvertrouwen: kwetsbaar', 'let op',
    'Er wordt vaak "weet ik niet" gekozen, gestopt, of opgegeven na een fout. Spanning of weinig vertrouwen zit het leren dan in de weg.',
    `${nd}× "weet ik niet" op ${rows.length} sommen · ${stopped} keer gestopt · na een fout ${giveUp} van de ${afterWrong} keer opgegeven`,
    'Rustige modus: eerder makkelijkere sommen tussendoor, meer succeservaringen, Max extra kalm en geruststellend, geen druk.');
  else add('zelfvertrouwen', 'Zelfvertrouwen', 'ok', 'Geen tekenen van opgeven of veel spanning.', `${nd}× "weet ik niet" op ${rows.length} sommen · ${stopped} keer gestopt`, null);

  // 7. Vastlopers op een bepaalde soort tussenstap
  const steps = {};
  for (const r of rows) for (const s of r.step_errors || []) { const k = `${r.cat}|${stepShape(s)}`; (steps[k] ||= { cat: r.cat, step: s, n: 0 }).n++; }
  const stuck = Object.values(steps).filter((s) => s.n >= 2).sort((a, b) => b.n - a.n).slice(0, 4);
  if (stuck.length) add('stappen', 'Loopt vast bij een bepaalde stap', 'let op',
    'Dezelfde soort tussenstap gaat steeds mis. Precies daar zit het probleem, niet in de hele som.',
    stuck.map((s) => `${catById[s.cat]?.label}: "${s.step}" (${s.n}×)`).join(' · '),
    'Max legt juist deze stap anders uit, met een makkelijker voorbeeld.');

  // 8. Waar we nog niet zien wáár het misgaat → kladblok en stappen nodig
  const needWork = await needWorkCats();
  if (needWork.length) add('laatzien', 'Hier willen we de uitwerking zien', 'let op',
    'Bij deze onderdelen gaat het vaak fout, maar we zien nog niet precies waar. Daarom vraagt de app om de tussenstappen in het kladblok (of samen stap voor stap).',
    needWork.map((c) => catById[c]?.label).join(', '),
    'Kladblok gaat vanzelf open bij deze onderdelen; Max kijkt mee en wijst de foute stap aan. Stopt vanzelf zodra duidelijk is waar het misgaat.');

  // 9. Wat helpt (uitleg-vormen per onderwerp)
  const helps = await whatHelps();
  if (helps.length) add('wathelpt', 'Welke uitleg helpt', 'info',
    'Per onderwerp: na welke soort uitleg de volgende som goed ging. Geen vast "type", maar per onderwerp bewijs.',
    helps.map((h) => `${h.label}: ${h.forms.map((f) => `${FORM[f.form] || f.form} ${f.ok}/${f.n}`).join(', ')}`).join(' · '), null);

  return { at: new Date().toISOString(), n: rows.length, signals: out };
}

export const FORM = { plaatje: 'plaatje/model', verhaal: 'verhaaltje/geld', regel: 'regel/trucje', stappen: 'stap voor stap', voorbeeld: 'voordoen' };

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
