// De AI-leraar ("Meester Max"). Hoofdroute: OpenAI (OPENAI_API_KEY).
// Terugval: Claude (ANTHROPIC_API_KEY). Zonder sleutel werkt de app met de ingebouwde uitleg.
//
// De leraar:
//  - voert per som een gesprek (vóór het antwoord: helpen zonder voorzeggen; na een fout:
//    diagnose + stap voor stap samen oplossen; bij een tussenstap: precies díe stap uitleggen)
//  - geeft korte interactieve lessen (uitleg → voorbeeld → controlevraag → feedback)
//  - houdt een leerlingprofiel bij (denkfouten, wat werkt) en gebruikt dat in elk gesprek
//  - schrijft na elke sessie een persoonlijk berichtje en adviseert de ouder
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'node:crypto';
import { mnemonicText } from './mnemonics.js';
import { kidStore } from './db.js';

// ---------- privacy: de AI ziet nooit de echte naam ----------
// Op de server heet het kind gewoon "Christo"; naar de AI gaat een vaste schuilnaam (bijv. "Leerling-4821").
// Uitgaand: echte naam → schuilnaam. Terug: schuilnaam → echte naam. Zo blijft het gesprek persoonlijk,
// maar staat er bij OpenAI geen naam en geen kind-id.
export function aliasFor(kidId) {
  const h = crypto.createHash('sha256').update(`${process.env.SESSION_SECRET || 'rekenen'}:${kidId}`).digest();
  return `Leerling-${1000 + (h.readUInt32BE(0) % 9000)}`;
}
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function privacy() {
  const st = kidStore.getStore();
  if (!st?.kid) return null;
  const alias = aliasFor(st.kid);
  const real = String(st.name || '').trim();
  return {
    alias,
    out: (t) => (real.length >= 2 ? String(t).replace(new RegExp(`(?<![\\p{L}])${escRe(real)}(?![\\p{L}])`, 'giu'), alias) : String(t)),
    back: (t) => String(t).split(alias).join(real || 'jij'),
  };
}
function mapStrings(v, f) {
  if (typeof v === 'string') return f(v);
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, f));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x, f)]));
  return v;
}

export const TEACHER = process.env.TEACHER_NAME || 'Meester Max';
const openai = process.env.OPENAI_API_KEY ? new OpenAI() : null;
const anthropic = !openai && process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
// AI_MOCK=1: nep-leraar om de schermen te testen zonder API-sleutel (alleen voor ontwikkeling)
const mock = process.env.AI_MOCK === '1' && !openai && !anthropic;
export const aiEnabled = () => !!(openai || anthropic || mock);
export const aiProvider = () => (openai ? 'openai' : anthropic ? 'claude' : mock ? 'test (nep)' : null);

// ---------- model kiezen (OpenAI) ----------
// Modelnamen veranderen snel: we kiezen het eerste beschikbare model uit een voorkeurslijst.
const PREFER = (process.env.OPENAI_MODEL || 'gpt-6-luna,gpt-5.5,gpt-5.6-terra,gpt-5.4-mini,gpt-5-mini,gpt-4.1-mini,gpt-4o-mini').split(',').map((s) => s.trim()).filter(Boolean);
let chosenModel = null;
async function openaiModel() {
  if (chosenModel) return chosenModel;
  try {
    const have = new Set();
    for await (const m of openai.models.list()) have.add(m.id);
    chosenModel = PREFER.find((m) => have.has(m)) || PREFER[0];
  } catch {
    chosenModel = PREFER[0];
  }
  console.log(`[ai] OpenAI-model: ${chosenModel}`);
  return chosenModel;
}
export const aiModel = () => (openai ? chosenModel || PREFER[0] : anthropic ? (process.env.AI_MODEL || 'claude-opus-5-5') : null);

// Eén aanroep. messages: [{role:'user'|'assistant', content}]. json: verwacht een JSON-object terug.
// Plaatje (kladblok) meesturen met het laatste bericht van de gebruiker
function withImage(messages, image, provider) {
  if (!image || !/^data:image\/(png|jpeg|webp);base64,/.test(image)) return messages;
  const m = [...messages];
  const i = m.map((x) => x.role).lastIndexOf('user');
  if (i < 0) return messages;
  const text = String(m[i].content);
  if (provider === 'openai') m[i] = { role: 'user', content: [{ type: 'text', text }, { type: 'image_url', image_url: { url: image, detail: 'high' } }] };
  else {
    const [, mt, data] = image.match(/^data:(image\/\w+);base64,(.+)$/) || [];
    m[i] = { role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mt, data } }, { type: 'text', text }] };
  }
  return m;
}

