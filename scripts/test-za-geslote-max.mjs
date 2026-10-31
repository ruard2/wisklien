// Integrasietoets vir die laaste Afrikaanse Max-gaping: eie/vrygetikte vrae
// en ’n foutiewe KI-boodskap mag nooit na ’n vrye metode-uitset deurglip nie.
process.env.AI_MOCK = '1';

const { kidStore } = await import('../src/db.js');
const { generateTpl } = await import('../src/curriculum.js');
const { teacherTurn, splitForm } = await import('../src/ai.js');
const { alleKaarten, kaartVoor } = await import('../src/uitleg/index.js');
const { checkArithmetic, nederlandsInAfrikaans, verklaptAntwoord } = await import('../src/kwaliteit.js');

let question = null;
for (const tpl of Object.keys(alleKaarten('af'))) {
  const candidate = generateTpl(tpl, { pogingen: 5000 });
  if (candidate?.guide?.length && kaartVoor('af', candidate.tpl)) { question = candidate; break; }
}
if (!question) throw new Error('Geen geskikte Afrikaanse toetsvraag met tussenstappe en metodekaart gevind nie.');
const method = kaartVoor('af', question.tpl);
let failures = 0;
const fail = (message) => { failures++; console.error('✗', message); };

await kidStore.run({ lang: 'af', cur: 'za', groep: 7, name: 'Toetskind', kid: 999999 }, async () => {
  const cases = [
    ['before-vry', { phase: 'before', given: '', chat: [{ role: 'kid', text: 'Hoekom werk dit so?' }] }],
    ['wrong-vry', { phase: 'wrong', given: '9999', chat: [{ role: 'kid', text: 'Hoekom werk dit so?' }] }],
    ['right', { phase: 'right', given: String(question.display), chat: [] }],
    ['step-swak-ki', { phase: 'step', given: '', step: question.guide[0], chat: [{ role: 'kid', text: 'ek weet nie' }] }],
  ];
  for (const [name, args] of cases) {
    const raw = await teacherTurn({ name: 'Toetskind', profile: '', memory: '', today: '', question, levelName: 'graad 7', misconception: null, ...args });
    const visible = splitForm(raw).text || '';
    if (!visible) fail(`${name}: leë antwoord`);
    if (!visible.includes(method.naam) && name !== 'right') fail(`${name}: aktiewe Afrikaanse metode ontbreek`);
    if (nederlandsInAfrikaans(visible).length) fail(`${name}: Nederlandse woorde het deurgeglip`);
    if (checkArithmetic(visible).length) fail(`${name}: ongekontroleerde rekenstelling`);
    if (name !== 'right' && verklaptAntwoord(visible, question.display, { som: question.text, kind: args.chat.map((x) => x.text).join(' ') })) fail(`${name}: finale antwoord verklap`);
  }
});

console.log(failures ? `${failures} geslote-Max-fout(e)` : '✓ Afrikaanse vrygetikte gesprekke en foutiewe KI-uitset val terug na die app se geslote KABV-metode');
process.exit(failures ? 1 : 0);

