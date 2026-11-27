import 'server-only';
// Projects as Ingenium sees them: Keystone's projects and engineering teams of the mirror (written only by the Keystone
// connector), filtered by the viewer's project scope in the data layer (spec 02 § 2): every project with `all_projects`, else
// those whose team names the viewer (by e-mail). A project outside the scope is not returned: its pages answer 404.
import { asc } from 'drizzle-orm';
import { cache } from 'react';
import { inProjectScope } from '@/domain/rights';
import type { DisciplineCode } from '@/domain/vocab';
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
  source: string;
  syncedAt: Date;
  /** The viewer is on the project's engineering team. */
  mine: boolean;
  /** The viewer's disciplines on the project. */
  myDisciplines: DisciplineCode[];
  team: { personName: string; discipline: DisciplineCode | null; activity: string | null }[];
}

const load = cache(async () => {
  const db = await getDb();
  const [projects, team] = await Promise.all([
    db.select().from(projectMirror).orderBy(asc(projectMirror.code)),
    db.select().from(teamMirror).orderBy(asc(teamMirror.projectCode), asc(teamMirror.personName)),
  ]);
  return { projects, team };
});

/** Every project of the viewer's scope (open ones first, the viewer's team first among them, then by code). */
export async function projectsInScope(v: Viewer): Promise<ProjectRow[]> {
  const { projects, team } = await load();
  const email = v.email.toLowerCase();
  return projects
    .map((p) => {
      const members = team.filter((m) => m.projectCode === p.code);
      const mineRows = members.filter((m) => m.email === email);
      return {
        ...p,
        mine: mineRows.length > 0,
        myDisciplines: [...new Set(mineRows.map((m) => m.discipline).filter((d): d is DisciplineCode => !!d))],
        team: members.map((m) => ({ personName: m.personName, discipline: m.discipline as DisciplineCode | null, activity: m.activity })),
      };
    })
    .filter((p) => inProjectScope(v.roles, p.mine))
    .sort((a, b) => Number(b.open) - Number(a.open) || Number(b.mine) - Number(a.mine) || a.code.localeCompare(b.code));
}

/** One project of the viewer's scope, or null (the page answers 404: never say it exists). */
export async function projectInScope(v: Viewer, code: string): Promise<ProjectRow | null> {
  return (await projectsInScope(v)).find((p) => p.code === code) ?? null;
}

/** True when the mirror holds any project at all (a reader with an empty list sees « Keystone not read yet »). */
export async function mirrorIsEmpty(): Promise<boolean> {
  const db = await getDb();
  const [row] = await db.select({ code: projectMirror.code }).from(projectMirror).limit(1);
  return !row;
}
