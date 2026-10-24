// Max-test lokaal (kost AI-aanroepen): de echte Meester Max op een stapel sommen, alles bewaren en laten beoordelen.
// Hetzelfde als de pagina /audit op de server, maar dan met je eigen sleutel en als bestanden.
//   node scripts/max-audit.mjs [nl|af] [aantal=100] [uitmap=max-test]
//   AUDIT_MODEL=…        ander (sterker) model voor de beoordelaar (standaard: hetzelfde model als Max)
//   AUDIT_CONCURRENCY=4  zoveel sommen tegelijk
// Schrijft <uitmap>/max-test-<taal>-<tijd>.json en .html (open de .html in je browser).
import '../src/env.js';
import fs from 'node:fs';
process.env.DATABASE_URL ||= 'postgresql://niet-nodig@localhost/x'; // de test gebruikt geen database
const { planSums, auditOne, judgeOne, summarize, runPool } = await import('../src/audit.js');
const { reportPage } = await import('../src/audit-page.js');
const { aiEnabled, aiModel } = await import('../src/ai.js');

const lang = process.argv[2] === 'af' ? 'af' : 'nl';
const n = Number(process.argv[3] || 100);
const dir = process.argv[4] || 'max-test';
if (!aiEnabled()) { console.error('Geen AI-sleutel: zet OPENAI_API_KEY (of ANTHROPIC_API_KEY) in .env'); process.exit(1); }

const plan = planSums(lang, n);
const items = new Array(plan.length);
let done = 0;
const t0 = Date.now();
console.log(`Max-test: ${n} sommen (${lang}), model ${aiModel()}${process.env.AUDIT_MODEL ? `, beoordelaar ${process.env.AUDIT_MODEL}` : ''}`);
await runPool(plan, Number(process.env.AUDIT_CONCURRENCY || 4), async (p, k) => {
  const it = await auditOne(lang, p);
  it.verdict = await judgeOne(it).catch((e) => ({ fout: e.message }));
  items[k] = it;
  done++;
  const c = it.verdict?.cijfers || {};
  console.log(`  ${String(done).padStart(3)}/${n} ${it.label} · ${it.levelName}: ${Object.values(c).filter((x) => typeof x === 'number').join(' ') || '?'}${it.verdict?.rekenfouten?.length ? ' ✗ rekenfout' : ''}`);
});
const list = items.filter(Boolean);
const summary = await summarize(lang, list).catch(() => null);
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const job = { id: stamp, lang, n, status: 'klaar', created_at: new Date(t0).toISOString(), model: aiModel(), judge_model: process.env.AUDIT_MODEL || aiModel(), summary };
const base = `${dir}/max-test-${lang}-${stamp}`;
fs.writeFileSync(`${base}.json`, JSON.stringify({ ...job, items: list }, null, 1));
fs.writeFileSync(`${base}.html`, reportPage(job, list));
console.log(`\nKlaar in ${Math.round((Date.now() - t0) / 60000)} min → ${base}.html (en .json)`);
process.exit(0);
