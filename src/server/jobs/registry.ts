import 'server-only';
// Ingenium's scheduled jobs: the schema backup (when INGENIUM_BACKUP_DIR is set), the hourly read of Keystone's projects and
// engineering teams (INGENIUM_KEYSTONE not off), and the daily schema declaration to Matrix (when MATRIX_URL or
// MATRIX_DECLARATIONS_DIR is set). Business jobs (outboxes to Codex and Vigie, PDM synchronisation, projection of the tasks)
// come with their deliveries.
import path from 'node:path';
import { backupSchema } from '@/server/backup';
import { getConfig } from '@/server/config';
import { declareIngeniumSchema } from '@/server/integrations/matrix';
import { matrixDeclarationEnabled } from '@/server/integrations/matrix/declare-schema';
import type { PostgresHandle } from '@/server/db/postgres';
import type { Job } from './runner';

export function ingeniumJobs(h: PostgresHandle): Job[] {
  const cfg = getConfig();
  return [
    {
      name: 'backup',
      everyMin: cfg.backup.everyMin,
      enabled: !!cfg.backup.dir && !!cfg.database,
      async run() {
        const r = await backupSchema({ databaseUrl: cfg.database!.url, dir: cfg.backup.dir!, retentionDays: cfg.backup.retentionDays });
        return `${path.basename(r.file)}${r.deleted.length ? `, ${r.deleted.length} expired removed` : ''}`;
      },
    },
    {
      // Keystone's projects and engineering teams (docs/spec/05 § 1): the mirror refreshed every hour.
      name: 'keystone-sync',
      everyMin: 60,
      enabled: !!cfg.database && cfg.connectors.keystone !== 'off',
      async run() {
        const { syncKeystone } = await import('@/server/integrations/keystone/sync');
        const r = await syncKeystone(h.db, { mode: cfg.connectors.keystone });
        if (r.outcome !== 'ok') throw new Error(r.message ?? 'Keystone not read');
        return `${r.projects} projects, ${r.members} team members`;
      },
    },
    {
      name: 'matrix-declare',
      everyMin: 1440,
      enabled: matrixDeclarationEnabled(process.env),
      async run() {
        await declareIngeniumSchema((q) => h.pool.query(q).then((r) => r.rows as Record<string, unknown>[]));
      },
    },
  ];
}
