// AI-hulp via Claude: andere uitleg bij een som, uitlegkaarten bij een lastige
// categorie en advies voor ouders. Zonder ANTHROPIC_API_KEY werkt de app gewoon
// verder met de ingebouwde stappenplannen.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
export const aiEnabled = () => !!client;

const TUTOR = `Je bent "Rekenmaatje", een geduldige rekencoach voor een kind in groep 8 van de Nederlandse basisschool (11-12 jaar) dat achterloopt met rekenen.

Zo werk je:
- Schrijf in eenvoudig, vriendelijk Nederlands. Korte zinnen. Spreek het kind aan met "je".
- Gebruik de strategieën en woorden die Nederlandse rekenmethodes (Pluspunt, Wereld in getallen, Getal & Ruimte Junior, Wizwijs) gebruiken: verhoudingstabel, kolomsgewijs rekenen, happen (kolomsgewijs delen), splitsen, getallenlijn, strook, schatten, de "trap" voor maten (km-hm-dam-m-dm-cm-mm), gelijknamig maken, "1% eerst" of "10% eerst" bij procenten.
- Leg uit in kleine, genummerde stappen (maximaal 5). Eén rekenstap per regel.
- Gebruik zo mogelijk een voorbeeld uit het dagelijks leven (geld, eten, sport, gamen).
- Wees bemoedigend maar niet kinderachtig; hij zit in groep 8.
- Gebruik Nederlandse notatie: komma als decimaalteken (2,5), × voor keer, : voor delen.
- Geen markdown-koppen of tabellen. Je mag **vetgedrukt** gebruiken voor het belangrijkste woord.
- Houd het kort: hooguit 130 woorden, tenzij om meer gevraagd wordt.`;

async function ask(system, messages) {
  if (!client) return null;
  try {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system,
      messages,
    });
    if (res.stop_reason === 'refusal') return null;
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    return text || null;
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) console.warn('[ai] rate limit');
    else if (e instanceof Anthropic.AuthenticationError) console.error('[ai] ongeldige ANTHROPIC_API_KEY');
    else if (e instanceof Anthropic.APIError) console.error(`[ai] API-fout ${e.status}: ${e.message}`);
    else console.error('[ai]', e?.message || e);
    return null;
  }
}

function describeQuestion(qq) {
  let s = `Som: ${qq.text}`;
  if (qq.options) s += `\nKeuzes: ${qq.options.join(' | ')}`;
  if (qq.visual?.kind === 'bar' || qq.visual?.kind === 'line') s += `\nGrafiek "${qq.visual.title}": ${qq.visual.labels.map((l, i) => `${l}=${qq.visual.values[i]}`).join(', ')}`;
  if (qq.visual?.kind === 'pie') s += `\nCirkeldiagram: ${qq.visual.labels.map((l, i) => `${l} ${qq.visual.values[i]}%`).join(', ')}`;
  if (qq.visual?.kind === 'table') s += `\nTabel: ${JSON.stringify({ kop: qq.visual.headers, rijen: qq.visual.rows })}`;
  return s;
}

// Uitleg of hulp bij één som. Als het kind nog niet heeft geantwoord: niet voorzeggen.
export async function explain({ question, answered, given, correct, chat = [], name }) {
  const ctx = `${describeQuestion(question)}
Juiste antwoord: ${question.display}
Ingebouwd stappenplan: ${question.steps.join(' / ')}
${answered ? `${name} antwoordde: "${given}" — dat was ${correct ? 'GOED' : 'FOUT'}.` : `${name} heeft nog NIET geantwoord. Verklap het antwoord NIET; geef alleen een duwtje in de goede richting (welke strategie, eerste stap).`}`;
  const instr = answered
    ? correct ? 'Leg kort uit waarom dit klopt en geef één slimme tip om dit soort sommen nog sneller te doen.'
      : `Leg op een andere manier uit dan het stappenplan hoe je dit oplost. Als je kunt zien welke denkfout ${name} waarschijnlijk maakte (kijk naar het gegeven antwoord), benoem die vriendelijk.`
    : 'Geef een hint.';
  const messages = [{ role: 'user', content: `${ctx}\n\n${instr}` }];
  // eventueel doorvragen van het kind
  for (const m of chat.slice(-6)) messages.push({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text });
  if (messages.at(-1).role === 'assistant') messages.push({ role: 'user', content: 'Ga verder.' });
  return ask(TUTOR, messages);
}

// Korte uitlegkaart voor een categorie waar hij op vastloopt.
export async function coachCard({ catLabel, level, mistakes, name }) {
  const lvl = ['', 'basis (stof groep 6/7)', 'niveau 1F (eind groep 8)', 'niveau 1S (streefniveau groep 8)'][level];
  const voorbeelden = mistakes.length
    ? `Recente fouten:\n${mistakes.map((m) => `- ${m.text} → gaf "${m.given}", goed was ${m.display}`).join('\n')}`
    : 'Er zijn nog geen recente fouten bekend.';
  return ask(TUTOR, [{
    role: 'user',
    content: `${name} loopt vast bij "${catLabel}" op ${lvl}.\n${voorbeelden}\n\nMaak een korte uitlegkaart (max 170 woorden) die ${name} vóór het oefenen leest:
1. Eén zin: waar gaat dit over.
2. "Zo pak je het aan": een stappenplan van 3-4 stappen, met de strategie uit de Nederlandse methodes.
3. Eén uitgewerkt voorbeeld (een andere som dan de fouten hierboven).
4. "Let op!": de valkuil die je in de fouten ziet.
Eindig met een korte aanmoediging.`,
  }]);
}

const PARENT = `Je bent een ervaren remedial teacher rekenen in het Nederlandse basisonderwijs. Je adviseert een ouder van een kind in groep 8 dat achterloopt met rekenen. Je kent de referentieniveaus 1F en 1S, de doorstroomtoets, en methodes als Pluspunt, Wereld in getallen en Getal & Ruimte Junior. Schrijf in helder Nederlands, concreet en praktisch, zonder vakjargon zonder uitleg. Geen markdown-tabellen; korte kopjes met ** mogen.`;

export async function parentAdvice({ name, summary }) {
  return ask(PARENT, [{
    role: 'user',
    content: `Hier zijn de oefengegevens van ${name}:\n${summary}\n\nGeef (max 300 woorden):
1. Een eerlijke samenvatting: waar staat ${name}, wat gaat goed, wat niet.
2. Waarom de zwakste onderdelen waarschijnlijk lastig zijn (welke onderliggende vaardigheid ontbreekt).
3. 3 concrete dingen die de ouder thuis kan doen (5-10 minuten, in het dagelijks leven, bijv. boodschappen, koken, reizen).
4. Wat de ouder eventueel met de leerkracht kan bespreken.`,
  }]);
}
