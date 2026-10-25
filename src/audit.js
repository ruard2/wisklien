// Max-test: de échte Meester Max (zelfde prompts, zelfde model) uitproberen op een flinke stapel sommen,
// alles bewaren en laten beoordelen. Niets hiervan is zichtbaar voor kinderen of ouders.
//
// Per som:
//   1. de vaste uitleg uit de app: stappenplan, hints, tussenstappen met tips, herkende denkfout + "wat helpt"
//   2. "Hoe begin ik?" vóór het antwoord (mag het antwoord niet voorzeggen)
//   3. een fout antwoord (vaak een bekende denkfout) → Max opent het gesprek, het kind reageert (gespeeld door de AI),
//      Max antwoordt, het kind tikt "Ik snap het nog niet" → Max nog een keer
//   4. vastlopen bij een tussenstap → Max legt díe stap uit
//   5. een rekencontrole (code, geen AI) op alle sommetjes in de teksten ("12 × 4 = 48")
//   6. een beoordelaar (AI, eigen rubric) geeft cijfers en noemt concrete problemen met citaat en voorstel
// Na afloop: één samenvatting met de belangrijkste verbeterpunten.
//
// Draait op de server (pagina /audit, alleen beheerder) of lokaal: node scripts/max-audit.mjs
import { kidStore, pool } from './db.js';
import { generate, hintsFor, detectMisconception, checkAnswer, catById, CATEGORIES, LEVEL_NAMES, didactiekText } from './curriculum.js';
import { teacherTurn, splitForm, auditCall, describeQuestion, aiEnabled, aiModel } from './ai.js';
import { kaartTekst } from './uitleg/index.js';
import { fracStr, hhmm, metZaad } from './util.js';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

// ---------- de vaste meetlat (src/meetlat/*.json.gz, gemaakt met scripts/maak-meetlat.mjs) ----------
const meetlatCache = {};
export function meetlat(lang) {
  lang = lang === 'af' ? 'af' : 'nl';
  return (meetlatCache[lang] ||= JSON.parse(gunzipSync(readFileSync(new URL(`./meetlat/${lang}.json.gz`, import.meta.url))).toString('utf8')));
}
const versie = () => (process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT || '').slice(0, 7) || null;

const KID = { nl: { kid: 999990, name: 'Sam', cur: 'nl', lang: 'nl', country: 'NL' }, af: { kid: 999991, name: 'Sam', cur: 'za', lang: 'af', country: 'ZA' } };
const NAME = 'Sam';
// Modellen per test (in te stellen op /audit; anders de omgevingsvariabelen, anders het gewone model van de app):
//   max = het model van Max zelf (leeg = hetzelfde als in de app; een ander model test je zo zonder de app te veranderen)
//   judge = de beoordelaar, kid = het gespeelde kind
const JUDGE_MODEL = () => kidStore.getStore()?.judgeModel || process.env.AUDIT_MODEL || null;
const KID_MODEL = () => kidStore.getStore()?.kidModel || process.env.AUDIT_KID_MODEL || null;
const inCtx = (lang, fn, m = {}) => kidStore.run({ ...(KID[lang] || KID.nl), aiModel: m.max || null, judgeModel: m.judge || null, kidModel: m.kid || null, cache: m.cache || null }, fn);

const rnd = (n) => Math.floor(Math.random() * n);
const pickOne = (a) => a[rnd(a.length)];
const fmtNum = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');

// ---------- welke sommen? ----------
// Elk onderdeel × niveau minstens één keer (zolang n het toelaat), de rest willekeurig.
export function planSums(lang, n) {
  return inCtx(lang, () => {
    const cells = [];
    for (const c of CATEGORIES) for (let lv = 0; lv < 4; lv++) cells.push({ cat: c.id, level: lv });
    const shuffled = cells.sort(() => Math.random() - 0.5);
    const plan = shuffled.slice(0, Math.min(n, cells.length));
    while (plan.length < n) plan.push(pickOne(cells));
    return plan.sort((a, b) => a.cat.localeCompare(b.cat) || a.level - b.level);
  });
}

// ---------- een fout antwoord, zoals een kind het geeft ----------
function shownAnswer(q, v) {
  if (q.type === 'choice') return q.options[v];
  if (q.type === 'fraction') return Array.isArray(v) ? fracStr(v, false) : String(v);
  if (q.type === 'time') return hhmm(v);
  return typeof v === 'number' ? fmtNum(v) : String(v);
}
function wrongAnswer(q) {
  // vaak een bekende denkfout (dan kan Max laten zien dat hij die herkent)
  const known = (q.wrong || []).filter((w) => typeof w.answer === 'number' || Array.isArray(w.answer));
  if (known.length && Math.random() < 0.6) {
    const w = pickOne(known);
    return { raw: q.type === 'time' ? hhmm(w.answer) : Array.isArray(w.answer) ? `${w.answer[0]}/${w.answer[1]}` : fmtNum(w.answer), kind: 'denkfout' };
  }
  if (q.type === 'choice') { const i = (q.answer + 1 + rnd(q.options.length - 1)) % q.options.length; return { raw: String(i), kind: 'willekeurig' }; }
  if (q.type === 'time') return { raw: hhmm(q.answer + pickOne([10, -10, 60, 40])), kind: 'willekeurig' };
  if (q.type === 'fraction') return { raw: fracStr([q.answer[0] + 1, q.answer[1]], false), kind: 'willekeurig' };
  const a = q.answer;
  const r = Number.isInteger(a) ? a + (Math.random() < 0.5 ? 1 : -1) * (Math.abs(a) > 20 ? 10 : 1) : a * 10;
  return { raw: fmtNum(r), kind: 'willekeurig' };
}
function wrongStep(step) {
  if (step.type === 'choice') return String((step.answer + 1) % step.options.length);
  if (step.type === 'number') return fmtNum(step.answer + (Math.abs(step.answer) >= 20 ? 10 : 1));
  if (step.type === 'fraction') return fracStr([step.answer[0] + 1, step.answer[1]], false);
  if (step.type === 'time') return hhmm(step.answer + 10);
  return '1';
}

