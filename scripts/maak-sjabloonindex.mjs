import '../src/env.js';
// Index van de sjablonen (NL): bij welk onderdeel en niveau een soort som gemaakt wordt en hoe vaak (kans per som op dat
// niveau). Nodig om gericht één soort som te maken (generateTpl: voorkennissom, herkansing van dezelfde soort).
// Opnieuw maken na een nieuw sjabloon: node scripts/maak-sjabloonindex.mjs  (npm test controleert of hij nog klopt).
import { writeFileSync } from 'node:fs';
import { CATEGORIES, LEVELS, generateRaw } from '../src/generators.js';

export function maakIndex(N = 1500) {
  const tel = {};
  for (const { id } of CATEGORIES) for (const l of LEVELS) for (let i = 0; i < N; i++) {
    const t = generateRaw(id, l).tpl;
    ((tel[t] ||= {})[`${id}:${l}`] ||= 0); tel[t][`${id}:${l}`]++;
  }
  const idx = {};
  for (const t of Object.keys(tel).sort()) {
    const [plek, n] = Object.entries(tel[t]).sort((a, b) => b[1] - a[1])[0];
    const [cat, level] = plek.split(':');
    idx[t] = [cat, Number(level), Math.round((n / N) * 1000) / 1000];
  }
  return idx;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const idx = maakIndex();
  writeFileSync(new URL('../src/sjablonen-nl.json', import.meta.url), JSON.stringify(idx, null, 0).replace(/\],"/g, '],\n"') + '\n');
  console.log(`${Object.keys(idx).length} sjablonen → src/sjablonen-nl.json`);
}
