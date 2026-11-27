// Rules of the Keystone connector (pure): what a row of keystone.pub_projets and pub_affectations becomes in Ingenium's mirror.
// Keystone stays the owner of the projects and of their teams; Ingenium never writes them back (docs/spec/05 § 1).
import { isDiscipline, isProjectCode, PG_FORMATS, type DisciplineCode, type TeamOrigin } from './vocab';

export interface MirrorProject {
  code: string;
  designOfficeNumber: string | null;
  name: string;
  client: string | null;
  phase: string | null;
  open: boolean;
  /** Keystone's `confidentialite` = 'confidentiel' (false when the column is not published). */
  confidential: boolean;
}

export interface MirrorMember {
  projectCode: string;
  assignment: string;
  employeeNumber: string | null;
  personName: string;
  email: string | null;
  discipline: DisciplineCode | null;
  activity: string | null;
  origin: TeamOrigin;
}

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Discipline of an assignment from its activity (« Ingénierie électrique » → electrical), else null. */
export function disciplineOfActivity(activity: string | null | undefined): DisciplineCode | null {
  if (!activity) return null;
  const a = activity.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (isDiscipline(a)) return a;
  if (/automat|plc|controle.?commande|instrumentation|control/.test(a)) return 'automation';
  if (/electr/.test(a)) return 'electrical';
  if (/meca|mechan/.test(a)) return 'mechanical';
  if (/process|procede|genie chimique/.test(a)) return 'process';
  return null;
}

/**
 * Keystone's confidentiality level (owner, 27 Nov 2026: « c'est Keystone qui donnera le niveau de confidentialité »). Only
 * 'confidentiel' hides the project; an absent column or another level ('normal') does not.
 */
export function confidentialOf(v: unknown): boolean {
  return typeof v === 'string' && v.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') === 'confidentiel';
}

/** Origin of a team row of keystone.pub_equipes_projets (`origine`); a row of pub_affectations is an assignment. */
export function originOf(v: unknown): TeamOrigin {
  return typeof v === 'string' && v.trim() === 'partie_prenante' ? 'stakeholder' : 'assignment';
}

/** A row of keystone.pub_projets, or null when it cannot be mirrored (code of another shape, no name). */
export function projectFromKeystone(r: Record<string, unknown>): MirrorProject | null {
  const code = text(r.code);
  const name = text(r.nom);
  if (!code || !isProjectCode(code) || !name) return null;
  const n = text(r.numero);
  return {
    code,
    designOfficeNumber: n && new RegExp(PG_FORMATS.designOfficeNumber).test(n) ? n : null,
    name,
    client: text(r.client),
    phase: text(r.phase),
    open: r.imputable !== false,
    confidential: confidentialOf(r.confidentialite),
  };
}

/**
 * A team row on a mirrored project, or null: a row of keystone.pub_equipes_projets (projet_code, matricule, personne_nom, email,
 * origine, activite; ING-30) or of keystone.pub_affectations (source, affectation_id, matricule, personne_nom, projet_code,
 * activite). `emails` maps an employee number to an e-mail (Clavis), used when the row carries none.
 */
export function memberFromKeystone(r: Record<string, unknown>, projects: ReadonlySet<string>, emails: ReadonlyMap<string, string> = new Map()): MirrorMember | null {
  const projectCode = text(r.projet_code);
  const name = text(r.personne_nom);
  const employeeNumber = text(r.matricule);
  const published = text(r.email);
  const origin = originOf(r.origine);
  const rawEmail = published ?? (employeeNumber ? emails.get(employeeNumber) ?? null : null);
  const email = rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail.toLowerCase() : null;
  // pub_affectations names each row; a team row of pub_equipes_projets is keyed by its origin and its person.
  const id = r.affectation_id != null ? text(String(r.affectation_id)) : null;
  const assignment = id ? `${text(r.source) ?? 'keystone'}:${id}` : (employeeNumber ?? email) ? `${origin}:${employeeNumber ?? email}` : null;
  if (!projectCode || !projects.has(projectCode) || !name || !assignment) return null;
  const activity = text(r.activite);
  return { projectCode, assignment, employeeNumber, personName: name, email, discipline: disciplineOfActivity(activity), activity, origin };
}

/** Duplicates of one project and assignment dropped (the first row kept). */
export function uniqueMembers(rows: readonly MirrorMember[]): MirrorMember[] {
  const seen = new Set<string>();
  return rows.filter((m) => {
    const k = `${m.projectCode}|${m.assignment}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
