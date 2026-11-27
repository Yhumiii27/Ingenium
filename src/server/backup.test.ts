// Backup and restore of the `ingenium` schema with the real pg_dump / pg_restore, as ingenium_app (no right to create a schema).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auditEntries, disciplines } from '@/server/db/schema';
import { writeAudit } from '@/server/db/helpers';
import { testDatabase, type TestDatabase } from '@/test/db';
import { backupSchema, restoreSchema, splitCredentials } from './backup';

let t: TestDatabase;
let dir: string;
beforeAll(async () => {
  t = await testDatabase();
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ingenium-backup-'));
});
afterAll(async () => {
  await t.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('backup and restore', () => {
  it('keeps the password off the command line', () => {
    expect(splitCredentials('postgres://ingenium_app:s%40cret@db:5432/atrium')).toEqual({ url: 'postgres://ingenium_app@db:5432/atrium', password: 's@cret' });
  });

  it('dumps the schema, prunes old backups, and restores the data as it was', async () => {
    fs.writeFileSync(path.join(dir, 'ingenium-20200101T000000Z.dump'), 'old');
    await writeAudit(t.db, { actorName: 'System', actorUserId: null, objectRef: 'Test', change: 'before backup', area: 'Tests' });
    const { file, deleted } = await backupSchema({ databaseUrl: t.url, role: t.role, dir, retentionDays: 14, now: new Date('2026-10-22T08:00:00Z') });
    expect(path.basename(file)).toBe('ingenium-20261022T080000Z.dump');
    expect(deleted).toEqual(['ingenium-20200101T000000Z.dump']);
    expect(fs.statSync(file).size).toBeGreaterThan(1000);

    await t.db.update(disciplines).set({ label: 'Changed after the backup' }).where(eq(disciplines.code, 'process'));
    await restoreSchema({ databaseUrl: t.url, role: t.role, file });
    expect(await t.db.$count(disciplines, eq(disciplines.label, 'Changed after the backup'))).toBe(0);
    expect(await t.db.$count(disciplines)).toBe(4);
    expect(await t.db.$count(auditEntries, eq(auditEntries.change, 'before backup'))).toBe(1);
    // The append-only trigger came back with the table.
    await expect(t.handle.pool.query(`delete from ingenium.audit_entries`)).rejects.toThrow(/append-only/);
  });
});
