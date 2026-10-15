// Stresstoets vir die Suid-Afrikaanse somme: elke kategorie × vlak, baie keer.
import { GENERATORS, generate, hintsFor } from '../src/za/generators.js';
import { checkAnswer } from '../src/generators.js';
let bad = 0, n = 0;
const fail = (q, why) => { bad++; if (bad < 40) console.log('✗', q.cat, q.level, why, '|', q.text, '| ans', JSON.stringify(q.answer)); };
for (const cat of Object.keys(GENERATORS)) for (let lv = 0; lv < 4; lv++) for (let i = 0; i < 400; i++) {
  let q;
  try { q = generate(cat, lv); } catch (e) { fail({ cat, level: lv, text: '' }, 'CRASH ' + e.message); continue; }
  n++;
  if (/undefined|NaN|Infinity|\[object/.test(JSON.stringify([q.text, q.steps, q.guide, q.guideFinal, q.options]))) fail(q, 'undefined/NaN');
  if (q.type === 'number' && (typeof q.answer !== 'number' || !isFinite(q.answer))) fail(q, 'answer not number');
  if (q.type === 'number' && q.answer < 0 && q.cat !== 'getalbegrip') fail(q, 'negative');
  if (q.type === 'number' && !checkAnswer(q, q.display.replace(/[^\d,−-]/g, '')).correct) fail(q, 'display ' + q.display + ' not accepted');
  if (q.type === 'choice' && (q.answer < 0 || q.options.length < 2 || new Set(q.options).size !== q.options.length)) fail(q, 'bad choice ' + q.options);
  if (q.type === 'fraction' && !(q.answer[1] > 0)) fail(q, 'bad frac');
  for (const g of q.guide) {
    if (g.type === 'number' && !isFinite(g.answer)) fail(q, 'guide NaN ' + g.ask);
    if (g.type === 'choice' && (g.answer < 0 || new Set(g.options).size !== g.options.length)) fail(q, 'guide choice ' + g.ask + ' ' + g.options);
  }
  for (const w of q.wrong) if (w.answer === q.answer) fail(q, 'wrong==answer');
  if (!hintsFor(q)[0]) fail(q, 'no hint');
  // geen Nederlandse woorde in die kind se teks nie
  const all = [q.text, ...q.steps, ...q.guide.map((g) => g.ask + ' ' + g.tip), q.guideFinal || ''].join(' ').replace(/verhouding \d+ : \d+/g, '');
  if (/\b(het antwoord|hoeveel is het|de |een som|tientallen|eenheden|honderdtallen| : )\b/.test(all.replace(/['’]n /g, ''))) fail(q, 'NL? ' + all.match(/\b(het antwoord|de |tientallen|eenheden|keer| : )\b/)?.[0]);
}
console.log(`${n} somme, ${bad} probleme`);
for (const cat of Object.keys(GENERATORS)) for (let lv = 0; lv < 4; lv++) { const q = generate(cat, lv); console.log(`[${cat} ${lv}] ${q.text}  → ${q.display}`); }
