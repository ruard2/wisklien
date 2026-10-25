// Verbeterde kaarten uit een Kaartcheck (download van /audit) overnemen in src/uitleg/kaartcheck-<taal>.json.
//   node scripts/neem-kaarten-over.mjs max-test-N-xx.json [--droog]
// Elke voorgestelde kaart moet door dezelfde regels als de handgeschreven kaarten: naam + aanpak aanwezig, geen getallen
// van één voorbeeldsom (een getal moet in ≥ 90% van de sommen van dat sjabloon voorkomen, een vast feit zijn of "bijv."),
// niet te lang. Kaarten die niet door de regels komen, worden overgeslagen (en gemeld).
process.env.DATABASE_URL ||= 'postgresql://niet-nodig@localhost/x';
import fs from 'node:fs';
const { kidStore } = await import('../src/db.js');
const C = await import('../src/curriculum.js');
const { handKaarten } = await import('../src/uitleg/index.js');
const { normKaartOordeel } = await import('../src/audit.js');

const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const droog = process.argv.includes('--droog');
const lang = job.lang;
const uit = new URL(`../src/uitleg/kaartcheck-${lang}.json`, import.meta.url);
const bestaand = fs.existsSync(uit) ? JSON.parse(fs.readFileSync(uit, 'utf8')) : { kaarten: {} };

