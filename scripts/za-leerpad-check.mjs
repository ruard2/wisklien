import {
  LEERPAD_BRONNE,
  LEERPAD_GRADE,
  METODEPROTOKOLLE,
  ONDERRIGSIKLUS,
  leerpadVirGraad,
  knoopVirId,
  metodeVirKnoop,
  herstelroeteVirKnoop,
} from '../src/za/leerpad.js';
import { HOERSKOOL_GENERATOR_IDS, HOERSKOOL_VARIANTE, generateHoerskoolVraag, checkHoerskoolAntwoord, publicHoerskoolVraag } from '../src/za/hoerskool-generators.js';
import { HOERSKOOL_TOEPASSING_IDS, maakToepassingsItem } from '../src/za/hoerskool-toepassings.js';
import { maakHoerskoolMaxPlan, volgendeHoerskoolMaxStap, beginHoerskoolMaxGesprek, antwoordHoerskoolMaxGesprek } from '../src/za/hoerskool-max.js';
import { skoonHoerskoolPlan, huidigeDagdoel, maakHoerskoolPaneel, skoonHoerskoolBeloning } from '../src/za/hoerskool-plan.js';

const failures = [];
const fail = (message) => failures.push(message);
const ids = new Set();
let count = 0;

if (LEERPAD_GRADE.join(',') !== '8,9,10,11,12') fail('grade scope is not 8-12');
if (ONDERRIGSIKLUS.length !== 9) fail(`teaching cycle has ${ONDERRIGSIKLUS.length} steps instead of 9`);

for (const grade of LEERPAD_GRADE) {
  const plan = leerpadVirGraad(grade);
  if (!plan) { fail(`missing grade ${grade}`); continue; }
  let lastTerm = 0;
  for (const node of plan.nodes) {
    count += 1;
    if (ids.has(node.id)) fail(`duplicate node ${node.id}`);
    ids.add(node.id);
    if (node.grade !== grade) fail(`${node.id} has grade ${node.grade}`);
    if (node.term < lastTerm) fail(`${node.id} moves backwards from term ${lastTerm} to ${node.term}`);
    lastTerm = node.term;
    for (const field of ['concept', 'prerequisite', 'implementation', 'masteryEvidence']) {
      if (!node[field]?.en || !node[field]?.af) fail(`${node.id} lacks bilingual ${field}`);
    }
    if (node.learningSteps.length < 2) fail(`${node.id} has fewer than two explicit learning steps`);
    for (const step of node.learningSteps) {
      if (!step.en || !step.af) fail(`${node.id} has an incomplete bilingual learning step`);
    }
    if (node.masteryGate.mode !== 'evidence-not-percentage') fail(`${node.id} has an unsafe mastery gate`);
    if (!node.practiceEnabled || node.generatorId !== `za-hs:${node.id}:v2`) fail(`${node.id} is not connected to its parameterised practice generator`);
    if (node.masteryGate.requiredDimensions.length !== 5) fail(`${node.id} lacks complete mastery dimensions`);
    if (!METODEPROTOKOLLE[node.methodProtocolId]) fail(`${node.id} has unknown method ${node.methodProtocolId}`);
    if (!node.sourceRefs.length) fail(`${node.id} has no sources`);
    for (const ref of node.sourceRefs) if (!LEERPAD_BRONNE[ref]) fail(`${node.id} has unknown source ${ref}`);
    for (const ref of node.pathPrerequisiteIds) if (!knoopVirId(ref)) fail(`${node.id} has unknown prerequisite node ${ref}`);
    for (const variant of HOERSKOOL_VARIANTE) {
      for (let sample = 0; sample < 4; sample++) {
        const q = generateHoerskoolVraag(node.id, { variant });
        if (!q || q.nodeId !== node.id || q.generatorId !== node.generatorId || q.variant !== variant) { fail(`${node.id} generator did not return its own ${variant} question`); break; }
        if (q.options.length !== 4 || new Set(q.options).size !== 4) fail(`${node.id} ${variant} question lacks four unique options`);
        if (!checkHoerskoolAntwoord(q, String(q.answer)).correct) fail(`${node.id} rejects its own correct ${variant} option`);
        for (let i = 0; i < q.options.length; i++) if (i !== q.answer && checkHoerskoolAntwoord(q, String(i)).correct) fail(`${node.id} accepts ${variant} distractor ${i}`);
        const pub = publicHoerskoolVraag(q);
        if ('answer' in pub || 'display' in pub || 'steps' in pub || 'wrong' in pub) fail(`${node.id} leaks an answer through the public ${variant} question`);
      }
    }
    const uniqueApplications = new Set();
    for (let sample = 0; sample < 80; sample++) {
      const item = maakToepassingsItem(node.id);
      if (!item || item.afleiers.length !== 3 || item.stappe.length < 3) fail(`${node.id} lacks a complete parameterised application item`);
      if (item && new Set([item.reg, ...item.afleiers]).size !== 4) fail(`${node.id} generated duplicate application options`);
      if (item) uniqueApplications.add(item.vraag);
    }
    const minimum = maakToepassingsItem(node.id)?.familie === 'begrip' ? 3 : 8;
    if (uniqueApplications.size < minimum) fail(`${node.id} only produced ${uniqueApplications.size} distinct application questions (minimum ${minimum})`);
    const coachQuestion = generateHoerskoolVraag(node.id, { variant: 'toepassing' });
    const wrongIndex = coachQuestion.options.findIndex((_, index) => index !== coachQuestion.answer);
    const coachResult = checkHoerskoolAntwoord(coachQuestion, String(wrongIndex));
    let coach = maakHoerskoolMaxPlan({ node, method: metodeVirKnoop(node.id), question: coachQuestion, result: coachResult, recovery: herstelroeteVirKnoop(node.id) });
    if (!coach || coach.contract.controller !== 'app' || coach.contract.maxRole !== 'verwoord-slegs' || !coach.contract.sequenceLocked) fail(`${node.id} lacks the locked Max contract`);
    let conversation = structuredClone(coach);
    const opening = beginHoerskoolMaxGesprek(conversation);
    if (!opening.message?.options?.length || opening.message.options.some((option) => 'correct' in option)) fail(`${node.id} interactive Max opening leaks its checker`);
    const unknown = antwoordHoerskoolMaxGesprek(conversation, 'ek het self ’n nuwe metode uitgedink');
    if (unknown.correct || unknown.plan.interactionIndex !== 0) fail(`${node.id} interactive Max accepts unchecked free text`);
    let guard = 0;
    while (conversation?.interactions?.[conversation.interactionIndex]?.kind !== 'complete' && guard++ < 20) {
      const current = conversation.interactions[conversation.interactionIndex];
      const correctIndex = current.options.findIndex((option) => option.correct);
      if (correctIndex < 0) { fail(`${node.id} interactive Max has no checked route at step ${conversation.interactionIndex}`); break; }
      const turn = antwoordHoerskoolMaxGesprek(conversation, String(correctIndex));
      if (!turn.correct) { fail(`${node.id} interactive Max rejects its checked route at step ${conversation.interactionIndex}`); break; }
      conversation = turn.plan;
    }
    if (conversation?.interactions?.[conversation.interactionIndex]?.kind !== 'complete') fail(`${node.id} interactive Max does not reach its controlled close`);
    const seenCoachSteps = [];
    while (coach) {
      const turn = volgendeHoerskoolMaxStap(coach);
      if (turn.message) seenCoachSteps.push(turn.message.text);
      coach = turn.done ? null : turn.plan;
    }
    if (seenCoachSteps.length !== coachQuestion.steps.length + 2) fail(`${node.id} Max route has ${seenCoachSteps.length} messages instead of ${coachQuestion.steps.length + 2}`);
    if (!seenCoachSteps.every((text) => text.startsWith('Meneer Max:'))) fail(`${node.id} Max route contains an uncontrolled message`);
    for (const step of coachQuestion.steps) if (!seenCoachSteps.some((text) => text.includes(step))) fail(`${node.id} Max route omits prescribed step: ${step}`);
  }
  for (const term of [1, 2, 3, 4]) {
    if (!plan.terms.some((item) => item.term === term)) fail(`grade ${grade} lacks term ${term}`);
  }
}

