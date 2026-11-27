// The Server Functions of the engineering register on the demonstration database (register held by Ingenium since the seed's
// transfer): rights by discipline, optimistic lock, frozen revisions, append-only history, projection of the tasks. And the
// switch-over itself on a database where Keystone still holds the register (dry run, then applied once).
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RoleKey } from '@/config/roles';
import { registerChecks, registerDeliverables, registerInputs, deliverableRevisions, publishedTasks, transferRuns, users } from '@/server/db/schema';
import type { Viewer } from '@/server/viewer';
import { testDatabase, type TestDatabase } from '@/test/db';

const state: { viewer: Viewer | null } = { viewer: null };
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/server/session', () => ({ getViewer: async () => state.viewer! }));

const { addDeliverableAction, checkStepAction, confirmInputAction, deliverableStepAction, generateOutputAction, raiseCheckAction } = await import('./actions');
const { createFreeTaskAction, moveFreeTaskAction } = await import('@/features/tasks/actions');

let t: TestDatabase;
const as = async (email: string, ...roles: RoleKey[]) => {
  const [u] = await t.db.select().from(users).where(eq(users.email, email));
  state.viewer = { userId: u.id, name: u.name, email, oid: null, initials: 'X', role: roles[0], roles, demo: true };
};
const form = (o: Record<string, string | string[]>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(o)) for (const x of Array.isArray(v) ? v : [v]) fd.append(k, x);
  return fd;
};
const deliverable = async (number: string) => (await t.db.select().from(registerDeliverables).where(and(eq(registerDeliverables.projectCode, 'HLT-026'), eq(registerDeliverables.number, number))))[0];

beforeAll(async () => { t = await testDatabase(); });
afterAll(() => t.close());

describe('deliverables', () => {
  it('an engineer of the discipline freezes; another discipline is refused; the lead proposes the release', async () => {
    await as('ines.barbier@demo.example', 'engineer');
    const sch = await deliverable('SCH-ELE-026');
    expect(await deliverableStepAction(null, form({ project: 'HLT-026', id: sch.id, step: 'freeze', version: String(sch.rowVersion) }))).toEqual({ ok: true });
    await as('claire.renaud@demo.example', 'engineer');
    const bom = await deliverable('BOM-ELE-026');
    expect(await deliverableStepAction(null, form({ project: 'HLT-026', id: bom.id, step: 'freeze', version: '1' }))).toMatchObject({ ok: false, error: 'You do not have the right to do this' });
    await as('ines.barbier@demo.example', 'engineer');
    expect(await deliverableStepAction(null, form({ project: 'HLT-026', id: sch.id, step: 'propose', version: '2' }))).toMatchObject({ ok: false });
    await as('marc.lenoir@demo.example', 'engineering_lead');
    expect(await deliverableStepAction(null, form({ project: 'HLT-026', id: sch.id, step: 'propose', version: '1' }))).toMatchObject({ ok: false, error: 'Someone changed this record in the meantime: reload the page' });
    expect(await deliverableStepAction(null, form({ project: 'HLT-026', id: sch.id, step: 'propose', version: '2' }))).toEqual({ ok: true });
    await as('camille.arnaud@demo.example', 'document_controller');
    expect(await deliverableStepAction(null, form({ project: 'HLT-026', id: sch.id, step: 'release', version: '3' }))).toEqual({ ok: true });
    const after = await deliverable('SCH-ELE-026');
    expect(after).toMatchObject({ status: 'released', revision: 'B', rowVersion: 4 });
    const hist = await t.db.select().from(deliverableRevisions).where(eq(deliverableRevisions.deliverableId, sch.id));
    expect(hist.map((h) => h.status)).toEqual(expect.arrayContaining(['frozen', 'release_proposed', 'released']));
  });
  it('a frozen revision never changes; a new revision starts as a draft; the history is append-only', async () => {
    const sch = await deliverable('SCH-ELE-026');
    await expect(t.handle.pool.query(`update ingenium.register_deliverables set title = 'x' where id = $1`, [sch.id])).rejects.toThrow(/frozen/);
    await expect(t.handle.pool.query(`delete from ingenium.deliverable_revisions where deliverable_id = $1`, [sch.id])).rejects.toThrow(/append-only/);
    await expect(t.handle.pool.query(`delete from ingenium.register_deliverables where id = $1`, [sch.id])).rejects.toThrow(/held by Ingenium/);
    await as('ines.barbier@demo.example', 'engineer');
    expect(await deliverableStepAction(null, form({ project: 'HLT-026', id: sch.id, step: 'revise', version: String(sch.rowVersion) }))).toEqual({ ok: true });
    expect(await deliverable('SCH-ELE-026')).toMatchObject({ status: 'draft', revision: 'C' });
  });
  it('a reader writes nothing; a project outside the scope does not exist', async () => {
    await as('anne.duval@demo.example', 'reader');
    expect(await addDeliverableAction(null, form({ project: 'HLT-026', discipline: 'process', number: 'NOT-HLT-026', title: 'Note', revision: 'A' }))).toMatchObject({ ok: false });
    await as('julien.faure@demo.example', 'designer');
    expect(await addDeliverableAction(null, form({ project: 'RDP-072', discipline: 'process', number: 'NOT-RDP-072', title: 'Note', revision: 'A' }))).toEqual({ ok: false, error: 'Project not found' });
    await as('claire.renaud@demo.example', 'engineer');
    expect(await addDeliverableAction(null, form({ project: 'HLT-026', discipline: 'process', number: 'NOT-HLT-026', title: 'Note de calcul', revision: 'A', recipients: ['mechanical', 'client'] }))).toEqual({ ok: true });
    expect(await deliverable('NOT-HLT-026')).toMatchObject({ status: 'draft', recipients: ['mechanical', 'client'] });
  });
});

