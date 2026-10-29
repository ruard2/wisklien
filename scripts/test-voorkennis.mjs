import '../src/env.js';
// Controle: voorkennis als echte som (src/methodes/wig-leerlijn.js VOORKENNIS, src/engine.js) en de sjabloonindex.
//  1. de index (src/sjablonen-nl.json) klopt nog met de generatoren;
//  2. elke voorkennissom bestaat, is te maken en komt in de leerlijn niet later dan de som waarvoor hij is;
//  3. het verloop in een dagtaak: fout → herkansing (zelfde soort) → nog fout → voorkennissom → de som van net terug.
import { kidStore } from '../src/db.js';
import { SJABLONEN, generateTpl, checkAnswer } from '../src/generators.js';
import { maakIndex } from './maak-sjabloonindex.mjs';
import { KAART, VOORKENNIS } from '../src/methodes/wig-leerlijn.js';
import { nextQuestion, updateState, VK_MAX } from '../src/engine.js';
import { CAT_IDS } from '../src/curriculum.js';
import { DOELEN } from '../src/uitleg/doelen-nl.js';
import { kaartVoor } from '../src/uitleg/index.js';

let fout = 0;
const bad = (m) => { if (fout++ < 40) console.log('✗', m); };

// 1. index
const vers = maakIndex(300);
for (const [t, [cat, lv]] of Object.entries(vers)) {
  const o = SJABLONEN[t];
  if (!o) bad(`sjabloon ${t} staat niet in src/sjablonen-nl.json (draai: node scripts/maak-sjabloonindex.mjs)`);
  else if (o[0] !== cat || (o[1] !== lv && vers[t][2] > 0.05)) bad(`index klopt niet voor ${t}: ${o.slice(0, 2)} ↔ nu ${cat}:${lv}`);
}
for (const t of Object.keys(KAART)) if (!SJABLONEN[t] && vers[t]) bad(`${t} ontbreekt in de index`);

// 2. voorkennis
for (const [t, vks] of Object.entries(VOORKENNIS)) {
  if (!KAART[t]) bad(`VOORKENNIS voor onbekend sjabloon ${t}`);
  for (const v of vks) {
    if (v === t) bad(`${t} is zijn eigen voorkennis`);
    if (!KAART[v]) { bad(`voorkennis ${v} (bij ${t}) heeft geen leerlijn`); continue; }
    if (!SJABLONEN[v]) { bad(`voorkennis ${v} (bij ${t}) wordt nooit gemaakt`); continue; }
    if (SJABLONEN[v][2] < 0.03) bad(`voorkennis ${v} (bij ${t}) is te zeldzaam (${SJABLONEN[v][2]})`);
    if (KAART[v].groep > KAART[t].groep) bad(`voorkennis ${v} (groep ${KAART[v].groep}) komt later dan ${t} (groep ${KAART[t].groep})`);
    for (let i = 0; i < 3; i++) if (generateTpl(v)?.tpl !== v) { bad(`generateTpl(${v}) lukt niet`); break; }
  }
}
const zonder = Object.keys(KAART).filter((t) => !VOORKENNIS[t]);
console.log(`${Object.keys(VOORKENNIS).length} soorten sommen met een voorkennissom; zonder (voorkennis vóór groep 5): ${zonder.join(', ')}`);

// 2b. elke soort som heeft een doel, "beheerst als", woorden en minstens twee typische fouten
for (const t of Object.keys(KAART)) {
  const k = kaartVoor('nl', t);
  if (!DOELEN[t]) bad(`${t}: geen doel in src/uitleg/doelen-nl.js`);
  else if (!/^Ik (kan|weet)\b/.test(DOELEN[t].ik)) bad(`${t}: doel begint niet met "Ik kan"/"Ik weet"`);
  if (!k) { bad(`${t}: geen kaart`); continue; }
  if (!k.woorden) bad(`${t}: kaart zonder woorden`);
  if ((k.valkuilen || []).length < 2) bad(`${t}: kaart met minder dan twee typische fouten`);
}
for (const t of Object.keys(DOELEN)) if (!KAART[t]) bad(`doel voor onbekende soort som ${t}`);