async function complete(system, messages, opts = {}) {
  const p = privacy();
  if (!p) return completeRaw(system, messages, opts);
  const safeMsgs = messages.map((m) => ({ ...m, content: typeof m.content === 'string' ? p.out(m.content) : m.content }));
  const res = await completeRaw(p.out(system), safeMsgs, { ...opts, user: p.alias });
  return res == null ? res : mapStrings(res, p.back);
}

async function completeRaw(system, messages, { json = false, maxTokens = 1200, image = null, user = null } = {}) {
  if (mock) {
    await new Promise((r) => setTimeout(r, 400));
    const last = String(messages.at(-1)?.content || '');
    if (json) return { samenvatting: '(test) Optellen gaat goed, breuken nog lastig.', onderdelen: [{ onderdeel: 'Breuken', denkfouten: ['telt noemers bij elkaar op'], wat_helpt: 'pizza-plaatjes en gelijknamig maken', prioriteit: 'hoog' }], aanpak_tips: ['kleine stapjes'] };
    const turns = messages.filter((m) => m.role === 'assistant').length;
    const klaar = /les over/i.test(messages[0]?.content || '') && turns >= 3 ? '\n[KLAAR]' : '';
    return `(testleraar) Ik zie wat er gebeurde! Laten we het samen doen. **Stap ${turns}**: wat denk jij dat de eerste stap is?\n(reactie op: "${last.slice(0, 60)}")${klaar}`;
  }
  try {
    if (openai) {
      const model = await openaiModel();
      const reasoning = /^(gpt-5|o\d)/.test(model);
      const res = await openai.chat.completions.create({
        model,
        messages: [{ role: 'system', content: system }, ...withImage(messages, image, 'openai')],
        max_completion_tokens: reasoning ? maxTokens + 2500 : maxTokens,
        ...(reasoning ? { reasoning_effort: process.env.OPENAI_EFFORT || 'low' } : {}),
        ...(json ? { response_format: { type: 'json_object' } } : {}),
        // anoniem kenmerk (geen naam) zodat misbruik per gebruiker herleidbaar blijft voor OpenAI's veiligheidssystemen
        ...(user ? { safety_identifier: crypto.createHash('sha256').update(user).digest('hex').slice(0, 32) } : {}),
        store: false,
      });
      const text = res.choices?.[0]?.message?.content?.trim() || '';
      return json ? safeJson(text) : text || null;
    }
    if (anthropic) {
      const res = await anthropic.beta.messages.create({
        model: process.env.AI_MODEL || 'claude-opus-5-5',
        max_tokens: 4000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: json ? system + '\n\nAntwoord uitsluitend met één geldig JSON-object, zonder uitleg eromheen.' : system,
        messages: withImage(messages, image, 'anthropic'),
      });
      if (res.stop_reason === 'refusal') return null;
      const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      return json ? safeJson(text) : text || null;
    }
    return null;
  } catch (e) {
    if (e instanceof OpenAI.NotFoundError && openai) { console.error(`[ai] model "${chosenModel}" niet gevonden — zet OPENAI_MODEL`); chosenModel = null; }
    else if (e instanceof OpenAI.AuthenticationError || e instanceof Anthropic.AuthenticationError) console.error('[ai] ongeldige API-sleutel');
    else if (e instanceof OpenAI.RateLimitError || e instanceof Anthropic.RateLimitError) console.warn('[ai] rate limit / tegoed op');
    else console.error('[ai]', e?.status || '', e?.message || e);
    return null;
  }
}
function safeJson(text) {
  try { return JSON.parse(text.replace(/^```(json)?|```$/g, '').trim()); } catch { return null; }
}

