// Who sees a project (ING-29 and ING-30, owner's answers of 27 Nov 2026) — pure. The data layer applies the same rule in SQL
// (src/server/dal/projects.ts, `projectVisibility`) so that a project the viewer may not see is never read; this module is its
// statement, tested by value.
//
// ING-29: « Les utilisateurs peuvent sur la liste des projets voir par défaut les projets dont ils font partie, et s'ils
// enlèvent le filtre voir la totalité des projets en cours. […] il se peut pour des projets R&D qu'un projet soit confidentiel
// et donc l'accès n'est accordé que si la personne fait partie du projet et est ajoutée par le responsable du projet. Il
// n'apparaîtra donc jamais dans la liste des projets pour ceux qui n'en font pas partie. »
// ING-30: the team is the one Keystone publishes (assigned to a task, or stakeholder); the confidentiality level comes from
// Keystone too (« c'est Keystone qui donnera le niveau de confidentialité à Ingenium et aux autres softs »).
import type { RoleKey } from '@/config/roles';
import { can } from './rights';

export interface ProjectFacts {
  /** Keystone's confidentiality level is « confidentiel ». */
  confidential: boolean;
  /** Neither closed nor cancelled in Keystone. */
  open: boolean;
  /** The viewer is on the project's team published by Keystone (assigned to a task or stakeholder). */
  onTeam: boolean;
}

/**
 * True when the viewer may see the project. A confidential project: its team only, whatever the role (no administrator,
 * engineering lead or director sees it otherwise — Ingenium has no role equivalent to Crucible's R&D director). Any other
 * project: every project in progress for every role; a closed one for its team and the roles with `all_projects`.
 */
export function projectVisible(roles: readonly RoleKey[], f: ProjectFacts): boolean {
  if (f.confidential) return f.onTeam;
  return f.open || f.onTeam || can(roles, 'all_projects');
}

/** Filter of the project list, in the URL (`?projets=tous`); the default is the viewer's projects (« Mes projets »). */
export const PROJECT_FILTERS = ['mine', 'all'] as const;
export type ProjectFilter = (typeof PROJECT_FILTERS)[number];
export const projectFilterOf = (v: string | string[] | undefined | null): ProjectFilter => ((Array.isArray(v) ? v[0] : v) === 'tous' ? 'all' : 'mine');
export const projectFilterHref = (f: ProjectFilter) => (f === 'all' ? '/my/projects?projets=tous' : '/my/projects');

/** The projects a filter keeps: the viewer's ones (closed ones too), or every project in progress. */
export function filterProjects<P extends { mine: boolean; open: boolean }>(projects: readonly P[], f: ProjectFilter): P[] {
  return projects.filter((p) => (f === 'mine' ? p.mine : p.open));
}
