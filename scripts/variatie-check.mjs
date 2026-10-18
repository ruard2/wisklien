// Controle: zijn er genoeg verschillende sommen? Per onderdeel × niveau maken we een zware week na:
// WEEK sommen achter elkaar, elk keer met dezelfde "nooit dezelfde som"-regel als de app (80 pogingen).
// Gebruik: node scripts/variatie-check.mjs [nl|za] [WEEK=100]
const pack = process.argv[2] || 'nl', WEEK = Number(process.argv[3] || 100);
import { sumKey } from '../src/util.js';
const mod = await import(pack === 'za' ? '../src/za/generators.js' : '../src/generators.js');
let bad = 0;
const rows = [];
for (const cat of Object.keys(mod.GENERATORS)) for (let lv = 0; lv < 4; lv++) {
  const avoid = new Set(); let dup = 0;
  for (let i = 0; i < WEEK; i++) {
    let q;
    for (let k = 0; k < 80; k++) { q = mod.generate(cat, lv); if (!avoid.has(sumKey(q))) break; }
    if (avoid.has(sumKey(q))) dup++;
    avoid.add(sumKey(q));
  }
  const all = new Set(); for (let i = 0; i < 4000; i++) all.add(sumKey(mod.generate(cat, lv)));
  rows.push({ cat, lv, dup, pool: all.size });
  if (dup) bad++;
}
rows.sort((a, b) => b.dup - a.dup || a.pool - b.pool);
for (const r of rows) if (r.dup || r.pool < 300) console.log(`${r.dup ? '✗' : '·'} ${r.cat.padEnd(16)} niveau ${r.lv}: ${String(r.pool).padStart(5)} verschillende sommen${r.dup ? `, ${r.dup} dubbel in een week van ${WEEK}` : ''}`);
console.log(bad ? `\n${bad} onderdeel/niveau(s) met te weinig variatie (${pack})` : `\nGenoeg variatie: ${WEEK} sommen per onderdeel en niveau zonder herhaling ✓ (${pack})`);
process.exit(bad ? 1 : 0);
