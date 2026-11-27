// What each role may do in Ingenium (docs/spec/02-roles.md, ING-19). Pure; every Server Function asks these with the viewer's
// roles (cumulative) and the data layer applies the project scope (an object outside it is a 404, Norma § 6). Delivery 1 uses
// the platform rights only (administration, journal, project scope); the business rights are declared now so that the
// deliveries 2 to 4 add their checks without changing the role model.
import type { RoleKey } from '@/config/roles';

export type Right =
  | 'all_projects' // also the closed projects outside the viewer's team (every role sees the projects in progress, ING-29; never a confidential one)
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
  // Project leads, quality, purchasing, logistics and the directions read every non-confidential project (spec 02 § 1, ING-29);
  // their decisions come through « My approvals ».
  reader: ['all_projects'],
};

/** True when one of the roles carries the right. */
export const can = (roles: readonly RoleKey[], right: Right) => roles.some((r) => RIGHTS[r].includes(right));

// The project scope (who sees which project, confidential projects included) is `projectVisible` of ./confidential.ts (ING-29),
// applied in SQL by the data layer: a project outside it is a 404.

/** Refusal message of a missing right (EN source string). */
export const FORBIDDEN = 'You do not have the right to do this';