if (count !== 90) fail(`expected 90 nodes, got ${count}`);
if (HOERSKOOL_GENERATOR_IDS.length !== count || new Set(HOERSKOOL_GENERATOR_IDS).size !== count) fail(`expected one unique generator per node, got ${HOERSKOOL_GENERATOR_IDS.length}`);
if (HOERSKOOL_TOEPASSING_IDS.length !== count || new Set(HOERSKOOL_TOEPASSING_IDS).size !== count) fail(`expected one parameterised application factory per node, got ${HOERSKOOL_TOEPASSING_IDS.length}`);
if (Object.keys(METODEPROTOKOLLE).length !== 10) fail('expected 10 method protocols');
if (!Object.values(LEERPAD_BRONNE).some((source) => source.kind === 'research')) fail('research sources missing');
if (!Object.values(LEERPAD_BRONNE).some((source) => source.kind === 'official')) fail('official sources missing');

const personal = skoonHoerskoolPlan({ days: [1, 2, 3, 4, 5], dailyGoal: 30, startTarget: 15, gradualBuild: true, createdAt: '2026-01-05' });
if (huidigeDagdoel(personal, '2026-01-05') !== 15 || huidigeDagdoel(personal, '2026-01-26') !== 30) fail('high-school gradual 15→30 build is not stable');
const paneel = maakHoerskoolPaneel({ plan: personal, progress: {}, nodes: LEERPAD_DATA_NODES(), today: '2026-01-26' });
if (paneel.plannedPerWeek !== 150 || paneel.fourWeekAttempts !== 600 || paneel.tenWeekAttempts !== 1500) fail('high-school workload projections are incorrect');
if (skoonHoerskoolBeloning({}).enabled) fail('high-school parent reward is not off by default');

if (failures.length) {
  console.error(failures.map((message) => `✗ ${message}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${count} brongekoppelde Graad 8-12-knopen met ${HOERSKOOL_TOEPASSING_IDS.length} geparameteriseerde toepassingsfabrieke, eie antwoordkontroles, ${HOERSKOOL_VARIANTE.length} diagnostiese vraagvorme, ${ONDERRIGSIKLUS.length} onderrigstappe en ${Object.keys(METODEPROTOKOLLE).length} metodeprotokolle`);

function LEERPAD_DATA_NODES() {
  return LEERPAD_GRADE.flatMap((grade) => leerpadVirGraad(grade).nodes).map((node) => ({ ...node, progress: { checkpointPassed: false } }));
}