// ---------- het kind (gespeeld door de AI) ----------
// bedoeling (meetlat): wat het kind deze beurt doet, zodat twee runs vergelijkbaar zijn
const BEDOELING = {
  nl: { fout: 'Beantwoord de vraag van de meester, maar FOUT (een fout die een kind echt maakt).', snapniet: 'Zeg dat je het niet snapt, in je eigen woorden (bijv. "huh?" of "snap ik niet").', goed: 'Beantwoord de vraag van de meester GOED, kort. (Vraagt hij hoe je op je eerste antwoord kwam: vertel dan eerlijk je foute manier.)' },
  af: { fout: 'Antwoord die vraag van Meneer, maar VERKEERD (’n fout wat ’n kind regtig maak).', snapniet: 'Sê jy verstaan dit nie, in jou eie woorde.', goed: 'Antwoord die vraag van Meneer REG, kort. (Vra hy hoe jy by jou eerste antwoord gekom het: vertel eerlik jou verkeerde manier.)' },
};
async function kidSays(lang, q, chat, bedoeling = null, fout = null) {
  const af = lang === 'af';
  const sys = af
    ? 'Jy speel ’n kind van 11 (graad 6, Suid-Afrika) wat agter is met wiskunde. Antwoord kort (maks 12 woorde) in eenvoudige Afrikaans, soos ’n kind tik. Meestal probeer jy die vraag van Meneer te beantwoord (soms reg, soms verkeerd), soms sê jy "ek verstaan nie".'
    : 'Je speelt een kind van 11 (groep 8) dat achterloopt met rekenen. Antwoord kort (max 12 woorden), in kindertaal zoals een kind typt. Meestal probeer je de vraag van de meester te beantwoorden (soms goed, soms fout), soms zeg je "snap ik niet".';
  // het kind weet zelf hoe het aan zijn foute antwoord kwam (Max vraagt daar nu eerst naar)
  const hoe = fout ? (af
    ? `\n\nJy het eers "${fout.given}" geantwoord (verkeerd).${fout.label ? ` So het jy daarby gekom: ${fout.label}` : ' Bedink self hoe ’n kind by daardie antwoord sou uitkom.'} Vra Meneer hoe jy daarby gekom het, vertel dit kort: ’n verduideliking wat regtig by "${fout.given}" uitkom (jou verkeerde manier), NIE die regte manier nie. Jy weet NIE wat die regte antwoord is nie: moenie ${q.display} noem nie, tensy Meneer jou stap vir stap daarheen gehelp het.`
    : `\n\nJe had eerst "${fout.given}" geantwoord (fout).${fout.label ? ` Zo kwam je erop: ${fout.label}` : ' Bedenk zelf hoe een kind op dat antwoord zou komen.'} Vraagt de meester hoe je erop kwam, vertel dat dan kort: een uitleg die echt op "${fout.given}" uitkomt (jouw foute manier), NIET de goede manier. Je weet het goede antwoord NIET: noem ${q.display} niet, tenzij de meester je er stap voor stap naartoe heeft geholpen.`) : '';
  const doe = bedoeling ? `\n\n${af ? 'Hierdie keer' : 'Deze keer'}: ${BEDOELING[af ? 'af' : 'nl'][bedoeling]}` : '';
  const user = `${af ? 'Die som' : 'De som'}: ${q.text}\n\n${chat.map((m) => `${m.role === 'teacher' ? (af ? 'Meneer' : 'Meester') : (af ? 'Jy' : 'Jij')}: ${m.text}`).join('\n')}${hoe}${doe}\n\n${af ? 'Wat sê jy terug? Net jou sin.' : 'Wat zeg je terug? Alleen jouw zin.'}`;
  const t = await auditCall(sys, [{ role: 'user', content: user }], { maxTokens: 300, model: KID_MODEL() });
  return String(t || (af ? 'ek verstaan nie' : 'snap ik niet')).replace(/^["“]|["”]$/g, '').trim().slice(0, 200);
}

// rekencontrole: zie src/kwaliteit.js
export { checkArithmetic } from './kwaliteit.js';
import { checkArithmetic } from './kwaliteit.js';

