// The reference queries of Ingenium's publications run on the demonstration database and keep their contract; no migration
// creates, changes or drops a `pub_` view (Matrix M-18).
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { writeAudit } from '@/server/db/helpers';
import { testDatabase, type TestDatabase } from '@/test/db';
import { D18_COLUMNS, PUBLICATIONS } from './definitions';

let t: TestDatabase;
beforeAll(async () => {
  t = await testDatabase();
  await writeAudit(t.db, { actorName: 'Marc Lenoir', actorUserId: null, objectRef: 'HLT-026', change: 'test entry', area: 'Administration' });
  await writeAudit(t.db, { actorName: 'Marc Lenoir', actorUserId: null, objectRef: 'RDP-072', change: 'test entry', area: 'Administration' });
});
afterAll(() => t.close());

describe('publications', () => {
  it('pub_journal keeps the D18 contract and names the project', async () => {
    const r = await t.handle.pool.query(PUBLICATIONS.pub_journal);
    expect(r.fields.map((f) => f.name)).toEqual([...D18_COLUMNS]);
    expect(r.rows.find((x) => x.objet === 'HLT-026')).toMatchObject({ nature: 'audit', projet: 'HLT-026', detail: 'test entry' });
  });
  it('pub_journal never publishes an entry of a confidential project (ING-29)', async () => {
    const r = await t.handle.pool.query(PUBLICATIONS.pub_journal);
    expect(r.rows.some((x) => x.objet === 'RDP-072')).toBe(false);
    const all = await t.handle.pool.query(`select count(*)::int as n from ingenium.audit_entries where object_ref = 'RDP-072'`);
    expect(all.rows[0].n).toBeGreaterThan(0);
  });
  it('no migration touches a pub_ view', () => {
    const dir = path.join(process.cwd(), 'drizzle');
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')))
      expect(fs.readFileSync(path.join(dir, f), 'utf8'), f).not.toMatch(/\b(CREATE|ALTER|DROP|COMMENT ON)\b[^;]*\bVIEW\b[^;]*\bpub_/i);
  });
});
