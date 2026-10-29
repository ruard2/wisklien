import '../src/env.js';
// Controle: de uitleg-les die de app stuurt (src/lesplan.js) en de rekencontrole op berichten van Max (src/ai.js).
//  - per onderdeel en niveau: een les komt tot het eind, of het kind nu alles goed, alles fout of "weet niet" zegt;
//  - in de vaste tekst klopt elk sommetje, en de vraag van de beurt verklapt zijn eigen antwoord niet;
//  - zonderFouteSommen haalt een zin met een rekenfout weg, rekenEnTaalFouten ziet fouten en te lange zinnen.
import { kidStore } from '../src/db.js';
import { CAT_IDS } from '../src/curriculum.js';
import { maakLes, lesStap, vasteTekst, kiesLesSoort } from '../src/lesplan.js';
import { checkArithmetic, verklaptAntwoord } from '../src/kwaliteit.js';
import { zonderFouteSommen, rekenEnTaalFouten } from '../src/ai.js';

let fout = 0, lessen = 0, beurten = 0;
const bad = (m) => { if (fout++ < 30) console.log('✗', m); };
const goedAntwoord = (b) => (b.vraag?.display != null ? String(b.vraag.display) : 'ja');
kidStore.run({ lang: 'nl', cur: 'nl', groep: 8 }, () => {
  for (const cat of CAT_IDS) for (const level of [0, 1, 2, 3]) for (const kindSoort of ['goed', 'fout', 'weetniet', 'wisselend']) {
    const tpl = kiesLesSoort(cat, level);
    if (!tpl) { if (kindSoort === 'goed') bad(`${cat} L${level}: geen soort som voor een les`); continue; }
    let les = maakLes({ cat, level, tpl });
    if (!les) { bad(`${cat} L${level}: les niet te maken (${tpl})`); continue; }
    lessen++;
    let kind = '', klaar = false;
    for (let n = 0; n < 90; n++) {
      const { les: l2, beurt } = lesStap(les, kind); les = l2; beurten++;
      const t = vasteTekst(beurt, 'Sem');
      const rf = checkArithmetic(t);
      if (rf.length) bad(`${tpl}: rekenfout in de vaste tekst: ${rf[0].expr} — "${t.slice(0, 120)}"`);
      // wat de app zelf al laat zien (de som, de vraag, de tip, het lesdoel) telt niet; de rest van de tekst mag het antwoord niet noemen
      const rest = [beurt.vraag?.som, beurt.vraag?.ask, beurt.vraag?.tip, beurt.doel?.replace(/^Ik (kan|weet) /, '')].filter(Boolean).reduce((x, y) => x.split(y).join(' '), t).replace(/(\d)[\s\u00a0\u202f\u2009](?=\d{3}\b)/g, '$1');
      if (beurt.vraag?.display && beurt.soort === 'vraag' && !beurt.vraag.zelf && beurt.reactie?.soort !== 'zeg' && verklaptAntwoord(rest, beurt.vraag.display, { som: beurt.vraag.som || '' })) bad(`${tpl}: de vaste tekst verklapt het antwoord ${beurt.vraag.display}: "${t.slice(0, 160)}"`);
      if (!t) bad(`${tpl}: lege beurt (${les.fase})`);
      if (beurt.klaar) { klaar = true; break; }
      const r = kindSoort === 'goed' ? goedAntwoord(beurt) : kindSoort === 'fout' ? (beurt.vraag?.display ? `${beurt.vraag.display}1`.replace(/[^\d]/g, '') || '7' : 'ja') : kindSoort === 'weetniet' ? 'weet ik niet' : n % 3 ? goedAntwoord(beurt) : '9999';
      kind = r;
    }
    if (!klaar) bad(`${tpl} (${kindSoort}): les komt niet tot het eind (fase ${les.fase})`);
  }
});
// rekencontrole
const z = zonderFouteSommen('Goed zo! 12 × 4 = 46. Nu 6 × 7 = 42. Wat is 3 + 4?');
if (/46/.test(z) || !/6 × 7 = 42/.test(z)) bad(`zonderFouteSommen: "${z}"`);
if (!rekenEnTaalFouten('Kijk: 25 + 17 = 43.').length) bad('rekenEnTaalFouten ziet 25 + 17 = 43 niet');
if (rekenEnTaalFouten('Kijk: 25 + 17 = 42. En 3 × 4 = 12.').length) bad('rekenEnTaalFouten keurt goede sommen af');
if (!rekenEnTaalFouten('Dit is een hele lange zin met heel veel woorden die maar doorgaat en doorgaat zonder punt omdat hij nooit stopt en nog verder.').length) bad('te lange zin niet gezien');
console.log(`${lessen} lessen nagespeeld (${beurten} beurten)`);
console.log(fout ? `${fout} fouten in de les of de rekencontrole` : '✓ Les en rekencontrole kloppen');
process.exit(fout ? 1 : 0);
