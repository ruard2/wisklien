import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';

// DATABASE_URL, of (Railway) de private variant, of de losse PG-variabelen van de Postgres-service
const E = process.env;
const url = E.DATABASE_URL || E.DATABASE_PRIVATE_URL || E.DATABASE_PUBLIC_URL || E.POSTGRES_URL
  || (E.PGHOST && E.PGUSER ? `postgresql://${encodeURIComponent(E.PGUSER)}:${encodeURIComponent(E.PGPASSWORD || '')}@${E.PGHOST}:${E.PGPORT || 5432}/${E.PGDATABASE || 'railway'}` : '');
if (!url) {
  const seen = Object.keys(E).filter((k) => /PG|POSTGRES|DATABASE/i.test(k));
  console.error('DATABASE_URL ontbreekt. Lokaal: start eerst "npm run db" en zet de DATABASE_URL in .env.');
  console.error(`Railway: voeg bij de app-service een variabele DATABASE_URL toe met waarde \${{Postgres.DATABASE_URL}}. Gevonden databasevariabelen: ${seen.length ? seen.join(', ') : '(geen)'}`);
  process.exit(1);
}

// datums (type 1082) als 'YYYY-MM-DD'-tekst teruggeven, niet als Date (tijdzone-gedoe)
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({
  connectionString: url,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: 8,
});

// ---------- per kind een eigen schema ----------
// Elk kind krijgt een eigen PostgreSQL-schema (kid_<id>) met dezelfde tabellen.
// Het kind van het huidige verzoek staat in kidStore; alle queries gaan automatisch naar dat schema.
export const kidStore = new AsyncLocalStorage();
export const currentKid = () => kidStore.getStore()?.kid ?? null;
// Curriculum en taal van het kind van dit verzoek: 'nl' (Nederland) of 'za' (Suid-Afrika, KABV, Afrikaans)
export const currentCur = () => kidStore.getStore()?.cur || 'nl';
export const currentLang = () => kidStore.getStore()?.lang || 'nl';
export const curOfKid = (k) => (k?.lang === 'af' ? 'za' : 'nl');
export const kidContext = (k) => ({ kid: k.id, name: k.name, cur: curOfKid(k), lang: k.lang || 'nl', country: k.country || 'NL', demo: !!k.demo });
const schemaOf = (kid) => `kid_${Number(kid)}`;

// Verbinding met het schema van het huidige kind (en daarna netjes terugzetten)
export async function connect(kid = currentKid()) {
  const client = await pool.connect();
  await client.query(`SET search_path TO ${kid ? schemaOf(kid) + ', ' : ''}public`);
  const release = client.release.bind(client);
  client.release = async () => {
    try { await client.query('SET search_path TO public'); } catch {}
    release();
  };
  return client;
}
export async function q(text, params) {
  const kid = currentKid();
  if (!kid) return pool.query(text, params);
  const client = await connect(kid);
  try { return await client.query(text, params); } finally { await client.release(); }
}
export const one = async (text, params) => (await q(text, params)).rows[0];

