// Local-only convenience: boots a self-contained PostgreSQL (no Docker, no cloud)
// on port 5433 for previewing the app. Not part of the app; installed with --no-save.
import EmbeddedPostgres from 'embedded-postgres';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.join(__dirname, '..', '.pgdata');

const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'bizznex',
  password: 'bizznex',
  port: 5433,
  persistent: true,
});

async function main() {
  try {
    await pg.initialise();
  } catch {
    /* already initialised */
  }
  await pg.start();
  try {
    await pg.createDatabase('bizznex');
  } catch {
    /* database already exists */
  }
  console.log('LOCAL_DB_READY postgresql://bizznex:bizznex@localhost:5433/bizznex');
  // keep the process (and Postgres) alive
  setInterval(() => {}, 1 << 30);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

const stop = async () => {
  try { await pg.stop(); } catch {}
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