// sommen per sjabloon (voor de getallen-regel)
const sommen = {}, vormen = {};
// vorm van een som: de tekst zonder getallen en namen ("Rond # af op tientallen." ≠ "… op honderdtallen.")
const SLEUTEL = /\b(mm|cm|dm|m|km|g|kg|mg|ℓ|mℓ|ml|dl|cl|liter|ton|m²|cm²|dm²|m³|eenheden|tientallen|honderdtallen|duizendtallen|tiene|honderde|duisende|ene|omtrek|oppervlakte|area|volume|vlakken|vlakke|ribben|ribbe|rande|hoekpunten|hoekpunte|zijden|sye|symmetrie\w*|korting|afslag|rente|verhoging|toegeneem|gemiddelde|mediaan|modus|omvang|waarskynlikheid|kans)\b|[×:÷+−%]/gi;
const vorm = (t) => [...new Set((String(t).split('\n')[0].match(SLEUTEL) || []).map((x) => x.toLowerCase()))].sort().join(' ') || '-';
await kidStore.run({ kid: 1, cur: lang === 'af' ? 'za' : 'nl', lang, name: 'Sam' }, () => {
  for (const c of C.CATEGORIES) for (let lv = 0; lv < 4; lv++) for (let i = 0; i < 200; i++) { const q = C.generate(c.id, lv); (sommen[q.tpl] ||= []).push(`${q.text} ${(q.steps || []).join(' ')}`); (vormen[q.tpl] ||= new Set()).add(vorm(q.text)); }
});
const FEIT = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '12', '15', '20', '24', '25', '30', '45', '50', '60', '75', '90', '100', '180', '360', '1000', '1 000', '10 000', '3,14', '0,5', '0,25', '0,75', '00', '000', '11', '13', '23', '500']);
const zonderVoorbeeld = (t) => String(t).replace(/\((?:bijv\.|bv\.|byvoorbeeld)[^)]*\)|(?:bijv\.|bv\.|bijvoorbeeld|byvoorbeeld|Eers ’n klein voorbeeld:|Eerst een klein voorbeeld:)[^.]*\./gi, '');
function keur(tpl, k, it) {
  const f = [];
  if (!k?.naam || !Array.isArray(k.aanpak) || !k.aanpak.length) f.push('geen naam of aanpak');
  const S = sommen[tpl] || [];
  if (!S.length) f.push('sjabloon bestaat niet (meer)');
  const teksten = [k?.naam, ...(k?.aanpak || []), k?.model, ...(k?.valkuilen || []), k?.concreter].filter(Boolean);
  if (teksten.join(' ').length > 1400) f.push('te lang');
  // onderwerp: noemt de kaart een begrip dat in geen enkele som van dit sjabloon voorkomt, terwijl de sommen een ánder
  // begrip uit dezelfde groep hebben? (Kaartcheck AF: "omtrek"-kaarten voor oppervlakte- en volumesommen, omdat het
  // onderdeel "omtrek" heet.) Dan niet overnemen.
  const groepen = [['omtrek', 'rand rondom', 'buiterand'], ['oppervlakte', 'area', 'vierkante binne', 'vierkantjes'], ['volume', 'inhoud', 'kubusse', 'blokjes', 'lae'], ['vlakken', 'vlakke'], ['ribben', 'ribbe', 'rande'], ['hoekpunten', 'hoekpunte'], ['modus'], ['mediaan'], ['gemiddelde'], ['omvang'], ['korting', 'afslag'], ['rente'], ['verhoging', 'toename']];
  const somTekst = (S.join(' ') + ' ' + (it?.sommen || []).map((x) => x.text).join(' ')).toLowerCase(), kaartTxt = teksten.join(' ').toLowerCase();
  const inSom = groepen.filter((g) => g.some((w) => somTekst.includes(w)));
  for (const g of groepen) if (g.some((w) => kaartTxt.includes(w)) && !inSom.includes(g) && inSom.some((h) => h !== g && [0, 1, 2].includes(groepen.indexOf(h)) && [0, 1, 2].includes(groepen.indexOf(g)))) f.push(`kaart gaat over "${g[0]}", de sommen over "${inSom.map((h) => h[0]).join('/')}"`);
  // de kaart is gemaakt op 3 voorbeeldsommen: dekken die alle vormen van dit sjabloon? (anders past de kaart maar op een deel)
  const alle = vormen[tpl] || new Set(), gezien = new Set((it?.sommen || []).map((x) => vorm(x.text)));
  if (alle.size > 1 && alle.size <= 12 && [...alle].some((v) => !gezien.has(v))) f.push(`kaart gemaakt op ${gezien.size} van de ${alle.size} vormen van deze som (bijv. "${[...alle].find((v) => !gezien.has(v))}")`);
  for (const t of teksten) for (const n of new Set([...zonderVoorbeeld(t).matchAll(/\d+(?:[  ]\d{3})*(?:,\d+)?/g)].map((m) => m[0].replace(/ /g, ' ')))) {
    if (FEIT.has(n)) continue;
    const re = new RegExp(`(^|[^\\d,])${n.replace(',', '\\,').replace(' ', '[  ]?')}(?![\\d])`);
    if (S.filter((s) => re.test(s)).length / S.length < 0.9) f.push(`getal ${n} hoort bij één som: "${String(t).slice(0, 70)}"`);
  }
  return f;
}
const nieuw = {}, afgekeurd = [];
for (const it of job.items || []) {
  const v = normKaartOordeel(it.verdict);
  if (!v?.nieuwe_kaart) continue;
  const f = keur(it.tpl, v.nieuwe_kaart, it);
  if (f.length) afgekeurd.push(`${it.tpl}: ${f.join('; ')}`); else nieuw[it.tpl] = v.nieuwe_kaart;
}
console.log(`${lang}: ${Object.keys(nieuw).length} kaarten overgenomen, ${afgekeurd.length} afgekeurd`);
for (const a of afgekeurd) console.log('  ✗', a);
// controle: de handgeschreven kaart blijft bestaan (woorden, niet doen)
const hand = handKaarten(lang);
for (const t of Object.keys(nieuw)) if (!hand[t]) console.log('  ! geen handgeschreven kaart voor', t);
if (!droog) {
  const out = { bron: `Kaartcheck #${job.id} (${job.judge_model}, versie ${job.versie})`, gemaakt: new Date().toISOString().slice(0, 10), kaarten: { ...bestaand.kaarten, ...nieuw } };
  fs.writeFileSync(uit, JSON.stringify(out, null, 1) + '\n');
  console.log(`→ ${uit.pathname} (${Object.keys(out.kaarten).length} kaarten)`);
}
process.exit(0);
