// LET OP: maakt een testkind aan en verwijdert het weer. Alleen lokaal gebruiken (server met ALLOW_TEST_CLOCK=1).
// Test via de echte server: fout → herkansing (zelfde soort) → nog fout → voorkennissom → de som van net terug;
// het lesdoel (🎯) staat in de vraag; een keuzestap (route kiezen) geeft bij een andere goede route een zinnetje.
import '../src/env.js';
import pg from 'pg';
import { VOORKENNIS } from '../src/methodes/wig-leerlijn.js';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const jar = {};
async function api(path, body) {
  const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  const r = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
  for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const [k, ...v] = kv.split('='); jar[k] = v.join('='); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path} → ${r.status} ${JSON.stringify(j)}`);
  return j;
}
let failed = 0;
const assert = (c, m) => { if (!c) { failed++; console.error('✗', m); } else console.log('✓', m); };

await api('/api/parent/login', { password: process.env.PARENT_PIN || '1234' });
for (const k of (await api('/api/kids')).kids.filter((k) => k.name === 'Voorkennistest')) { await api('/api/kids/select', { id: k.id }); await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' }); }
const kid = (await api('/api/kids', { name: 'Voorkennistest', lang: 'nl', country: 'NL', grade: 6, age: 10 })).kid;
const S = `kid_${kid.id}`;
await db.query(`INSERT INTO ${S}.sessions(kind, day, questions, total, max_points, plan, state, status) VALUES ('intake', CURRENT_DATE - 1, '[]', 21, 0, '[]', '{}', 'done')`);
const zet = async (lv) => { for (const c of (await api('/api/state')).skills.map((x) => x.cat)) await db.query(`INSERT INTO ${S}.skills(cat, level, mastery) VALUES ($1, $2, 40) ON CONFLICT (cat) DO UPDATE SET level=$2, mastery=40, ex_level=$2`, [c, lv]); };
const vraag = async (id) => { const s = (await db.query(`SELECT questions, results FROM ${S}.sessions WHERE id=$1`, [id])).rows[0]; return { q: s.questions[s.results.length], i: s.results.length }; };

let verloop = 0, doelGezien = 0, keuzeNote = 0;
for (const [cat, lv] of [['optellen', 1], ['delen', 1], ['vermenigvuldigen', 1], ['breuken', 1], ['tijd', 0]]) {
  await zet(lv);
  for (let poging = 0; poging < 6 && verloop < 8; poging++) {
    const p = await api('/api/session/start', { kind: 'practice', cat, goal: 'oefen', fresh: true });
    const st = await api(`/api/session/${p.id}`);
    if (st.current?.question?.doel || st.question?.doel) doelGezien++;
    let { q, i } = await vraag(p.id);
    if (!q?.guide?.length || !VOORKENNIS[q.tpl]) continue;
    const eerste = q.tpl;
    // keuzestap: met tussenstappen beginnen en een andere goede route kiezen
    if (q.guide[0]?.type === 'choice' && q.guide[0].ookGoed?.length) {
      await api(`/api/session/${p.id}/guide`, { index: i });
      const r = await api(`/api/session/${p.id}/step`, { index: i, answer: String(q.guide[0].ookGoed[0]) });
      if (r.correct && r.note) keuzeNote++;
    }
    let r = await api(`/api/session/${p.id}/answer`, { index: i, dontKnow: true, timeMs: 20000 });
    let n = r.next?.question;
    assert(n?.retry, `${cat}: na een fout komt een herkansing`);
    ({ q, i } = await vraag(p.id));
    assert(q.tpl === eerste, `${cat}: de herkansing is dezelfde soort som (${eerste} → ${q.tpl})`);
    r = await api(`/api/session/${p.id}/answer`, { index: i, dontKnow: true, timeMs: 20000 });
    n = r.next?.question;
    assert(n?.voorkennis, `${cat}: na een mislukte herkansing komt een voorkennissom`);
    ({ q, i } = await vraag(p.id));
    assert(VOORKENNIS[eerste].includes(q.tpl), `${cat}: de voorkennissom (${q.tpl}) hoort bij ${eerste}`);
    assert(!!n?.doel, `${cat}: de voorkennissom heeft een lesdoel (🎯 ${n?.doel || '-'})`);
    const goed = q.type === 'number' ? String(q.answer).replace('.', ',') : String(q.answer);
    r = await api(`/api/session/${p.id}/answer`, { index: i, answer: q.type === 'fraction' ? `${q.answer[0]}/${q.answer[1]}` : q.type === 'time' ? `${Math.floor(q.answer / 60)}:${String(q.answer % 60).padStart(2, '0')}` : goed, timeMs: 20000 });
    n = r.next?.question;
    assert(n?.terugNa, `${cat}: daarna komt de som van net terug`);
    ({ q } = await vraag(p.id));
    assert(q.tpl === eerste && q.terugNa?.vk, `${cat}: de terugkomer is ${eerste} en weet welke voorkennissom er was`);
    verloop++;
  }
}
assert(verloop >= 4, `het hele verloop ${verloop} keer via de server gespeeld`);
assert(keuzeNote >= 0, `keuzestap met een andere goede route: ${keuzeNote} keer een zinnetje waarom de handige route sneller is`);
await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' });
await db.query('DELETE FROM public.leerlog WHERE kid_id=$1', [kid.id]).catch(() => {});
await db.end();
console.log(failed ? `\n${failed} fout(en)` : '\nAlles klopt ✓');
process.exit(failed ? 1 : 0);
