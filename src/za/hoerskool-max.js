// Geslote Meneer-Max-spoor vir Graad 8–12.
// Max kies hier geen metode, getal, antwoord of volgende stap nie. Die app maak
// die hele plan uit die nagegaanbare vraag, leerpadknoop en metodeprotokol.

const clone = (x) => structuredClone(x);
const norm = (x) => String(x ?? '').trim().toLocaleLowerCase('af-ZA').replace(/\s+/g, ' ');

const publicMessage = (message, feedback = '') => message ? {
  kind: message.kind,
  title: message.title,
  text: message.text,
  options: (message.options || []).map((option, index) => ({ id: String(index), text: option.text })),
  allowUnknown: message.allowUnknown !== false,
  feedback,
} : null;

function maakInteraksies({ node, method, question, result, mode }) {
  const steps = [...question.steps];
  const diagnose = result?.misconception?.label || 'Sê eers presies waar jy vashaak; dan begin ons by daardie punt.';
  const items = [{
    kind: 'diagnose', title: 'Waar sit die moeilikheid?',
    text: diagnose,
    options: [
      { text: 'Ek weet nie watter metode om te gebruik nie', correct: true },
      { text: 'Ek ken die metode, maar weet nie hoe om te begin nie', correct: true },
      { text: 'Ek het begin en sit by ’n latere stap vas', correct: true },
    ],
  }, {
    kind: 'method', title: 'Kies die metode',
    text: `Ons bly by die goedgekeurde protokol vir “${node.concept.af}”. Watter roete gebruik ons?`,
    options: [
      { text: method.title.af, correct: true },
      { text: 'Spring direk na die finale antwoord', correct: false },
      { text: 'Kies ’n nuwe metode wat nie in die leerpad staan nie', correct: false },
    ],
  }];
  steps.forEach((step, index) => {
    const later = steps[index + 1];
    items.push({
      kind: 'method-step', title: `Stap ${index + 1}`,
      text: index === 0 ? 'Wat moet jy eerste doen?' : `Stap ${index} is vas. Wat is stap ${index + 1}?`,
      options: [
        { text: step, correct: true },
        ...(later ? [{ text: later, correct: false }] : []),
        { text: 'Gee die finale antwoord sonder hierdie stap', correct: false },
      ],
    });
  });
  items.push({
    kind: 'check', title: 'Kontroleer jou werk',
    text: 'Wat moet gebeur voordat ons hierdie item afsluit?',
    options: [
      { text: 'Kontroleer die antwoord teen die laaste metodestap en behou tekens, beperkings en eenhede.', correct: true },
      { text: 'Aanvaar die antwoord sonder ’n kontrole.', correct: false },
      { text: 'Verander die metode nadat die antwoord reeds gekry is.', correct: false },
    ],
  }, {
    kind: 'complete', title: mode === 'wenk' ? 'Nou is dit jou beurt' : 'Herstelpad voltooi',
    text: mode === 'wenk'
      ? 'Gaan terug na die vraag en voer die eerste stap self uit. Max bly by hierdie metode as jy weer hulp nodig het.'
      : `Die bediener se nagegaanbare antwoord is ${question.display}. Probeer nou ’n nuwe variasie met dieselfde metode.`,
    options: [], allowUnknown: false,
  });
  return items;
}

export function maakHoerskoolMaxPlan({ node, method, question, result = null, recovery = null, mode = 'herstel' }) {
  if (!node || !method || !question) return null;
  const diagnose = result?.misconception?.label || `Ons soek die eerste stap waar die metode vir “${node.concept.af}” skeefgeloop het.`;
  const eersteAksie = result?.misconception?.fix || question.steps[0];
  const messages = mode === 'wenk'
    ? [{
      kind: 'wenk',
      title: 'Eerste stap',
      text: `Meneer Max: Gebruik ${method.title.af}. ${eersteAksie}`,
    }]
    : [
      {
        kind: 'diagnose',
        title: '1. Vind die eerste fout',
        text: `Meneer Max: ${diagnose} Ons gebruik net die metode “${method.title.af}”.`,
      },
      ...question.steps.map((step, index) => ({
        kind: 'method-step',
        title: `${index + 2}. Metodestap ${index + 1}`,
        text: `Meneer Max: ${step}`,
      })),
      {
        kind: 'check',
        title: `${question.steps.length + 2}. Kontroleer`,
        text: `Meneer Max: Die nagegaanbare antwoord is ${question.display}. Kontroleer dit met die laaste metodestap en behou alle beperkings, tekens en eenhede.`,
      },
    ];
  return {
    schemaVersion: 2,
    mode,
    nodeId: node.id,
    questionId: question.id,
    language: 'af-ZA',
    methodProtocolId: node.methodProtocolId,
    contract: {
      controller: 'app',
      maxRole: 'verwoord-slegs',
      sequenceLocked: true,
      answerSource: 'server-checked-question',
      allowedMethod: method.title.af,
      forbidden: [
        'Geen alternatiewe metode improviseer nie.',
        'Geen nuwe getalle, formules, feite of voorbeelde byvoeg nie.',
        'Geen stap oorslaan, omruil of saamvoeg nie.',
        'Geen Engels of Nederlands in die leerderboodskap nie.',
        'Geen bemeestering verklaar voordat die app se drie bewyse voltooi is nie.',
      ],
    },
    goal: clone(node.concept),
    prerequisite: clone(node.prerequisite),
    recovery: recovery ? clone(recovery) : null,
    messages,
    index: 0,
    interactionIndex: 0,
    interactionAttempts: 0,
    interactions: maakInteraksies({ node, method, question, result, mode }),
  };
}

