import '../src/env.js';
// Controle van de gespreksplannen (src/foutgesprek.js, src/stapgesprek.js, src/hulp.js): de app stuurt het gesprek.
// Meetlat #37: na een tussenantwoord vroeg Max de stap die het kind al had opnieuw (96 van de 215 foute antwoorden), en bij
// "snap ik niet" volgde geen kleinere stap. Hier spelen we gesprekken af met een nep-Max die precies doet wat het plan vraagt.
import { CATEGORIES, LEVELS, generate } from '../src/generators.js';
import { foutPlan, tussenIndex } from '../src/foutgesprek.js';
import { stapPlan } from '../src/stapgesprek.js';

let fouten = 0, gesprekken = 0, metDeel = 0;
const bad = (q, w) => { if (fouten++ < 20) console.log(`✗ ${q.tpl}: ${w}\n   ${q.text}`); };
const kaal = (x) => String(x).replace(/\s*=\s*\?.*$/, '').replace(/^[^:?\d]*[:?]\s*(?=\d)/, '');
const vraagVan = (p) => p.deelInfo?.vraag || (['tussen_verder', 'volgende', 'samen_begin', 'stap_hint', 'stap_concreet', 'laatste'].includes(p.zet) ? p.doel : null);
for (const { id } of CATEGORIES) for (const lv of LEVELS) for (let n = 0; n < 40; n++) {
  const q = generate(id, lv);
  const nums = (q.guide || []).filter((g) => g.type === 'number');
  if (nums.length < 2) continue;
  const j = q.guide.indexOf(nums[0]), given = nums[0].display;
  if (tussenIndex(q, given) < 0) continue;
  gesprekken++;
  const chat = [];
  let p = foutPlan({ question: q, given, chat, misconception: { label: 'tussen' } });
  if (p?.zet !== 'tussen_verder') { bad(q, `opening na tussenantwoord ${given} is "${p?.zet}"`); continue; }
  if (p.k <= j) bad(q, 'het plan begint niet ná de stap die het kind al had');
  const gedaan = new Set(q.guide.slice(0, p.k).map((g) => kaal(g.ask)));
  const say = (p) => { const v = vraagVan(p); chat.push({ role: 'teacher', text: `(${p.zet})`, ...(v ? { vb: { som: kaal(v.ask), uitkomst: v.type === 'choice' ? v.options[v.answer] : v.display } } : {}) }); return v; };
  let v = say(p), stappen = 0;
  for (let t = 0; t < 30; t++) {
    const kid = t === 0 ? 'Ik snap het nog niet 🤔' : v ? (v.type === 'choice' ? v.options[v.answer] : v.display) : q.display;
    chat.push({ role: 'kid', text: kid });
    p = foutPlan({ question: q, given, chat, misconception: { label: 'tussen' } });
    if (!p) { bad(q, `plan stopt bij "${kid}" (vorige zet ${chat.at(-2)?.text})`); break; }
    if (p.zet === 'goed_nu') bad(q, '"wat ging er anders?" terwijl de fout al bekend is (tussenantwoord)');
    if (p.deelInfo) metDeel++;
    v = say(p);
    if (v && gedaan.has(kaal(v.ask)) && !p.deelInfo) bad(q, `vraagt een stap die al klaar is: ${v.ask}`);
    if (['goed_klaar', 'goed_nu'].includes(p.zet)) break;
    if (++stappen > 28) bad(q, 'gesprek komt niet bij het eind');
  }
  if (!['goed_klaar', 'goed_nu'].includes(p?.zet)) bad(q, `gesprek eindigt niet met het goede antwoord (laatste zet ${p?.zet})`);
  // vast bij een stap: met deelstappen begint de ladder bij de eerste deelstap
  const st = nums.at(-1);
  const sp = stapPlan({ question: q, step: st, chat: [{ role: 'kid', text: `Ik snap deze stap niet: ${st.ask}` }] });
  if (sp?.deelInfo && sp.zet !== 'deel_start') bad(q, `stap met deelstappen begint met ${sp.zet}`);
}
console.log(`${gesprekken} gesprekken na een tussenantwoord afgespeeld, ${metDeel} beurten met deelstappen`);
console.log(fouten ? `✗ ${fouten} fouten in de gespreksplannen` : '✓ Gespreksplannen kloppen');
process.exit(fouten ? 1 : 0);