// ---------- de leraar ----------
const LERAAR = (name, profile, memory = '', today = '') => `Je bent ${TEACHER}, de persoonlijke rekenleraar van ${name}. ${name} zit op een Nederlandse basisschool (meestal groep 7 of 8), loopt achter met rekenen en is géén rekenwonder. Je bent geduldig, warm, eerlijk en een tikje grappig. Je praat met ${name} zoals een hele goede bijlesjuf of -meester: echt een gesprek, geen standaardteksten.

HOE JE LESGEEFT
- Kleine stapjes. Eén ding tegelijk. Stel per bericht maximaal één vraag en wacht op het antwoord.
- Maak het concreet: geld, pizza, voetbal, gamen, snoep, een tabelletje of een getallenlijn.
- Gebruik de aanpak van Nederlandse rekenmethodes (Pluspunt, Wereld in getallen): splitsen, in stukjes onder elkaar, "happen" bij delen, een tabelletje, de maten-trap (km-hm-dam-m-dm-cm-mm), "eerst 10%" of "eerst 1%".
- Kijk naar het antwoord dat ${name} gaf en zoek de denkfout (bijv. getallen onder de streep opgeteld, komma verkeerd, tafel vergeten, eenheid niet omgerekend). Benoem die vriendelijk en concreet.
- Laat ${name} zoveel mogelijk zelf doen. Vraag "Wat denk jij dat … is?" in plaats van alles voor te zeggen.
- Lukt het na twee pogingen nog niet: doe het dan zelf heel duidelijk voor (stap voor stap, maximaal 4 korte stappen) en laat ${name} alleen de laatste stap zelf doen.
- Is het antwoord op jouw vraag goed? Zeg dat duidelijk ("Ja! Precies.") en ga één stapje verder.
- Prijs inzet en aanpak, niet "slim zijn". Fouten zijn normaal.

PAS JE STEEDS AAN (heel belangrijk)
- Lees na elk bericht opnieuw hoe het gaat en pas je aan, net als een echte leraar:
  · Korte antwoorden, "weet niet", "?" of stilte → nóg kleiner stapje, een makkelijker voorbeeld, of geef een keuze (A of B).
  · Frustratie ("stom", "ik snap er niks van", "ik ben dom", boos) → eerst geruststellen en het gevoel serieus nemen, dan een veel makkelijkere ingang. Nooit doorduwen.
  · Snel en goed → minder uitleg, iets meer uitdaging, tempo omhoog.
  · Half goed → zeg precies wat goed is en wat nog niet.
  · Snapt ${name} je vraag niet → stel dezelfde vraag anders, eenvoudiger.
  · Stelt ${name} zelf een vraag → beantwoord die kort en eindig met een kleine vraag, zodat ${name} zelf de volgende stap rekent. Geef het eindantwoord niet weg als ${name} het zelf kan vinden.
  · Werkt een uitleg 2 keer niet → kies een héél andere manier (geld i.p.v. pizza, getallenlijn, tafelrijtje, met kleinere getallen, of terug naar een makkelijkere som).
- Sluit aan bij hoe ${name} praat: simpel en informeel als ${name} dat ook doet. Gebruik soms de naam.
- Vraagt ${name} iets anders over rekenen: beantwoord het gewoon. Gaat het over iets heel anders: kort vriendelijk reageren en dan terug naar de som.
- Zegt ${name} het te snappen: geef een supersnelle controlevraag of zeg dat de volgende som eraan komt.

WOORDEN
- Ga er NOOIT van uit dat ${name} vakwoorden kent. Zeg het eerst in gewone woorden: "het getal onder de streep" i.p.v. "noemer", "het getal boven de streep" i.p.v. "teller", "zorgen dat de getallen onder de streep hetzelfde zijn" i.p.v. "gelijknamig maken", "de rand rondom" i.p.v. "omtrek".
- Wil je het vakwoord leren, zet het er dan tussen haakjes achter: "het getal onder de streep (dat heet de noemer)".
- Korte, gewone zinnen. "Keer" in plaats van "vermenigvuldigen", "delen door" in plaats van "de deler".

ONTHOUDEN EN VOORTBOUWEN
- Je kent ${name} al. Gebruik wat je weet (hieronder): verwijs ernaar als het past ("Weet je nog, met die pizza?"), gebruik uitleg en voorbeelden die eerder werkten, en let extra op denkfouten die vaker voorkomen.
- Gebruik interesses van ${name} in voorbeelden als je die kent.
- Herhaal niet letterlijk wat je net al zei; bouw verder op het gesprek.

EZELSBRUGGETJES
- Als het helpt (niet bij elk bericht), gebruik een ezelsbruggetje of geheugensteuntje uit de lijst bij de som. Leg kort uit hoe het werkt.
- Noem iets alleen een "bekend ezelsbruggetje" als het zo in de lijst staat. Een eigen trucje mag, maar zeg dan "trucje".

STIJL
- Kort en to the point: meestal 2 tot 5 korte zinnen (max. ± 80 woorden). Geen lappen tekst.
- Nederlandse notatie: 2,5 (komma), × voor keer, : voor delen.
- Gewone tekst; **vet** mag voor het belangrijkste. Geen tabellen, geen koppen.
- Af en toe een licht grapje mag, maar de uitleg gaat voor.
- Spreek ${name} aan met "je". Gebruik over ${name} geen "hij" of "zij" als je dat niet zeker weet.
${profile ? `\nLEERLINGPROFIEL VAN ${name.toUpperCase()}\n${profile}` : ''}${memory ? `\nJOUW NOTITIES OVER ${name.toUpperCase()} (uit eerdere lessen)\n${memory}` : ''}${today ? `\nVANDAAG IN DEZE SESSIE\n${today}` : ''}`;

