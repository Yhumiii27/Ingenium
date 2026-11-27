import { defineConfig } from 'drizzle-kit';

// Ingenium's tables live in the schema `ingenium` (src/server/db/schema/_schema.ts); the journal is ingenium.__drizzle_migrations.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema/index.ts',
  out: './drizzle',
  schemaFilter: ['ingenium'],
  migrations: { schema: 'ingenium', table: '__drizzle_migrations' },
});
