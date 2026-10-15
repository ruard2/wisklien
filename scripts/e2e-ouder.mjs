// LET OP: maakt testkinderen aan en verwijdert ze weer. Alleen lokaal gebruiken.
// Test van de ouder-instellingen: beloning, weekplan, ouderwachtwoord.
import '../src/env.js';
import pg from 'pg';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
// elke "browser" een eigen koekjestrommel
function client() {
  const jar = {};
  return async function api(path, body) {
    const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
    const r = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const [k, ...v] = kv.split('='); jar[k] = v.join('='); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(`${path} → ${r.status} ${JSON.stringify(j)}`); e.status = r.status; throw e; }
    return j;
  };
}
let failed = 0;
const assert = (c, m) => { if (!c) { failed++; console.error('✗', m); } else console.log('✓', m); };
const fails = async (p, m) => { try { await p; assert(false, m); } catch (e) { assert(true, `${m} (${e.status})`); } };

const admin = client();
await admin('/api/parent/login', { password: process.env.PARENT_PIN || '1234' });
for (const k of (await admin('/api/kids')).kids.filter((k) => /^E2E-OUDER/.test(k.name))) { await admin('/api/kids/select', { id: k.id }); await admin('/api/parent/delete-kid', { confirm: 'VERWIJDER' }); }

// ---- profiel + ouder-instellingen in één keer (zoals in de app: stap 1 kind, stap 2 ouder) ----
const home = client();
await fails(home('/api/kids', { name: 'E2E-OUDER', lang: 'nl', country: 'NL', grade: 8, age: 11, setup: { dailyCents: 99999 } }), 'te groot bedrag geweigerd');
await fails(home('/api/kids', { name: 'E2E-OUDER', lang: 'nl', country: 'NL', grade: 8, age: 11, setup: { days: [] } }), 'geen enkele dag geweigerd');
await fails(home('/api/kids', { name: 'E2E-OUDER', lang: 'nl', country: 'NL', grade: 8, age: 11, setup: { password: 'abc' } }), 'te kort wachtwoord geweigerd');
const all7 = [0, 1, 2, 3, 4, 5, 6];
const kid = (await home('/api/kids', { name: 'E2E-OUDER', lang: 'nl', country: 'NL', grade: 8, age: 11,
  setup: { dailyCents: 100, intakeCents: 200, weekBonusCents: 0, dailyCount: 10, days: all7, password: 'geheim123', surprise: { enabled: true, rewards: ['🎬 Samen naar de film'] } } })).kid;
const SCHEMA = `kid_${kid.id}`;
let st = await home('/api/state');
assert(st.points.daily === 100 && st.points.intake === 200 && st.points.dailyCount === 10 && st.points.daysPerWeek === 7, `beloning uit de instellingen (${JSON.stringify(st.points)})`);
assert(st.today.schoolDay === true, 'elke dag een dagtaak → vandaag ook');
assert(st.week.days.length === 7 && st.week.bonus === 0, `week van 7 dagen, geen weekbonus (${st.week.days.length})`);
assert(!JSON.stringify(await (await fetch(BASE + '/api/kids')).json()).includes('parent_pw'), 'wachtwoord(hash) gaat nooit naar de app');
const pwRow = (await db.query('SELECT parent_pw FROM public.kids WHERE id=$1', [kid.id])).rows[0].parent_pw;
assert(pwRow && !pwRow.includes('geheim123'), 'wachtwoord gehasht opgeslagen');
const sc = (await db.query(`SELECT value FROM ${SCHEMA}.settings WHERE key='surprise_cfg'`)).rows[0]?.value;
assert(sc?.rewards?.[0] === '🎬 Samen naar de film', 'eigen verrassing opgeslagen');