describe('inputs, lists and checks', () => {
  it('the discipline confirms an outdated input at the reference revision', async () => {
    await as('julien.faure@demo.example', 'engineer');
    const [i] = await t.db.select().from(registerInputs).where(and(eq(registerInputs.projectCode, 'HLT-026'), eq(registerInputs.consumer, 'mechanical'), eq(registerInputs.documentNumber, 'PID-HLT-026')));
    expect(await confirmInputAction(null, form({ project: 'HLT-026', id: i.id }))).toEqual({ ok: true });
    expect(await confirmInputAction(null, form({ project: 'HLT-026', id: i.id }))).toMatchObject({ ok: false });
  });
  it('a list blocked by an open blocking check cannot be generated; the lead closes the check, then it can', async () => {
    const [k] = await t.db.select().from(registerChecks).where(and(eq(registerChecks.projectCode, 'NDC-031')));
    expect(k).toBeUndefined();
    await as('hugo.lemaire@demo.example', 'engineer');
    expect(await raiseCheckAction(null, form({ project: 'NDC-031', rule: 'electrical-automation', severity: 'blocking', owner: 'automation', title: 'Variable sans E/S' }))).toEqual({ ok: true });
    const [c] = await t.db.select().from(registerChecks).where(eq(registerChecks.projectCode, 'NDC-031'));
    expect(c.number).toBe('C-01');
    expect(await checkStepAction(null, form({ project: 'NDC-031', id: c.id, step: 'resolve', version: '1', note: 'ok' }))).toMatchObject({ ok: false });
    expect(await checkStepAction(null, form({ project: 'NDC-031', id: c.id, step: 'send_back', version: '1' }))).toEqual({ ok: false, error: 'A note is required' });
    await as('marc.lenoir@demo.example', 'engineering_lead');
    const o3 = (await t.handle.pool.query(`select id from ingenium.register_outputs where project_code = 'HLT-026' and number = 'O-03'`)).rows[0];
    expect(await generateOutputAction(null, form({ project: 'HLT-026', id: o3.id }))).toEqual({ ok: false, error: 'Blocked by an open blocking check of the discipline' });
    expect(await checkStepAction(null, form({ project: 'NDC-031', id: c.id, step: 'resolve', version: '1', note: 'Variable ajoutée' }))).toEqual({ ok: true });
  });
});

