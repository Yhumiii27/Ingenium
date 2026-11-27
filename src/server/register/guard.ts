import 'server-only';
// The context of a write in a project's register: the viewer (roles read in Clavis), the project read in their scope (outside
// it, the same refusal as an unknown project: never say it exists), the viewer's disciplines on it and whether Ingenium holds the
// register (one source per object: while Keystone holds it, every write is refused).
import type { RegisterActor } from '@/domain/register';
import { projectInScope, type ProjectRow } from '@/server/dal/projects';
import { getDb } from '@/server/db/client';
import { switchoverOf } from '@/server/integrations/keystone/register';
import { getViewer, type Viewer } from '@/server/session';

import { HELD_IN_KEYSTONE, NOT_FOUND } from '@/domain/register';
export { HELD_IN_KEYSTONE, NOT_FOUND, STALE } from '@/domain/register';

export type RegisterContext = { ok: true; viewer: Viewer; project: ProjectRow; actor: RegisterActor } | { ok: false; error: string };

export async function registerContext(code: unknown): Promise<RegisterContext> {
  const viewer = await getViewer();
  const project = typeof code === 'string' ? await projectInScope(viewer, code) : null;
  if (!project) return { ok: false, error: NOT_FOUND };
  if (!(await switchoverOf(await getDb(), 'register'))) return { ok: false, error: HELD_IN_KEYSTONE };
  return { ok: true, viewer, project, actor: { roles: viewer.roles, disciplines: project.myDisciplines } };
}
