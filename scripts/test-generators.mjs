// Controle: genereer veel sommen per categorie/niveau en kijk of alles klopt,
// inclusief de invulbare tussenstappen. Start met: npm test
import { CATEGORIES, LEVELS, generate, checkAnswer } from '../src/generators.js';
import { fracStr, hhmm } from '../src/util.js';

const N = Number(process.argv[2] || 1500);
let fails = 0;
const bad = (q, why) => {
  if (fails++ < 25) console.log(`✗ ${q.cat} L${q.level}: ${why}\n   ${q.text}\n   antwoord=${JSON.stringify(q.answer)} display=${q.display}`);
};
const inputFor = (q) => q.type === 'number' ? String(q.answer).replace('.', ',')
  : q.type === 'fraction' ? fracStr(q.answer)
  : q.type === 'time' ? hhmm(q.answer)
  : String(q.answer);
const decimalDot = /\d\.\d/;

let withGuide = 0, total = 0;
for (const { id } of CATEGORIES) {
  for (const level of LEVELS) {
    const texts = new Set();
    for (let i = 0; i < N; i++) {
      let q;
      try { q = generate(id, level); } catch (e) { bad({ cat: id, level, text: '(crash)' }, e.stack); continue; }
      total++;
      texts.add(q.text);
      const blob = JSON.stringify(q);
      if (/NaN|undefined|Infinity|\bnull\b/.test(blob.replace(/"headers":null/g, '').replace(/"guideFinal":null/g, ''))) bad(q, 'NaN/undefined/null in vraag: ' + blob.slice(0, 300));
      if (!checkAnswer(q, inputFor(q)).correct) bad(q, `eigen antwoord "${inputFor(q)}" wordt fout gerekend`);
      if (q.type === 'number' && (q.answer < 0 || !Number.isFinite(q.answer))) bad(q, 'raar antwoord');
      if (q.type === 'number' && Math.abs(q.answer * 1000 - Math.round(q.answer * 1000)) > 1e-6) bad(q, 'antwoord met >3 decimalen');
      if (!q.steps?.length) bad(q, 'geen stappen');
      const texts2 = [...q.steps, q.text, ...(q.options || []), q.guideFinal || '', ...q.guide.flatMap((g) => [g.ask, g.tip, ...(g.options || [])])];
      if (texts2.some((t) => decimalDot.test(t))) bad(q, 'punt als decimaalteken: ' + texts2.join(' | '));
      if (q.guide.length) {
        withGuide++;
        if (!q.guideFinal) bad(q, 'tussenstappen zonder slotzin');
        for (const g of q.guide) {
          if (!g.ask || !g.tip) bad(q, 'tussenstap zonder vraag/tip');
          if (!checkAnswer(g, inputFor(g)).correct) bad(q, `tussenstap "${g.ask}" eigen antwoord ${inputFor(g)} fout`);
          if (g.type === 'number' && Math.abs(g.answer * 1000 - Math.round(g.answer * 1000)) > 1e-6) bad(q, `tussenstap met rare decimalen: ${g.ask} = ${g.answer}`);
        }
      }
    }
    console.log(`${id.padEnd(17)} L${level}: ${String(texts.size).padStart(5)} unieke sommen`);
  }
}
console.log(`\n${Math.round((withGuide / total) * 100)}% van de sommen heeft invulbare tussenstappen`);
console.log(fails ? `${fails} fouten gevonden` : 'Alles klopt ✓');
process.exit(fails ? 1 : 0);
