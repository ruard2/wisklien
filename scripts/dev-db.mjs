// Lokale Postgres zonder Docker (alleen voor ontwikkeling).
// Start met: npm run db  — en laat dit in een apart terminalvenster draaien.
// Productie (Railway) gebruikt zijn eigen Postgres via DATABASE_URL.
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const port = Number(process.env.DEV_DB_PORT || 5440);
const dataDir = join(process.cwd(), '.pgdata');
const fresh = !existsSync(join(dataDir, 'PG_VERSION'));

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'rekenen',
  password: 'rekenen',
  port,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: () => {},
  onError: (m) => console.error('[db]', String(m).trim()),
});

if (fresh) {
  console.log('[db] Nieuwe database-map wordt gemaakt in .pgdata …');
  await pg.initialise();
}
try {
  await pg.start();
} catch (e) {
  console.error(`[db] Kon niet starten. Draait Postgres al op poort ${port}? (${e?.message ?? e})`);
  console.error('[db] Zo niet: verwijder .pgdata/postmaster.pid en probeer opnieuw.');
  process.exit(1);
}

const client = pg.getPgClient();
await client.connect();
const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'rekenen'");
if (res.rowCount === 0) {
  await client.query("CREATE DATABASE rekenen ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0");
  console.log("[db] Database 'rekenen' gemaakt.");
}
await client.end();

console.log(`[db] Postgres draait op poort ${port}.`);
console.log(`[db] DATABASE_URL="postgresql://rekenen:rekenen@localhost:${port}/rekenen"`);
console.log('[db] Ctrl+C om te stoppen.');

async function stop() {
  console.log('\n[db] Stoppen …');
  await pg.stop();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30);
