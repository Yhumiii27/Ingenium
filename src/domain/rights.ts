// What each role may do in Ingenium (docs/spec/02-roles.md, ING-19). Pure; every Server Function asks these with the viewer's
// roles (cumulative) and the data layer applies the project scope (an object outside it is a 404, Norma § 6). Delivery 1 uses
// the platform rights only (administration, journal, project scope); the business rights are declared now so that the
// deliveries 2 to 4 add their checks without changing the role model.
import type { RoleKey } from '@/config/roles';

export type Right =
  | 'all_projects' // every Keystone project of the perimeter, not only those of the viewer's engineering team
  | 'engineering' // inputs, deliverables, imports, checks, BOM, P&ID tags of the viewer's discipline (delivery 2)
  | 'parts' // create a part and its technical data, drawings (delivery 3)
  | 'validate_parts' // validate a part, close a check, propose a release, ECO « engineering lead » key (deliveries 2–3)
  | 'documents' // deposits to Codex, revisions follow-up (delivery 2)
  | 'administration' // disciplines, consistency rules, import tools, pack and CE lists, connectors
  | 'journal';

const RIGHTS: Record<RoleKey, readonly Right[]> = {
  engineering_lead: ['all_projects', 'engineering', 'parts', 'validate_parts', 'documents', 'journal'],
  engineer: ['engineering', 'parts'],
  designer: ['parts'],
  document_controller: ['documents'],
  admin: ['all_projects', 'administration', 'journal'],
  // Project leads, quality, purchasing, logistics and the directions read every project (spec 02 § 1); their decisions come
  // through « My approvals ».
  reader: ['all_projects'],
};

/** True when one of the roles carries the right. */
export const can = (roles: readonly RoleKey[], right: Right) => roles.some((r) => RIGHTS[r].includes(right));

/**
 * Project scope (spec 02 § 2): every project with `all_projects`, otherwise the projects whose engineering team (read in
 * Keystone) names the viewer. Pure: the data layer filters with it, a project outside it is a 404.
 */
export function inProjectScope(roles: readonly RoleKey[], onTeam: boolean): boolean {
  return onTeam || can(roles, 'all_projects');
}

/** Refusal message of a missing right (EN source string). */
export const FORBIDDEN = 'You do not have the right to do this';