// ---------- één som uitproberen ----------
// p = { cat, level } (willekeurige som) of een bevroren meetlat-geval { id, cat, level, q, fout, bedoeling, step }
export async function auditOne(lang, p, models = {}) {
  const { cat, level } = p;
  return inCtx(lang, async () => {
    // Meetlat: de som opnieuw maken met het zaad, zodat de vaste uitleg van NU meedoet; zelfde som? dan die, anders de bevroren som.
    let q, vers = null;
    if (p.q && p.seed != null) {
      const nieuw = metZaad(p.seed, () => generate(cat, level));
      vers = nieuw.tpl === p.q.tpl && nieuw.text === p.q.text;
      q = vers ? nieuw : structuredClone(p.q);
    } else q = p.q ? structuredClone(p.q) : generate(cat, level);
    const card = didactiekText(cat, level, { kort: !!kaartTekst(lang, q.tpl) });
    const base = { name: NAME, profile: '', memory: '', today: '', question: q, levelName: LEVEL_NAMES[level] };
    const item = {
      lang, cat, level, uitleg_vers: vers, label: catById[cat].label, levelName: LEVEL_NAMES[level], tpl: q.tpl || null, geval: p.id || null, goud: p.goud || null,
      som: describeQuestion(q), type: q.type, antwoord: q.display, opties: q.options || null,
      stappenplan: q.steps || [], hints: hintsFor(q) || [],
      tussenstappen: (q.guide || []).map((s) => ({ vraag: s.ask, antwoord: s.display, tip: s.tip || null, opties: s.options || null })),
      slot: q.guideFinal || null,
      denkfouten: (q.wrong || []).map((w) => ({ label: w.label, wat_helpt: w.fix })),
      gesprekken: {}, rekencontrole: [], fouten: [],
    };
    const call = async (label, fn) => {
      const t0 = Date.now();
      try { const r = await fn(); return { ...r, ms: Date.now() - t0 }; } catch (e) { item.fouten.push(`${label}: ${e.message}`); return null; }
    };
    const maxSays = async (args) => { const r = await teacherTurn({ ...base, ...args }); const { text, form } = splitForm(r); return { text: text || null, vorm: form || null }; };

    // vóór het antwoord: "Hoe begin ik?"
    const begin = lang === 'af' ? 'Hoe begin ek?' : 'Hoe begin ik?';
    const b = await call('begin', () => maxSays({ phase: 'before', given: undefined, chat: [{ role: 'kid', text: begin }] }));
    item.gesprekken.begin = { kind: begin, max: b?.text ?? null, vorm: b?.vorm ?? null, ms: b?.ms };

    // fout antwoord → gesprek zoals in de app
    const w = p.fout ? { raw: p.fout, kind: p.foutSoort || 'meetlat' } : wrongAnswer(q);
    const given = q.type === 'choice' ? q.options[Number(w.raw)] : w.raw;
    const mis = detectMisconception(q, w.raw, checkAnswer);
    item.fout_antwoord = { gegeven: given, soort: w.kind, herkend: mis ? { label: mis.label, wat_helpt: mis.fix } : null, klopt_niet: !checkAnswer(q, w.raw).correct };
    const chat = [];
    const turns = [];
    const r1 = await call('fout-1', () => maxSays({ phase: 'wrong', given, chat, misconception: mis }));
    if (r1?.text) {
      chat.push({ role: 'teacher', text: r1.text }); turns.push({ wie: 'max', tekst: r1.text, vorm: r1.vorm, ms: r1.ms });
      const k1 = await call('kind-1', async () => ({ text: p.kind1 || await kidSays(lang, q, chat, p.bedoeling || null, { given, label: mis?.label || null }) }));
      if (k1?.text) {
        chat.push({ role: 'kid', text: k1.text }); turns.push({ wie: 'kind', tekst: k1.text });
        const r2 = await call('fout-2', () => maxSays({ phase: 'wrong', given, chat: [...chat], misconception: mis }));
        if (r2?.text) {
          chat.push({ role: 'teacher', text: r2.text }); turns.push({ wie: 'max', tekst: r2.text, vorm: r2.vorm, ms: r2.ms });
          const k2 = lang === 'af' ? 'Ek verstaan dit nog nie 🤔' : 'Ik snap het nog niet 🤔';
          chat.push({ role: 'kid', text: k2 }); turns.push({ wie: 'kind', tekst: k2, knop: true });
          const r3 = await call('fout-3', () => maxSays({ phase: 'wrong', given, chat: [...chat], misconception: mis }));
          if (r3?.text) turns.push({ wie: 'max', tekst: r3.text, vorm: r3.vorm, ms: r3.ms });
        }
      }
    }
    item.gesprekken.na_fout = turns;

    // vast bij een tussenstap
    if (q.guide?.length) {
      const si = p.step != null ? Math.min(p.step, q.guide.length - 1) : q.guide.length > 1 ? 1 + rnd(q.guide.length - 1) : 0;
      const step = q.guide[si];
      const tried = wrongStep(step);
      const shown = step.type === 'choice' ? step.options[Number(tried)] : tried;
      const msg = lang === 'af' ? `Ek verstaan nie hierdie stap nie: ${step.ask}` : `Ik snap deze stap niet: ${step.ask}`;
      const r = await call('stap', () => maxSays({ phase: 'step', step, given: shown, chat: [{ role: 'kid', text: msg }] }));
      item.gesprekken.stap = { stap: si + 1, vraag: step.ask, goed: step.display, gegeven: shown, tip: step.tip || null, kind: msg, max: r?.text ?? null, vorm: r?.vorm ?? null, ms: r?.ms };
    }

    // rekencontrole op alle teksten
    const texts = [
      ...item.stappenplan.map((t) => ['stappenplan', t]), ...item.hints.map((t) => ['hint', t]),
      ...item.tussenstappen.flatMap((s) => [['tussenstap', `${s.vraag.replace(/=\s*\?$/, '')}= ${s.antwoord}`], ['tip', s.tip || '']]),
      ['denkfout', mis?.fix || ''],
      ['max-begin', item.gesprekken.begin.max], ...turns.filter((x) => x.wie === 'max').map((x) => ['max-fout', x.tekst]),
      ['max-stap', item.gesprekken.stap?.max],
    ];
    for (const [waar, t] of texts) for (const f of checkArithmetic(t)) item.rekencontrole.push({ waar, ...f });
    item._card = [kaartTekst(lang, q.tpl), card].filter(Boolean).join('\n\n');
    return item;
  }, models);
}

