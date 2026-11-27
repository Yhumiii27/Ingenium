'use server';
// Server Functions of the administration. Each checks the right server-side (the viewer's roles read in Clavis) before acting.
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/components/app/ActionForm';
import { can, FORBIDDEN } from '@/domain/rights';
import { getConfig } from '@/server/config';
import { getDb } from '@/server/db/client';
import { syncKeystone } from '@/server/integrations/keystone/sync';
import { transferRegister } from '@/server/integrations/keystone/register';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { isRuleCode } from '@/domain/register';
import { businessToday } from '@/server/clock';
import { writeAudit } from '@/server/db/helpers';
import { consistencyRules } from '@/server/db/schema';
import { rebuildPublishedTasks } from '@/server/tasks/projection';
import { getViewer } from '@/server/session';

/** « Read now » of the Keystone connector (administration): reads the views or the simulation, journals the run. */
export async function readKeystoneNowAction(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!can(viewer.roles, 'administration')) return { ok: false, error: FORBIDDEN };
  const mode = getConfig().connectors.keystone;
  if (mode === 'off') return { ok: false, error: 'The Keystone connector is off (INGENIUM_KEYSTONE=off)' };
  const r = await syncKeystone(await getDb(), { mode, requestedBy: { userId: viewer.userId, name: viewer.name, role: viewer.role } });
  revalidatePath('/', 'layout');
  return r.outcome === 'ok' ? { ok: true } : { ok: false, error: r.message ?? 'Keystone views not readable (grant of Matrix missing or view absent)' };
}

const RuleForm = z.object({
  code: z.string().trim().toLowerCase().refine(isRuleCode), label: z.string().trim().min(1).max(80), active: z.enum(['on', 'off']).optional(),
});

/** Adds or edits a consistency rule (administration; ING-D2 gives the real list). A rule is never deleted: it is deactivated. */
export async function saveRuleAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!can(viewer.roles, 'administration') && !can(viewer.roles, 'validate_parts')) return { ok: false, error: FORBIDDEN };
  const f = RuleForm.safeParse({ code: fd.get('code') ?? '', label: fd.get('label') ?? '', active: fd.get('active') ?? undefined });
  if (!f.success) return { ok: false, error: 'Some fields are missing or invalid' };
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [cur] = await tx.select().from(consistencyRules).where(eq(consistencyRules.code, f.data.code)).for('update');
    const active = f.data.active !== 'off';
    if (cur) await tx.update(consistencyRules).set({ label: f.data.label, active, updatedAt: new Date() }).where(eq(consistencyRules.code, cur.code));
    else {
      const [{ n }] = await tx.select({ n: sql<number>`coalesce(max(${consistencyRules.position}), 0)::int` }).from(consistencyRules);
      await tx.insert(consistencyRules).values({ code: f.data.code, label: f.data.label, position: n + 1, active });
    }
    await writeAudit(tx, {
      actorName: viewer.name, actorUserId: viewer.userId, actorRole: viewer.role, objectRef: `Rule ${f.data.code}`, area: 'Administration',
      change: cur ? `consistency rule edited${cur.active !== active ? (active ? ', activated' : ', deactivated') : ''}` : 'consistency rule added',
      before: cur ? { label: cur.label, active: cur.active } : null, after: { label: f.data.label, active },
    });
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Transfer of the engineering register from Keystone: a dry run (nothing changed), or applied once (switch-over). */
async function transfer(apply: boolean): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!can(viewer.roles, 'administration')) return { ok: false, error: FORBIDDEN };
  const r = await transferRegister(await getDb(), {
    mode: getConfig().connectors.keystone, apply, today: await businessToday(),
    actor: { userId: viewer.userId, name: viewer.name, role: viewer.role }, afterApply: (tx) => rebuildPublishedTasks(tx).then(() => undefined),
  });
  revalidatePath('/', 'layout');
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? 'Transfer refused' };
}

export async function dryRunRegisterTransferAction(): Promise<ActionResult> {
  return transfer(false);
}

export async function applyRegisterTransferAction(): Promise<ActionResult> {
  return transfer(true);
}
