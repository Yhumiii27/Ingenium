'use server';
// Server Functions of the free tasks (ING-25, ING-31): create one for oneself or for a member of a project's team (a project of
// the viewer's scope), move it along the board (the contract's transitions), cancel it with a reason (no physical deletion).
// Only its assignee or its author acts on it. The projection of the tasks is rewritten in the same transaction.
import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/components/app/ActionForm';
import { FREE_TASK_MOVES, TASK_PRIORITIES, isFreeTaskMove, type FreeTaskState } from '@/domain/own-tasks';
import { getDb } from '@/server/db/client';
import { writeAudit } from '@/server/db/helpers';
import { freeTasks, teamMirror } from '@/server/db/schema';
import { projectInScope } from '@/server/dal/projects';
import { getViewer } from '@/server/session';
import { rebuildPublishedTasks } from '@/server/tasks/projection';

const INVALID = 'Some fields are missing or invalid';
const TaskForm = z.object({
  title: z.string().trim().min(1).max(200),
  project: z.string().trim().optional().transform((v) => v || null),
  assignee: z.string().trim().toLowerCase().optional().transform((v) => v || null),
  due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')).transform((v) => v || null),
  priority: z.enum(TASK_PRIORITIES).default('normal'),
});

export async function createFreeTaskAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  const f = TaskForm.safeParse(Object.fromEntries([...fd.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : ''])));
  if (!f.success) return { ok: false, error: INVALID };
  const me = viewer.email.toLowerCase();
  let assignee = { email: me, name: viewer.name };
  const db = await getDb();
  if (f.data.project && !(await projectInScope(viewer, f.data.project))) return { ok: false, error: 'Project not found' };
  if (f.data.assignee && f.data.assignee !== me) {
    if (!f.data.project) return { ok: false, error: 'A task for someone else belongs to a project of their team' };
    const [m] = await db.select().from(teamMirror).where(and(eq(teamMirror.projectCode, f.data.project), eq(teamMirror.email, f.data.assignee))).limit(1);
    if (!m) return { ok: false, error: 'This person is not on the project’s team' };
    assignee = { email: m.email!, name: m.personName };
  }
  const now = new Date();
  await db.transaction(async (tx) => {
    const [row] = await tx.insert(freeTasks).values({
      title: f.data.title, projectCode: f.data.project, assigneeEmail: assignee.email, assigneeName: assignee.name, createdByUserId: viewer.userId,
      createdByName: viewer.name, dueOn: f.data.due, priority: f.data.priority, createdAt: now, updatedAt: now,
    }).returning({ id: freeTasks.id });
    await writeAudit(tx, { actorName: viewer.name, actorUserId: viewer.userId, actorRole: viewer.role, area: 'Tasks', objectRef: f.data.project ?? 'Task', change: `task created for ${assignee.name}`, entityType: 'free_task', entityId: row.id });
    await rebuildPublishedTasks(tx, now);
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}

class Refused extends Error {}

async function act(id: unknown, run: (row: typeof freeTasks.$inferSelect, now: Date) => { set: Partial<typeof freeTasks.$inferInsert>; change: string; reason?: string | null }): Promise<ActionResult> {
  const viewer = await getViewer();
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: INVALID };
  const now = new Date();
  try {
    await (await getDb()).transaction(async (tx) => {
      const [row] = await tx.select().from(freeTasks).where(eq(freeTasks.id, parsed.data)).for('update');
      const me = viewer.email.toLowerCase();
      // Someone else's task does not exist for the viewer.
      if (!row || (row.assigneeEmail !== me && row.createdByUserId !== viewer.userId)) throw new Refused('Task not found');
      const r = run(row, now);
      await tx.update(freeTasks).set({ ...r.set, rowVersion: sql`${freeTasks.rowVersion} + 1`, updatedAt: now }).where(eq(freeTasks.id, row.id));
      await writeAudit(tx, { actorName: viewer.name, actorUserId: viewer.userId, actorRole: viewer.role, area: 'Tasks', objectRef: row.projectCode ?? 'Task', change: r.change, reason: r.reason ?? null, entityType: 'free_task', entityId: row.id });
      await rebuildPublishedTasks(tx, now);
    });
  } catch (e) {
    if (e instanceof Refused) return { ok: false, error: e.message };
    throw e;
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** A transition of the board (`demarrer`, `suspendre`, `reprendre`, `terminer`). */
export async function moveFreeTaskAction(id: string, move: string): Promise<ActionResult> {
  if (!isFreeTaskMove(move)) return { ok: false, error: INVALID };
  const m = FREE_TASK_MOVES[move];
  return act(id, (row, now) => {
    if (!m.from.includes(row.state as FreeTaskState)) throw new Refused('This step is not open in the task’s state');
    return { set: { state: m.to, doneAt: m.to === 'done' ? now : null }, change: `task ${row.state} → ${m.to}` };
  });
}

/** Cancels a free task with a reason. */
export async function cancelFreeTaskAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const reason = String(fd.get('reason') ?? '').trim().slice(0, 500);
  if (!reason) return { ok: false, error: 'A reason is required' };
  return act(fd.get('id'), (row) => {
    if (row.state === 'done' || row.state === 'cancelled') throw new Refused('This step is not open in the task’s state');
    return { set: { state: 'cancelled', cancelReason: reason, doneAt: null }, change: `task ${row.state} → cancelled`, reason };
  });
}
