import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Tests run on PostgreSQL (src/test/db.ts: one fresh database per file on INGENIUM_TEST_ADMIN_URL's server). DATABASE_URL is a
// placeholder the configuration requires; the tests point getDb() at their own database. INGENIUM_AUTH empty: demo mode (the
// Entra tests set it themselves); MATRIX_URL / MATRIX_DECLARATIONS_DIR blank: the tests declare nothing to Matrix.
// INGENIUM_CLOCK pinned to the demo data set's date, Tue 24 Nov 2026 (unset is the real clock).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: { DATABASE_URL: 'postgres://ingenium_app:unused@127.0.0.1:5432/ingenium_unused', INGENIUM_AUTH: '', INGENIUM_CLOCK: '2026-11-24', INGENIUM_SEED: '', MATRIX_URL: '', MATRIX_DECLARATIONS_DIR: '' },
  },
  resolve: { alias: { '@norma': path.resolve(__dirname, 'norma'), '@': path.resolve(__dirname, 'src'), 'server-only': path.resolve(__dirname, 'src/test/server-only-stub.ts') } },
});
