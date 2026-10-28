import '../src/env.js';
// Controle: genereer veel sommen per categorie/niveau en kijk of alles klopt,
// inclusief de invulbare tussenstappen. Start met: npm test
import { CATEGORIES, LEVELS, generate, checkAnswer, hintsFor } from '../src/generators.js';
import { fracStr, hhmm, fmt } from '../src/util.js';
import { intakePlan } from '../src/engine.js';
import { deelstappen } from '../src/hulp.js';
import { rekenVraag } from '../src/stapgesprek.js';

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
      // hints mogen het eindantwoord nooit verklappen
      if (q.type === 'number' || q.type === 'fraction' || q.type === 'time') {
        const ans = q.type === 'number' ? fmt(q.answer) : q.type === 'fraction' ? fracStr(q.answer) : hhmm(q.answer);
        const esc = ans.replace(/[.*+?^${}()|[\]\/]/g, '\\$&');
        const re = new RegExp('(^|[^\\d,/:])' + esc + '($|[^\\d,/:])');
        const stepHints = hintsFor(q).slice(1); // [0] is de algemene aanpak
        // een hint mag nooit een uitkomst tonen ("= 287"), alleen een vraag ("= ?")
        if (stepHints.some((h) => /=\s*[−\d€]/.test(h) && !/\?\s*=/.test(h))) bad(q, 'hint toont een uitkomst: ' + stepHints.join(' | '));
        // en het eindantwoord mag er niet in staan, tenzij het al in de som zelf staat of een getal is om mee te rekenen
        if (!re.test(q.text) && stepHints.some((h) => re.test(h.replace(/[^=]*$/, '')) && !/= \?$/.test(h))) bad(q, `hint bevat eindantwoord ${ans}: ` + stepHints.join(' | '));
      }
      if (q.guide.length) {
        withGuide++;
        if (!q.guideFinal) bad(q, 'tussenstappen zonder slotzin');
        for (const g of q.guide) {
          if (!g.ask || !g.tip) bad(q, 'tussenstap zonder vraag/tip');
          if (!checkAnswer(g, inputFor(g)).correct) bad(q, `tussenstap "${g.ask}" eigen antwoord ${inputFor(g)} fout`);
          if (g.type === 'number' && Math.abs(g.answer * 1000 - Math.round(g.answer * 1000)) > 1e-6) bad(q, `tussenstap met rare decimalen: ${g.ask} = ${g.answer}`);
          // tips narekenen (meetlat #37): "in stukjes" moet optellen tot het getal uit de stap; schuiven altijd met de richting erbij
          // hulpladder (src/hulp.js): elke deelstap klopt, en de laatste is de uitkomst van de stap
          const ds = deelstappen(g);
          if (ds) for (const x of ds) { const v = rekenVraag(String(x.ask).replace(/^[^\d]*?(?=\d)/, '')); if (v != null && Math.abs(v - x.answer) > 1e-6) bad(q, `deelstap klopt niet: ${x.ask} = ${x.display} (moet ${v}) bij "${g.ask}"`); }
          if (ds && Math.abs(ds.at(-1).answer - g.answer) > 1e-9) bad(q, `deelstappen eindigen niet op de uitkomst van "${g.ask}"`);
          const tip = String(g.tip || '');
          const stuk = tip.match(/in stukjes (?:af|op): begin bij ([\d ]+), eerst ([−+]) ([\d ]+)((?:, dan [−+] [\d ]+)+)/);
          const askOp = String(g.ask).match(/(\d[\d\s]*?)\s*([−+])\s*(\d[\d\s]*?)\s*=\s*\?/);
          if (stuk && askOp) {
            const n = (x) => Number(String(x).replace(/\s/g, ''));
            const som = n(stuk[3]) + [...stuk[4].matchAll(/dan [−+] ([\d ]+)/g)].reduce((a, m) => a + n(m[1]), 0);
            if (som !== n(askOp[3]) || n(stuk[1]) !== n(askOp[1])) bad(q, `tip in stukjes klopt niet: "${tip}" bij "${g.ask}"`);
          }
          if (/schuift/.test(tip) && !/komma|groter|kleiner|zo groot|zo klein/.test(tip)) bad(q, `tip over schuiven zonder richting/komma: "${tip}"`);
          if (g.type === 'number' && new RegExp(`=\\s*${String(g.display ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\d,])`).test(tip) && g.display && String(g.display).length > 1) bad(q, `tip verklapt de uitkomst ${g.display}: "${tip}"`);
        }
      }
    }
    console.log(`${id.padEnd(17)} L${level}: ${String(texts.size).padStart(5)} unieke sommen`);
  }
}
console.log(`\n${Math.round((withGuide / total) * 100)}% van de sommen heeft invulbare tussenstappen`);
console.log(fails ? `${fails} fouten gevonden` : 'Alles klopt ✓');
process.exit(fails ? 1 : 0);