function describeQuestion(q) {
  let s = `Som: ${q.text}`;
  if (q.options) s += `\nKeuzes: ${q.options.join(' | ')}`;
  if (q.visual?.kind === 'bar' || q.visual?.kind === 'line') s += `\nGrafiek "${q.visual.title}": ${q.visual.labels.map((l, i) => `${l}=${q.visual.values[i]}`).join(', ')}`;
  if (q.visual?.kind === 'pie') s += `\nCirkeldiagram: ${q.visual.labels.map((l, i) => `${l} ${q.visual.values[i]}%`).join(', ')}`;
  if (q.visual?.kind === 'table') s += `\nTabel: ${JSON.stringify({ kop: q.visual.headers, rijen: q.visual.rows })}`;
  if (q.visual?.kind === 'rect' || q.visual?.kind === 'tri') s += `\nTekening: ${q.visual.kind === 'rect' ? 'rechthoek' : 'driehoek'} ${q.visual.w} bij ${q.visual.h} ${q.visual.unit}`;
  if (q.visual?.kind === 'pizza') s += `\nTekening: pizza in ${q.visual.parts} stukken, ${q.visual.eaten} opgegeten`;
  if (q.visual?.kind === 'grid') s += `\nTekening: rechthoek van ${q.visual.w} bij ${q.visual.h} hokjes`;
  return s;
}

// Eén beurt van de leraar in het gesprek bij een som.
// phase: 'before' (nog niet geantwoord) | 'wrong' | 'right' | 'step' (vast bij een tussenstap)
function scratchContext(name, scratch, phase) {
  if (!scratch || (!scratch.image && !scratch.text)) return '';
  return [`KLADBLOK: ${name} heeft op een kladblaadje gerekend${scratch.text ? `. Getypt: "${scratch.text}"` : ''}${scratch.image ? '. De afbeelding bij het laatste bericht is dat kladblaadje (met de vinger getekend, dus soms slordig).' : '.'}`,
    phase === 'wrong' ? `Kijk heel goed naar die uitwerking: welke stappen deed ${name}, wat ging daarin goed, en op welke plek precies ging het mis? Noem eerst kort wat goed ging in de uitwerking, en wijs dan die ene plek aan waar het misging (zonder het eindantwoord te geven).`
      : phase === 'right' ? 'Kijk naar de uitwerking: noem kort wat slim was aan de aanpak.'
        : `Kijk mee in de uitwerking tot nu toe en help vanaf daar verder (niet het antwoord verklappen).`].join('\n');
}

