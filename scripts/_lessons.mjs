import '../src/env.js';
import fs from 'node:fs';
import OpenAI from 'openai';
import { kidStore } from '../src/db.js';
import { lessonTurn, splitForm } from '../src/ai.js';
import { catById, LEVEL_NAMES } from '../src/generators.js';
const o = new OpenAI();
const cats = (process.argv[2] || 'kommagetallen:2').split(',').map((x) => x.split(':'));
const turns = Number(process.argv[3] || 4);
const out = [];
async function kid(chat) {
  const r = await o.chat.completions.create({ model: 'gpt-5.4-mini', max_completion_tokens: 300, messages: [
    { role: 'system', content: 'Je speelt een kind van 11 (groep 8) dat achterloopt met rekenen. Antwoord kort (max 12 woorden), kindertaal. Meestal probeer je het, soms fout (vooral in het begin), soms "snap ik niet".' },
    { role: 'user', content: chat.map((m) => `${m.role === 'teacher' ? 'Meester' : 'Kind'}: ${m.text}`).join('\n') + '\n\nWat zeg je terug? Alleen jouw zin.' }] });
  return r.choices[0].message.content.trim();
}
await kidStore.run({ kid: 999999, name: 'Christo' }, async () => {
  for (const [cat, lv] of cats) {
    const level = Number(lv);
    let chat = [];
    out.push(`\n===== ${catById[cat].label} · ${LEVEL_NAMES[level]} =====`);
    for (let t = 0; t < turns; t++) {
      const r = await lessonTurn({ name: 'Christo', profile: '', memory: '', cat, catLabel: catById[cat].label, level, levelName: LEVEL_NAMES[level], mistakes: [], chat });
      if (!r) { out.push('(geen antwoord)'); break; }
      const { text } = splitForm(r.text);
      chat.push({ role: 'teacher', text });
      out.push(`MAX: ${text}`);
      if (r.ready) break;
      const k = await kid(chat);
      chat.push({ role: 'kid', text: k });
      out.push(`KIND: ${k}`);
    }
  }
});
fs.writeFileSync(process.argv[4] || 'lessen.txt', out.join('\n'));
console.log(out.join('\n'));
process.exit(0);
