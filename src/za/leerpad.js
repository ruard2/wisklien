import { LEERPAD_DATA } from './leerpad-data.js';

const clone = (value) => structuredClone(value);
const grades = LEERPAD_DATA.grades;
const allNodes = Object.values(grades).flatMap((grade) => grade.nodes);
const nodeIndex = new Map(allNodes.map((node) => [node.id, node]));
const CROSS_STRAND_BRIDGES = Object.freeze({
  '8-A4': ['8-A3'],                    // vergelykings benodig algebraïese taal en bewerkings
  '8-F1': ['8-P1', '8-A2'],            // funksies benodig patrone en substitusie
  '10-T1': ['9-G3', '8-G3'],           // trigonometrie benodig gelykvormigheid en Pythagoras
  '10-FM1': ['8-N2', '10-A4'],         // finansies benodig persentasie/tempo en eksponensiële vorm
  '12-C1': ['11-E1', '11-F1'],         // calculus begin by polinoomstruktuur en funksiegedrag
});

function splitBilingualSteps(implementation) {
  const en = implementation.en.split(';').map((step) => step.trim()).filter(Boolean);
  const af = implementation.af.split(';').map((step) => step.trim()).filter(Boolean);
  return en.map((step, index) => ({ order: index + 1, en: step, af: af[index] || implementation.af }));
}

function enrichNode(node) {
  const pathPrerequisiteIds = [...new Set([
    ...node.pathPrerequisiteIds,
    ...(CROSS_STRAND_BRIDGES[node.id] || []),
  ])];
  return {
    ...clone(node),
    pathPrerequisiteIds,
    learningSteps: splitBilingualSteps(node.implementation),
    teachingCycleSteps: ONDERRIGSIKLUS.map((step) => step.step),
    masteryGate: {
      mode: 'evidence-not-percentage',
      evidence: clone(node.masteryEvidence),
      requiredDimensions: ['represent', 'explain', 'calculate', 'verify', 'transfer'],
      note: {
        en: 'The product may configure a local numeric threshold, but it must not present that threshold as a DBE promotion rule.',
        af: "Die produk mag 'n plaaslike numeriese drempel instel, maar mag dit nie as 'n DBE-bevorderingsreël voorstel nie.",
      },
    },
  };
}

export const LEERPAD_GRADE = Object.freeze([...LEERPAD_DATA.scope.grades]);
export const ONDERRIGSIKLUS = Object.freeze(LEERPAD_DATA.teachingCycle);
export const METODEPROTOKOLLE = Object.freeze(LEERPAD_DATA.methodProtocols);
export const LEERPAD_BRONNE = Object.freeze(LEERPAD_DATA.sources);

export function leerpadVirGraad(graad) {
  const plan = grades[String(Number(graad))];
  return plan ? { ...clone(plan), nodes: plan.nodes.map(enrichNode) } : null;
}

export function knoopVirId(id) {
  const node = nodeIndex.get(String(id));
  return node ? enrichNode(node) : null;
}

export function metodeVirKnoop(id) {
  const node = nodeIndex.get(String(id));
  if (!node) return null;
  return clone(METODEPROTOKOLLE[node.methodProtocolId]);
}

export function bronpakketVirKnoop(id) {
  const node = nodeIndex.get(String(id));
  if (!node) return null;
  return node.sourceRefs.map((ref) => clone(LEERPAD_BRONNE[ref])).filter(Boolean);
}

// Die vorige knoop in dieselfde inhoudslyn is die program se eerste herstelroete.
// Die benoemde prerequisite bly die diagnostiese waarheid: as die fout uit 'n
// ander inhoudslyn kom, moet die app daardie kleinste ontbrekende vaardigheid kies.
export function herstelroeteVirKnoop(id) {
  const node = nodeIndex.get(String(id));
  if (!node) return null;
  const enriched = enrichNode(node);
  return {
    nodeId: node.id,
    prerequisite: clone(node.prerequisite),
    pathPrerequisites: enriched.pathPrerequisiteIds.map((ref) => knoopVirId(ref)).filter(Boolean),
    rule: {
      en: 'Diagnose the first faulty line. Use the path prerequisite only when it matches the missing idea; otherwise route to the smallest named missing subskill.',
      af: "Diagnoseer die eerste foutiewe reël. Gebruik die leerpadvoorvereiste slegs wanneer dit met die ontbrekende idee ooreenstem; roeteer anders na die kleinste benoemde ontbrekende subvaardigheid.",
    },
  };
}

export function volledigeLeerpadVirGraad(graad) {
  const plan = leerpadVirGraad(graad);
  if (!plan) return null;
  return {
    schemaVersion: LEERPAD_DATA.schemaVersion,
    scope: clone(LEERPAD_DATA.scope),
    authorityNote: clone(LEERPAD_DATA.authorityNote),
    teachingCycle: clone(ONDERRIGSIKLUS),
    methodProtocols: clone(METODEPROTOKOLLE),
    sources: clone(LEERPAD_BRONNE),
    grade: plan,
  };
}

export function leerpadOpsomming() {
  return LEERPAD_GRADE.map((grade) => {
    const plan = grades[String(grade)];
    return {
      grade,
      nodeCount: plan.nodes.length,
      termCounts: [1, 2, 3, 4].map((term) => ({
        term,
        nodeCount: plan.nodes.filter((node) => node.term === term).length,
      })),
      strands: [...new Set(plan.nodes.map((node) => node.strand))],
    };
  });
}

export function volgendeKnoop(id) {
  const node = nodeIndex.get(String(id));
  if (!node) return null;
  const plan = grades[String(node.grade)];
  const index = plan.nodes.findIndex((candidate) => candidate.id === node.id);
  return index >= 0 && index + 1 < plan.nodes.length ? enrichNode(plan.nodes[index + 1]) : null;
}

export function isHoerskoolLeerpadGraad(graad) {
  return LEERPAD_GRADE.includes(Number(graad));
}

export const leerpadData = () => clone(LEERPAD_DATA);

