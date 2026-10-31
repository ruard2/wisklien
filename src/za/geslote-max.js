// Laerskool-Afrikaans: veilige terugval wanneer die app se gewone stap- of
// foutplan nie ’n vrygetikte boodskap kan klassifiseer nie. Die terugval bly by
// die aktiewe KABV-kaart en vra net die presiese oop stap; geen vrye KI-roete nie.
import { kaartVoor } from '../uitleg/index.js';
import { foutPlan } from '../foutgesprek.js';
import { stapPlan } from '../stapgesprek.js';
import { checkArithmetic, nederlandsInAfrikaans, verklaptAntwoord } from '../kwaliteit.js';

const antwoord = (step) => step?.type === 'choice' ? step.options?.[step.answer] : step?.display;
const skoonVraag = (step) => {
  const text = String(step?.ask || '').replace(/\s+—.*$/, '').trim();
  if (!text) return '';
  return /[?]$/.test(text) ? text : `${text.replace(/[.:]$/, '')}?`;
};
const label = (step) => step ? `\n[VB: ${String(step.ask).replace(/\s+—.*$/, '').replace(/\s*=\s*\?.*$/, '').trim()} = ${antwoord(step)}]` : '';
const lastKid = (chat) => [...chat].reverse().find((item) => item.role !== 'teacher')?.text || '';

export const afMaxGesluitAan = () => process.env.AF_MAX_GESLOTEN !== '0';

export function afMetodeKontrak(question) {
  const kaart = kaartVoor('af', question?.tpl);
  return {
    language: 'af-ZA',
    controller: 'app',
    tpl: question?.tpl || null,
    method: kaart?.naam || question?.tpl || 'KABV-metode',
    orderedSteps: [...(kaart?.aanpak || [])],
    model: kaart?.model || null,
    forbidden: [...(kaart?.niet || [])],
    maxRole: 'verwoord-binne-kaart',
    freeFallback: false,
  };
}

function methodOpening(question) {
  const contract = afMetodeKontrak(question);
  const first = contract.orderedSteps[0];
  return first ? `Ons bly by “${contract.method}”. Eerste metodestap: ${first}` : `Ons bly by die KABV-metode vir hierdie som.`;
}

function openStep(question, step = null) {
  if (step) return step;
  const index = Math.max(0, Number(question?.guideStep || 0));
  return question?.guide?.[index] || question?.guide?.[0] || null;
}

export function gesloteAfrikaanseBeurt({ question, phase, given, chat = [], step = null, misconception = null }) {
  if (!question) return null;
  const current = openStep(question, step);
  const method = methodOpening(question);
  const kidText = chat.filter((item) => item.role !== 'teacher').map((item) => item.text).join(' ');
  let text = '';

  if (phase === 'right') {
    text = `Dis reg. Jy het die antwoord met die app se metode voltooi. Kontroleer nou dat jou teken, eenheid en laaste stap by die vraag pas.`;
  } else if (phase === 'step') {
    const plan = stapPlan({ question, step: current, chat, lang: 'af' });
    const target = plan?.deelInfo?.vraag || current;
    const tip = target?.tip || current?.tip || afMetodeKontrak(question).orderedSteps[0] || '';
    text = `${method}${tip ? ` Wenk vir net hierdie stap: ${tip}` : ''}${target ? ` ${skoonVraag(target)}` : ''}${label(target)}`;
  } else if (phase === 'wrong') {
    const plan = foutPlan({ question, given, chat, misconception, lang: 'af' });
    const target = plan?.deelInfo?.vraag || plan?.doel || current;
    if (plan?.zet === 'goed_klaar' || plan?.zet === 'goed_nu') {
      text = `Nou is dit reg. Jy het teruggegaan na die metode en tot by die einde deurgewerk. Vul dit in.`;
    } else {
      const why = misconception?.fix || target?.tip || '';
      text = `Nog nie reg nie. ${method}${why ? ` Gebruik hierdie hulp: ${why}` : ''}${target ? ` Doen nou net hierdie stap: ${skoonVraag(target)}` : ' Wys nou net die eerste metodestap.'}${label(target)}`;
    }
  } else {
    text = `${method}${current?.tip ? ` Wenk: ${current.tip}` : ''}${current ? ` Begin net hier: ${skoonVraag(current)}` : ' Doen nou net daardie eerste stap.'}${label(current)}`;
  }

  // Laaste plaaslike veiligheidshek. By enige onverklaarde afwyking gee ons ’n
  // kort kaartboodskap sonder nuwe wiskundige aansprake of getalle.
  const visible = text.replace(/\s*\[VB:[^\]]*\]\s*/gi, ' ').trim();
  const unsafe = checkArithmetic(visible).length
    || nederlandsInAfrikaans(visible).length
    || (phase !== 'right' && verklaptAntwoord(visible, question.display, { som: question.text, kind: `${kidText} ${lastKid(chat)}` }));
  return unsafe ? `${method} Wys nou net die eerste stap van dié metode.` : text.replace(/\s+/g, ' ').replace(/ \[VB:/, '\n[VB:').trim();
}

