'use server';
// Server Functions of the administration. Each checks the right server-side (the viewer's roles read in Clavis) before acting.
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/components/app/ActionForm';
import { can, FORBIDDEN } from '@/domain/rights';
import { getConfig } from '@/server/config';
import { getDb } from '@/server/db/client';
import { syncKeystone } from '@/server/integrations/keystone/sync';
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
