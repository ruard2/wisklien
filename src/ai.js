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
import { mnemonicText, didactiekText, ALGEMEEN, LEVEL_NAMES } from './curriculum.js';
import { isAF, teacherName } from './i18n.js';
import { taalgidsText } from './didactiek.js';
import { kaartTekst } from './uitleg/index.js';
import { verklaptAntwoord, nederlandsInAfrikaans, snaptNiet, zelfdeVraag, noemtGetal, plaatjeFouten, checkArithmetic } from './kwaliteit.js';
import { stapPlan, getallenRegel, getallen as getallenIn, rekenVraag } from './stapgesprek.js';
import { makkelijker } from './tips.js';
import { vasteBeurt } from './vast.js';

// Schoolcontext per curriculum (Nederland of Suid-Afrika)
const SCHOOL = () => (isAF() ? 'zit in ’n Suid-Afrikaanse laerskool (meestal graad 6 of 7, KABV-kurrikulum)' : 'zit op een Nederlandse basisschool (meestal groep 7 of 8)');
const ONDERWIJS = () => (isAF() ? 'Suid-Afrikaanse laerskool-onderwijs (KABV, Intermediêre en Senior Fase)' : 'Nederlands basisonderwijs');
// Taal van alle antwoorden: Afrikaans voor Suid-Afrikaanse kinderen
const Z = (nl, af) => (isAF() ? af : nl); // voorbeeldzin in de taal van het kind
const TAALREGEL = () => (isAF() ? `

TAAL (heel belangrijk): Antwoord ALTIJD in eenvoudig, correct Afrikaans zoals in Suid-Afrika gepraat wordt — nooit Nederlands. Gebruik de Suid-Afrikaanse schoolwoorden (KABV): somme, gewone breuke, teller, noemer, desimale breuke, tiendes, honderdstes, persentasie, plekwaarde (ene, tiene, honderde, duisende), kolomme, langdeling, oordra, getallesin, getallelyn, verdubbel en halveer, afronding, skatting, omtrek, area, volume. Geld in rand en sent (R12,50). Deel met ÷. Getallen in een rij met ; ertussen. Spreek een leraar aan als "Meneer". De voorbeeldzinnen in deze instructies zijn Nederlands: zeg ze ALTIJD in het Afrikaans (bv. "Hoe kwam je op …?" → "Hoe het jy by … uitgekom?", "Dat is hem!" → "Dis reg!", "Bijna" → "Amper", "Welke" → "Watter", "je/jij" → "jy", "niet" → "nie", "denk" → "dink", "nu" → "nou", "zo" → "so", "geen stress" → "moenie worry nie" of "dis reg so"). Geen Nederlandse of Engelse woorden.` : '');
import { kidStore, pool } from './db.js';

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

export const TEACHER = process.env.TEACHER_NAME || 'Meester Max'; // (oud; gebruik teacherName())
// Sleutels opschonen (spaties, aanhalingstekens) en controleren: een sleutel met tekens als • (gemaskeerd
// gekopieerd) laat elke AI-aanroep mislukken. Dan liever duidelijk melden en de AI netjes uitzetten.
function cleanKey(name) {
  const raw = process.env[name];
  if (!raw) return null;
  const k = raw.trim().replace(/^["']|["']$/g, '').trim();
  if (!/^[\x21-\x7e]+$/.test(k)) {
    console.error(`[ai] ${name} bevat ongeldige tekens (bijvoorbeeld • of een spatie): waarschijnlijk is een gemaskeerde sleutel gekopieerd. De AI-leraar staat uit tot de echte sleutel is ingevuld.`);
    return null;
  }
  process.env[name] = k;
  return k;
}
const openaiKey = cleanKey('OPENAI_API_KEY'), anthropicKey = cleanKey('ANTHROPIC_API_KEY');
const openai = openaiKey ? new OpenAI({ apiKey: openaiKey, timeout: Number(process.env.AI_TIMEOUT_MS || 60000), maxRetries: 1 }) : null;
const anthropic = !openai && anthropicKey ? new Anthropic({ apiKey: anthropicKey, timeout: Number(process.env.AI_TIMEOUT_MS || 60000), maxRetries: 1 }) : null;
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
// Voor interne controles (Max-test, /audit): een losse aanroep zonder de leraar-prompt.
// model: ander model (bijv. AUDIT_MODEL) voor de beoordelaar; leeg = hetzelfde model als Max.
export const auditCall = (system, messages, opts = {}) => completeRaw(system, messages, opts);
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
  system = system + TAALREGEL();
  const p = privacy();
  let res;
  if (!p) res = await completeRaw(system, messages, opts);
  else {
    const safeMsgs = messages.map((m) => ({ ...m, content: typeof m.content === 'string' ? p.out(m.content) : m.content }));
    res = await completeRaw(p.out(system), safeMsgs, { ...opts, user: p.alias });
    if (res != null) res = mapStrings(res, p.back);
  }
  // het onzichtbare uitleg-label alleen bewaren waar de server het uitleest (gesprek, les)
  if (res != null && !opts.keepForm) res = mapStrings(res, (t) => t.replace(/\s*\[VORM:[^\]]*\]\s*/gi, ' ').trim());
  return res;
}

// Hergebruik (alleen in de Max-test, niet voor echte kinderen): exact dezelfde vraag aan hetzelfde model → het opgeslagen
// antwoord uit public.ai_cache in plaats van een nieuwe (betaalde) aanroep. Verandert er iets aan de som, de kaart, de prompt
// of het gesprek, dan is de vraag anders en wordt er gewoon opnieuw gevraagd. kidStore.cache = { nieuw, hergebruikt } telt mee.
async function completeRaw(system, messages, opts = {}) {
  const st = kidStore.getStore();
  // meter (Max-test): omvang van elke aanroep in tokens (± 4 tekens per token), ook als het antwoord uit de cache komt,
  // zodat twee manieren eerlijk te vergelijken zijn
  // vast = de systeemprompt (voor elk bericht gelijk, dus bij OpenAI uit de cache: 90% goedkoper)
  if (st?.meter) { st.meter.aanroepen++; st.meter.invoer += Math.round((system.length + JSON.stringify(messages).length) / 4); st.meter.vast = (st.meter.vast || 0) + Math.round(system.length / 4); }
  const uit = (r) => { if (st?.meter && r != null) st.meter.uitvoer += Math.round(JSON.stringify(r).length / 4); return r; };
  if (!st?.cache) return uit(await completeAI(system, messages, opts));
  const model = opts.model || st.aiModel || (mock ? 'mock' : openai ? await openaiModel() : process.env.AI_MODEL || 'claude-opus-5-5');
  const key = crypto.createHash('sha256').update(JSON.stringify([openai ? 'openai' : 'anthropic', model, system, messages, !!opts.json, opts.maxTokens || 1200, opts.image ? crypto.createHash('sha256').update(opts.image).digest('hex') : null])).digest('hex');
  // lezen: false = alles vers vragen (vinkje uit), maar wel opslaan, zodat een volgende test het kan hergebruiken
  if (st.cache.lezen !== false) try {
    const r = await pool.query('UPDATE public.ai_cache SET gebruikt = gebruikt + 1, laatst = now() WHERE sleutel = $1 RETURNING antwoord', [key]);
    if (r.rows.length) { st.cache.hergebruikt++; return uit(r.rows[0].antwoord.v); }
  } catch (e) { console.warn('[ai-cache]', e.message); }
  const out = await completeAI(system, messages, opts);
  st.cache.nieuw++;
  if (out != null) await pool.query('INSERT INTO public.ai_cache(sleutel, model, antwoord) VALUES ($1,$2,$3) ON CONFLICT (sleutel) DO UPDATE SET antwoord = EXCLUDED.antwoord, laatst = now()', [key, model, JSON.stringify({ v: out })]).catch((e) => console.warn('[ai-cache]', e.message));
  return uit(out);
}
// ---------- echt AI-gebruik bijhouden (tokens, uit cache, kosten) ----------
// Per dag × bron (app = echte kinderen, test = Max-test) × model. Zo zien we wat de vaste prompt echt bespaart.
const PRIJS = { 'gpt-6-luna': [0.10, 0.01, 0.50] }; // $ per miljoen: invoer, invoer uit cache, uitvoer
export const ZONDER_AI = 'zonder AI (vaste beurt)';
const prijsVan = (m) => m === ZONDER_AI ? [0, 0, 0] : PRIJS[m] || (process.env.AI_PRIJS ? process.env.AI_PRIJS.split(',').map(Number) : null);
function telGebruik(model, u) {
  if (!u) return;
  const cache = u.prompt_tokens_details?.cached_tokens || 0, bron = kidStore.getStore()?.cache ? 'test' : 'app';
  pool.query(`INSERT INTO public.ai_gebruik(dag, bron, model, aanroepen, invoer, cache, uitvoer) VALUES (CURRENT_DATE, $1, $2, 1, $3, $4, $5)
    ON CONFLICT (dag, bron, model) DO UPDATE SET aanroepen = ai_gebruik.aanroepen + 1, invoer = ai_gebruik.invoer + $3, cache = ai_gebruik.cache + $4, uitvoer = ai_gebruik.uitvoer + $5`,
    [bron, model, u.prompt_tokens || 0, cache, u.completion_tokens || 0]).catch(() => {});
}
export async function aiGebruik(dagen = 7) {
  const r = await pool.query(`SELECT bron, model, SUM(aanroepen)::int AS aanroepen, SUM(invoer)::bigint AS invoer, SUM(cache)::bigint AS cache, SUM(uitvoer)::bigint AS uitvoer
    FROM public.ai_gebruik WHERE dag > CURRENT_DATE - $1::int GROUP BY bron, model ORDER BY bron, model`, [dagen]).catch(() => ({ rows: [] }));
  return r.rows.map((x) => {
    const p = prijsVan(x.model), inv = Number(x.invoer), c = Number(x.cache), uit = Number(x.uitvoer);
    return { ...x, invoer: inv, cache: c, uitvoer: uit, kosten: p ? ((inv - c) * p[0] + c * p[1] + uit * p[2]) / 1e6 : null, zonderCache: p ? (inv * p[0] + uit * p[2]) / 1e6 : null };
  });
}