export async function teacherTurn({ name, profile, memory, today, question, levelName, phase, given, chat = [], step, misconception, scratch = null }) {
  const ctx = [
    'CONTEXT (alleen voor jou):',
    describeQuestion(question),
    `Niveau van deze som: ${levelName}.`,
    `Juiste antwoord: ${question.display}`,
    `Stappenplan: ${question.steps.join(' / ')}`,
    phase === 'before' ? `${name} heeft nog NIET geantwoord. Verklap het eindantwoord niet. Help op weg met een vraag of een tip.` : '',
    phase === 'wrong' ? `${name} antwoordde "${given}". Dat is FOUT.` : '',
    phase === 'wrong' && misconception ? `Herkende denkfout (zeker): ${misconception.label} Wat helpt: ${misconception.fix}` : '',
    mnemonicText(question.cat) ? `Ezelsbruggetjes/geheugensteuntjes bij dit onderwerp:\n${mnemonicText(question.cat)}` : '',
    phase === 'right' ? `${name} antwoordde "${given}". Dat is GOED.` : '',
    phase === 'step' && step ? `${name} rekent samen met je in tussenstappen en loopt vast bij de stap: "${step.ask}" (goed is ${step.display}). Poging van ${name}: "${given || '?'}". Verklap het antwoord van deze stap niet meteen.` : '',
    scratchContext(name, scratch, phase),
  ].filter(Boolean).join('\n');

  const opener = {
    wrong: `Begin het gesprek: zeg in één zin vriendelijk wat er waarschijnlijk misging (kijk naar het antwoord "${given}"). Stel daarna één eenvoudige vraag waarmee ${name} zelf de eerste stap van de oplossing zet.`,
    step: 'Leg deze ene tussenstap heel concreet uit, het liefst met een makkelijker voorbeeld (bijv. met kleinere getallen of met geld). Vraag daarna om het zelf nog eens te proberen.',
    right: 'Geef een kort compliment over de aanpak en één slimme tip voor dit soort sommen.',
    before: 'Help op weg.',
  }[phase];

  const messages = [{ role: 'user', content: ctx }, { role: 'assistant', content: 'Begrepen. Ik help stap voor stap.' }];
  if (!chat.length) messages.push({ role: 'user', content: `[instructie] ${opener}` });
  for (const m of chat.slice(-20)) messages.push({ role: m.role === 'teacher' ? 'assistant' : 'user', content: m.text });
  if (messages.at(-1).role === 'assistant') messages.push({ role: 'user', content: '[instructie] Ga verder.' });
  return complete(LERAAR(name, profile, memory, today), messages, { maxTokens: 500, image: scratch?.image || null });
}

// Kladblok bekijken: hoe rekende het kind, en waar ging het mis? Kort, voor het profiel en het geheugen.
export async function analyzeScratch({ name, question, given, correct, scratch }) {
  if (!scratch || (!scratch.image && !scratch.text)) return null;
  const data = await complete('Je bent een ervaren remedial teacher rekenen (Nederlands basisonderwijs). Je bekijkt het kladblaadje van een kind en beschrijft kort en concreet hoe het rekende.', [{
    role: 'user',
    content: `${describeQuestion(question)}\nJuiste antwoord: ${question.display}\nAntwoord van ${name}: "${given}" (${correct ? 'goed' : 'FOUT'})\n${scratch.text ? `Getypt op het kladblok: "${scratch.text}"\n` : ''}${scratch.image ? 'De afbeelding is het kladblaadje (met de vinger getekend).\n' : ''}
Geef JSON: {"leesbaar": true/false, "aanpak": "welke aanpak/stappen ${name} gebruikte, max 15 woorden", "fout": "waar het precies misging, max 15 woorden, of null als het goed ging", "denkfout": "kort label van de denkfout, of null"}
Alleen wat je echt ziet. Gebruik alles: de tekening én de getypte tekst. Is de tekening onleesbaar maar de tekst wel bruikbaar, dan is leesbaar=true. Alleen als er nergens iets bruikbaars staat: leesbaar=false en de rest null.`,
  }], { json: true, maxTokens: 400, image: scratch.image || null });
  if (!data || data.leesbaar === false) return null;
  const parts = [data.aanpak && `aanpak: ${data.aanpak}`, data.fout && `fout: ${data.fout}`, data.denkfout && `denkfout: ${data.denkfout}`].filter(Boolean);
  return parts.length ? parts.join(' · ').slice(0, 300) : null;
}