// Plaatjes van Max leesbaar voor de beoordelaar (meetlat #6: "[[getallenlijn: 640 | 650 | 642]]" werd gelezen als
// "642 staat ná 650", terwijl het betekent: lijn van 640 tot 650 met een stip bij 642).
export function leesbaarPlaatje(t) {
  return String(t ?? '').replace(/\[\[\s*(getallenlijn|tijdlijn)\s*:\s*([^|\]]+)\|([^|\]]+)\|?([^\]]*)\]\]/gi, (m, soort, a, b, c) =>
    `[plaatje: ${soort === 'tijdlijn' ? 'tijdbalk' : 'getallenlijn'} van ${a.trim()} tot ${b.trim()}${c.trim() ? `, met een stip bij ${c.trim()}` : ''}]`)
    .replace(/\[\[\s*sprongen\s*:\s*([^|\]]+)\|([^\]]*)\]\]/gi, (m, a, b) => `[plaatje: lege getallenlijn, vanaf ${a.trim()} sprongen ${b.split('|').map((x) => x.trim()).join(', ')}]`)
    .replace(/\[\[\s*klok\s*:\s*([^|\]]+)(\|[^\]]*)?\]\]/gi, (m, a) => `[plaatje: klok met wijzers op ${a.trim()}]`);
}
// ---------- beoordelen ----------
const RUBRIC = (lang) => `Je bent een zeer ervaren rekenspecialist en remedial teacher (${lang === 'af' ? 'Suid-Afrikaanse laerskool, KABV; de app-teksten zijn in het Afrikaans' : 'Nederlandse basisschool, groep 5-8'}). Je beoordeelt kritisch en eerlijk de uitleg in een reken-app voor kinderen (9-12 jaar) die achterlopen.

Je krijgt één som met ALLES wat het kind te zien krijgt:
- de vaste uitleg van de app: stappenplan (na een fout), hints, tussenstappen ("samen stap voor stap": het kind vult elke stap zelf in, met een tip als het fout gaat) en de uitleg bij een herkende denkfout;
- gesprekken met de AI-leraar ("Max"): vóór het antwoord ("Hoe begin ik?"), na een fout antwoord, en als het kind vastloopt bij een tussenstap;
- de UITLEGKAART van deze soort som (leidend: de aanpak die de app en Max moeten volgen, zoals scholen het aanleren) en de achtergrond van de DIDACTIEKKAART van het onderdeel. Wijkt de vaste uitleg af van de rekenroute van de uitlegkaart, of is de kaart zelf onhandig voor deze som, meld dat dan ook (waar: "kaart"). Het "model/plaatje" op de kaart is voor Max (die kan tekenen); dat het stappenplan (tekst) geen plaatje tekent is GEEN probleem.;
- uitkomst van een automatische rekencontrole (kan vals alarm geven, controleer zelf).

Controleer vooral:
1. Rekenkundig: klopt elk getal, elke tussenuitkomst en het eindantwoord? Klopt de som zelf (eenduidig, realistisch)? Elke rekenfout is ernstig.
2. Tussenstappen: logische volgorde, elke stap één klein ding, geen sprong; leidt het écht naar het antwoord; past het bij de aanpak van de kaart; is de tip bij een stap behulpzaam (en niet gewoon het antwoord)?
3. Stappenplan en hints: duidelijk, juist, volgens de kaart, kindertaal.
4. Max na een fout: herkent hij wat er misging (kijk naar het gegeven antwoord en de herkende denkfout)? Is er géén denkfout herkend, dan is eerst vragen hoe het kind eraan kwam GOED (niet afrekenen), mits hij daarna de fout in de uitleg van het kind oppakt. Kleine stap, één vraag, reageert hij echt op wat het kind zei, gaat hij concreter als het kind het niet snapt, geen herhaling, geen lap tekst?
5. Max bij een tussenstap: legt hij precies díe stap uit, met een makkelijker voorbeeld, zonder het antwoord van de stap te verklappen?
6. Max vóór het antwoord: helpt op weg zonder het eindantwoord (of een uitkomst waarmee het antwoord direct vastligt) te verklappen.
7. Samenhang: gebruiken Max, het stappenplan en de tussenstappen dezelfde aanpak en woorden? Of zegt Max iets anders dan de app?
8. Taal: begrijpelijk voor een kind van 10, geen vakwoorden zonder uitleg, natuurlijk ${lang === 'af' ? 'Afrikaans (geen Nederlands of anglisismes)' : 'Nederlands (geen vertaald Engels)'}; geen LaTeX of markdown-rommel.

Cijfers 1-5 (5 = uitstekend, 3 = matig, 1 = slecht/fout). Gebruik null als iets ontbreekt.
Noem bij problemen ALTIJD waar (één van: som, stappenplan, hint, tussenstap, tip, denkfout-uitleg, kaart, max-begin, max-fout, max-stap), een letterlijk citaat, wat er mis is, en een concreet voorstel (betere tekst of wat er in de prompt/generator moet veranderen). Alleen echte problemen; geen muggenzifterij.

Antwoord met één JSON-object:
{"rekenfouten": [{"waar": "...", "citaat": "...", "uitleg": "..."}],
 "cijfers": {"som": 1-5, "stappenplan": 1-5, "tussenstappen": 1-5|null, "tips": 1-5|null, "max_begin": 1-5|null, "max_na_fout": 1-5|null, "max_stap": 1-5|null, "samenhang": 1-5, "taal": 1-5},
 "max_herkent_fout": true|false|null,
 "max_verklapt": true|false,
 "problemen": [{"waar": "...", "soort": "rekenfout|onduidelijk|sprong|andere-aanpak|te-lang|voorzeggen|niet-luisteren|herhaling|taal|niveau|denkfout-gemist|anders", "ernst": 1-3, "citaat": "...", "uitleg": "...", "voorstel": "..."}],
 "oordeel": "één of twee zinnen: hoe goed is de uitleg bij deze som en wat is het belangrijkste verbeterpunt"}`;

