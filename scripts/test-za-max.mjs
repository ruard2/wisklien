import '../src/env.js';
// Afrikaans-pariteit vir die hele beheerde Max-ketting:
// KABV-kaart → doel → app-les → antwoordkontrole → herstel → self doen → afsluiting.
import { kidStore } from '../src/db.js';
import { CAT_IDS, generateTpl } from '../src/curriculum.js';
import { maakLes, lesStap, vasteTekst, kiesLesSoort } from '../src/lesplan.js';
import { alleKaarten, kaartTekst } from '../src/uitleg/index.js';
import { foutPlanModus } from '../src/ai.js';
import { checkArithmetic, nederlandsInAfrikaans, verklaptAntwoord } from '../src/kwaliteit.js';
import { afMaxGesluitAan, afMetodeKontrak, gesloteAfrikaanseBeurt } from '../src/za/geslote-max.js';

let foute = 0, lesse = 0, beurte = 0;
const fout = (m) => { if (foute++ < 40) console.log('✗', m); };
const antwoord = (b) => (b.vraag?.display != null ? String(b.vraag.display) : 'ja');

kidStore.run({ lang: 'af', cur: 'za', groep: 7 }, () => {
  if (foutPlanModus() !== 'strak') fout(`die Afrikaanse foutplan is ${foutPlanModus()}, nie app-gestuurde "strak" nie`);
  if (!afMaxGesluitAan()) fout('die Afrikaanse Max kan nog na ’n vrye gesprek terugval');

  const kaarte = alleKaarten('af');
  for (const [tpl, kaart] of Object.entries(kaarte)) {
    if (!kaart?.doel?.startsWith('Ek kan ')) fout(`${tpl}: geen Afrikaanse kinddoel nie`);
    if (!kaart?.klaar) fout(`${tpl}: geen bemeesteringshek nie`);
    const teks = kaartTekst('af', tpl);
    for (const deel of ['DOEL VAN HIERDIE SOORT SOM', 'BEMEESTER AS', 'HULPPLAN WANNEER DIE KIND VASHAK']) {
      if (!teks.includes(deel)) fout(`${tpl}: ${deel} ontbreek in Max se voer`);
    }
  }

  for (const cat of CAT_IDS) for (const level of [0, 1, 2, 3]) for (const soort of ['reg', 'verkeerd', 'weetnie', 'wissel']) {
    const tpl = kiesLesSoort(cat, level, null, 'af');
    if (!tpl) { if (soort === 'reg') fout(`${cat} vlak ${level}: geen lessoort nie`); continue; }
    const proef = generateTpl(tpl, { pogingen: 3000 });
    if (!proef || proef.tpl !== tpl) { if (soort === 'reg') fout(`${tpl}: die Afrikaanse lyn kan nie presies dié soort som maak nie`); continue; }
    if (soort === 'reg') {
      const contract = afMetodeKontrak(proef);
      if (contract.controller !== 'app' || contract.freeFallback !== false || contract.maxRole !== 'verwoord-binne-kaart' || !contract.orderedSteps.length) fout(`${tpl}: geen geslote Afrikaanse metodekontrak nie`);
      const cases = [
        ['before', gesloteAfrikaanseBeurt({ question: proef, phase: 'before' })],
        ['wrong', gesloteAfrikaanseBeurt({ question: proef, phase: 'wrong', given: '9999', chat: [] })],
        ['right', gesloteAfrikaanseBeurt({ question: proef, phase: 'right', given: String(proef.display), chat: [] })],
        ...(proef.guide?.[0] ? [['step', gesloteAfrikaanseBeurt({ question: proef, phase: 'step', step: proef.guide[0], given: '', chat: [{ role: 'kid', text: 'ek weet nie' }] })]] : []),
      ];
      for (const [phase, message] of cases) {
        if (!message) { fout(`${tpl}: geslote ${phase}-beurt is leeg`); continue; }
        const visible = message.replace(/\s*\[VB:[^\]]*\]\s*/gi, ' ').trim();
        if (checkArithmetic(visible).length) fout(`${tpl}: rekenfout in geslote ${phase}-beurt`);
        if (nederlandsInAfrikaans(visible).length) fout(`${tpl}: Nederlandse woord in geslote ${phase}-beurt`);
        if (phase !== 'right' && verklaptAntwoord(visible, proef.display, { som: proef.text })) fout(`${tpl}: geslote ${phase}-beurt verklap die antwoord`);
      }
    }
    let les = maakLes({ cat, level, tpl, lang: 'af' });
    if (!les) { fout(`${cat} vlak ${level}: les nie maakbaar nie (${tpl})`); continue; }
    if ([les.vb, les.samen, ...les.zelf].some((q) => q.tpl !== tpl)) fout(`${tpl}: ’n les het ’n som van ’n ander metodekaart gekry`);
    lesse++;
    let kind = '', klaar = false;
    for (let n = 0; n < 90; n++) {
      const { les: volgende, beurt } = lesStap(les, kind); les = volgende; beurte++;
      if (beurt.lang !== 'af') fout(`${tpl}: beurt is nie in die Afrikaanse lyn nie`);
      const teks = vasteTekst(beurt, 'Sem', 'af');
      const reken = checkArithmetic(teks);
      if (reken.length) fout(`${tpl}: rekenfout in vaste Afrikaanse teks: ${reken[0].expr}`);
      const nl = nederlandsInAfrikaans(teks);
      if (nl.length) fout(`${tpl}: Nederlandse woord(e) in vaste Afrikaanse teks: ${nl.join(', ')}`);
      const weg = [beurt.vraag?.som, beurt.vraag?.ask, beurt.vraag?.tip, beurt.doel?.replace(/^Ek kan /, '')].filter(Boolean)
        .reduce((x, y) => x.split(y).join(' '), teks).replace(/(\d)[\s\u00a0\u202f\u2009](?=\d{3}\b)/g, '$1');
      if (beurt.vraag?.display && beurt.soort === 'vraag' && !beurt.vraag.zelf && beurt.reactie?.soort !== 'zeg'
        && verklaptAntwoord(weg, beurt.vraag.display, { som: beurt.vraag.som || '' })) fout(`${tpl}: vaste teks verklap ${beurt.vraag.display}`);
      if (!teks) fout(`${tpl}: leë Afrikaanse beurt`);
      if (beurt.klaar) { klaar = true; break; }
      kind = soort === 'reg' ? antwoord(beurt)
        : soort === 'verkeerd' ? (beurt.vraag?.display ? `${beurt.vraag.display}1`.replace(/[^\d]/g, '') || '7' : 'ja')
          : soort === 'weetnie' ? 'ek weet nie'
            : n % 3 ? antwoord(beurt) : '9999';
    }
    if (!klaar) fout(`${tpl} (${soort}): les bereik nie die einde nie (${les.fase})`);
  }
});

console.log(`${Object.keys(alleKaarten('af')).length} Afrikaanse metodekaarte en ${lesse} lesroetes nagegaan (${beurte} beurte)`);
console.log(foute ? `${foute} Afrikaanse Max-pariteitsfoute` : '✓ Afrikaanse Max-ketting het doel, metode, stappe, kontrole, herstel en bemeesteringshekke');
process.exit(foute ? 1 : 0);