describe('tasks', () => {
  it('the projection follows the register; a free task moves along the board', async () => {
    const tasks = await t.db.select().from(publishedTasks).where(eq(publishedTasks.recipientEmail, 'marc.lenoir@demo.example'));
    expect(tasks.some((x) => x.type === 'release_proposal')).toBe(true);
    await as('claire.renaud@demo.example', 'engineer');
    expect(await createFreeTaskAction(null, form({ title: 'Relire', project: 'HLT-026', assignee: 'julien.faure@demo.example', priority: 'high' }))).toEqual({ ok: true });
    expect(await createFreeTaskAction(null, form({ title: 'Relire', project: 'HLT-026', assignee: 'nobody@demo.example' }))).toMatchObject({ ok: false });
    const [row] = (await t.db.select().from(publishedTasks).where(eq(publishedTasks.recipientEmail, 'julien.faure@demo.example'))).filter((x) => x.title === 'Relire');
    expect(row).toMatchObject({ state: 'a_faire', priority: 'haute' });
    const id = row.taskId.replace('libre:', '');
    await as('julien.faure@demo.example', 'designer');
    expect(await moveFreeTaskAction(id, 'demarrer')).toEqual({ ok: true });
    expect(await moveFreeTaskAction(id, 'reprendre')).toMatchObject({ ok: false });
    await as('anne.duval@demo.example', 'reader');
    expect(await moveFreeTaskAction(id, 'terminer')).toEqual({ ok: false, error: 'Task not found' });
  });
});

describe('switch-over of the register (production database, Keystone simulated)', () => {
  it('held in Keystone: mirror read only; dry run changes nothing; applied once', async () => {
    const p = await testDatabase({ seed: 'production' });
    const { syncKeystone } = await import('@/server/integrations/keystone/sync');
    const { transferRegister, switchoverOf } = await import('@/server/integrations/keystone/register');
    await syncKeystone(p.db, { mode: 'simulation' });
    const mirrored = await p.db.select().from(registerDeliverables);
    expect(mirrored.length).toBe(16);
    expect(mirrored.every((d) => d.source === 'simulation' && d.importedAt === null)).toBe(true);
    state.viewer = { userId: '00000000-0000-4000-8000-000000000000', name: 'Lead', email: 'lead@demo.example', oid: null, initials: 'L', role: 'engineering_lead', roles: ['engineering_lead'], demo: true };
    expect(await raiseCheckAction(null, form({ project: 'HLT-026', rule: 'revision', severity: 'info', owner: 'process', title: 'x' }))).toEqual({ ok: false, error: 'Held in Keystone until its switch-over to Ingenium: open it in Keystone' });
    const actor = { userId: null, name: 'Admin', role: 'admin' };
    const dry = await transferRegister(p.db, { mode: 'simulation', apply: false, today: '2026-11-24', actor });
    expect(dry).toMatchObject({ ok: true, plan: { counts: { refused: 0 } } });
    expect(await switchoverOf(p.db, 'register')).toBeNull();
    const applied = await transferRegister(p.db, { mode: 'simulation', apply: true, today: '2026-11-24', actor });
    expect(applied.ok).toBe(true);
    expect(await switchoverOf(p.db, 'register')).not.toBeNull();
    expect((await p.db.select().from(registerDeliverables)).every((d) => d.importedAt !== null)).toBe(true);
    expect(await transferRegister(p.db, { mode: 'simulation', apply: true, today: '2026-11-24', actor })).toMatchObject({ ok: false });
    expect((await p.db.select().from(transferRuns)).map((r) => r.mode).sort()).toEqual(['applied', 'dry_run']);
    // After the switch-over the Keystone read never touches the register again.
    await syncKeystone(p.db, { mode: 'simulation' });
    expect((await p.db.select().from(registerDeliverables)).every((d) => d.importedAt !== null)).toBe(true);
    await p.close();
  });
});