function itemForJudge(it) {
  const L = [];
  L.push(`ONDERDEEL: ${it.label} · niveau ${it.levelName}`);
  L.push(it.som);
  if (it.opties) L.push(`Keuzes: ${it.opties.join(' | ')}`);
  L.push(`Juiste antwoord: ${it.antwoord}`);
  L.push(`\nSTAPPENPLAN (na een fout):\n${it.stappenplan.map((s, i) => `${i + 1}. ${s}`).join('\n') || '(geen)'}`);
  L.push(`\nHINTS:\n${it.hints.map((s, i) => `${i + 1}. ${s}`).join('\n') || '(geen)'}`);
  L.push(`\nTUSSENSTAPPEN:\n${it.tussenstappen.map((s, i) => `${i + 1}. vraag: "${s.vraag}"${s.opties ? ` (keuzes: ${s.opties.join(' | ')})` : ''} → goed: ${s.antwoord}${s.tip ? ` · tip bij fout: "${s.tip}"` : ''}`).join('\n') || '(geen)'}${it.slot ? `\nSlot (de app toont: ${it.lang === 'af' ? `"Nou is dit jou beurt: ${it.slot}" + "Vul hieronder die eindantwoord in."` : `"Nu jij: ${it.slot}" + "Vul hieronder het eindantwoord in."`} Het kind rekent dit laatste stukje bewust zelf uit; dat is geen onaffe stap): ${it.slot}` : ''}`);
  L.push(`\nMAX VÓÓR HET ANTWOORD\nKind: ${it.gesprekken.begin?.kind}\nMax: ${leesbaarPlaatje(it.gesprekken.begin?.max) || '(geen antwoord)'}`);
  L.push(`\nFOUT ANTWOORD van het kind: "${it.fout_antwoord.gegeven}"${it.fout_antwoord.herkend ? ` — de app herkende de denkfout: "${it.fout_antwoord.herkend.label}" (uitleg in de app: "${it.fout_antwoord.herkend.wat_helpt}")` : ' — geen bekende denkfout herkend'}`);
  L.push(`GESPREK NA DE FOUT:\n${(it.gesprekken.na_fout || []).map((t) => `${t.wie === 'max' ? 'Max' : 'Kind'}: ${t.wie === 'max' ? leesbaarPlaatje(t.tekst) : t.tekst}`).join('\n') || '(geen)'}`);
  if (it.gesprekken.stap) {
    const s = it.gesprekken.stap;
    L.push(`\nVAST BIJ TUSSENSTAP ${s.stap}: "${s.vraag}" (goed: ${s.goed}; kind vulde in: ${s.gegeven}; tip van de app: "${s.tip || '-'}")\nKind: ${s.kind}\nMax: ${leesbaarPlaatje(s.max) || '(geen antwoord)'}`);
  }
  L.push(`\nAUTOMATISCHE REKENCONTROLE: ${it.rekencontrole.length ? it.rekencontrole.map((r) => `[${r.waar}] ${r.expr} (uitkomst links is ${r.verwacht}${r.keten ? '; let op: is-teken-ketting' : ''})`).join('; ') : 'niets gevonden'}`);
  L.push(`\nDIDACTIEKKAART:\n${it._card || '(geen)'}`);
  return L.join('\n');
}
export async function judgeOne(it, models = {}) {
  return inCtx(it.lang, async () => {
    const v = await auditCall(RUBRIC(it.lang), [{ role: 'user', content: itemForJudge(it) }], { json: true, maxTokens: 3000, model: JUDGE_MODEL() });
    return v && typeof v === 'object' ? v : { fout: 'geen oordeel' };
  }, models);
}

