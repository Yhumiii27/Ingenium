import 'server-only';
// Projection of Ingenium's own tasks (contract norma/contrats/taches-v1.md § 1: `taches_publiees`): rewritten from the registers
// held by Ingenium and the free tasks, in the transaction of each write that opens, closes or reassigns a task, and by the job
// `tasks-projection` every 15 minutes. A row keeps its creation instant; its `maj_le` moves only when its content changes. The
// person id is the recipient's Clavis `oid` once they have signed in to Ingenium (the publication keeps only those rows).
import { and, eq, isNotNull } from 'drizzle-orm';
import { computeOwnTasks, type OwnTask, type TaskFree, type TaskProject } from '@/domain/own-tasks';
import type { DisciplineCode, } from '@/domain/vocab';
import { projectLabel } from '@/domain/vocab';
import { getConfig } from '@/server/config';
import { derivedRegisters } from '@/server/dal/register';
import { freeTasks, projectMirror, publishedTasks, teamMirror, users } from '@/server/db/schema';
import type { DB, Tx } from '@/server/db/types';
import { switchoverOf } from '@/server/integrations/keystone/register';

type Q = DB | Tx;

/** Every own task, computed now (not stored). */
export async function computeTasks(q: Q, now: Date): Promise<OwnTask[]> {
  const [projects, team, free, held] = await Promise.all([
    q.select().from(projectMirror), q.select().from(teamMirror), q.select().from(freeTasks), switchoverOf(q, 'register'),
  ]);
  const codes = projects.map((p) => p.code);
  const registers = held ? await derivedRegisters(q, codes) : new Map();
  const taskProjects: TaskProject[] = held
    ? projects.map((p) => {
        const r = registers.get(p.code)!;
        return {
          code: p.code, label: projectLabel(p), confidential: p.confidential,
          team: team.filter((m) => m.projectCode === p.code).map((m) => ({ email: m.email, personName: m.personName, discipline: m.discipline as DisciplineCode | null, activity: m.activity })),
          inputs: r.inputs, checks: r.checks, deliverables: r.deliverables, outputs: r.outputs,
        };
      })
    : [];
  const confidential = new Set(projects.filter((p) => p.confidential).map((p) => p.code));
  const freeRows: TaskFree[] = free.map((f) => ({
    id: f.id, title: f.title, projectCode: f.projectCode, assigneeEmail: f.assigneeEmail, dueOn: f.dueOn, priority: f.priority as TaskFree['priority'],
    state: f.state as TaskFree['state'], doneAt: f.doneAt, updatedAt: f.updatedAt, rowVersion: f.rowVersion, projectConfidential: !!f.projectCode && confidential.has(f.projectCode),
  }));
  return computeOwnTasks(taskProjects, freeRows, now);
}

const same = (a: typeof publishedTasks.$inferSelect, b: OwnTask, link: string, personId: string | null) =>
  a.title === b.title && a.state === b.state && a.dueOn === b.dueOn && a.priority === b.priority && a.version === b.version && a.link === link &&
  a.personId === personId && a.sensitive === b.sensitive && a.actions.join() === b.actions.join() && a.objectRef === b.objectRef;

/** Rewrites the projection (in the caller's transaction). Returns the number of rows. */
export async function rebuildPublishedTasks(tx: Tx, now: Date = new Date()): Promise<number> {
  const tasks = await computeTasks(tx, now);
  const base = getConfig().publicUrl.replace(/\/+$/, '');
  const oids = new Map((await tx.select({ email: users.email, oid: users.oid }).from(users).where(and(isNotNull(users.oid), eq(users.active, true)))).map((u) => [u.email, u.oid!]));
  const current = new Map((await tx.select().from(publishedTasks)).map((r) => [`${r.taskId}\u0000${r.recipientEmail}`, r]));
  const keep = new Set<string>();
  for (const t of tasks) {
    const key = `${t.taskId}\u0000${t.recipientEmail}`;
    if (keep.has(key)) continue;
    keep.add(key);
    const link = `${base}${t.path}`;
    const personId = oids.get(t.recipientEmail) ?? null;
    const prev = current.get(key);
    if (prev && same(prev, t, link, personId)) continue;
    const values = {
      personId, nature: t.nature, type: t.type, typeLabel: t.typeLabel, typeLabelEn: t.typeLabelEn, objectRef: t.objectRef, title: t.title, state: t.state,
      dueOn: t.dueOn, priority: t.priority, actions: t.actions, sensitive: t.sensitive, projectCode: t.projectCode, link, version: t.version, updatedAt: now,
    };
    if (prev) await tx.update(publishedTasks).set(values).where(and(eq(publishedTasks.taskId, t.taskId), eq(publishedTasks.recipientEmail, t.recipientEmail)));
    else await tx.insert(publishedTasks).values({ ...values, taskId: t.taskId, recipientEmail: t.recipientEmail, createdAt: now });
  }
  for (const [key, r] of current)
    if (!keep.has(key)) await tx.delete(publishedTasks).where(and(eq(publishedTasks.taskId, r.taskId), eq(publishedTasks.recipientEmail, r.recipientEmail)));
  return keep.size;
}

/** The viewer's own rows of the projection (by e-mail: in demo mode the personas have no Clavis id). */
export async function ownTaskRows(q: Q, email: string) {
  return q.select().from(publishedTasks).where(eq(publishedTasks.recipientEmail, email.toLowerCase()));
}
