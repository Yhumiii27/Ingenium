// npm run db:local — creates Ingenium's database on a developer's PostgreSQL server: database `ingenium_dev` (INGENIUM_LOCAL_DATABASE),
// role ingenium_app (password INGENIUM_LOCAL_PASSWORD, default "ingenium-dev") and schema `ingenium`, the layout of the shared Atrium
// server (Matrix). Connects with INGENIUM_ADMIN_URL (a superuser; default postgres://postgres:postgres@127.0.0.1:5432/postgres)
// and prints the DATABASE_URL to put in .env.local. Then: npm run db:migrate. Never run it against the shared server: there,
// Matrix's base layer creates the role and the schema.
import pg from 'pg';
import { loadEnvFiles } from '@/server/config/env-files';
import { appUrlOf, provisionDatabase, provisionSchema, withDatabase } from '@/server/db/provision';

async function main(): Promise<void> {
  loadEnvFiles(process.cwd());
  const adminUrl = process.env.INGENIUM_ADMIN_URL || 'postgres://postgres:postgres@127.0.0.1:5432/postgres';
  const database = process.env.INGENIUM_LOCAL_DATABASE || 'ingenium_dev';
  const password = process.env.INGENIUM_LOCAL_PASSWORD || 'ingenium-dev';
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await provisionDatabase(admin, { database, password });
  } finally {
    await admin.end();
  }
  const inDb = new pg.Client({ connectionString: withDatabase(adminUrl, database) });
  await inDb.connect();
  try {
    await provisionSchema(inDb);
  } finally {
    await inDb.end();
  }
  console.log(`Database "${database}" ready (role ingenium_app, schema ingenium).\nDATABASE_URL=${appUrlOf(adminUrl, database, password)}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
