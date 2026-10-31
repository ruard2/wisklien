import { LEERPAD_GRADE, leerpadVirGraad } from '../src/za/leerpad.js';

const grade = Number(process.argv[2] || 8);
if (!LEERPAD_GRADE.includes(grade)) {
  console.error(`Gebruik: npm run za-leerpad -- <${LEERPAD_GRADE.join('|')}>`);
  process.exit(1);
}

const plan = leerpadVirGraad(grade);
console.log(`Graad ${grade}: ${plan.nodes.length} leerknopen`);
for (const term of [1, 2, 3, 4]) {
  console.log(`\nKwartaal ${term}`);
  for (const node of plan.nodes.filter((item) => item.term === term)) {
    console.log(`- ${node.id} ${node.concept.af}`);
    console.log(`  Voorvereiste: ${node.prerequisite.af}`);
    console.log(`  Metode: ${node.implementation.af}`);
    console.log(`  Hek: ${node.masteryEvidence.af}`);
  }
}