async function completeAI(system, messages, { json = false, maxTokens = 1200, image = null, user = null, model: forceModel = null } = {}) {
  if (mock) {
    await new Promise((r) => setTimeout(r, 400));
    const last = String(messages.at(-1)?.content || '');
    // nep-beoordelaar voor de Max-test (alleen om de schermen te testen)
    if (json && /DIDACTIEKKAART/.test(last)) { const r = () => 2 + Math.floor(Math.random() * 4); return { rekenfouten: [], cijfers: { som: 5, stappenplan: r(), tussenstappen: r(), tips: r(), max_begin: r(), max_na_fout: r(), max_stap: r(), samenhang: r(), taal: r() }, max_herkent_fout: Math.random() < 0.7, max_verklapt: Math.random() < 0.15, problemen: [], oordeel: '(test) nep-oordeel' }; }
    if (json) return { samenvatting: '(test) Optellen gaat goed, breuken nog lastig.', onderdelen: [{ onderdeel: 'Breuken', denkfouten: ['telt noemers bij elkaar op'], wat_helpt: 'pizza-plaatjes en gelijknamig maken', prioriteit: 'hoog' }], aanpak_tips: ['kleine stapjes'] };
    const turns = messages.filter((m) => m.role === 'assistant').length;
    const klaar = /les over/i.test(messages[0]?.content || '') && turns >= 3 ? '\n[KLAAR]' : '';
    return `(testleraar) Ik zie wat er gebeurde! Laten we het samen doen. **Stap ${turns}**: wat denk jij dat de eerste stap is?\n(reactie op: "${last.slice(0, 60)}")${klaar}`;
  }
  try {
    if (openai) {
      // forceModel (bijv. beoordelaar) > model van een Max-test-run (kidStore.aiModel) > het gewone model
      const model = forceModel || kidStore.getStore()?.aiModel || await openaiModel();
      // denkende modellen (gpt-5, gpt-6, o-serie): extra ruimte, anders gaat alles op aan nadenken en blijft het antwoord leeg
      const reasoning = /^(gpt-[5-9]|o\d)/.test(model);
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
      telGebruik(model, res.usage);
      const text = res.choices?.[0]?.message?.content?.trim() || '';
      const fin = res.choices?.[0]?.finish_reason;
      const out = json ? safeJson(text) : text || null;
      // nooit stil mislukken: anders blijft bijv. het profiel ongemerkt oud
      if (out == null) console.error(`[ai] leeg/ongeldig antwoord (finish_reason=${fin}, ${text.length} tekens, tokens=${res.usage?.completion_tokens})`);
      return out;
    }
    if (anthropic) {
      const res = await anthropic.beta.messages.create({
        model: forceModel || kidStore.getStore()?.aiModel || process.env.AI_MODEL || 'claude-opus-5-5',
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

// Het onzichtbare uitleg-label eraf halen: { text, form }
export function splitForm(text) {
  if (!text) return { text, form: null, vb: null };
  const m = String(text).match(/\[VORM:\s*(plaatje|verhaal|regel|stappen|voorbeeld)\s*\]/i);
  // [VB: vraag = uitkomst]: het voorbeeld dat Max zelf bedacht (gespreksplan bij een tussenstap; het kind ziet het niet)
  const v = String(text).match(/\[VB:\s*([^\]]*?)\s*=\s*([^\]=]+?)\s*\]/i);
  return { text: String(text).replace(/\s*\[(VORM|VB):[^\]]*\]\s*/gi, ' ').trim(), form: m ? m[1].toLowerCase() : null, vb: v ? { som: v[1].trim(), uitkomst: v[2].trim() } : null };
}

// ---------- de leraar ----------
const LERAAR_SJABLOON = (name) => `Je bent ${teacherName()}, de persoonlijke rekenleraar van één kind (hoe het heet en wat je over het kind weet, staat in het eerste bericht onder OVER HET KIND). Het kind ${SCHOOL()}, loopt achter met rekenen en is géén rekenwonder. Je bent geduldig, warm, eerlijk en een tikje grappig. Je praat met ${name} zoals een hele goede bijlesjuf of -meester: echt een gesprek, geen standaardteksten.

HOE JE LESGEEFT
- Kleine stapjes. Eén ding tegelijk. Stel per bericht maximaal één vraag en wacht op het antwoord.
- Volg ALTIJD de DIDACTIEKKAART die je bij de som of les krijgt: dat is hoe scholen ${isAF() ? 'in Suid-Afrika (KABV)' : 'in Nederland'} het aanleren, en de app (hints, tussenstappen, voorbeelden) gebruikt precies dezelfde aanpak en woorden. Verzin geen andere methode, ook geen "handig trucje" dat het kind niet kent. Zo hoort het kind overal hetzelfde verhaal.
- Handelingsmodel: begin bij betekenis (geld, meten, een echte situatie), dan een model (plaatje: getallenlijn, strook, positieschema, verhoudingstabel), dan de kale som. Snapt ${name} het niet: ga één niveau concreter (kale som → plaatje → geld/echte situatie), en koppel daarna terug naar de som ("en dat is dus precies wat er in de som staat").
- Schatten: ${ALGEMEEN.schatten} Begin een uitleg NOOIT met "schat eerst" (behalve als de kaart het zo zegt). Gebruik je het woord "schatten", zet er dan ALTIJD meteen de uitleg bij: "schatten (= met ronde getallen ongeveer uitrekenen)". Kies bij schatten getallen die duidelijk naar één kant afronden (niet 1,5 of 2,5). Verder alleen als controle aan het eind: "Klopt het ongeveer?"
- Verhaaltjessom: ${ALGEMEEN.drieslag}
- Laat ${name} in eigen woorden zeggen hoe het ging ("Hoe deed je dat?"): uitleggen helpt onthouden.
- Zoek de denkfout in wat ${name} zegt of laat zien (bijv. getallen onder de streep opgeteld, komma verkeerd, tafel vergeten, eenheid niet omgerekend) en benoem die vriendelijk en concreet. Weet je niet hoe ${name} aan een antwoord kwam, raad dan niet maar vraag het ("Hoe kwam je op …?") en zoek de fout in de uitleg die ${name} geeft.
- Laat ${name} zoveel mogelijk zelf doen. Vraag "Wat denk jij dat … is?" in plaats van alles voor te zeggen.
- Keer of gedeeld door 10, 100 of 1000 (ook bij maten omrekenen): zeg het ALTIJD zo: bij keer schuift elk cijfer naar links in het positieschema (naar de grotere plekken) en wordt het getal groter; bij gedeeld door schuift elk cijfer naar rechts en wordt het getal kleiner. Zeg nooit dat "de komma naar links" gaat bij keer. Controleer: wordt het getal groter of kleiner?
- Lukt het na twee pogingen nog niet: doe het dan zelf heel duidelijk voor (stap voor stap, maximaal 4 korte stappen) en laat ${name} alleen de laatste stap zelf doen.
- Is het antwoord op jouw vraag goed? Zeg dat duidelijk ("Ja! Precies.") en ga één stapje verder.
- Prijs inzet en aanpak, niet "slim zijn". Fouten zijn normaal.

LUISTER ECHT (heel belangrijk)
- Reageer op wat ${name} écht zegt, niet op wat je verwachtte. Vraagt ${name} "waarom?", "wat betekent …?" of "hoe weet je dat?": geef eerst echt antwoord op die vraag (de reden of de betekenis, in gewone woorden). Herhaal niet gewoon je vorige vraag of stap.
- Controleer elke uitspraak van ${name} precies, ook als hij bijna goed is. Zeg nooit "Ja, precies" als er iets niet klopt. Is het half goed of verkeerd om gezegd ("6 kun je delen door 42"), zeg dan wat goed is en zeg het daarna goed ("Bijna: 42 kun je delen door 6").
- Zegt ${name} "ik snap het (nog steeds) niet": gebruik NIET dezelfde uitleg of hetzelfde voorbeeld opnieuw. Kies echt iets anders: kleinere getallen, geld, een plaatje, of de "concreter"-tip van de kaart, en zeg dat je het op een andere manier probeert.
- Reken alles wat je zelf opschrijft na voordat je het zegt: elk getal moet kloppen met DEZE som (let op nullen en de komma). Geen getal van een kaart of voorbeeld overnemen dat niet bij deze som hoort.

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
${isAF() ? '' : `
${taalgidsText()}
`}

ONTHOUDEN EN VOORTBOUWEN
- Je kent ${name} al. Gebruik wat je weet (hieronder): verwijs ernaar als het past ("Weet je nog, met die pizza?"), gebruik uitleg en voorbeelden die eerder werkten, en let extra op denkfouten die vaker voorkomen.
- Gebruik interesses van ${name} in voorbeelden als je die kent.
- Herhaal niet letterlijk wat je net al zei; bouw verder op het gesprek.

EZELSBRUGGETJES
- Als het helpt (niet bij elk bericht), gebruik een ezelsbruggetje of geheugensteuntje uit de lijst bij de som. Leg kort uit hoe het werkt.
- Noem iets alleen een "bekend ezelsbruggetje" als het zo in de lijst staat. Een eigen trucje mag, maar zeg dan "trucje".

STIJL
- Kort en to the point: meestal 2 tot 5 korte zinnen (max. ± 80 woorden). Geen lappen tekst.
- ${isAF() ? 'Suid-Afrikaanse notasie: 2,5 (komma), × vir maal, ÷ vir deel, geld als R12,50.' : 'Nederlandse notatie: 2,5 (komma), × voor keer, : voor delen.'}
- Gewone tekst; **vet** mag voor het belangrijkste. Geen koppen, geen markdown-tabellen (gebruik de plaatjes hieronder) en NOOIT LaTeX of wiskunde-code zoals haakjes met een backslash, frac-code of dollartekens: schrijf gewoon 1/2 + 1/4.

PLAATJES (zoals de juf op het bord tekent; gebruik ze bij uitleg, niet bij elk bericht)
Zet een plaatje op een eigen regel met precies deze schrijfwijze; de app tekent het:
- [[positieschema: 27,6]]  → vakjes T E , t (tientallen, eenheden, komma, tienden …)
- [[strook: 3/4]]  → een reep in 4 gelijke stukken, 3 gekleurd (meer stroken: [[strook: 1/4; 2/4]])
- [[procentstrook: 120 | 10%=12 | 25%=30]]  → strook van 0% tot 100% (= 120), met tussenstreepjes
- [[getallenlijn: 2 | 3 | 2,4]]  → getallenlijn van 2 tot 3 met een stip bij 2,4 (meer stippen met ;)
- [[sprongen: 56 | +10 | +7]]  → lege getallenlijn: vanaf 56 sprongen van +10 en +7
- [[tabel: aantal | 1 | 2 | 4 ; prijs | 3 | 6 | 12]]  → verhoudingstabel (twee rijen)
- [[hokjes: 3 x 4]]  → rechthoek van 3 rijen met 4 hokjes (oppervlakte)
- [[rechthoek: 8 x 6 | cm]]  → rechthoek met lengte en breedte erbij (omtrek/oppervlakte); [[driehoek: 8 x 6 | cm]] → driehoek met de rechthoek eromheen
- [[klok: 10:30]]  → echte klok met wijzers ([[klok: 7:45 | wekker]] of [[klok: 3:25 | horloge]] mag ook; de uurwijzer schuift mee); [[tijdlijn: 10:00 | 11:00 | 10:30]] → tijdbalk met tijden (noem het tegen het kind "tijdbalk")
Gebruik ALLEEN een plaatje dat bij dit onderwerp en de kaart past (dus geen strook bij oppervlakte). Geen passend plaatje? Dan geen plaatje.
Gebruik het model uit de didactiekkaart. Zet het eindantwoord niet in een plaatje als ${name} het zelf moet vinden.
- Af en toe een licht grapje mag, maar de uitleg gaat voor.
- Spreek ${name} aan met "je". Gebruik over ${name} geen "hij" of "zij" als je dat niet zeker weet.

UITLEG-VORM (onzichtbaar label)
- Leg je in een bericht iets uit, zet dan op de allerlaatste regel precies één label: [VORM: plaatje] (tekening/model: strook, getallenlijn, pizza, tabel, blokjes), [VORM: verhaal] (situatie: geld, voetbal, eten), [VORM: regel] (rekenregel, trucje of ezelsbruggetje), [VORM: stappen] (stap voor stap rekenen) of [VORM: voorbeeld] (voordoen met makkelijkere getallen). Kies de vorm die het meest in je uitleg zit.
- Alleen een vraag of compliment, zonder uitleg? Dan geen label. Het label wordt weggehaald voordat het kind het ziet.`;
// Kosten (Max-agent stap 1): de vaste instructies zijn voor elk kind en elk bericht EXACT gelijk (alleen per taal anders),
// zodat OpenAI ze als "al gezien" rekent (90% korting) en sneller antwoordt. Alles wat per kind verschilt (naam, profiel,
// notities, vandaag) staat vooraan in het eerste bericht. Zie aiGebruik() voor de echte cijfers.
const vastCache = {};
const LERAAR_VAST = () => (vastCache[isAF() ? 'af' : 'nl'] ||= LERAAR_SJABLOON('het kind'));
const KIND = (name, profile = '', memory = '', today = '') => [`OVER HET KIND: het kind heet ${name}. Spreek ${name} aan met "je" en gebruik soms de naam.`,
  profile ? `LEERLINGPROFIEL VAN ${name.toUpperCase()}\n${profile}` : '', memory ? `JOUW NOTITIES OVER ${name.toUpperCase()} (uit eerdere lessen)\n${memory}` : '', today ? `VANDAAG IN DEZE SESSIE\n${today}` : ''].filter(Boolean).join('\n');
const metKind = (messages, kind) => { const m = messages.map((x) => ({ ...x })); const i = m.findIndex((x) => x.role === 'user'); if (i >= 0) m[i].content = `${kind}\n\n${m[i].content}`; return m; };
const completeLeraar = (kind, messages, opts) => complete(LERAAR_VAST(), metKind(messages, kind), opts);

export function describeQuestion(q) {
  let s = `Som: ${q.text}`;
  if (q.options) s += `\nKeuzes: ${q.options.join(' | ')}`;
  if ((q.visual?.kind === 'bar' || q.visual?.kind === 'line') && Array.isArray(q.visual.labels)) s += `\nGrafiek "${q.visual.title}": ${q.visual.labels.map((l, i) => `${l}=${q.visual.values?.[i]}`).join(', ')}`;
  else if (q.visual?.kind === 'line') s += `\nTekening: getallenlijn van ${q.visual.from} tot ${q.visual.to}${q.visual.ticks ? ` (streepjes bij ${q.visual.ticks.join(', ')})` : ''}${q.visual.mark != null ? `, met een pijltje bij ${q.visual.mark}` : ''}${q.visual.unit ? ` (${q.visual.unit})` : ''}`;
  if (q.visual?.kind === 'pie') s += `\nCirkeldiagram: ${q.visual.labels.map((l, i) => `${l} ${q.visual.values[i]}%`).join(', ')}`;
  if (q.visual?.kind === 'table') s += `\nTabel: ${JSON.stringify({ kop: q.visual.headers, rijen: q.visual.rows })}`;
  if (q.visual?.kind === 'rect' || q.visual?.kind === 'tri') s += `\nTekening: ${q.visual.kind === 'rect' ? 'rechthoek' : 'driehoek'} ${q.visual.w} bij ${q.visual.h} ${q.visual.unit}`;
  if (q.visual?.kind === 'clock') {
    // wijzerstand erbij: Max zei eens "grote wijzer op de 2" bij 4:40 (Max-test)
    const [hh, mm] = String(q.visual.time).split(':').map(Number);
    const pos = Number.isFinite(mm) ? (mm === 0 ? 12 : mm / 5) : null;
    s += `
Tekening: ${q.visual.look === 'alarm' ? 'wekker' : q.visual.look === 'watch' ? 'horloge' : 'klok'} met wijzers op ${q.visual.time}${q.visual.label ? ` (${q.visual.label})` : ''}${pos != null && Number.isInteger(pos) ? `: de grote wijzer staat op de ${pos} (${mm} minuten), de kleine wijzer ${mm === 0 ? 'precies op' : 'tussen de ' + (hh % 12 || 12) + ' en de'} ${mm === 0 ? hh % 12 || 12 : (hh % 12) + 1}` : ''}`;
  }
  if (q.visual?.kind === 'digital') s += `
Tekening: digitale ${q.visual.look === 'oven' ? 'oven' : q.visual.look === 'phone' ? 'telefoon' : 'wekker'} die ${q.visual.time} aangeeft`;
  if (q.visual?.kind === 'clocks') s += `
Tekening: ${q.visual.items.map((i) => `${i.label || 'klok'} ${i.time}`).join(' en ')}`;
  if (q.visual?.kind === 'board') s += `
Tekening: vertrekbord: ${q.visual.rows.map((r) => `${r.time} naar ${r.to}`).join('; ')}`;
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

// Aan/uit: in de Max-test per variant (kidStore.stapPlan), anders zie hieronder.
// Standaard: aan voor NL (Tussenstappen #20: beter op alles, rekenfouten gelijk), AF nog uit tot de volgende test.
// MAX_STAPPLAN=1/0 zet het voor beide talen aan of uit.
export const stapPlanAan = () => { const v = kidStore.getStore()?.stapPlan; if (v != null) return !!v; const e = process.env.MAX_STAPPLAN; return e === '1' || e === '0' ? e === '1' : !isAF(); };
async function stapBeurt({ name, profile, memory, today, question, step, given, chat }) {
  const plan = stapPlan({ question, step, chat });
  if (!plan) return null;
  const { verboden } = getallenRegel({ question, step, chat, plan });
  const vb = plan.voorbeeld;
  const ctx = [
    'GESPREKSPLAN (alleen voor jou): de app bepaalt WAT je in dit bericht doet, jij bepaalt HOE je het zegt. Volg de OPDRACHT precies; de algemene regels gelden verder gewoon.',
    describeQuestion(question),
    `Het kind rekent in tussenstappen en zit vast bij de stap: "${step.ask}". Goed is ${plan.goedStap} (GEHEIM: noem dit niet, het kind moet het zelf vinden). In het vakje vulde het kind eerst in: "${given || '?'}".`,
    step.tip ? `Aanpak van de app bij deze stap (tip): "${step.tip}". Volg deze route.` : '',
    vb ? `MAKKELIJKER VOORBEELD${vb.vanApp ? ' (door de app nagerekend)' : ' (dat jij eerder gaf)'}: ${vb.som} — uitkomst ${vb.uitkomst}${plan.vbUitkomst ? '' : ' (noem die uitkomst niet)'}.` : '',
    kaartTekst(isAF() ? 'af' : 'nl', question.tpl),
    plan.eerdereZetten.length ? `Wat je eerder in dit gesprek deed: ${plan.eerdereZetten.join(' → ')}.` : '',
  ].filter(Boolean).join('\n');
  const opdracht = `[app, onzichtbaar voor het kind] OPDRACHT: ${plan.doel} Kies zelf één manier: ${plan.opties.join(' OF ')}. ${plan.regels}${verboden.length ? ` Deze getallen komen NIET in je bericht: ${verboden.join(', ')}.` : ''}
STIJL: 1 tot 3 korte zinnen (hooguit ± 45 woorden), warm en natuurlijk, zoals een goede bijlesjuf of -meester praat. Reageer eerst op wat ${name} net zei (gebruik de woorden of het getal van ${name}); klopt het getal maar de uitleg erbij niet, zeg dat vriendelijk. Begin anders dan je vorige bericht. Hooguit één vraag, aan het eind. Gebruik soms de naam. Reken alles wat je zegt na: elk getal in je voorbeeld moet kloppen en mag elkaar niet tegenspreken.${plan.zet === 'klaar' ? '' : `
Zet op de allerlaatste regel, onzichtbaar voor het kind, de vraag die je stelt met het juiste antwoord: [VB: <je vraag kort, als som als dat kan> = <het juiste antwoord>] (bijv. [VB: 30 − 10 = 20], [VB: 66 × 20 = 1320] of [VB: plek van de 4 in 345 = tientallen]). De app kijkt daarmee het antwoord van ${name} na.`}`;
  const hist = chat.slice(-10);
  const messages = [{ role: 'user', content: ctx }, { role: 'assistant', content: 'Begrepen.' }];
  hist.forEach((m, i) => messages.push({ role: m.role === 'teacher' ? 'assistant' : 'user', content: i === hist.length - 1 ? `${m.text}\n\n${opdracht}` : m.text }));
  const sys = LERAAR_VAST(), opts = { maxTokens: 400, keepForm: true };
  const msgs = metKind(messages, KIND(name, profile, memory, today));
  let out = await complete(sys, msgs, opts);
  if (typeof out !== 'string') return out;
  const kindTekst = chat.filter((m) => m.role !== 'teacher').map((m) => m.text).join(' \n ');
  const vorig = [...chat].reverse().find((m) => m.role === 'teacher');
  const fouten = (t) => {
    const f = [], { text: zicht, vb: eigen } = splitForm(t);
    const hit = verboden.find((x) => getallenIn(zicht).some((g) => Math.abs(g - x) < 1e-9));
    if (hit != null) f.push(`Het getal ${String(hit).replace('.', ',')} mag niet in je bericht (dat moet ${name} zelf vinden).`);
    else if (plan.zet !== 'klaar' && verklaptAntwoord(zicht, plan.goedStap, { som: `${question.text}\n${step.ask}`, kind: kindTekst })) f.push(`In je bericht staat de uitkomst van de stap (${plan.goedStap}). Laat die weg.`);
    if (plan.zet !== 'klaar') {
      if (!eigen && ZETTEN_VB.has(plan.zet)) f.push('Zet op de allerlaatste regel je vraag met het juiste antwoord: [VB: <vraag> = <antwoord>].');
      if (eigen) {
        const juist = rekenVraag(eigen.som), u = getallenIn(eigen.uitkomst)[0];
        if ((juist != null && u != null && Math.abs(juist - u) > 1e-6) || checkArithmetic(`${eigen.som} = ${eigen.uitkomst}`).length) f.push(`Je vraag en antwoord kloppen niet: ${eigen.som} is niet ${eigen.uitkomst}${juist != null ? ` (maar ${String(juist).replace('.', ',')})` : ''}. Reken je voorbeeld goed uit, ook in de tekst.`);
        if (u != null && plan.fase === 'voorbeeld' && [...getallenIn(plan.goedStap), ...getallenIn(question.display)].some((g) => Math.abs(g - u) < 1e-9)) f.push('Je voorbeeld heeft dezelfde uitkomst als de echte stap of de som. Kies andere getallen.');
      }
    }
    if (vorig && /snap|verstaan|weet/i.test(chat.at(-1)?.text || '') && zelfdeVraag(vorig.text, zicht)) f.push('Je stelt bijna dezelfde vraag als in je vorige bericht. Kies een ándere, kleinere of concretere vraag.');
    if (zicht.split(/\s+/).length > 70) f.push('Je bericht is te lang: hooguit 3 korte zinnen.');
    const pf = plaatjeFouten(zicht);
    if (pf.length) f.push(`Je plaatje klopt niet (${pf.join('; ')}).`);
    const nl = isAF() ? nederlandsInAfrikaans(zicht) : [];
    if (nl.length) f.push(`Schrijf in zuiver, eenvoudig Afrikaans (niet: ${nl.join(', ')}).`);
    return f;
  };
  const f1 = fouten(out);
  if (f1.length) {
    const opnieuw = await complete(sys, [...msgs, { role: 'assistant', content: out }, { role: 'user', content: `[controle] ${f1.join(' ')} Schrijf je bericht opnieuw en geef alleen het nieuwe bericht.` }], opts).catch(() => null);
    if (typeof opnieuw === 'string' && opnieuw.trim()) out = opnieuw;
    const f2 = fouten(out);
    console.log(`[max-plan] ${plan.zet}: ${f1.map((x) => x.slice(0, 40)).join(' | ')} → herschreven${f2.length ? ' (nog niet helemaal)' : ''}`);
    // een voorbeeld dat nog steeds niet klopt, gebruikt het plan niet (dan kan het het antwoord van het kind niet nakijken)
    if (f2.some((x) => /kloppen niet|voorbeeld heeft/i.test(x))) out = out.replace(/\s*\[VB:[^\]]*\]\s*/gi, ' ').trim();
  }
  // het voorbeeld van de app: dat kent de app al, ook als Max het label vergat
  if (plan.zet === 'voorbeeld' && vb && !/\[VB:/i.test(out)) out = `${out}\n[VB: ${vb.som.replace(/\s*=\s*\?\s*$/, '')} = ${vb.uitkomst}]`;
  return out;
}
const ZETTEN_VB = new Set(['eigen_voorbeeld']);

export async function teacherTurn({ name, profile, memory, today, question, levelName, phase, given, chat = [], step, misconception, scratch = null }) {
  // Vaste beurt (src/vast.js): weet de app al precies wat Max moet zeggen, dan geen AI-aanroep. Telt als "zonder AI" in het gebruik.
  const metPlan = phase === 'step' && step && stapPlanAan();
  const vast = process.env.VASTE_BEURTEN === '0' ? null : vasteBeurt({ question, phase, given, chat, step: metPlan ? null : step, misconception, scratch, af: isAF() });
  if (vast) { telGebruik(ZONDER_AI, {}); return vast; }
  // Gespreksplan bij een tussenstap (src/stapgesprek.js): de app kiest de zet, Max verwoordt. Geen zet (eigen vraag van
  // het kind e.d.)? Dan de gewone Max hieronder.
  if (metPlan) { const r = await stapBeurt({ name, profile, memory, today, question, step, given, chat }); if (r) return r; }
  const ctx = [
    'CONTEXT (alleen voor jou):',
    describeQuestion(question),
    `Niveau van deze som: ${levelName}.`,
    `Juiste antwoord: ${question.display}`,
    `Stappenplan: ${question.steps.join(' / ')}`,
    question.guide?.length ? `Tussenstappen die de app het kind laat invullen (volg dezelfde route en dezelfde tips; kies geen andere manier): ${question.guide.map((g, i) => `${i + 1}. ${g.ask}${g.tip ? ` (tip: ${g.tip})` : ''}`).join(' / ')}${question.guideFinal ? ` / laatste stap: ${question.guideFinal}` : ''}` : '',
    phase === 'before' ? `${name} heeft nog NIET geantwoord. Verklap het eindantwoord niet. Help op weg met een vraag of een tip. Vraagt ${name} "hoe begin ik?": noem alleen wat de eerste stap is (wat ga je eerst doen, met welk plaatje of welke aanpak van de kaart) en laat ${name} die stap zelf uitrekenen. Geef niet de hele berekening, niet de doorslaggevende tussenuitkomst en ook niet het kenmerk dat meteen het antwoord geeft.` : '',
    phase === 'wrong' ? `${name} antwoordde "${given}". Dat is FOUT.` : '',
    phase === 'wrong' && misconception ? `Herkende denkfout (zeker): ${misconception.label} Wat helpt: ${misconception.fix}` : '',
    phase === 'wrong' && !misconception ? `Er is GEEN bekende denkfout herkend: je weet dus NIET hoe ${name} aan "${given}" kwam. Raad geen oorzaak en zeg niet "waarschijnlijk heb je …", "misschien dacht je …" of iets dergelijks. Vraag eerst hoe ${name} het deed (${Z(`"Hoe kwam je op ${given}?"`, `"Hoe het jy by ${given} uitgekom?"`)}). Vertelt ${name} het, zoek dan de fout in díé uitleg, benoem die concreet en ga vanaf daar verder. Komt de uitleg van ${name} op een ánder getal uit dan "${given}" (bijv. de goede uitkomst): zeg dan niet alleen "Ja, precies", maar wijs op het verschil (${Z(`"Je rekende het goed uit, maar je vulde ${given} in. Zie je waar het misging?"`, `"Jy het dit reg uitgereken, maar jy het ${given} ingevul. Sien jy waar dit verkeerd geloop het?"`)}). Weet ${name} het niet meer of zegt ${name} "gewoon gegokt": begin samen bij de eerste stap.` : '',
    phase !== 'right' ? `NIET VOORZEGGEN: noem het eindantwoord (${question.display}) zelf NOOIT zolang ${name} het nog niet zelf heeft gezegd: ook niet als voorbeeld, als controle (zoals "5 × 7 = 35, dus …"), in een opsomming waaruit het meteen volgt, of in een plaatje (geen strook, cirkel of tabel waar het antwoord al in staat). Snapt ${name} het niet: maak het concreter (kleinere getallen, geld, een plaatje van de situatie), maar laat het laatste rekenwerk altijd aan ${name}.` : '',
    phase !== 'right' ? `Zegt ${name} in het gesprek het goede antwoord of een goede tussenuitkomst: bevestig dat kort (${Z('"Ja, precies!"', '"Ja, presies!"')}) en ga één stap verder. Leg dan niet alles opnieuw uit en herhaal de berekening niet. Is het het eindantwoord, zeg dan alleen dat het klopt en dat ${name} het nu kan invullen (${Z('"Dat is hem! Vul het maar in."', '"Dis reg! Vul dit maar in."')}), zonder het getal of de som met uitkomst nog eens op te schrijven (dus NIET "Dan kun je 48 : 4 = 12 invullen").${phase === 'wrong' ? ` LET OP: ${name} vulde eerst "${given}" in. Komt ${name} nu met het goede antwoord of de goede manier, zeg dan niet alleen dat het klopt: zeg dat het nu goed is en vraag kort wat er de eerste keer anders ging (${Z('"Nu klopt het! Maar eerst vulde je ' + given + ' in. Wat ging er toen anders?"', '"Nou is dit reg! Maar eers het jy ' + given + ' ingevul. Wat was toe anders?"')}). Pas als dat duidelijk is (of ${name} het niet weet), zeg je dat ${name} het kan invullen.` : ''}` : '',
    phase !== 'right' ? `Zegt ${name} iets wat niet klopt (ook als ${name} zegt dat jij je vergist): controleer het zelf aan de som. Klopt het niet, geef dan niet toe, maar laat vriendelijk zien waar het staat (${Z('"Kijk nog eens: in 8945 staat de 5 rechts van de 4"', '"Kyk weer: in 8945 staan die 5 regs van die 4"')}). Geef alleen toe als jij echt iets fout zei. Geef het antwoord ook niet als één van een paar keuzes ("is het 4, 8 of 9?").` : '',
    mnemonicText(question.cat) ? `Ezelsbruggetjes/geheugensteuntjes bij dit onderwerp:\n${mnemonicText(question.cat)}` : '',
    phase === 'right' ? `${name} antwoordde "${given}". Dat is GOED.` : '',
    phase === 'step' && step ? `${name} rekent samen met je in tussenstappen en loopt vast bij de stap: "${step.ask}" (goed is ${step.display}). Poging van ${name}: "${given || '?'}". Verklap het antwoord van deze stap niet meteen.${step.tip ? ` De app gaf bij deze stap als tip: "${step.tip}". Leg het uit op dezelfde manier (zelfde route), alleen concreter.` : ''}${(() => { const v = makkelijker(step.ask, step.answer, [question.answer]); return v ? ` MAKKELIJKER VOORBEELD (door de app nagerekend, gebruik dit): ${v.vraag ? v.som : `${v.som} = ?`} (uitkomst ${v.uitkomst}). Laat ${name} eerst dít voorbeeld uitrekenen, bevestig het, en zeg dan dat de echte stap precies zo gaat.` : ''; })()}` : '',
    scratchContext(name, scratch, phase),
    kaartTekst(isAF() ? 'af' : 'nl', question.tpl),
    didactiekText(question.cat, question.level, { kort: !!kaartTekst(isAF() ? 'af' : 'nl', question.tpl) }),
  ].filter(Boolean).join('\n');

  const opener = {
    wrong: misconception
      ? `Begin het gesprek: zeg in één zin vriendelijk wat er misging (de herkende denkfout, in gewone woorden). Stel daarna één eenvoudige vraag waarmee ${name} zelf de eerste stap van de oplossing zet.`
      : (String(given ?? '').trim() && !/^\?+$/.test(String(given).trim())
        ? `Begin het gesprek: zeg in één korte zin vriendelijk dat "${given}" nog niet klopt, zonder te raden waarom. Vraag daarna alleen hoe ${name} aan "${given}" kwam (bijv. ${Z('"Hoe heb je het uitgerekend?"', '"Hoe het jy dit uitgereken?"')}). Leg nog niets uit.`
        : `Begin het gesprek: zeg in één korte zin vriendelijk dat het nog niet klopt. Stel daarna één eenvoudige vraag waarmee ${name} zelf de eerste stap van de oplossing zet.`),
    step: 'Leg deze ene tussenstap uit met een MAKKELIJKER VOORBEELD: dezelfde soort stap met kleinere of rondere getallen (of met geld). Laat het kind eerst dát voorbeeld uitrekenen en zeg dan dat de echte stap precies zo gaat. Herhaal niet de vraag of de tip van de app. Noem de uitkomst van de echte stap niet, ook niet in een plaatje, een opsomming ("250, 500, 750, 1000") of een zin waaruit hij meteen volgt.',
    right: 'Geef een kort compliment over de aanpak en één slimme tip voor dit soort sommen.',
    before: `Help op weg met alleen het eerste kleine stapje: zeg in gewone woorden wat de som vraagt of met welke aanpak je begint, en stel één vraag over de eerste deelberekening. Reken die niet voor.`,
  }[phase];

  const messages = [{ role: 'user', content: ctx }, { role: 'assistant', content: 'Begrepen. Ik help stap voor stap.' }];
  if (!chat.length) messages.push({ role: 'user', content: `[instructie] ${opener}` });
  for (const m of chat.slice(-20)) messages.push({ role: m.role === 'teacher' ? 'assistant' : 'user', content: m.text });
  if (messages.at(-1).role === 'assistant') messages.push({ role: 'user', content: '[instructie] Ga verder.' });
  const sys = LERAAR_VAST(), opts = { maxTokens: 500, image: scratch?.image || null, keepForm: true };
  messages.splice(0, messages.length, ...metKind(messages, KIND(name, profile, memory, today)));
  let out = await complete(sys, messages, opts);
  // Bewaking vóór het kind het ziet (src/kwaliteit.js): verklapt Max het (tussen)antwoord, of praat hij Nederlands in een
  // Afrikaans gesprek? Dan één keer opnieuw laten schrijven, met precies die opmerking erbij.
  if (typeof out === 'string') {
    const kind = chat.filter((m) => m.role !== 'teacher').map((m) => m.text).join(' \n ');
    const doelen = phase === 'right' ? [] : [[question.display, question.text]];
    if (phase === 'step' && step) doelen.push([step.display, `${question.text}\n${step.ask}`]);
    const fouten = (t) => {
      const f = [];
      const hit = doelen.find(([d, som]) => verklaptAntwoord(t, d, { som, kind }));
      if (hit) f.push(`In je bericht staat het antwoord (${hit[0]}) dat ${name} zelf moet vinden. Laat dat getal weg: ook niet als keuze, in een rijtje, als controle of in een plaatje. Laat ${name} die laatste stap zelf doen.`);
      const vorig = [...chat].reverse().find((m) => m.role === 'teacher'), laatsteKind = chat.at(-1)?.role !== 'teacher' ? chat.at(-1)?.text : '';
      if (vorig && snaptNiet(laatsteKind) && zelfdeVraag(vorig.text, t)) f.push(`${name} zegt dat het niet snapt, maar je stelt bijna dezelfde vraag als net. Stel een ándere, kleinere vraag: een makkelijker voorbeeld met kleinere getallen, een plaatje of een kleiner stapje.`);
      // Tegenspraak (meetlat #6 en AF #7, ±20×): het kind zegt nu het goede antwoord terwijl het eerst iets anders invulde,
      // en Max zegt alleen "Dis reg! Vul dit maar in." zonder het verschil te benoemen.
      if (phase === 'wrong' && given != null && laatsteKind && noemtGetal(laatsteKind, question.display) && !noemtGetal(t, given) && /\b(klopt|precies|goed|juist|reg|presies|korrek)\b/i.test(t))
        f.push(`${name} zegt nu het goede antwoord, maar vulde eerst "${given}" in. Zeg dat het nu klopt én vraag kort wat er de eerste keer anders ging (noem "${given}"). Zeg pas daarna dat ${name} het kan invullen.`);
      // Vastgelopen bij een tussenstap zonder voorbeeld van de app: dan moet Max zelf een makkelijker voorbeeld geven, met
      // andere (kleinere) getallen. Meetlat #13/#14: in ± 50% van die gevallen herhaalde Max de stap met dezelfde getallen.
      if (phase === 'step' && step && !makkelijker(step.ask, step.answer, [question.answer])) {
        const nums = (x) => new Set((String(x || '').replace(/\[\[[^\]]*\]\]/g, ' ').match(/\d+(?:,\d+)?/g) || []));
        const bekend = new Set([...nums(question.text), ...nums(step.ask), ...nums(given), ...nums(step.tip), ...nums(step.display)]);
        if (![...nums(t)].some((x) => !bekend.has(x))) f.push(`${name} loopt vast bij deze stap. Begin met een MAKKELIJKER VOORBEELD van dezelfde soort, met andere, kleinere getallen dan in de som (bijv. de helft, of een getal onder de 10), laat ${name} dát eerst doen, en zeg dan dat de echte stap precies zo gaat. Noem de uitkomst van de echte stap niet.`);
      }
      const pf = plaatjeFouten(t);
      if (pf.length) f.push(`Je plaatje klopt niet (${pf.join('; ')}). Maak het plaatje opnieuw: [[getallenlijn: begin | eind | stip]] met begin < eind en de stip ertussen, of laat het plaatje weg.`);
      const nl = isAF() ? nederlandsInAfrikaans(t) : [];
      if (nl.length) f.push(`Je bericht bevat Nederlandse of Engelse woorden (${nl.join(', ')}). Schrijf alles in zuiver, eenvoudig Afrikaans (bv. klop, amper, presies, watter, jy, nie, dink, nou, uitgereken, eers, moenie worry nie).`);
      return f;
    };
    const f1 = fouten(out);
    if (f1.length) {
      const opnieuw = await complete(sys, [...messages, { role: 'assistant', content: out }, { role: 'user', content: `[controle] ${f1.join(' ')} Schrijf je bericht opnieuw en geef alleen het nieuwe bericht.` }], opts).catch(() => null);
      if (typeof opnieuw === 'string' && opnieuw.trim()) out = opnieuw; // ook als er nog iets mis is: de herschreven versie is beter
      console.log(`[max-bewaking] ${f1.map((x) => x.slice(0, 40)).join(' | ')} → herschreven${fouten(out).length ? ' (nog niet helemaal)' : ''}`);
    }
  }
  return out;
}

// Kladblok bekijken: hoe rekende het kind, en waar ging het mis? Kort, voor het profiel en het geheugen.
export async function analyzeScratch({ name, question, given, correct, scratch }) {
  if (!scratch || (!scratch.image && !scratch.text)) return null;
  const data = await complete(`Je bent een ervaren remedial teacher rekenen (${ONDERWIJS()}). Je bekijkt het kladblaadje van een kind en beschrijft kort en concreet hoe het rekende.`, [{
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
export async function lessonTurn({ name, profile, memory, cat, catLabel, level = 2, levelName, mistakes = [], chat = [] }) {
  const ctx = `CONTEXT: Je geeft ${name} een korte les over "${catLabel}" op ${levelName}-niveau.

${didactiekText(cat, level)}

${mnemonicText(cat) ? `Ezelsbruggetjes/geheugensteuntjes die je kunt gebruiken (alleen als het past bij de aanpak):\n${mnemonicText(cat)}\n` : ''}
${mistakes.length ? `Recente fouten van ${name} bij dit onderdeel:\n${mistakes.map((m) => `- ${m.text} → gaf "${m.given}", goed was ${m.display}`).join('\n')}` : 'Nog geen recente fouten bekend.'}

ZO VERLOOPT DE LES (zoals een instructie op school; per bericht één stap en één vraag):
1. VOORKENNIS — Eerste bericht: een warme, korte opening en één heel makkelijke vraag over de voorkennis uit de kaart (nog geen uitleg). Is dat antwoord fout? Help eerst daarmee (stap terug), pas dan verder.
2. BETEKENIS — Laat zien wat het betekent met de situatie/het model uit de kaart (geld, meten, strook, positieschema …), met een plaatje. Kort.
3. VOORDOEN — Doe één voorbeeld hardop voor met precies de stappen van de aanpak uit de kaart (genummerd, max 4 korte stappen). Kies getallen die passen bij ${levelName}.
4. SAMEN — Geef een vergelijkbare som. ${name} doet één stap tegelijk; jij vraagt steeds de volgende stap. Fout → zoek de denkfout (zie de kaart), ga één niveau concreter, en probeer opnieuw.
5. ZELF — Twee controlesommen die ${name} helemaal zelf maakt. Fout → terug naar stap 4 met die som.
6. TERUGKIJKEN — Vraag ${name} in eigen woorden te zeggen hoe je dit aanpakt. Vat het daarna in één zin samen, zeg dat ${name} klaar is om te oefenen, en zet op de laatste regel precies: [KLAAR]
Elk bericht = kort reageren op het antwoord + meteen de volgende stap + EINDIGEN MET ÉÉN VRAAG of opdracht aan ${name} (alleen het allerlaatste [KLAAR]-bericht heeft geen vraag). Nooit een bericht als "Dan gaan we kijken naar …" zonder dat je het meteen doet.
Sla stappen over als ${name} het duidelijk al kan (snel en goed). Houd elk bericht kort (max. ± 90 woorden, een plaatje telt niet mee).`;
  const messages = [{ role: 'user', content: ctx }, { role: 'assistant', content: 'Begrepen.' }];
  if (!chat.length) messages.push({ role: 'user', content: '[instructie] Begin de les.' });
  for (const m of chat.slice(-14)) messages.push({ role: m.role === 'teacher' ? 'assistant' : 'user', content: m.text });
  if (messages.at(-1).role === 'assistant') messages.push({ role: 'user', content: '[instructie] Ga verder.' });
  let text = await completeLeraar(KIND(name, profile, memory), messages, { maxTokens: 600, keepForm: true });
  if (!text) return null;
  // vangnet: geen vraag en niet klaar? Dan meteen doorgaan, zodat het kind niet blijft hangen
  if (!/\?/.test(text.replace(/\[\[[^\]]*\]\]/g, '')) && !/\[KLAAR\]/.test(text)) {
    const more = await completeLeraar(KIND(name, profile, memory), [...messages, { role: 'assistant', content: text }, { role: 'user', content: '[instructie] Je stopte zonder vraag. Ga meteen verder met de volgende stap van de les (zoals je net aankondigde) en eindig met één vraag aan het kind. Herhaal niet wat je al zei.' }], { maxTokens: 600, keepForm: true });
    if (more) text = `${text}\n\n${more}`;
  }
  return { text: text.replace(/\s*\[KLAAR\]\s*/g, '').trim(), ready: /\[KLAAR\]/.test(text) };
}

// Lesplan voor vandaag: Max bepaalt per onderdeel het niveau, het aantal sommen en een woordje.
// rows: [{cat, label, level (0-3), levelName, score, recent: 'x/y', trend, struggling}]
export async function planSession({ name, profile, memory, groep, rows, n }) {
  const table = rows.map((r) => `${r.cat} | ${r.label} | nu: ${r.levelName} | score ${r.score}/100 | laatste 14 dagen: ${r.recent || 'nog niet geoefend'} | trend ${r.trend ?? '-'}${r.struggling ? ' | LOOPT VAST' : ''}${r.calib ? ' | NIVEAU NOG ONZEKER' : ''}`).join('\n');
  return completeLeraar(KIND(name, profile, memory), [{
    role: 'user',
    content: `Maak het lesplan voor de oefensessie van vandaag (${n} sommen). ${name} zit in ${isAF() ? 'graad' : 'groep'} ${groep || (isAF() ? 7 : 8)}.
Niveaus: ${[...LEVEL_NAMES].map((l, i) => `${i} = ${l}`).join(', ')} (het laatste is het eindniveau). Elk onderdeel heeft een eigen niveau.

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
  return completeLeraar(KIND(name, profile, memory), [{
    role: 'user',
    content: `${summary}\n\nSchrijf ${name} een kort persoonlijk berichtje (max. 60 woorden) na deze sessie: 1) wat er echt goed ging (concreet), 2) waar jullie samen nog aan gaan werken, 3) een aanmoediging (mag grappig). Geen vragen stellen.`,
  }], { maxTokens: 300 });
}

// Voor het kind op het voortgangsscherm: waar je goed in bent, waar we nog mee oefenen, en een aanmoediging.
// Bewust GEEN niveaus, groepen/graden, scores of procenten: die zijn alleen voor de ouder.
export async function kidProgressNote({ name, profile, memory, strong, practice, streak }) {
  return completeLeraar(KIND(name, profile, memory), [{
    role: 'user',
    content: `Schrijf ${name} een kort berichtje (max. 55 woorden) voor het voortgangsscherm.
Goed in: ${strong.join(', ') || '(nog te weinig gegevens)'}.
Nog oefenen: ${practice.join(', ') || '(niets bijzonders)'}.
${streak ? `Al ${streak} dagen op rij geoefend.` : ''}
Regels: 1) noem concreet waar ${name} goed in is, 2) noem rustig waar jullie samen nog mee oefenen (als iets om te leren, niet als iets wat slecht is), 3) eindig met een korte aanmoediging (mag grappig).
Noem NOOIT een niveau, groep, graad, score, percentage of cijfer over hoe goed ${name} is. Geen vragen stellen. Geen plaatjes.`,
  }], { maxTokens: 260 });
}

// Leerlingprofiel bijwerken op basis van recente pogingen.
// Het leerlingprofiel: blijft bestaan over alle sessies heen. Zwakke punten krijgen bewijs en een status,
// zodat oude problemen niet vergeten worden en je ziet wat er opgelost is.
export async function updateProfile({ name, oldProfile, attempts, stats = [], misconceptions = [], memory = '', signals = '' }) {
  const data = await complete(`Je bent een ervaren remedial teacher rekenen (${ONDERWIJS()}). Je houdt een leerlingdossier bij van een kind dat achterloopt met rekenen. Je bent precies en eerlijk: je noemt alleen wat de data laat zien. Gebruik de naam of "het kind", nooit hij of zij.`, [{
    role: 'user',
    content: `HUIDIG PROFIEL (kan leeg zijn):
${oldProfile || '(leeg)'}

STAND PER ONDERDEEL (niveau nu | aantal sommen totaal | % goed totaal | % goed laatste 14 dagen | trend):
${stats.map((x) => `${x.label} | ${x.level} | ${x.n} | ${x.pct}% | ${x.pct14 == null ? '-' : x.pct14 + '%'} | ${x.trend}`).join('\n') || '(nog niets)'}

HERKENDE DENKFOUTEN (hoe vaak, alles):
${misconceptions.map((m) => `${m.misconception} (${m.n}×)`).join('\n') || '(geen)'}

NOTITIES VAN DE LERAAR (gesprekken):
${memory || '(geen)'}

GEMETEN SIGNALEN (tempo, automatisering, werkgeheugen, lezen, zelfvertrouwen, vastlopers, welke uitleg hielp):
${signals || '(nog geen)'}

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
 "leerstijl": "hoe ${name} het best leert, alleen op basis van de signalen en wat aantoonbaar hielp (tempo, stapgrootte, welke uitleg-vorm bij welk onderwerp werkte, wat motiveert). GEEN labels als 'visueel' of 'auditief' (onderzoek: lesgeven naar zo'n stijl helpt niet). Weinig data? Zeg dat.",
 "aanpak_tips": ["korte tip voor de leraar (max 3)"]}`,
  }], { json: true, maxTokens: 1800 });
  return data && typeof data === 'object' && (data.samenvatting || data.zwakke_punten) ? data : null;
}
// Na een sessie of les: korte notities voor het geheugen van de leraar.
export async function remember({ name, transcript }) {
  const data = await complete(`Je bent ${teacherName()}, de rekenleraar van ${name} (${isAF() ? 'laerskool' : 'basisschool'}, loopt achter met rekenen). Je maakt korte notities voor jezelf, zodat je de volgende keer kunt voortbouwen.`, [{
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
  return completeLeraar(KIND(name, profile, memory), [{
    role: 'user',
    content: `${describeQuestion(question)}\nJuiste antwoord: ${question.display}\nStappenplan: ${question.steps.join(' / ')}\n\n${name} had deze som goed en legt nu zelf uit hoe het ging:\n"""${explanation}"""\n\nGeef korte feedback (max 60 woorden): wat goed is aan de uitleg (noem de eigen woorden van ${name}), klopt de manier, mist er een stap? Eindig met een aanmoediging. Geen vragen terug.`,
  }], { maxTokens: 300 });
}

// Advies voor de ouder.
export async function parentAdvice({ name, summary, profile }) {
  return complete(isAF()
    ? 'Je bent een ervaren remedial teacher wiskunde in het Suid-Afrikaanse laerskoolonderwijs. Je adviseert een ouder van een kind (meestal graad 6/7) dat achterloopt met wiskunde. Je kent het KABV-kurrikulum (Intermediêre en Senior Fase), de DBE-werkboeke en de jaarlikse toetse. Schrijf helder, concreet en praktisch. Geen tabellen; korte kopjes met ** mogen. Je weet niet of het kind een jongen of meisje is: gebruik de naam of "die kind", nooit hy of sy.'
    : 'Je bent een ervaren remedial teacher rekenen in het Nederlandse basisonderwijs. Je adviseert een ouder van een kind (meestal groep 7/8) dat achterloopt met rekenen. Je kent de referentieniveaus 1F en 1S, de doorstroomtoets, en methodes als Pluspunt en Wereld in getallen. Schrijf helder, concreet en praktisch. Geen tabellen; korte kopjes met ** mogen. Je weet niet of het kind een jongen of meisje is: gebruik de naam of "het kind", nooit hij of zij.', [{
    role: 'user',
    content: `Oefengegevens van ${name}:\n${summary}\n\nLeerlingprofiel (door de AI-leraar bijgehouden):\n${profile || '(nog leeg)'}\n\nGeef (max 300 woorden):\n1. Eerlijke samenvatting: waar staat ${name}.\n2. De belangrijkste denkfouten en waar die vandaan komen.\n3. 3 concrete dingen die de ouder thuis kan doen (5-10 min, dagelijks leven).\n4. Wat de ouder met de leerkracht kan bespreken.`,
  }], { maxTokens: 1200 });
}
