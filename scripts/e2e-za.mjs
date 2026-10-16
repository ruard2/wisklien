// LET OP: maakt testkinderen aan en verwijdert ze weer. Alleen lokaal gebruiken.
// End-to-end test van het Suid-Afrikaanse (Afrikaanse) curriculum tegen een draaiende server.
import '../src/env.js';
import pg from 'pg';
import { fracStr, hhmm } from '../src/util.js';

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
const good = (q) => q.type === 'number' ? String(q.answer).replace('.', ',') : q.type === 'fraction' ? fracStr(q.answer) : q.type === 'time' ? hhmm(q.answer) : q.answer;
let failed = 0;
const assert = (c, m) => { if (!c) { failed++; console.error('✗', m); } else console.log('✓', m); };
let SCHEMA = 'public';
const current = async (id) => { const s = (await db.query(`SELECT questions, results FROM ${SCHEMA}.sessions WHERE id=$1`, [id])).rows[0]; return s.questions[s.results.length]; };
const ZA = ['optel', 'vermenigvuldig', 'deling', 'getalbegrip', 'breuke', 'desimale', 'persentasie', 'finansies', 'patrone', 'meetkunde', 'meting', 'omtrek', 'tyd', 'data'];
const NLWORD = /\b(tientallen|eenheden|Hoeveel is het|Reken|Splits|kolomsgewijs|keer zo|deel van|het antwoord|uitrekenen)\b|€| : \d/;

async function play(kind, decide, extra = {}) {
  let s = await api('/api/session/start', { kind, ...extra });
  const log = [];
  let last;
  while (s.current || (last && !last.done)) {
    const cur = last ? last.next : s.current;
    if (!cur) break;
    const full = await current(s.id);
    const how = decide(cur.index, cur, full);
    if (how === 'guided-good') {
      await api(`/api/session/${s.id}/guide`, { index: cur.index, choice: 'guided' });
      for (const g of full.guide) {
        const r = await api(`/api/session/${s.id}/step`, { index: cur.index, answer: good(g) });
        if (!r.correct) assert(false, `tussenstap fout: ${g.ask} (${good(g)})`);
      }
    }
    last = await api(`/api/session/${s.id}/answer`, { index: cur.index, answer: how === 'bad' ? (full.type === 'choice' ? (full.answer + 1) % full.options.length : '999999') : good(full), timeMs: 9000 });
    log.push({ cur, full, res: last, how });
    if (last.done) break;
  }
  return { id: s.id, log, last };
}