// Interactieve mini-les voor een onderdeel. Eerste beurt: uitleg + voorbeeld + één controlevraag.
// Daarna: reageer op het antwoord. Na 2 goede controlevragen: [KLAAR] aan het eind.
export async function lessonTurn({ name, profile, memory, cat, catLabel, levelName, mistakes = [], chat = [] }) {
  const ctx = `CONTEXT: Je geeft ${name} een korte les over "${catLabel}" op ${levelName}-niveau.
${mnemonicText(cat) ? `Ezelsbruggetjes/geheugensteuntjes die je kunt gebruiken:\n${mnemonicText(cat)}\n` : ''}
${mistakes.length ? `Recente fouten van ${name} bij dit onderdeel:\n${mistakes.map((m) => `- ${m.text} → gaf "${m.given}", goed was ${m.display}`).join('\n')}` : 'Nog geen recente fouten bekend.'}

Zo verloopt de les:
1. Eerste bericht: leg in maximaal 4 korte zinnen uit hoe je dit aanpakt (met de methode-aanpak), geef één uitgewerkt voorbeeld met kleine getallen, en stel één makkelijke controlevraag.
2. Reageer daarna op het antwoord van ${name}: goed → compliment en een iets moeilijkere controlevraag; fout → zoek de denkfout, leg dat ene stukje anders uit, en stel een vergelijkbare vraag.
3. Zijn 2 controlevragen goed: zeg dat ${name} klaar is om te oefenen en zet op de laatste regel precies: [KLAAR]
Houd elk bericht kort (max. ± 90 woorden).`;
  const messages = [{ role: 'user', content: ctx }, { role: 'assistant', content: 'Begrepen.' }];
  if (!chat.length) messages.push({ role: 'user', content: '[instructie] Begin de les.' });
  for (const m of chat.slice(-14)) messages.push({ role: m.role === 'teacher' ? 'assistant' : 'user', content: m.text });
  if (messages.at(-1).role === 'assistant') messages.push({ role: 'user', content: '[instructie] Ga verder.' });
  const text = await complete(LERAAR(name, profile, memory), messages, { maxTokens: 600 });
  if (!text) return null;
  return { text: text.replace(/\s*\[KLAAR\]\s*/g, '').trim(), ready: /\[KLAAR\]/.test(text) };
}

// Lesplan voor vandaag: Max bepaalt per onderdeel het niveau, het aantal sommen en een woordje.
// rows: [{cat, label, level (0-3), levelName, score, recent: 'x/y', trend, struggling}]
export async function planSession({ name, profile, memory, groep, rows, n }) {
  const table = rows.map((r) => `${r.cat} | ${r.label} | nu: ${r.levelName} | score ${r.score}/100 | laatste 14 dagen: ${r.recent || 'nog niet geoefend'} | trend ${r.trend ?? '-'}${r.struggling ? ' | LOOPT VAST' : ''}${r.calib ? ' | NIVEAU NOG ONZEKER' : ''}`).join('\n');
  return complete(LERAAR(name, profile, memory), [{
    role: 'user',
    content: `Maak het lesplan voor de oefensessie van vandaag (${n} sommen). ${name} zit in groep ${groep || 8}.
Niveaus: 0 = groep 5, 1 = groep 6, 2 = groep 7, 3 = groep 8 (eindniveau). Elk onderdeel heeft een eigen niveau.

Onderdelen (cat-id | naam | huidig niveau | score | resultaten | trend):
${table}

Regels:
- Differentieer echt per onderdeel. Kies per onderdeel het niveau waarop ${name} vandaag het meeste leert: uitdagend maar haalbaar (ongeveer 70-80% goed).
- Je mag het niveau hooguit 1 stap afwijken van het huidige. Lager als het de laatste tijd vaak fout ging (minder dan de helft goed); hoger als het heel goed gaat (85% of meer goed, met genoeg sommen); anders gelijk.
- "NIVEAU NOG ONZEKER" = de starttoets was kort; dit niveau is een schatting. Geef zulke onderdelen 1 of 2 sommen, zodat we ze leren kennen.
- Verdeel precies ${n} sommen. Onderdelen die lastig zijn krijgen er meer (3 tot 6), onderdelen die goed gaan weinig (0 of 1, af en toe 1 om het bij te houden). Maximaal 6 per onderdeel. Gebruik minstens 5 verschillende onderdelen.
- Schrijf per onderdeel een korte notitie AAN ${name} (max. 15 woorden): een concreet compliment waar het goed gaat, een eerlijke aanmoediging waar het nog lastig is. Geen vaktaal.
- Schrijf een bericht aan ${name} (max. 55 woorden): begin met wat goed gaat (noem onderdelen), zeg waar jullie vandaag aan werken en waarom, en moedig aan. Mag een grapje bevatten.

Geef JSON: {"bericht": "...", "onderdelen": [{"cat": "cat-id", "niveau": 0-3, "aantal": 0-6, "notitie": "..."}]}  (alle onderdelen noemen, ook met aantal 0)`,
  }], { json: true, maxTokens: 1500 });
}

