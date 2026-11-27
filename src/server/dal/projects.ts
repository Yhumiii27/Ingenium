import 'server-only';
// Projects as Ingenium sees them: Keystone's projects, confidentiality level and teams of the mirror (written only by the
// Keystone connector). The viewer's scope is a condition of the SQL query (`projectVisibility`, the rule `projectVisible` of
// src/domain/confidential.ts, ING-29): a project outside it is never read — not in a list, a counter, the page search, the
// project switcher or the journal — and its pages answer 404.
import { and, asc, eq, inArray, not, or, sql, type SQL } from 'drizzle-orm';
import { cache } from 'react';
import { can } from '@/domain/rights';
import type { DisciplineCode, TeamOrigin } from '@/domain/vocab';
import { getDb } from '@/server/db/client';
import { projectMirror, teamMirror } from '@/server/db/schema';
import type { Viewer } from '@/server/viewer';

export interface ProjectRow {
  code: string;
  designOfficeNumber: string | null;
  name: string;
  client: string | null;
  phase: string | null;
  open: boolean;
  /** Confidential in Keystone: only its team sees it. */
  confidential: boolean;
  source: string;
  syncedAt: Date;
  /** The viewer is on the project's team published by Keystone (default filter « My projects »). */
  mine: boolean;
  /** The viewer's disciplines on the project. */
  myDisciplines: DisciplineCode[];
  team: { personName: string; discipline: DisciplineCode | null; activity: string | null; origin: TeamOrigin }[];
}

const emailOf = (v: Viewer) => v.email.toLowerCase();

const onTeam = (email: string): SQL =>
  sql`exists (select 1 from ${teamMirror} where ${teamMirror.projectCode} = ${projectMirror.code} and ${teamMirror.email} = ${email})`;

/**
 * The viewer's project scope as a condition on project_mirror (`projectVisible`): a confidential project for its team only;
 * any other project when in progress, or for its team and the roles with `all_projects`.
 */
export function projectVisibility(v: Viewer): SQL {
  const team = onTeam(emailOf(v));
  const confidential = and(eq(projectMirror.confidential, true), team)!;
  const other = can(v.roles, 'all_projects') ? eq(projectMirror.confidential, false) : and(eq(projectMirror.confidential, false), or(eq(projectMirror.open, true), team))!;
  return or(confidential, other)!;
}

const load = cache(async (v: Viewer) => {
  const db = await getDb();
  const projects = await db.select().from(projectMirror).where(projectVisibility(v)).orderBy(asc(projectMirror.code));
  const codes = projects.map((p) => p.code);
  const team = codes.length
    ? await db.select().from(teamMirror).where(inArray(teamMirror.projectCode, codes)).orderBy(asc(teamMirror.projectCode), asc(teamMirror.personName))
    : [];
  return { projects, team };
});

/** Every project of the viewer's scope (open ones first, the viewer's ones first among them, then by code). */
export async function projectsInScope(v: Viewer): Promise<ProjectRow[]> {
  const { projects, team } = await load(v);
  const email = emailOf(v);
  return projects
    .map((p): ProjectRow => {
      const members = team.filter((m) => m.projectCode === p.code);
      const mineRows = members.filter((m) => m.email === email);
      return {
        code: p.code, designOfficeNumber: p.designOfficeNumber, name: p.name, client: p.client, phase: p.phase, open: p.open,
        confidential: p.confidential, source: p.source, syncedAt: p.syncedAt,
        mine: mineRows.length > 0,
        myDisciplines: [...new Set(mineRows.map((m) => m.discipline).filter((d): d is DisciplineCode => !!d))],
        team: members.map((m) => ({ personName: m.personName, discipline: m.discipline as DisciplineCode | null, activity: m.activity, origin: m.origin as TeamOrigin })),
      };
    })
    .sort((a, b) => Number(b.open) - Number(a.open) || Number(b.mine) - Number(a.mine) || a.code.localeCompare(b.code));
}

/** One project of the viewer's scope, or null (the page answers 404: never say it exists). */
export async function projectInScope(v: Viewer, code: string): Promise<ProjectRow | null> {
  return (await projectsInScope(v)).find((p) => p.code === code) ?? null;
}

/** Codes of the confidential projects the viewer may not see (the journal leaves their entries out). */
export async function hiddenProjectCodes(v: Viewer): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select({ code: projectMirror.code }).from(projectMirror)
    .where(and(eq(projectMirror.confidential, true), not(onTeam(emailOf(v)))));
  return rows.map((r) => r.code);
}

/** True when the mirror holds any project at all (a reader with an empty list sees « Keystone not read yet »). */
export async function mirrorIsEmpty(): Promise<boolean> {
  const db = await getDb();
  const [row] = await db.select({ code: projectMirror.code }).from(projectMirror).limit(1);
  return !row;
}
