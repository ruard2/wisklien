// Informatief (niet in npm test): getallen op een uitlegkaart die in minder dan 90% van de sommen van dat sjabloon voorkomen.
// Vaak terecht (tafels, klok in sprongen van 5), maar zo vind je kaarten die per ongeluk de getallen van één voorbeeldsom noemen.
process.env.DATABASE_URL ||= 'postgresql://x@localhost/x';
const C = await import('../src/curriculum.js');
const { kidStore } = await import('../src/db.js');
const { alleKaarten } = await import('../src/uitleg/index.js');
const sums = {};
for (const [lang, cur] of [['nl', 'nl'], ['af', 'za']]) await kidStore.run({ kid: 1, cur, lang, name: 'S' }, () => {
  for (const c of C.CATEGORIES) for (let lv = 0; lv < 4; lv++) for (let i = 0; i < 300; i++) { const q = C.generate(c.id, lv); (sums[`${lang}:${q.tpl}`] ||= []).push(q.text + ' ' + (q.steps||[]).join(' ')); }
});
const FEIT = new Set(['0','1','10','100','1000','1 000','10 000','60','24','12','360','180','90','30','15','45','50','25','75','3,14','0,5','0,25','00','13']);
const words = { twee:2, drie:3, vier:4, vijf:5, zes:6, zeven:7, acht:8, negen:9 };
for (const lang of ['nl','af']) for (const [id, k] of Object.entries(alleKaarten(lang))) {
  const S = sums[`${lang}:${id}`]; if (!S) continue;
  for (const t of [...(k.aanpak||[]), k.model, k.woorden, ...(k.valkuilen||[]), k.concreter].filter(Boolean)) {
    const z = String(t).replace(/\((?:bijv\.|bv\.)[^)]*\)|(?:bijv\.|bv\.|Eers ’n klein voorbeeld:|Eerst een klein voorbeeld:|Eerst een makkelijk voorbeeld:)[^.]*\./g, '');
    const nums = [...z.matchAll(/\d+(?:,\d+)?/g)].map(m=>m[0]).filter(x=>!FEIT.has(x));
    for (const n of new Set(nums)) {
      const re = new RegExp(`(^|[^\\d,])${n.replace(',', '\\,')}(?![\\d])`);
      const share = S.filter(s => re.test(s)).length / S.length;
      if (share < 0.9) console.log(lang, id, n, Math.round(share*100)+'%', '|', t.slice(0,120));
    }
  }
}