// Persoonlijk berichtje na een sessie.
export async function reflect({ name, profile, memory, summary }) {
  return complete(LERAAR(name, profile, memory), [{
    role: 'user',
    content: `${summary}\n\nSchrijf ${name} een kort persoonlijk berichtje (max. 60 woorden) na deze sessie: 1) wat er echt goed ging (concreet), 2) waar jullie samen nog aan gaan werken, 3) een aanmoediging (mag grappig). Geen vragen stellen.`,
  }], { maxTokens: 300 });
}

// Leerlingprofiel bijwerken op basis van recente pogingen.
// Het leerlingprofiel: blijft bestaan over alle sessies heen. Zwakke punten krijgen bewijs en een status,
// zodat oude problemen niet vergeten worden en je ziet wat er opgelost is.
export async function updateProfile({ name, oldProfile, attempts, stats = [], misconceptions = [], memory = '' }) {
  const data = await complete('Je bent een ervaren remedial teacher rekenen (Nederlands basisonderwijs). Je houdt een leerlingdossier bij van een kind dat achterloopt met rekenen. Je bent precies en eerlijk: je noemt alleen wat de data laat zien.', [{
    role: 'user',
    content: `HUIDIG PROFIEL (kan leeg zijn):
${oldProfile || '(leeg)'}

STAND PER ONDERDEEL (niveau nu | aantal sommen totaal | % goed totaal | % goed laatste 14 dagen | trend):
${stats.map((x) => `${x.label} | ${x.level} | ${x.n} | ${x.pct}% | ${x.pct14 == null ? '-' : x.pct14 + '%'} | ${x.trend}`).join('\n') || '(nog niets)'}

HERKENDE DENKFOUTEN (hoe vaak, alles):
${misconceptions.map((m) => `${m.misconception} (${m.n}×)`).join('\n') || '(geen)'}

NOTITIES VAN DE LERAAR (gesprekken):
${memory || '(geen)'}

RECENTE POGINGEN (onderdeel | niveau | som | antwoord kind | goed antwoord | goed? | hulp | kladblok):
${attempts.map((a) => `${a.label} | ${a.level} | ${a.text} | ${a.given} | ${a.display} | ${a.correct ? 'goed' : 'FOUT'} | ${a.guided ? 'tussenstappen' : a.hints ? 'hints' : 'zelf'}${a.scratch_note ? ` | ${a.scratch_note}` : ''}`).join('\n')}

Werk het dossier van ${name} bij. Regels:
- Neem zwakke punten uit het huidige profiel over, tenzij de data laat zien dat het nu goed gaat: zet dan status "gaat beter" of "opgelost" (en zeg in "bewijs" waarom).
- Een zwak punt is concreet (niet "breuken", wel "telt bij optellen ook de getallen onder de streep op").
- "bewijs" noemt echte voorbeelden of aantallen uit de data.
- Max 8 zwakke punten; opgeloste punten max 3 (de nieuwste).
Geef JSON:
{"samenvatting": "2-3 zinnen: waar staat ${name}, wat gaat goed, wat niet, en of het vooruitgaat",
 "sterk": ["onderdeel + kort waarom (max 4)"],
 "zwakke_punten": [{"onderdeel": "naam", "punt": "wat er precies misgaat", "bewijs": "waaraan je het ziet", "status": "nieuw|mee bezig|gaat beter|opgelost", "wat_helpt": "welke uitleg/aanpak werkt", "prioriteit": "hoog|midden|laag"}],
 "leerstijl": "hoe ${name} het best leert (tempo, soort uitleg, voorbeelden, wat motiveert) — alleen als je het echt ziet",
 "aanpak_tips": ["korte tip voor de leraar (max 3)"]}`,
  }], { json: true, maxTokens: 1800 });
  return data && typeof data === 'object' && (data.samenvatting || data.zwakke_punten) ? data : null;
}
// Na een sessie of les: korte notities voor het geheugen van de leraar.
export async function remember({ name, transcript }) {
  const data = await complete(`Je bent ${TEACHER}, de rekenleraar van ${name} (basisschool, loopt achter met rekenen). Je maakt korte notities voor jezelf, zodat je de volgende keer kunt voortbouwen.`, [{
    role: 'user',
    content: `Dit gebeurde zojuist:\n${transcript}\n\nSchrijf 1 tot 4 korte notities (elk max. 20 woorden) die je de volgende keer helpen. Denk aan: wat ${name} nu wél snapt, waar ${name} precies vastliep, welke uitleg of welk voorbeeld werkte, wat ${name} over zichzelf vertelde (interesses, gevoel), en hoe ${name} het liefst uitleg krijgt (kort of uitgebreid, met welk soort voorbeelden). Alleen dingen die je echt zag. Geef JSON: {"notities": ["..."]}`,
  }], { json: true, maxTokens: 500 });
  return Array.isArray(data?.notities) ? data.notities.filter((n) => typeof n === 'string' && n.trim()).slice(0, 4) : [];
}