// ---- ouderscherm alleen met het juiste wachtwoord ----
await fails(home('/api/parent/overview'), 'ouderscherm dicht zonder inloggen');
await fails(home('/api/parent/login', { password: 'fout' }), 'verkeerd wachtwoord geweigerd');
await fails(home('/api/parent/login', { password: '0000' }).then(() => home('/api/parent/overview')), 'andere pincode opent dit kind niet');
if (process.env.PARENT_PIN !== '1234') await fails(home('/api/parent/login', { password: '1234' }).then(() => home('/api/parent/overview')), 'standaardpincode opent dit kind niet');
await home('/api/parent/login', { password: 'geheim123' });
const ov = await home('/api/parent/overview');
assert(ov.hasPassword && ov.rewards.dailyCount === 10, 'met eigen wachtwoord: ouderscherm open, instellingen zichtbaar');
const allMine = await home('/api/parent/all');
assert(allMine.kids.length === 1 && allMine.kids[0].name === 'E2E-OUDER', `overzicht toont alleen de eigen kinderen (${allMine.kids.map((k) => k.name)})`);

// ---- een tweede kind van een ander gezin: deze ouder komt er niet in ----
const other = client();
const kid2 = (await other('/api/kids', { name: 'E2E-OUDER-B', lang: 'af', country: 'ZA', grade: 6, age: 11, setup: { password: 'anderwagwoord' } })).kid;
await home('/api/kids/select', { id: kid2.id });
await fails(home('/api/parent/overview'), 'ouder A kan het ouderscherm van kind B niet openen');
await home('/api/kids/select', { id: kid.id });

// ---- dagtaak volgt de instellingen ----
await db.query(`UPDATE ${SCHEMA}.sessions SET status='done' WHERE kind='intake'`).catch(() => {});
await db.query(`INSERT INTO ${SCHEMA}.sessions(kind, day, questions, total, max_points, plan, state, status) VALUES ('intake', CURRENT_DATE, '[]', 21, 0, '[]', '{}', 'done')`);
const d = await home('/api/session/start', { kind: 'daily' });
assert(d.total === 10, `dagtaak heeft 10 sommen (${d.total})`);
const row = (await db.query(`SELECT max_points FROM ${SCHEMA}.sessions WHERE id=$1`, [d.id])).rows[0];
assert(row.max_points === 100, `dagtaak levert max 100 cent op (${row.max_points})`);

// ---- later aanpassen via het ouderscherm ----
await fails(home('/api/parent/rewards', { dailyCount: 7 }), 'onbekend aantal sommen geweigerd');
await home('/api/parent/rewards', { dailyCents: 0, dailyCount: 25, days: [1, 3, 5], weekBonusCents: 50 });
st = await home('/api/state');
assert(st.points.daily === 0 && st.points.dailyCount === 25 && st.week.days.length === 3 && st.week.bonus === 50, `aangepast: zonder geld, 25 sommen, ma/wo/vr (${JSON.stringify(st.points)})`);
assert(st.week.days.every((x) => [1, 3, 5].includes(x.dow)), 'week toont alleen ma, wo, vr');
await fails(home('/api/parent/password', { password: 'nieuwwachtwoord', password2: 'anders' }), 'wachtwoorden moeten gelijk zijn');
await home('/api/parent/password', { password: 'nieuwwachtwoord', password2: 'nieuwwachtwoord' });
const fresh = client();
await fresh('/api/kids/select', { id: kid.id });
await fails(fresh('/api/parent/login', { password: 'geheim123' }), 'oud wachtwoord werkt niet meer');
await fresh('/api/parent/login', { password: 'nieuwwachtwoord' });
assert((await fresh('/api/parent/overview')).name === 'E2E-OUDER', 'nieuw wachtwoord werkt');

// ---- overslaan = standaard ----
const skip = client();
const kid3 = (await skip('/api/kids', { name: 'E2E-OUDER-C', lang: 'nl', country: 'NL', grade: 7, age: 10 })).kid;
st = await skip('/api/state');
assert(st.points.daily === 50 && st.points.dailyCount === 20 && st.week.bonus === 25, 'overgeslagen: standaardbeloning');

// opruimen (beheerder mag alles)
for (const id of [kid.id, kid2.id, kid3.id]) { await admin('/api/kids/select', { id }); await admin('/api/parent/delete-kid', { confirm: 'VERWIJDER' }); }
await db.end();
console.log(failed ? `\n${failed} fout(en)` : '\nAlles klopt ✓');
process.exit(failed ? 1 : 0);
