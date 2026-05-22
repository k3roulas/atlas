import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../../.env');

// Load .env manually before anything else
const { config } = await import('dotenv');
config({ path: envPath });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

// Parse the database name and construct a URL to the 'postgres' db
const url = new URL(DATABASE_URL);
const dbName = url.pathname.slice(1);
url.pathname = '/postgres';
const adminUrl = url.toString();

async function reset() {
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();

  try {
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [dbName]
    );
    await client.query(`DROP DATABASE IF EXISTS ${client.escapeIdentifier(dbName)}`);
    console.log(`Dropped database: ${dbName}`);

    await client.query(`CREATE DATABASE ${client.escapeIdentifier(dbName)}`);
    console.log(`Created database: ${dbName}`);
  } finally {
    await client.end();
  }

  const dbClient = new pg.Client({ connectionString: DATABASE_URL });
  await dbClient.connect();
  try {
    await dbClient.query('CREATE EXTENSION IF NOT EXISTS postgis');
    console.log('Enabled PostGIS extension');
  } finally {
    await dbClient.end();
  }
}

reset().catch((err) => {
  console.error('Reset failed:', err.message);
  process.exit(1);
});