await api('/api/parent/login', { pin: process.env.PARENT_PIN || '1234' });
for (const k of (await api('/api/kids')).kids.filter((k) => /^E2E-(ZA|NL)$/.test(k.name))) { await api('/api/kids/select', { id: k.id }); await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' }); }
await api('/api/kids/leave', {});

// graad buite bereik word geweier
await api('/api/kids', { name: 'E2E-ZA', lang: 'af', country: 'ZA', grade: 8, age: 12 }).then(() => assert(false, 'graad 8 hoort geweigerd'), () => assert(true, 'graad 8 bestaat niet in de laerskool → geweigerd'));
const kid = (await api('/api/kids', { name: 'E2E-ZA', lang: 'af', country: 'ZA', grade: 7, age: 12 })).kid;
SCHEMA = `kid_${kid.id}`;
let st = await api('/api/state');
assert(st.kid.lang === 'af' && st.curriculum === 'za', `profiel: Afrikaans, curriculum za (${st.curriculum})`);
assert(st.teacher === 'Meneer Max', `leraar heet ${st.teacher}`);
assert(st.currency === 'ZAR', `munt ${st.currency}`);
assert(JSON.stringify(st.levelNames) === JSON.stringify(['graad 4', 'graad 5', 'graad 6', 'graad 7']), `niveaus ${st.levelNames}`);
assert(st.skills.length === 14 && st.skills.every((s) => ZA.includes(s.cat)), `14 KABV-onderdelen (${st.skills.map((s) => s.cat).join(',')})`);
assert(Object.values(st.aanpak || {}).every((a) => !NLWORD.test(a)), 'aanpak-tips in het Afrikaans');

// ---- Begintoets ----
const intake = await play('intake', (i, cur, full) => (full.level >= 3 ? 'bad' : 'good'), { groep: 7 });
assert(intake.log.length === 21, `begintoets 21 sommen (${intake.log.length})`);
assert(intake.log.slice(0, 14).every((l) => l.full.level === 2), 'graad 7 → begintoets op graad 6-niveau');
assert(new Set(intake.log.slice(0, 14).map((l) => l.full.cat)).size === 14, 'elk onderdeel één keer');
const texts = intake.log.map((l) => l.full.text).join('\n').replace(/verhouding \d+ : \d+/g, '');
assert(!NLWORD.test(texts), 'geen Nederlands in de sommen' + (NLWORD.test(texts) ? ': ' + texts.match(NLWORD)[0] : ''));
assert(!/ : \d/.test(texts.replace(/verhouding \d+ : \d+/g, '')), 'delen met ÷, niet met :');
console.log('  voorbeelden:', intake.log.slice(0, 5).map((l) => l.full.text).join(' || '));

// ---- Voortgang voor het kind: alleen woorden van Max, geen niveaus ----
{
  const v = await api('/api/kid/voortgang');
  assert(Array.isArray(v.strong) && Array.isArray(v.practice) && (v.strong.length + v.practice.length) > 0, `kind krijgt goed-in/oefenen (${v.strong.map((x) => x.label)} | ${v.practice.map((x) => x.label)})`);
  assert(!v.text || !/graad \d|groep \d|vlak|\d+ ?%/i.test(v.text), `berichtje van Max zonder niveau of score: ${String(v.text).slice(0, 120)}`);
  assert(!JSON.stringify(v).includes('levelName') && !JSON.stringify(v).includes('score'), 'geen niveau of score in wat het kind krijgt');
}

// ---- Dagtaak met tussenstappen: elke tussenstap moet via de server kloppen ----
await db.query(`UPDATE ${SCHEMA}.sessions SET status='stopped' WHERE status='active'`);
const daily = await play('daily', (i, cur, full) => (full.guide?.length ? 'guided-good' : 'good'));
assert(daily.last.done, `dagtaak klaar (${daily.log.length} sommen)`);
assert(daily.log.filter((l) => l.full.warmup).every((l) => ['vermenigvuldig', 'deling'].includes(l.full.cat)), 'opwarmers uit vermenigvuldig/deling');
assert(daily.log.every((l) => ZA.includes(l.full.cat)), 'alleen KABV-onderdelen');

// ---- Elk onderdeel op elk niveau: goed antwoord + alle tussenstappen ----
for (const cat of ZA) for (let lv = 0; lv < 4; lv++) {
  await db.query(`UPDATE ${SCHEMA}.skills SET level=$2 WHERE cat=$1`, [cat, lv]);
  await db.query(`UPDATE ${SCHEMA}.sessions SET status='stopped' WHERE status='active'`);
  const s = await api('/api/session/start', { kind: 'practice', cat });
  const full = await current(s.id);
  for (const g of full.guide) { const r = await api(`/api/session/${s.id}/step`, { index: 0, answer: good(g) }).catch((e) => ({ err: e.message })); if (r.err && !/Geen stap/.test(r.err)) assert(false, `${cat}/${lv} stap: ${r.err}`); }
  const r = await api(`/api/session/${s.id}/answer`, { index: 0, answer: good(full) });
  if (!r.correct) assert(false, `${cat}/${lv}: goed antwoord afgekeurd: ${full.text} → ${good(full)}`);
}
assert(true, '14 onderdelen × 4 niveaus: goede antwoorden worden goedgekeurd');

// ---- Denkfout herkennen (Afrikaans) ----
{
  let hit = null;
  for (let k = 0; k < 40 && !hit; k++) {
    await db.query(`UPDATE ${SCHEMA}.skills SET level=3 WHERE cat='persentasie'`);
    await db.query(`UPDATE ${SCHEMA}.sessions SET status='stopped' WHERE status='active'`);
    const s = await api('/api/session/start', { kind: 'practice', cat: 'persentasie' });
    const full = await current(s.id);
    if (/afslag/.test(full.text)) hit = { s, w: full.wrong.find((w) => /afslag, nie die nuwe prys/.test(w.label)) };
  }
  if (hit?.w) {
    const r = await api(`/api/session/${hit.s.id}/answer`, { index: 0, answer: String(hit.w.answer).replace('.', ',') });
    assert(r.misconception && /afslag/.test(r.misconception.label), `denkfout herkend: "${r.misconception?.label}"`);
  } else assert(false, 'afslag-som gevonden');
}

// ---- Hint in het Afrikaans ----
{
  await db.query(`UPDATE ${SCHEMA}.sessions SET status='stopped' WHERE status='active'`);
  const s = await api('/api/session/start', { kind: 'practice', cat: 'deling' });
  const h = await api(`/api/session/${s.id}/hint`, { index: 0 }).catch((e) => ({ err: e.message }));
  const txt = JSON.stringify(h);
  assert(!h.err && /Onthou|deel|keer|res/i.test(txt) && !NLWORD.test(txt), `hint Afrikaans: ${txt.slice(0, 120)}`);
}

// ---- Ouderscherm ----
const ov = await api('/api/parent/overview');
assert(ov.lang === 'af' && ov.country === 'ZA', `ouderscherm volgt de taal van het kind (${ov.lang})`);
const all = await api('/api/parent/all');
const me = all.kids.find((k) => k.name === 'E2E-ZA');
assert(me && me.lang === 'af' && me.teacher === 'Meneer Max' && me.stats.length === 14, 'overzicht: Afrikaans kind met eigen onderdelen');

// ---- Nederlands kind tegelijk: eigen curriculum ----
const nl = (await api('/api/kids', { name: 'E2E-NL', lang: 'nl', country: 'NL', grade: 8, age: 11 })).kid;
st = await api('/api/state');
assert(st.curriculum === 'nl' && st.skills.some((s) => s.cat === 'kommagetallen') && st.teacher === 'Meester Max', 'Nederlands kind houdt het Nederlandse curriculum');
await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' });
void nl;
await api('/api/kids/select', { id: kid.id });
assert((await api('/api/state')).curriculum === 'za', 'terug naar ZA-kind: weer KABV');
await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' });
await db.end();
console.log(failed ? `\n${failed} fout(en)` : '\nAlles klopt ✓');
process.exit(failed ? 1 : 0);
