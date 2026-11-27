// The reference queries of Ingenium's publications run on the demonstration database and keep their contract; no migration
// creates, changes or drops a `pub_` view (Matrix M-18).
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { writeAudit } from '@/server/db/helpers';
import { testDatabase, type TestDatabase } from '@/test/db';
import { PUB_TACHES_COLUMNS, rowProblems } from '@norma/charte/ds/task-rules';
import { rebuildPublishedTasks } from '@/server/tasks/projection';
import { AVANCEMENT_COLUMNS, D18_COLUMNS, PUBLICATIONS } from './definitions';

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
  it('pub_taches keeps the contract taches-v1 and publishes only the recipients known to Clavis', async () => {
    const before = await t.handle.pool.query(PUBLICATIONS.pub_taches);
    expect(before.fields.map((f) => f.name)).toEqual([...PUB_TACHES_COLUMNS]);
    expect(before.rows).toEqual([]);
    await t.handle.pool.query(`update ingenium.users set oid = '00000000-0000-4000-8000-0000000000a1' where email = 'marc.lenoir@demo.example'`);
    await t.handle.pool.query(`update ingenium.users set oid = '00000000-0000-4000-8000-0000000000a2' where email = 'claire.renaud@demo.example'`);
    await t.handle.pool.query(`update ingenium.users set oid = '00000000-0000-4000-8000-0000000000a3' where email = 'hugo.lemaire@demo.example'`);
    await t.db.transaction((tx) => rebuildPublishedTasks(tx));
    const r = await t.handle.pool.query(PUBLICATIONS.pub_taches);
    expect(r.rows.length).toBeGreaterThan(3);
    for (const row of r.rows) {
      const shaped = { ...row, personne_id: String(row.personne_id), echeance: row.echeance ? new Date(row.echeance).toISOString().slice(0, 10) : null, maj_le: new Date(row.maj_le).toISOString() };
      expect(rowProblems(shaped), row.tache_id).toEqual([]);
    }
    expect(r.rows.some((x) => x.type === 'release_proposal' && x.nature === 'approbation')).toBe(true);
    // The confidential project's tasks are sensitive: another tool shows their type only.
    const rd = r.rows.filter((x) => x.projet === 'RDP-072');
    expect(rd.length).toBeGreaterThan(0);
    expect(rd.every((x) => x.sensible === true)).toBe(true);
  });
  it('pub_avancement_ingenierie counts the register by project and discipline, without a confidential project', async () => {
    const r = await t.handle.pool.query(PUBLICATIONS.pub_avancement_ingenierie);
    expect(r.fields.map((f) => f.name)).toEqual([...AVANCEMENT_COLUMNS]);
    const elec = r.rows.find((x) => x.projet_code === 'HLT-026' && x.discipline === 'electrical');
    expect(elec).toMatchObject({ livrables: 4, livrables_figes: 1, livrables_diffuses: 0, controles_bloquants: 2 });
    expect(r.rows.some((x) => x.projet_code === 'RDP-072')).toBe(false);
  });
  it('no migration touches a pub_ view', () => {
    const dir = path.join(process.cwd(), 'drizzle');
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')))
      expect(fs.readFileSync(path.join(dir, f), 'utf8'), f).not.toMatch(/\b(CREATE|ALTER|DROP|COMMENT ON)\b[^;]*\bVIEW\b[^;]*\bpub_/i);
  });
});
