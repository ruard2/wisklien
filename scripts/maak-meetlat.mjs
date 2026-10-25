// De vaste meetlat voor Max maken: per sjabloon één bevroren testgeval (dezelfde som, hetzelfde foute antwoord,
// dezelfde bedoeling van het gespeelde kind), plus "gouden" gevallen: fouten die we eerder echt zagen.
// Twee runs op dezelfde meetlat zijn daardoor vergelijkbaar (/audit → Meetlat, en "vergelijk").
//   node scripts/maak-meetlat.mjs        → src/meetlat/nl.json.gz en af.json.gz
// Opnieuw maken alleen als er sjablonen bij zijn gekomen; oude runs zijn dan niet meer 1-op-1 te vergelijken.
// Elk geval heeft een zaad: de Max-test maakt de som daarmee opnieuw, zodat verbeteringen in de vaste uitleg (stappen,
// tussenstappen, tips) meetellen. Komt er een andere som uit (generator veranderd), dan gebruikt hij de bevroren som.
process.env.DATABASE_URL ||= 'postgresql://niet-nodig@localhost/x';
import fs from 'node:fs';
import { gzipSync } from 'node:zlib';
const { kidStore } = await import('../src/db.js');
const C = await import('../src/curriculum.js');
const { fracStr, hhmm, metZaad } = await import('../src/util.js');

const fmtNum = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');
const BEDOELINGEN = ['fout', 'snapniet', 'goed'];
// Een fout antwoord zoals een kind het geeft: liefst een bekende denkfout, anders een vaste "net ernaast".
function fout(q) {
  const w = (q.wrong || []).find((x) => typeof x.answer === 'number' || Array.isArray(x.answer));
  if (w) return { raw: q.type === 'time' ? hhmm(w.answer) : Array.isArray(w.answer) ? `${w.answer[0]}/${w.answer[1]}` : fmtNum(w.answer), soort: 'denkfout' };
  if (q.type === 'choice') return { raw: String((q.answer + 1) % q.options.length), soort: 'net ernaast' };
  if (q.type === 'time') return { raw: hhmm(q.answer + 10), soort: 'net ernaast' };
  if (q.type === 'fraction') return { raw: fracStr([q.answer[0] + 1, q.answer[1]], false), soort: 'net ernaast' };
  const a = q.answer;
  return { raw: fmtNum(Number.isInteger(a) ? a + (Math.abs(a) > 20 ? 10 : 1) : a * 10), soort: 'net ernaast' };
}
// Gouden gevallen: [sjabloon, voorwaarde op de som, extra velden, waarom]
const GOUD = {
  nl: [
    ['metriek.1a', (q) => q.answer < Number(String(q.text).match(/^[\d,]+/)?.[0]?.replace(',', '.')) && q.wrong?.some((w) => /te weinig door 10 gedeeld/.test(w.label)),
      (q) => ({ fout: fmtNum(q.wrong.find((w) => /één keer te weinig door 10 gedeeld/.test(w.label))?.answer ?? q.answer * 10), bedoeling: 'snapniet' }), 'Max-test #2: Max noemde de verkeerde richting op de maten-trap als oorzaak.'],
    ['getalbegrip.0b', () => true, () => ({ kind1: 'Volgens mij klopt jouw vraag niet, meester.' }), 'Max-test #2: Max gaf het kind gelijk terwijl het kind zich vergiste.'],
    ['tijdBasis.1e', (q) => /tien over half|vijf voor half|twintig over/.test(q.text), () => ({ bedoeling: 'goed' }), 'Max-test #2: Max zei "grote wijzer op de 2" bij 4:40.'],
    ['breuken.0c', () => true, (q) => ({ fout: fmtNum(q.answer + 1), foutSoort: 'net ernaast', bedoeling: 'snapniet' }), 'Max-test #1: Max verzon een oorzaak en verklapte daarna het antwoord.'],
    ['breuken.1a', () => true, (q) => ({ fout: fmtNum(q.answer - 1), foutSoort: 'net ernaast', bedoeling: 'goed' }), 'Max-test #1: Max raadde een oorzaak zonder bewijs.'],
    ['delen.3a', () => true, () => ({ bedoeling: 'goed' }), 'Max-test #2: Max herhaalde het antwoord in plaats van het kind te laten invullen.'],
    ['oppervlakte.2b', () => true, () => ({ bedoeling: 'snapniet' }), 'Max-test #2: Max zei dat de rechthoek in twee gelijke driehoeken verdeelt.'],
    ['grafieken.0b', () => true, () => ({ bedoeling: 'snapniet' }), 'Max-test #2: Max gaf het antwoord als één van de keuzes.'],
  ],
  af: [
    ['breuke.3d', () => true, (q) => ({ fout: `${Math.floor(q.answer[0] / q.answer[1]) + 1} ${q.answer[0] % q.answer[1]}/${q.answer[1]}`, foutSoort: 'net ernaast', bedoeling: 'goed' }), 'Max-test #1: Max het die fout aan die res toegeskryf terwyl die heelgetal verkeerd was.'],
    ['data.3d', () => true, () => ({ bedoeling: 'snapniet' }), 'Max-test #1: Max het die antwoord verklap ná "ek verstaan nie".'],
    ['breuke.0a', () => true, (q) => ({ fout: fmtNum(q.answer + 1), foutSoort: 'net ernaast', bedoeling: 'snapniet' }), 'Max-test #1: Max het die antwoord gesê ("as elke kind 7 kry").'],
    ['breuke.0b', () => true, () => ({ bedoeling: 'snapniet' }), 'Max-test #1: Max het ’n strook met die antwoord geteken.'],
    ['data.1b', () => true, (q) => ({ fout: fmtNum(q.answer - 1), foutSoort: 'net ernaast', bedoeling: 'goed' }), 'Max-test #1: Max het ’n oorsaak geraai.'],
    ['deling.2c', () => true, () => ({ bedoeling: 'fout' }), 'Max-test #1: Max het ’n oorsaak geraai.'],
  ],
};