// Een "lage" score per som, om de slechtste bovenaan te zetten
export function itemScore(it) {
  const c = it.verdict?.cijfers || {};
  const vals = Object.values(c).filter((x) => typeof x === 'number');
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 3;
  return avg - 1.5 * (it.verdict?.rekenfouten?.length || 0) - (it.verdict?.max_verklapt ? 1 : 0);
}

// ---------- samenvatting over alle sommen ----------
export async function summarize(lang, items, models = {}) {
  const probs = items.flatMap((it) => (it.verdict?.problemen || []).map((p) => `[${it.label} ${it.levelName}] ${p.waar} · ${p.soort} · ernst ${p.ernst}: ${p.uitleg} ${p.citaat ? `(“${String(p.citaat).slice(0, 120)}”)` : ''}`));
  const rek = items.flatMap((it) => (it.verdict?.rekenfouten || []).map((r) => `[${it.label} ${it.levelName}] ${r.waar}: ${r.uitleg} (“${String(r.citaat || '').slice(0, 120)}”)`));
  if (!probs.length && !rek.length) return null;
  return inCtx(lang, () => auditCall(`Je bent hoofd onderwijs van een reken-app. Je krijgt de problemen die een beoordelaar vond in de uitleg bij ${items.length} sommen (vaste uitleg uit de app én gesprekken met de AI-leraar Max). Vat samen wat het meeste oplevert om te verbeteren. Wees concreet en praktisch.`, [{
    role: 'user',
    content: `REKENFOUTEN (${rek.length}):\n${rek.join('\n').slice(0, 15000) || '(geen)'}\n\nANDERE PROBLEMEN (${probs.length}):\n${probs.join('\n').slice(0, 45000)}\n\nGeef JSON:
{"samenvatting": "3-5 zinnen: hoe goed is de uitleg nu, en waar zit het grootste probleem",
 "verbeterpunten": [{"titel": "kort", "waar": "prompt van Max | tussenstappen/stappenplan van onderdeel X | denkfout-uitleg | anders", "hoe_vaak": "bijv. 14 van de ${items.length} sommen", "voorbeeld": "één typisch citaat", "oplossing": "wat er precies moet veranderen"}],
 "onderdelen_slechtst": [{"onderdeel": "...", "waarom": "..."}],
 "wat_goed_gaat": ["..."]}
Maximaal 10 verbeterpunten, belangrijkste eerst.`,
  }], { json: true, maxTokens: 5000, model: JUDGE_MODEL() }), models);
}

// Kleine wachtrij: maximaal `conc` tegelijk
export async function runPool(list, conc, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(conc, list.length) }, async () => {
    while (i < list.length) { const k = i++; await fn(list[k], k); }
  }));
}