const KID_TABLES = `
    CREATE TABLE IF NOT EXISTS settings (
      key text PRIMARY KEY,
      value jsonb NOT NULL
    );
    CREATE TABLE IF NOT EXISTS skills (
      cat text PRIMARY KEY,
      level int NOT NULL DEFAULT 1,
      mastery real NOT NULL DEFAULT 40,
      level_attempts int NOT NULL DEFAULT 0,
      attempts int NOT NULL DEFAULT 0,
      correct int NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id serial PRIMARY KEY,
      kind text NOT NULL,              -- intake | daily | practice
      day date NOT NULL,
      questions jsonb NOT NULL,
      results jsonb NOT NULL DEFAULT '[]',
      status text NOT NULL DEFAULT 'active',
      correct int NOT NULL DEFAULT 0,
      total int NOT NULL,
      points int NOT NULL DEFAULT 0,
      max_points int NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      finished_at timestamptz
    );
    CREATE INDEX IF NOT EXISTS sessions_day ON sessions(day, kind);
    CREATE TABLE IF NOT EXISTS attempts (
      id serial PRIMARY KEY,
      session_id int REFERENCES sessions(id) ON DELETE CASCADE,
      cat text NOT NULL,
      level int NOT NULL,
      correct boolean NOT NULL,
      hints int NOT NULL DEFAULT 0,
      time_ms int,
      given text,
      text text,
      display text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS attempts_cat ON attempts(cat, created_at);
    CREATE TABLE IF NOT EXISTS skill_snapshots (
      day date NOT NULL,
      cat text NOT NULL,
      score real NOT NULL,
      PRIMARY KEY (day, cat)
    );
    CREATE TABLE IF NOT EXISTS ledger (
      id serial PRIMARY KEY,
      cents int NOT NULL,
      kind text NOT NULL,             -- earn | payout
      note text,
      session_id int,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS ai_cache (
      key text PRIMARY KEY,
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS badges (
      id text PRIMARY KEY,
      earned_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE skills ADD COLUMN IF NOT EXISTS recent jsonb NOT NULL DEFAULT '[]';
    ALTER TABLE skills ADD COLUMN IF NOT EXISTS scaffold int NOT NULL DEFAULT 0;
    ALTER TABLE skills ADD COLUMN IF NOT EXISTS guided_wins int NOT NULL DEFAULT 0;
    ALTER TABLE skills ADD COLUMN IF NOT EXISTS solo_bonus int NOT NULL DEFAULT 0;
    ALTER TABLE skills ADD COLUMN IF NOT EXISTS transition_seen boolean NOT NULL DEFAULT false;
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS plan jsonb NOT NULL DEFAULT '[]';
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS state jsonb NOT NULL DEFAULT '{}';
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS points_acc real NOT NULL DEFAULT 0;
    ALTER TABLE attempts ADD COLUMN IF NOT EXISTS guided boolean NOT NULL DEFAULT false;
    ALTER TABLE attempts ADD COLUMN IF NOT EXISTS mult real NOT NULL DEFAULT 1;
    ALTER TABLE skills ADD COLUMN IF NOT EXISTS ai_note text;
    ALTER TABLE skills ADD COLUMN IF NOT EXISTS ai_note_at timestamptz;
    ALTER TABLE skills ADD COLUMN IF NOT EXISTS ex_level int NOT NULL DEFAULT -1;
    ALTER TABLE skills ADD COLUMN IF NOT EXISTS calib int NOT NULL DEFAULT 0;
    ALTER TABLE attempts ADD COLUMN IF NOT EXISTS misconception text;
    -- foutenschrift: fouten komen na 1, 3 en 7 dagen terug
    CREATE TABLE IF NOT EXISTS reviews (
      id serial PRIMARY KEY,
      cat text NOT NULL,
      level int NOT NULL,
      shape text NOT NULL,
      text text,
      box int NOT NULL DEFAULT 1,
      due date NOT NULL,
      done boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_at timestamptz
    );
    CREATE INDEX IF NOT EXISTS reviews_due ON reviews(done, due);
    -- starttoets is ingekort van 40 naar 21 sommen: lopende oude starttoetsen ook inkorten (wat al gedaan is telt mee)
    UPDATE sessions SET total = GREATEST(21, jsonb_array_length(results) + 1),
      plan = (SELECT jsonb_agg(e ORDER BY i) FROM jsonb_array_elements(plan) WITH ORDINALITY t(e, i) WHERE i <= GREATEST(21, jsonb_array_length(results) + 1))
      WHERE kind = 'intake' AND status = 'active' AND total = 40;
    -- kladblok: wat het kind uitrekende (tekening + tekst) en wat de leraar erin zag
    ALTER TABLE attempts ADD COLUMN IF NOT EXISTS scratch_text text;
    ALTER TABLE attempts ADD COLUMN IF NOT EXISTS scratch_note text;
    -- voor de signalen: hoeveel stappen, verhaaltjessom?, welke tussenstappen gingen mis
    ALTER TABLE attempts ADD COLUMN IF NOT EXISTS nsteps int;
    ALTER TABLE attempts ADD COLUMN IF NOT EXISTS word boolean;
    ALTER TABLE attempts ADD COLUMN IF NOT EXISTS step_errors jsonb;
    -- welke uitleg-vorm Max gebruikte, en of de volgende som van dat onderdeel daarna goed ging
    CREATE TABLE IF NOT EXISTS explanations (
      id serial PRIMARY KEY,
      cat text NOT NULL,
      form text NOT NULL,
      session_id int,
      idx int,
      outcome boolean,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS scratch (
      session_id int NOT NULL,
      idx int NOT NULL,
      image text,
      text text,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (session_id, idx)
    );
`;