// Begin en voer die tweerigtinggesprek. Die leerder mag praat/tik, maar Max
// beoordeel slegs vooraf nagegaanbare keuses. Onbekende vryteks word nooit as
// wiskundig korrek aanvaar nie en lei ook nie tot ’n geïmproviseerde metode nie.
export function beginHoerskoolMaxGesprek(plan) {
  if (!plan?.interactions?.length) return { plan, done: true, message: null };
  const index = Math.max(0, Number(plan.interactionIndex || 0));
  const message = plan.interactions[index];
  return { plan: clone(plan), done: message?.kind === 'complete', message: publicMessage(message), step: index + 1, total: plan.interactions.length };
}

export function antwoordHoerskoolMaxGesprek(plan, input) {
  if (!plan?.interactions?.length) return { plan, done: true, message: null };
  const index = Math.max(0, Number(plan.interactionIndex || 0));
  const current = plan.interactions[index];
  if (!current || current.kind === 'complete') return { plan, done: true, message: publicMessage(current), step: index + 1, total: plan.interactions.length };
  const raw = String(input ?? '').trim();
  const numeric = /^\d+$/.test(raw) ? Number(raw) : -1;
  const selected = numeric >= 0 ? current.options?.[numeric] : current.options?.find((option) => norm(option.text) === norm(raw));
  const unknown = /^(ek weet nie|weet nie|help|wys my)$/i.test(raw);
  if (!selected) {
    const feedback = unknown
      ? 'Goed dat jy dit sê. Kies die kleinste stap hieronder; ek sal nie die antwoord vooruit gee nie.'
      : 'Ek kan nie vryteks as ’n wiskundige stap goedkeur nie. Kies een van die nagegaanbare stappe hieronder sodat ons binne die metode bly.';
    return { plan: clone(plan), done: false, correct: false, message: publicMessage(current, feedback), step: index + 1, total: plan.interactions.length };
  }
  if (!selected.correct) {
    const next = { ...clone(plan), interactionAttempts: Number(plan.interactionAttempts || 0) + 1 };
    const feedback = current.kind === 'method-step'
      ? 'Daardie stap is nie volgende in hierdie protokol nie. Kyk na wat reeds gedoen is en kies die onmiddellike volgende stap.'
      : 'Daardie keuse hou ons nie binne die goedgekeurde metode nie. Probeer weer.';
    return { plan: next, done: false, correct: false, message: publicMessage(current, feedback), step: index + 1, total: plan.interactions.length };
  }
  const next = { ...clone(plan), interactionIndex: index + 1, interactionAttempts: 0 };
  const following = next.interactions[next.interactionIndex];
  const feedback = current.kind === 'diagnose' ? 'Reg. Nou kies ons eers die vaste metode.' : `Reg: ${selected.text}`;
  return {
    plan: next,
    done: following?.kind === 'complete',
    correct: true,
    message: publicMessage(following, feedback),
    step: next.interactionIndex + 1,
    total: next.interactions.length,
  };
}

export function volgendeHoerskoolMaxStap(plan) {
  if (!plan || !Array.isArray(plan.messages)) return null;
  const index = Math.max(0, Number(plan.index || 0));
  const message = plan.messages[index];
  if (!message) return { plan, done: true, message: null, step: plan.messages.length, total: plan.messages.length };
  const next = { ...clone(plan), index: index + 1 };
  return {
    plan: next,
    done: next.index >= next.messages.length,
    message: clone(message),
    step: index + 1,
    total: next.messages.length,
  };
}

export function publicHoerskoolMaxPlan(plan) {
  if (!plan) return null;
  return {
    mode: plan.mode,
    nodeId: plan.nodeId,
    questionId: plan.questionId,
    language: plan.language,
    methodProtocolId: plan.methodProtocolId,
    contract: clone(plan.contract),
    step: Number(plan.index || 0),
    total: plan.messages?.length || 0,
    conversationStep: Number(plan.interactionIndex || 0),
    conversationTotal: plan.interactions?.length || 0,
  };
}