// =====================================================================
// Op de server: opdrachten in de database (overleven geen herstart halverwege, maar gaan dan verder)
// =====================================================================
export async function migrateAudit() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.max_audit (
      id serial PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
      lang text NOT NULL, n int NOT NULL, status text NOT NULL DEFAULT 'bezig', model text, judge_model text,
      plan jsonb NOT NULL, summary jsonb, error text
    );
    ALTER TABLE public.max_audit ADD COLUMN IF NOT EXISTS soort text NOT NULL DEFAULT 'willekeurig';
    ALTER TABLE public.max_audit ADD COLUMN IF NOT EXISTS versie text;
    ALTER TABLE public.max_audit ADD COLUMN IF NOT EXISTS kid_model text;
    ALTER TABLE public.max_audit ADD COLUMN IF NOT EXISTS max_model text;
    CREATE TABLE IF NOT EXISTS public.max_audit_items (
      audit_id int NOT NULL REFERENCES public.max_audit(id) ON DELETE CASCADE, idx int NOT NULL,
      cat text NOT NULL, level int NOT NULL, item jsonb NOT NULL, verdict jsonb, score real,
      PRIMARY KEY (audit_id, idx)
    );
    ALTER TABLE public.max_audit ADD COLUMN IF NOT EXISTS hergebruik boolean NOT NULL DEFAULT true;
    ALTER TABLE public.max_audit ADD COLUMN IF NOT EXISTS meetlat_versie text;
    ALTER TABLE public.max_audit ADD COLUMN IF NOT EXISTS ai_nieuw int NOT NULL DEFAULT 0;
    ALTER TABLE public.max_audit ADD COLUMN IF NOT EXISTS ai_hergebruikt int NOT NULL DEFAULT 0;
    CREATE TABLE IF NOT EXISTS public.ai_cache (
      sleutel text PRIMARY KEY, model text, antwoord jsonb NOT NULL,
      gemaakt timestamptz NOT NULL DEFAULT now(), laatst timestamptz NOT NULL DEFAULT now(), gebruikt int NOT NULL DEFAULT 0
    );
    DELETE FROM public.ai_cache WHERE laatst < now() - interval '120 days';`);
}
const running = new Set();
// soort: 'willekeurig' (n willekeurige sommen) of 'meetlat' (alle vaste gevallen; vergelijkbaar tussen versies)
export async function startAudit(lang, n, soort = 'willekeurig', m = {}) {
  if (!aiEnabled()) throw new Error('De AI staat uit: zet OPENAI_API_KEY (of ANTHROPIC_API_KEY).');
  lang = lang === 'af' ? 'af' : 'nl';
  soort = soort === 'meetlat' ? 'meetlat' : 'willekeurig';
  const plan = soort === 'meetlat' ? meetlat(lang).cases.map((c) => ({ geval: c.id, cat: c.cat, level: c.level })) : planSums(lang, Math.max(1, Math.min(300, Number(n) || 100)));
  n = plan.length;
  const clean = (x) => (String(x || '').trim().match(/^[\w.:\-]{2,60}$/) ? String(x).trim() : null);
  const hergebruik = m.hergebruik !== false;
  const maxM = clean(m.max), judgeM = clean(m.judge) || process.env.AUDIT_MODEL || null, kidM = clean(m.kid) || process.env.AUDIT_KID_MODEL || null;
  const { id } = (await pool.query(`INSERT INTO public.max_audit(lang, n, plan, model, judge_model, soort, versie, max_model, kid_model, hergebruik, meetlat_versie) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [lang, n, JSON.stringify(plan), maxM || aiModel(), judgeM || maxM || aiModel(), soort, versie(), maxM, kidM, hergebruik, soort === 'meetlat' ? `${meetlat(lang).versie || 1}/${meetlat(lang).gemaakt}` : null])).rows[0];
  runAudit(id).catch((e) => console.error('[audit]', e));
  return id;
}
export async function resumeAudits() {
  for (const r of (await pool.query(`SELECT id FROM public.max_audit WHERE status='bezig'`)).rows) runAudit(r.id).catch((e) => console.error('[audit]', e));
}
async function runAudit(id) {
  if (running.has(id)) return;
  running.add(id);
  try {
    const job = (await pool.query('SELECT * FROM public.max_audit WHERE id=$1', [id])).rows[0];
    const models = { max: job.max_model || null, judge: job.judge_model && job.judge_model !== (job.max_model || job.model) ? job.judge_model : (process.env.AUDIT_MODEL || null), kid: job.kid_model || null };
    // hergebruik: tellers per test (nieuw = betaalde aanroep, hergebruikt = uit public.ai_cache)
    const teller = { nieuw: 0, hergebruikt: 0, lezen: job.hergebruik !== false };
    models.cache = teller;
    const bewaarTeller = () => { const n = teller.nieuw, h = teller.hergebruikt; teller.nieuw -= n; teller.hergebruikt -= h; return pool.query('UPDATE public.max_audit SET ai_nieuw = ai_nieuw + $2, ai_hergebruikt = ai_hergebruikt + $3 WHERE id=$1', [id, n, h]).catch(() => {}); };
    const done = new Set((await pool.query(`SELECT idx FROM public.max_audit_items WHERE audit_id=$1 AND verdict IS NOT NULL AND NOT (verdict ? 'fout')`, [id])).rows.map((r) => r.idx));
    const todo = job.plan.map((p, idx) => ({ ...p, idx })).filter((p) => !done.has(p.idx));
    console.log(`[audit] #${id}: ${todo.length} van ${job.n} sommen te gaan (${job.lang})`);
    await runPool(todo, Number(process.env.AUDIT_CONCURRENCY || 4), async (p) => {
      if ((await pool.query('SELECT status FROM public.max_audit WHERE id=$1', [id])).rows[0]?.status !== 'bezig') return;
      // één som die misgaat, mag nooit de hele test stoppen
      let it;
      const geval = p.geval ? meetlat(job.lang).cases.find((c) => c.id === p.geval) : null;
      try { it = await auditOne(job.lang, geval || p, models); } catch (e) {
        console.error('[audit] som mislukt', p, e);
        it = { lang: job.lang, cat: p.cat, level: p.level, label: p.cat, levelName: String(p.level), som: '(mislukt)', stappenplan: [], hints: [], tussenstappen: [], gesprekken: {}, rekencontrole: [], fouten: [`som: ${e.message}`] };
      }
      it.verdict = it.som === '(mislukt)' ? { fout: 'som mislukt' } : await judgeOne(it, models).catch((e) => ({ fout: e.message }));
      const score = itemScore(it);
      await pool.query(`INSERT INTO public.max_audit_items(audit_id, idx, cat, level, item, verdict, score) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (audit_id, idx) DO UPDATE SET item=$5, verdict=$6, score=$7`, [id, p.idx, p.cat, p.level, JSON.stringify(it), JSON.stringify(it.verdict), score]);
      await bewaarTeller();
    });
    if ((await pool.query('SELECT status FROM public.max_audit WHERE id=$1', [id])).rows[0]?.status !== 'bezig') return;
    const items = await auditItems(id);
    const summary = await summarize(job.lang, items, models).catch(() => null);
    await bewaarTeller();
    await pool.query(`UPDATE public.max_audit SET status='klaar', finished_at=now(), summary=$2 WHERE id=$1`, [id, summary ? JSON.stringify(summary) : null]);
    console.log(`[audit] #${id} klaar`);
  } catch (e) {
    await pool.query(`UPDATE public.max_audit SET status='fout', error=$2 WHERE id=$1`, [id, String(e.message || e).slice(0, 500)]).catch(() => {});
    throw e;
  } finally { running.delete(id); }
}
// Een gestopte of vastgelopen test verder laten gaan (sommen die al klaar zijn, blijven staan)
export async function resumeAudit(id) {
  await pool.query(`UPDATE public.max_audit SET status='bezig', error=NULL WHERE id=$1 AND status <> 'bezig'`, [id]);
  runAudit(id).catch((e) => console.error('[audit]', e));
}
// Compacte versie voor analyse (zonder didactiekkaart en tijden), in delen van ± 100 kB zodat ze als bijlage passen
export function compactItems(items) {
  return items.map(({ _card, ...it }) => {
    const g = it.gesprekken || {};
    return { ...it, gesprekken: {
      begin: g.begin ? { kind: g.begin.kind, max: g.begin.max } : undefined,
      na_fout: (g.na_fout || []).map((t) => ({ wie: t.wie, tekst: t.tekst })),
      stap: g.stap ? (({ ms, vorm, ...x }) => x)(g.stap) : undefined,
    } };
  });
}
export function splitParts(items, maxBytes = 100_000) {
  const parts = [[]];
  let size = 0;
  for (const it of items) {
    const n = Buffer.byteLength(JSON.stringify(it));
    if (size + n > maxBytes && parts.at(-1).length) { parts.push([]); size = 0; }
    parts.at(-1).push(it); size += n;
  }
  return parts;
}
export async function stopAudit(id) { await pool.query(`UPDATE public.max_audit SET status='gestopt' WHERE id=$1 AND status='bezig'`, [id]); }
export async function deleteAudit(id) { await pool.query('DELETE FROM public.max_audit WHERE id=$1', [id]); }
export async function auditJobs() {
  return (await pool.query(`SELECT a.id, a.created_at, a.finished_at, a.lang, a.n, a.status, a.model, a.judge_model, a.error, a.soort, a.versie, a.kid_model,
      (SELECT COUNT(*)::int FROM public.max_audit_items i WHERE i.audit_id=a.id) AS done FROM public.max_audit a ORDER BY a.id DESC LIMIT 50`)).rows;
}
// Twee meetlat-runs vergelijken: per dimensie gemiddeld A en B, en per geval wat beter of slechter werd
const DIMS = ['som', 'stappenplan', 'tussenstappen', 'tips', 'max_begin', 'max_na_fout', 'max_stap', 'samenhang', 'taal'];
export function vergelijk(itemsA, itemsB) {
  const byA = Object.fromEntries(itemsA.filter((x) => x.geval && x.verdict?.cijfers).map((x) => [x.geval, x]));
  const paren = itemsB.filter((x) => x.geval && x.verdict?.cijfers && byA[x.geval]).map((b) => ({ a: byA[b.geval], b }));
  const gem = (xs) => { const v = xs.filter((x) => typeof x === 'number'); return v.length ? v.reduce((p, q) => p + q, 0) / v.length : null; };
  const dims = Object.fromEntries(DIMS.map((k) => [k, { a: gem(paren.map((p) => p.a.verdict.cijfers[k])), b: gem(paren.map((p) => p.b.verdict.cijfers[k])) }]));
  const tel = (sel) => ({ a: paren.filter((p) => sel(p.a)).length, b: paren.filter((p) => sel(p.b)).length });
  const tellers = { rekenfout: tel((x) => x.verdict.rekenfouten?.length), verklapt: tel((x) => x.verdict.max_verklapt), nietHerkend: tel((x) => x.verdict.max_herkent_fout === false) };
  const verschil = paren.map((p) => ({ geval: p.b.geval, label: p.b.label, levelName: p.b.levelName, goud: p.b.goud, som: p.b.som, a: itemScore(p.a), b: itemScore(p.b), oordeelA: p.a.verdict.oordeel, oordeelB: p.b.verdict.oordeel }))
    .map((x) => ({ ...x, d: x.b - x.a })).sort((x, y) => x.d - y.d);
  return { n: paren.length, dims, tellers, slechter: verschil.filter((x) => x.d <= -0.5), beter: verschil.filter((x) => x.d >= 0.5).reverse(), goud: verschil.filter((x) => x.goud) };
}
export async function auditJob(id) { return (await pool.query('SELECT * FROM public.max_audit WHERE id=$1', [id])).rows[0]; }
export async function auditItems(id) {
  return (await pool.query('SELECT item, verdict FROM public.max_audit_items WHERE audit_id=$1 ORDER BY idx', [id])).rows.map((r) => ({ ...r.item, verdict: r.verdict }));
}