// 2c. zelf een route kiezen: de keuzestap klopt (de handige route goed, een andere werkende route ook goed met uitleg)
const KEUZE = ['optellen.1a', 'optellen.1b', 'optellen.1d', 'optellen.1e', 'optellen.1f', 'vermenigvuldigen.1e', 'vermenigvuldigen.1f'];
for (const t of KEUZE) {
  let n = 0, met = 0;
  for (let i = 0; i < 120; i++) {
    const q = generateTpl(t); if (!q) continue; n++;
    if (!q.routeKeuze) continue; met++;
    const g = q.guide[0];
    if (g.type !== 'choice' || !checkAnswer(g, String(g.answer)).correct) bad(`${t}: keuzestap klopt niet`);
    for (const k of g.ookGoed || []) { const c = checkAnswer(g, String(k)); if (!c.correct || !c.note) bad(`${t}: ook-goede route zonder uitleg`); }
    const fout = g.options.map((_, k) => k).filter((k) => k !== g.answer && !(g.ookGoed || []).includes(k));
    if (!fout.length || fout.some((k) => checkAnswer(g, String(k)).correct)) bad(`${t}: keuzestap zonder foute keuze`);
    if (!/^Kies je manier/.test(q.steps[0])) bad(`${t}: stappenplan begint niet met de keuze`);
  }
  if (!met || met > n * 0.7) bad(`${t}: routekeuze ${met} van ${n} keer`);
}

// 3. verloop in een dagtaak (zonder database: de motor zelf)
kidStore.run({ lang: 'nl', cur: 'nl', groep: 6 }, () => {
  const skills = CAT_IDS.map((cat) => ({ cat, level: 1, mastery: 40, recent: [], scaffold: 0, ex_level: 1, calib: 0 }));
  let gezien = 0;
  for (let ronde = 0; ronde < 14 * 8; ronde++) {
    const cat = CAT_IDS[ronde % CAT_IDS.length];
    for (const sk of skills) sk.level = Math.floor(ronde / CAT_IDS.length) % 4;
    const s = { kind: 'daily', questions: [], results: [], plan: Array(20).fill(cat), state: {}, total: 20 };
    const vraag = () => { const q = nextQuestion(s, skills); s.questions.push(q); return q; };
    const antwoord = (q, goed, extra = {}) => { Object.assign(q, extra); s.results.push({ correct: goed }); s.state = updateState(s, q, goed); };
    let q = vraag();
    if (!q.guide.length) continue; // zonder tussenstappen geen herkansing
    const eerste = q.tpl;
    antwoord(q, false);
    const h = vraag();
    if (!h.retry) bad('na een fout komt geen herkansing');
    if (h.tpl !== eerste) bad(`herkansing is een andere soort som: ${eerste} → ${h.tpl}`);
    antwoord(h, false, { guided: true });
    const vk = vraag();
    const verwacht = VOORKENNIS[eerste] || [];
    if (!h.guide.length) continue; // zonder tussenstappen geen herkansing
    if (verwacht.length) {
      gezien++;
      if (!vk.voorkennis) { bad(`na een mislukte herkansing van ${eerste} komt geen voorkennissom (wel ${vk.tpl})`); continue; }
      if (!verwacht.includes(vk.tpl)) bad(`voorkennissom ${vk.tpl} hoort niet bij ${eerste}`);
      if (vk.voorkennis.voor.tpl !== eerste) bad('voorkennissom weet niet waarvoor hij is');
      antwoord(vk, ronde % 2 === 0);
      const terug = vraag();
      if (!terug.terugNa || terug.tpl !== eerste) bad(`na de voorkennissom komt ${eerste} niet terug (wel ${terug.tpl})`);
      if (terug.terugNa?.vk !== vk.tpl) bad('de som die terugkomt weet niet welke voorkennissom er was');
      antwoord(terug, false);
      const daarna = vraag();
      if (daarna.voorkennis || daarna.terugNa || (daarna.retry && daarna.tpl === eerste)) bad('na de terugkomer weer een terugstap of herkansing (lus)');
    } else if (vk.voorkennis) bad(`voorkennissom bij ${eerste}, die er geen heeft`);
  }
  console.log(`${gezien} keer het verloop fout → herkansing → voorkennis → terug nagespeeld`);
  // hooguit VK_MAX per sessie
  const s = { kind: 'daily', questions: [], results: [], plan: Array(40).fill('vermenigvuldigen'), state: {}, total: 40 };
  let n = 0;
  for (let i = 0; i < 39; i++) { const q = nextQuestion(s, skills); s.questions.push(q); if (q.voorkennis) n++; s.results.push({ correct: false }); q.guided = true; q.stepErrors = ['a', 'b']; s.state = updateState(s, q, false); }
  if (n > VK_MAX) bad(`${n} voorkennissommen in één sessie (max ${VK_MAX})`);
});
console.log(fout ? `${fout} fouten in voorkennis/index` : '✓ Voorkennis en sjabloonindex kloppen');
process.exit(fout ? 1 : 0);