export async function migrateKid(kid) {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schemaOf(kid)}`);
  const client = await connect(kid);
  try { await client.query(KID_TABLES); } finally { await client.release(); }
}

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.kids (
      id serial PRIMARY KEY,
      name text NOT NULL,
      avatar text NOT NULL DEFAULT '🙂',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    -- profiel: taal (nl/af), land (NL/ZA), groep of graad, leeftijd
    ALTER TABLE public.kids ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'nl';
    ALTER TABLE public.kids ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'NL';
    ALTER TABLE public.kids ADD COLUMN IF NOT EXISTS grade int;
    ALTER TABLE public.kids ADD COLUMN IF NOT EXISTS age int;
    ALTER TABLE public.kids ADD COLUMN IF NOT EXISTS parent_pw text;
    -- demo-kind (knop "Bekijk de demo"): staat niet in de kindlijst en wordt na een tijdje opgeruimd
    ALTER TABLE public.kids ADD COLUMN IF NOT EXISTS demo boolean NOT NULL DEFAULT false;
    -- welke kinderen op welk toestel speelden (zodat "Wie ben jij?" alleen die laat zien)
    CREATE TABLE IF NOT EXISTS public.device_kids (
      device text NOT NULL, kid_id int NOT NULL REFERENCES public.kids(id) ON DELETE CASCADE,
      eerst timestamptz NOT NULL DEFAULT now(), laatst timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (device, kid_id)
    );
  `);
  for (const k of (await pool.query('SELECT id FROM public.kids')).rows) await migrateKid(k.id);
}

// ---------- kinderen ----------
const KID_COLS = 'id, name, avatar, lang, country, grade, age, demo';
export const listKids = async () => (await pool.query(`SELECT ${KID_COLS} FROM public.kids WHERE NOT demo ORDER BY id`)).rows;
export const getKid = async (id) => (await pool.query(`SELECT ${KID_COLS} FROM public.kids WHERE id=$1`, [Number(id) || 0])).rows[0];
export async function createKid(name, avatar, { lang = 'nl', country = 'NL', grade = null, age = null, demo = false } = {}) {
  const k = (await pool.query(`INSERT INTO public.kids(name, avatar, lang, country, grade, age, demo) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${KID_COLS}`,
    [name, avatar, lang, country, grade, age, demo])).rows[0];
  await migrateKid(k.id);
  return k;
}
export async function updateKidProfile(id, { lang, country, grade, age }) {
  await pool.query(`UPDATE public.kids SET lang=COALESCE($2, lang), country=COALESCE($3, country), grade=COALESCE($4, grade), age=COALESCE($5, age) WHERE id=$1`,
    [id, lang ?? null, country ?? null, grade ?? null, age ?? null]);
}
// Ouderwachtwoord per kind (gehasht; nooit in KID_COLS, zodat het nergens meegestuurd wordt)
export async function setKidPassword(id, hash) { await pool.query('UPDATE public.kids SET parent_pw=$2 WHERE id=$1', [id, hash]); }
export const kidPasswords = async () => (await pool.query('SELECT id, parent_pw FROM public.kids WHERE parent_pw IS NOT NULL')).rows;
export const kidHasPassword = async (id) => !!(await pool.query('SELECT 1 FROM public.kids WHERE id=$1 AND parent_pw IS NOT NULL', [id])).rows[0];
export async function renameKid(id, name) { await pool.query('UPDATE public.kids SET name=$2 WHERE id=$1', [id, name]); }
export async function deleteKid(id) {
  await pool.query(`DROP SCHEMA IF EXISTS ${schemaOf(id)} CASCADE`);
  await pool.query('DELETE FROM public.kids WHERE id=$1', [id]);
}

// Instellingen staan in het schema van het kind (dus per kind)
export async function getSetting(key, fallback = null) {
  const r = await one('SELECT value FROM settings WHERE key = $1', [key]);
  return r ? r.value : fallback;
}
export async function setSetting(key, value) {
  await q('INSERT INTO settings(key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, JSON.stringify(value)]);
}
