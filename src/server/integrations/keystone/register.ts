import 'server-only';
// Keystone's engineering register (docs/spec/06, ING-26; lot 2a): read in the temporary transfer view
// keystone.pub_reprise_registre_ingenierie (requests DI-K2, DI-M2; mode `views`) or in the demonstration's simulation
// (./register-demo.ts). One source per object: until the register's switch-over the connector rewrites the mirror rows
// (source keystone | simulation) on each read and every Server Function of the register refuses to write; the switch-over is a
// transfer run applied once (dry run first), after which the connector never touches the register again and Ingenium is its only
// writer. A view that cannot be read is a state: the mirror keeps its rows. Never writes to Keystone.
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { planRegisterTransfer, type RegisterPlan, type RegisterRecords, type TransferObject } from '@/domain/transfer';
import type { ConnectorMode } from '@/domain/vocab';
import { writeAudit } from '@/server/db/helpers';
import {
  consistencyRules, deliverableRevisions, objectSwitchovers, projectMirror, registerChanges, registerChecks, registerDeliverables,
  registerInputs, registerOutputs, transferRuns,
} from '@/server/db/schema';
import type { DB, Tx } from '@/server/db/types';
import { log } from '@/server/log';
import { simulatedKeystoneRegister } from './register-demo';

export const REGISTER_VIEW = 'keystone.pub_reprise_registre_ingenierie';
const MIRRORED = ['keystone', 'simulation'] as const;

type Q = DB | Tx;

/** The switch-over of an object, or null while Keystone holds it. */
export async function switchoverOf(q: Q, object: TransferObject) {
  const [row] = await q.select().from(objectSwitchovers).where(eq(objectSwitchovers.object, object)).limit(1);
  return row ?? null;
}

/** The rows of the transfer view (throws when it cannot be read). */
export async function readRegisterRows(q: Q, mode: Exclude<ConnectorMode, 'off'>, today: string): Promise<Record<string, unknown>[]> {
  if (mode === 'simulation') return simulatedKeystoneRegister(today);
  const r = await q.execute(sql.raw(`select nature, projet_code, keystone_id, donnees from ${REGISTER_VIEW}`));
  return r.rows as Record<string, unknown>[];
}

async function planOf(q: Q, rows: Record<string, unknown>[]): Promise<RegisterPlan> {
  const projects = new Set((await q.select({ code: projectMirror.code }).from(projectMirror)).map((p) => p.code));
  const rules = new Set((await q.select({ code: consistencyRules.code }).from(consistencyRules)).map((r) => r.code));
  return planRegisterTransfer(rows, projects, rules);
}

/** Replaces the mirror rows of the register with `records` (in the caller's transaction). `importedAt`: the applied transfer. */
export async function writeRegisterMirror(tx: Tx, records: RegisterRecords, source: 'keystone' | 'simulation', at: Date, importedAt: Date | null = null): Promise<void> {
  for (const t of [registerChecks, registerOutputs, registerInputs, registerChanges] as const) await tx.delete(t).where(inArray(t.source, [...MIRRORED]));
  await tx.delete(registerDeliverables).where(inArray(registerDeliverables.source, [...MIRRORED]));
  let pos = (await tx.select({ n: sql<number>`coalesce(max(${consistencyRules.position}), 0)::int` }).from(consistencyRules))[0].n;
  for (const r of records.rules) await tx.insert(consistencyRules).values({ code: r.code, label: r.label, position: ++pos }).onConflictDoNothing();
  const common = { source, keystoneId: null as string | null, importedAt, createdAt: at, updatedAt: at };
  for (const i of records.inputs)
    await tx.insert(registerInputs).values({
      ...common, keystoneId: i.keystoneId, projectCode: i.projectCode, consumer: i.consumer, documentNumber: i.documentNumber, externalParty: i.externalParty,
      externalTitle: i.externalTitle, revisionInUse: i.revisionInUse, acknowledgedAt: i.acknowledged ? at : null, acknowledgedByName: i.acknowledged ? 'Keystone' : null,
    });
  for (const d of records.deliverables) {
    const [row] = await tx.insert(registerDeliverables).values({
      ...common, keystoneId: d.keystoneId, projectCode: d.projectCode, number: d.number, title: d.title, discipline: d.discipline, equipmentRef: d.equipmentRef,
      revision: d.revision, status: d.status, issuedOn: d.issuedOn, authorName: d.authorName, recipients: d.recipients,
    }).returning({ id: registerDeliverables.id });
    // The history of an imported deliverable starts with its state at the transfer (the mirror keeps none: it is rewritten).
    if (importedAt) await tx.insert(deliverableRevisions).values({ deliverableId: row.id, revision: d.revision, status: d.status, occurredAt: importedAt, byName: 'Keystone' });
  }
  for (const o of records.outputs)
    await tx.insert(registerOutputs).values({
      ...common, keystoneId: o.keystoneId, projectCode: o.projectCode, number: o.number, discipline: o.discipline, name: o.name, recipients: o.recipients,
      sourceDeliverable: o.sourceDeliverable, sourceText: o.sourceText, generatedAt: o.generatedAt ? new Date(o.generatedAt) : null,
      generatedByName: o.generatedByName, generatedFromRevision: o.generatedFromRevision,
    });
  for (const c of records.checks)
    await tx.insert(registerChecks).values({
      ...common, keystoneId: c.keystoneId, projectCode: c.projectCode, number: c.number, ruleCode: c.ruleCode, severity: c.severity, title: c.title, detail: c.detail,
      owner: c.owner, status: c.status, note: c.note, closedAt: c.closedByName ? (c.closedAt ? new Date(c.closedAt) : at) : null, closedByName: c.closedByName, raisedByName: 'Keystone',
    });
  for (const c of records.changes)
    await tx.insert(registerChanges).values({ projectCode: c.projectCode, occurredOn: c.occurredOn, kind: 'note', text: c.text, recipients: c.recipients, byName: 'Keystone', source, createdAt: at });
}

