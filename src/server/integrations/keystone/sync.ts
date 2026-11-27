import 'server-only';
// Keystone connector (docs/spec/05 § 1): projects and engineering teams read in keystone.pub_projets and
// keystone.pub_equipes_projets — or keystone.pub_affectations until Keystone publishes the whole team, ING-30 — (mode `views`, once Matrix grants the reading to ingenium_app — request DI-M1), or the fictitious rows of
// ./demo.ts (mode `simulation`). The e-mail of a team member is read in clavis.pub_personnes by employee number, so the
// signed-in person finds their projects. Writes only the mirror (project_mirror, team_mirror) and the journal of the run
// (sync_runs); never writes to Keystone. A view that cannot be read is a state (« source unavailable »), never a page error:
// the mirror keeps its last rows.
import { eq, notInArray, sql } from 'drizzle-orm';
import { memberFromKeystone, projectFromKeystone, uniqueMembers, type MirrorMember, type MirrorProject } from '@/domain/keystone';
import type { ConnectorMode, SyncOutcome } from '@/domain/vocab';
import { writeAudit } from '@/server/db/helpers';
import { projectMirror, syncRuns, teamMirror } from '@/server/db/schema';
import type { DB, Tx } from '@/server/db/types';
import { log } from '@/server/log';
import { KEYSTONE_DEMO_ASSIGNMENTS, KEYSTONE_DEMO_EMAILS, KEYSTONE_DEMO_PROJECTS } from './demo';

export const KEYSTONE_VIEWS = {
  projects: 'keystone.pub_projets', teams: 'keystone.pub_equipes_projets', assignments: 'keystone.pub_affectations', people: 'clavis.pub_personnes',
} as const;

export interface SyncResult {
  outcome: SyncOutcome | 'off';
  projects: number;
  members: number;
  /** EN source text. */
  message: string | null;
}

async function rowsOf(q: DB | Tx, view: string, columns: string): Promise<Record<string, unknown>[]> {
  const r = await q.execute(sql.raw(`select ${columns} from ${view}`));
  return r.rows as Record<string, unknown>[];
}

/** The rows of the simulation (demonstration data set). */
export function simulatedKeystone(): { projects: MirrorProject[]; members: MirrorMember[] } {
  const projects = KEYSTONE_DEMO_PROJECTS.map(projectFromKeystone).filter((p): p is MirrorProject => !!p);
  const codes = new Set(projects.map((p) => p.code));
  const members = uniqueMembers(KEYSTONE_DEMO_ASSIGNMENTS.map((r) => memberFromKeystone(r, codes, KEYSTONE_DEMO_EMAILS)).filter((m): m is MirrorMember => !!m));
  return { projects, members };
}

/** Rows of the source: the simulation, or the views (throws when a view cannot be read). */
async function readSource(db: DB, mode: Exclude<ConnectorMode, 'off'>): Promise<{ projects: MirrorProject[]; members: MirrorMember[] }> {
  if (mode === 'simulation') return simulatedKeystone();
  let emails: ReadonlyMap<string, string>;
  // `select *`: the columns Keystone adds at the end of its contract (confidentialite, DI-K5) are read when published, ignored
  // otherwise (an absent column leaves the project « not confidential »).
  const projectRows = await rowsOf(db, KEYSTONE_VIEWS.projects, '*');
  // The whole team (assignments and stakeholders, ING-30) once Keystone publishes it; until then the assignments only.
  let assignmentRows: Record<string, unknown>[];
  try {
    assignmentRows = await rowsOf(db, KEYSTONE_VIEWS.teams, '*');
  } catch (e) {
    log.info('keystone.pub_equipes_projets not read: team from keystone.pub_affectations', { component: 'keystone', error: e instanceof Error ? e.message : String(e) });
    assignmentRows = await rowsOf(db, KEYSTONE_VIEWS.assignments, 'source, affectation_id, matricule, personne_nom, projet_code, activite');
  }
  // The directory gives the e-mail of an employee number; without it the team is mirrored without e-mails.
  try {
    const people = await rowsOf(db, KEYSTONE_VIEWS.people, 'matricule, email');
    emails = new Map(people.filter((p) => typeof p.matricule === 'string' && typeof p.email === 'string').map((p) => [p.matricule as string, p.email as string]));
  } catch (e) {
    log.warn('clavis.pub_personnes not read: team members without e-mail', { component: 'keystone', error: e instanceof Error ? e.message : String(e) });
    emails = new Map();
  }
  const projects = projectRows.map(projectFromKeystone).filter((p): p is MirrorProject => !!p);
  const codes = new Set(projects.map((p) => p.code));
  const members = uniqueMembers(assignmentRows.map((r) => memberFromKeystone(r, codes, emails)).filter((m): m is MirrorMember => !!m));
  return { projects, members };
}

