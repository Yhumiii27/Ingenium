// The Keystone connector: the simulation fills the mirror, the views are read once granted, a view that cannot be read leaves
// the mirror as it was and records « unavailable »; the project scope of the data layer follows the team.
import { sql } from 'drizzle-orm';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auditEntries, projectMirror, syncRuns, teamMirror } from '@/server/db/schema';
import { testDatabase, TEST_ADMIN_URL, type TestDatabase } from '@/test/db';
import { withDatabase } from '@/server/db/provision';
import { syncKeystone } from './sync';

let t: TestDatabase;
beforeAll(async () => {
  t = await testDatabase();
});
afterAll(() => t.close());

const admin = async (q: string) => {
  const c = new pg.Client({ connectionString: withDatabase(TEST_ADMIN_URL, t.name) });
  await c.connect();
  try {
    await c.query(q);
  } finally {
    await c.end();
  }
};

describe('Keystone connector', () => {
  it('the demonstration seed ran the simulation once', async () => {
    expect(await t.db.$count(projectMirror)).toBe(5);
    expect(await t.db.$count(teamMirror)).toBeGreaterThan(5);
    expect(await t.db.$count(syncRuns)).toBe(1);
  });

  it('views not granted: « unavailable », the mirror kept, the run journalled with who asked', async () => {
    const r = await syncKeystone(t.db, { mode: 'views', requestedBy: { userId: (await t.db.execute(sql`select id from ingenium.users limit 1`)).rows[0].id as string, name: 'Paul Vasseur', role: 'admin' } });
    expect(r.outcome).toBe('unavailable');
    expect(await t.db.$count(projectMirror)).toBe(5);
    const [run] = await t.db.select().from(syncRuns).orderBy(sql`${syncRuns.startedAt} desc`).limit(1);
    expect(run).toMatchObject({ outcome: 'unavailable', rows: 0 });
    expect(await t.db.$count(auditEntries, sql`${auditEntries.area} = 'Connectors'`)).toBe(1);
  });

  it('views granted: the projects and teams of Keystone replace the mirror, with the e-mails of the directory', async () => {
    await admin(`create schema keystone; create schema clavis;
      create table keystone.pub_projets (code text, numero text, nom text, client text, phase text, imputable boolean);
      create table keystone.pub_affectations (source text, affectation_id text, matricule text, personne_nom text, projet_code text, activite text);
      create table clavis.pub_personnes (matricule text, email text);
      insert into keystone.pub_projets values ('ABC-001', '#101', 'Projet A', 'Client A', 'Études', true), ('bad', null, 'x', null, null, true);
      insert into keystone.pub_affectations values ('planning', '1', 'M1', 'Personne Un', 'ABC-001', 'Ingénierie électrique'), ('planning', '2', 'M2', 'Personne Deux', 'ZZZ-999', 'x');
      insert into clavis.pub_personnes values ('M1', 'personne.un@demo.example');
      grant usage on schema keystone, clavis to ingenium_app;
      grant select on all tables in schema keystone to ingenium_app; grant select on all tables in schema clavis to ingenium_app;`);
    const r = await syncKeystone(t.db, { mode: 'views' });
    expect(r).toMatchObject({ outcome: 'ok', projects: 1, members: 1 });
    expect(await t.db.select().from(projectMirror)).toMatchObject([{ code: 'ABC-001', designOfficeNumber: '#101', source: 'keystone' }]);
    expect(await t.db.select().from(teamMirror)).toMatchObject([{ email: 'personne.un@demo.example', discipline: 'electrical', assignment: 'planning:1' }]);
  });

  it('off: nothing read, nothing recorded', async () => {
    const before = await t.db.$count(syncRuns);
    expect((await syncKeystone(t.db, { mode: 'off' })).outcome).toBe('off');
    expect(await t.db.$count(syncRuns)).toBe(before);
  });

  it('the database refuses a mirror row of the wrong shape', async () => {
    await expect(t.db.insert(projectMirror).values({ code: 'abc', name: 'x', open: true, source: 'simulation', syncedAt: new Date() })).rejects.toThrow();
    await expect(t.db.insert(projectMirror).values({ code: 'ABC-002', name: 'x', open: true, source: 'other', syncedAt: new Date() })).rejects.toThrow();
  });
});