/**
 * Refreshes Keystone's mirror of the register while Keystone holds it (called by the Keystone read). Never throws: a view that
 * cannot be read leaves the mirror as it was. Returns the rows kept, or null when nothing was read.
 */
export async function refreshRegisterMirror(db: DB, opts: { mode: Exclude<ConnectorMode, 'off'>; today: string; now?: Date }): Promise<number | null> {
  if (await switchoverOf(db, 'register')) return null;
  try {
    const rows = await readRegisterRows(db, opts.mode, opts.today);
    const at = opts.now ?? new Date();
    return await db.transaction(async (tx) => {
      const plan = await planOf(tx, rows);
      await writeRegisterMirror(tx, plan.records, opts.mode === 'views' ? 'keystone' : 'simulation', at);
      return plan.counts.read - plan.counts.refused;
    });
  } catch (e) {
    log.info('Keystone register not read (transfer view absent or not granted)', { component: 'keystone', error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export interface TransferResult {
  ok: boolean;
  /** EN source text of a failure. */
  error?: string;
  plan?: RegisterPlan;
  runId?: string;
}

/**
 * A transfer run of the register: `apply` false = dry run (« what would be imported », journalled, nothing changed); true = the
 * one import, from a fresh read, that switches the register over to Ingenium (rows stamped `imported_at`, history started,
 * audit entry). `afterApply` runs in the same transaction (the projection of the tasks).
 */
export async function transferRegister(db: DB, opts: {
  mode: ConnectorMode; apply: boolean; today: string; now?: Date;
  actor: { userId: string | null; name: string; role: string | null };
  afterApply?: (tx: Tx) => Promise<void>;
}): Promise<TransferResult> {
  if (opts.mode === 'off') return { ok: false, error: 'The Keystone connector is off (INGENIUM_KEYSTONE=off)' };
  if (await switchoverOf(db, 'register')) return { ok: false, error: 'The engineering register is already held by Ingenium' };
  let rows: Record<string, unknown>[];
  try {
    rows = await readRegisterRows(db, opts.mode, opts.today);
  } catch (e) {
    log.warn('Keystone register not read', { component: 'keystone', error: e instanceof Error ? e.message : String(e) });
    return { ok: false, error: 'Transfer view of Keystone not readable (keystone.pub_reprise_registre_ingenierie: requests DI-K2, DI-M2)' };
  }
  const at = opts.now ?? new Date();
  const source = opts.mode === 'views' ? 'keystone' : 'simulation';
  return db.transaction((tx) => runRegisterTransferTx(tx, { rows, source, apply: opts.apply, actor: opts.actor, at, afterApply: opts.afterApply }));
}

/** The transfer run itself, in the caller's transaction (also used by the demonstration seed). */
export async function runRegisterTransferTx(tx: Tx, opts: {
  rows: Record<string, unknown>[]; source: 'keystone' | 'simulation'; apply: boolean; at: Date;
  actor: { userId: string | null; name: string; role: string | null }; afterApply?: (tx: Tx) => Promise<void>;
}): Promise<TransferResult> {
  if (await switchoverOf(tx, 'register')) return { ok: false, error: 'The engineering register is already held by Ingenium' };
  const { at, source } = opts;
  const plan = await planOf(tx, opts.rows);
  const [run] = await tx.insert(transferRuns).values({
    object: 'register', mode: opts.apply ? 'applied' : 'dry_run', source, occurredAt: at, byName: opts.actor.name, byUserId: opts.actor.userId,
    counts: plan.counts, refused: plan.refusals.length, refusals: plan.refusals,
  }).returning({ id: transferRuns.id });
  if (opts.apply) {
    await writeRegisterMirror(tx, plan.records, source, at, at);
    await tx.insert(objectSwitchovers).values({ object: 'register', switchedAt: at, byName: opts.actor.name, transferRunId: run.id });
    await opts.afterApply?.(tx);
  }
  await writeAudit(tx, {
    occurredAt: at, actorName: opts.actor.name, actorUserId: opts.actor.userId, actorRole: opts.actor.role, objectRef: 'Engineering register', area: 'Transfer',
    change: `${opts.apply ? 'transfer applied: held by Ingenium from now on' : 'dry run'} (${plan.counts.read - plan.counts.refused} rows kept, ${plan.counts.refused} refused)`,
    entityType: 'transfer_run', entityId: run.id, after: plan.counts,
  });
  return { ok: true, plan, runId: run.id };
}

/** The last transfer runs of an object (newest first). */
export async function transferRunsOf(q: Q, object: TransferObject, limit = 10) {
  return q.select().from(transferRuns).where(eq(transferRuns.object, object)).orderBy(desc(transferRuns.occurredAt)).limit(limit);
}

/** Rows of the register mirrored from Keystone (counts shown before the switch-over). */
export async function mirroredRegisterCount(q: Q): Promise<number> {
  const [r] = await q.select({ n: sql<number>`count(*)::int` }).from(registerDeliverables).where(and(inArray(registerDeliverables.source, [...MIRRORED])));
  return r.n;
}
