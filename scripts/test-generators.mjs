// Controle: genereer veel sommen per categorie/niveau en kijk of alles klopt.
// Start met: npm test
import { CATEGORIES, generate, checkAnswer } from '../src/generators.js';
import { fracStr, hhmm } from '../src/util.js';

const N = Number(process.argv[2] || 1500);
let fails = 0;
const bad = (q, why) => {
  if (fails++ < 25) console.log(`✗ ${q.cat} L${q.level}: ${why}\n   ${q.text}\n   antwoord=${JSON.stringify(q.answer)} display=${q.display}`);
};

for (const { id } of CATEGORIES) {
  for (const level of [1, 2, 3]) {
    const texts = new Set();
    for (let i = 0; i < N; i++) {
      let q;
      try { q = generate(id, level); } catch (e) { bad({ cat: id, level, text: '(crash)' }, e.stack); continue; }
      texts.add(q.text);
      const blob = JSON.stringify(q);
      if (/NaN|undefined|Infinity|bnullb/.test(blob.replace(/"visual":\{[^}]*"headers":null/, ''))) bad(q, 'NaN/undefined in vraag');
      const input = q.type === 'number' ? String(q.answer).replace('.', ',')
        : q.type === 'fraction' ? fracStr(q.answer)
        : q.type === 'time' ? hhmm(q.answer)
        : String(q.answer);
      if (!checkAnswer(q, input).correct) bad(q, `eigen antwoord "${input}" wordt fout gerekend`);
      if (q.type === 'number' && (q.answer < 0 || !Number.isFinite(q.answer))) bad(q, 'raar antwoord');
      if (q.type === 'number' && Math.abs(q.answer * 1000 - Math.round(q.answer * 1000)) > 1e-6 && !q.unit) bad(q, 'antwoord met >3 decimalen');
      if (!q.steps?.length) bad(q, 'geen stappen');
      if (/\d\.\d/.test([...q.steps, q.text, ...(q.options || [])].join(' | '))) bad(q, 'punt als decimaalteken: ' + q.steps.join(' / '));
    }
    console.log(`${id.padEnd(17)} L${level}: ${String(texts.size).padStart(5)} unieke sommen`);
  }
}
console.log(fails ? `\n${fails} fouten gevonden` : '\nAlles klopt ✓');
process.exit(fails ? 1 : 0);
