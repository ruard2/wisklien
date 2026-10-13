import pg from 'pg';

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
  max: 5,
});

export const q = (text, params) => pool.query(text, params);
export const one = async (text, params) => (await pool.query(text, params)).rows[0];

export async function migrate() {
  await q(`
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
  `);
}

export async function getSetting(key, fallback = null) {
  const r = await one('SELECT value FROM settings WHERE key = $1', [key]);
  return r ? r.value : fallback;
}
export async function setSetting(key, value) {
  await q('INSERT INTO settings(key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, JSON.stringify(value)]);
}