export function profileText(p) {
  if (!p) return '';
  const lines = [];
  if (p.samenvatting) lines.push(p.samenvatting);
  if (p.sterk?.length) lines.push(`Sterk: ${p.sterk.join('; ')}`);
  for (const z of p.zwakke_punten || []) {
    if (z.status === 'opgelost') { lines.push(`- (opgelost) ${z.onderdeel}: ${z.punt}`); continue; }
    lines.push(`- ${z.onderdeel} [${z.status || '?'}, ${z.prioriteit || '?'}]: ${z.punt}${z.wat_helpt ? ` → helpt: ${z.wat_helpt}` : ''}`);
  }
  // oud formaat (van vóór de zwakke punten)
  for (const o of p.onderdelen || []) lines.push(`- ${o.onderdeel} (${o.prioriteit || '?'}): ${(o.denkfouten || []).join('; ')}${o.wat_helpt ? ` → helpt: ${o.wat_helpt}` : ''}`);
  if (p.leerstijl) lines.push(`Leerstijl: ${p.leerstijl}`);
  if (p.aanpak_tips?.length) lines.push(`Tips: ${p.aanpak_tips.join(' / ')}`);
  return lines.join('\n');
}

// Teach-back: het kind legt uit hoe het een som oploste.
export async function teachBack({ name, profile, memory, question, explanation }) {
  return complete(LERAAR(name, profile, memory), [{
    role: 'user',
    content: `${describeQuestion(question)}\nJuiste antwoord: ${question.display}\nStappenplan: ${question.steps.join(' / ')}\n\n${name} had deze som goed en legt nu zelf uit hoe het ging:\n"""${explanation}"""\n\nGeef korte feedback (max 60 woorden): wat goed is aan de uitleg (noem de eigen woorden van ${name}), klopt de manier, mist er een stap? Eindig met een aanmoediging. Geen vragen terug.`,
  }], { maxTokens: 300 });
}

// Advies voor de ouder.
export async function parentAdvice({ name, summary, profile }) {
  return complete('Je bent een ervaren remedial teacher rekenen in het Nederlandse basisonderwijs. Je adviseert een ouder van een kind (meestal groep 7/8) dat achterloopt met rekenen. Je kent de referentieniveaus 1F en 1S, de doorstroomtoets, en methodes als Pluspunt en Wereld in getallen. Schrijf helder, concreet en praktisch. Geen tabellen; korte kopjes met ** mogen.', [{
    role: 'user',
    content: `Oefengegevens van ${name}:\n${summary}\n\nLeerlingprofiel (door de AI-leraar bijgehouden):\n${profile || '(nog leeg)'}\n\nGeef (max 300 woorden):\n1. Eerlijke samenvatting: waar staat ${name}.\n2. De belangrijkste denkfouten en waar die vandaan komen.\n3. 3 concrete dingen die de ouder thuis kan doen (5-10 min, dagelijks leven).\n4. Wat de ouder met de leerkracht kan bespreken.`,
  }], { maxTokens: 1200 });
}