/** Replaces the mirror with the rows read (in the caller's transaction, behind the write lock). */
export async function writeMirror(tx: Tx, rows: { projects: MirrorProject[]; members: MirrorMember[] }, source: 'keystone' | 'simulation', at: Date): Promise<void> {
  await tx.delete(teamMirror);
  for (const p of rows.projects)
    await tx.insert(projectMirror).values({ ...p, source, syncedAt: at })
      .onConflictDoUpdate({ target: projectMirror.code, set: { designOfficeNumber: p.designOfficeNumber, name: p.name, client: p.client, phase: p.phase, open: p.open, confidential: p.confidential, source, syncedAt: at } });
  const codes = rows.projects.map((p) => p.code);
  if (codes.length) await tx.delete(projectMirror).where(notInArray(projectMirror.code, codes));
  else await tx.delete(projectMirror);
  for (const m of rows.members) await tx.insert(teamMirror).values({ ...m, source, syncedAt: at });
}

/**
 * Reads Keystone and refreshes the mirror; records the run in sync_runs. Never throws: a view not readable gives
 * `unavailable` and leaves the mirror as it was. `requestedBy` (« Read now ») is journalled.
 */
export async function syncKeystone(db: DB, opts: { mode: ConnectorMode; requestedBy?: { userId: string; name: string; role: string } | null; now?: Date }): Promise<SyncResult> {
  if (opts.mode === 'off') return { outcome: 'off', projects: 0, members: 0, message: 'The Keystone connector is off (INGENIUM_KEYSTONE=off)' };
  const startedAt = opts.now ?? new Date();
  let result: SyncResult;
  try {
    const rows = await readSource(db, opts.mode);
    await db.transaction(async (tx) => writeMirror(tx, rows, opts.mode === 'views' ? 'keystone' : 'simulation', startedAt));
    result = { outcome: 'ok', projects: rows.projects.length, members: rows.members.length, message: opts.mode === 'simulation' ? 'Simulated Keystone (demonstration data set)' : null };
  } catch (e) {
    log.warn('Keystone not read', { component: 'keystone', error: e instanceof Error ? e.message : String(e) });
    result = { outcome: 'unavailable', projects: 0, members: 0, message: 'Keystone views not readable (grant of Matrix missing or view absent)' };
  }
  const finishedAt = new Date(Math.max(Date.now(), startedAt.getTime()));
  await db.transaction(async (tx) => {
    await tx.insert(syncRuns).values({
      source: 'keystone', startedAt, finishedAt, outcome: result.outcome as SyncOutcome, rows: result.projects + result.members,
      message: result.message, requestedBy: opts.requestedBy?.userId ?? null,
    });
    if (opts.requestedBy)
      await writeAudit(tx, {
        actorName: opts.requestedBy.name, actorUserId: opts.requestedBy.userId, actorRole: opts.requestedBy.role, objectRef: 'Keystone',
        change: `read now: ${result.outcome} (${result.projects} projects, ${result.members} team members)`, area: 'Connectors',
      });
  });
  return result;
}

/** The last runs of a source (newest first). */
export async function lastSyncRuns(db: DB, limit = 10) {
  return db.select().from(syncRuns).where(eq(syncRuns.source, 'keystone')).orderBy(sql`${syncRuns.startedAt} desc`).limit(limit);
}
