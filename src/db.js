import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL ontbreekt. Lokaal: start eerst "npm run db" en zet de DATABASE_URL in .env');
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
    -- kladblok: wat het kind uitrekende (tekening + tekst) en wat de leraar erin zag
    ALTER TABLE attempts ADD COLUMN IF NOT EXISTS scratch_text text;
    ALTER TABLE attempts ADD COLUMN IF NOT EXISTS scratch_note text;
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
  `);
  for (const k of (await pool.query('SELECT id FROM public.kids')).rows) await migrateKid(k.id);
}

// ---------- kinderen ----------
export const listKids = async () => (await pool.query('SELECT id, name, avatar FROM public.kids ORDER BY id')).rows;
export const getKid = async (id) => (await pool.query('SELECT id, name, avatar FROM public.kids WHERE id=$1', [Number(id) || 0])).rows[0];
export async function createKid(name, avatar) {
  const k = (await pool.query('INSERT INTO public.kids(name, avatar) VALUES ($1,$2) RETURNING id, name, avatar', [name, avatar])).rows[0];
  await migrateKid(k.id);
  return k;
}
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