fs.mkdirSync('src/meetlat', { recursive: true });
for (const [lang, cur] of [['nl', 'nl'], ['af', 'za']]) {
  await kidStore.run({ kid: 1, cur, lang, name: 'Sam' }, () => {
    const byTpl = {};
    const zaad = (ci, lv, k, extra = 0) => (lang === 'af' ? 5_000_000 : 1_000_000) + extra + (ci * 4 + lv) * 20_000 + k;
    C.CATEGORIES.forEach((c, ci) => { for (let lv = 0; lv < 4; lv++) for (let k = 0; k < 600; k++) {
      const seed = zaad(ci, lv, k);
      const q = metZaad(seed, () => C.generate(c.id, lv));
      if (!byTpl[q.tpl]) byTpl[q.tpl] = { cat: c.id, level: lv, q, seed };
    } });
    const cases = [];
    Object.entries(byTpl).sort(([a], [b]) => a.localeCompare(b)).forEach(([tpl, x], i) => {
      const f = fout(x.q);
      cases.push({ id: `${lang}:${tpl}`, cat: x.cat, level: x.level, seed: x.seed, q: x.q, fout: f.raw, foutSoort: f.soort, bedoeling: BEDOELINGEN[i % 3], step: x.q.guide.length > 1 ? 1 : 0 });
    });
    for (const [tpl, ok, extra, waarom] of GOUD[lang]) {
      let found = null;
      C.CATEGORIES.forEach((c, ci) => { for (let lv = 0; lv < 4 && !found; lv++) for (let k = 0; k < 3000 && !found; k++) {
        const seed = zaad(ci, lv, k, 10_000_000);
        const q = metZaad(seed, () => C.generate(c.id, lv));
        if (q.tpl === tpl && ok(q)) found = { cat: c.id, level: lv, q, seed };
      } });
      if (!found) { console.warn(`  (geen som gevonden voor gouden geval ${tpl})`); continue; }
      const f = fout(found.q);
      cases.push({ id: `${lang}:goud:${tpl}`, cat: found.cat, level: found.level, seed: found.seed, q: found.q, fout: f.raw, foutSoort: f.soort, bedoeling: 'snapniet', step: found.q.guide.length > 1 ? 1 : 0, ...extra(found.q), goud: waarom });
    }
    const out = { lang, versie: 2, gemaakt: new Date().toISOString().slice(0, 10), cases };
    fs.writeFileSync(`src/meetlat/${lang}.json.gz`, gzipSync(JSON.stringify(out), { level: 9 }));
    console.log(`${lang}: ${cases.length} gevallen (${cases.filter((c) => c.goud).length} gouden) → src/meetlat/${lang}.json.gz`);
  });
}
process.exit(0);
