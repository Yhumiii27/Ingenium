// Rules of the Keystone connector (pure): what a row of keystone.pub_projets and pub_affectations becomes in Ingenium's mirror.
// Keystone stays the owner of the projects and of their teams; Ingenium never writes them back (docs/spec/05 § 1).
import { isDiscipline, isProjectCode, PG_FORMATS, type DisciplineCode } from './vocab';

export interface MirrorProject {
  code: string;
  designOfficeNumber: string | null;
  name: string;
  client: string | null;
  phase: string | null;
  open: boolean;
}

export interface MirrorMember {
  projectCode: string;
  assignment: string;
  employeeNumber: string | null;
  personName: string;
  email: string | null;
  discipline: DisciplineCode | null;
  activity: string | null;
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
  };
}

/** A row of keystone.pub_affectations on a mirrored project, or null. `emails` maps an employee number to an e-mail (Clavis). */
export function memberFromKeystone(r: Record<string, unknown>, projects: ReadonlySet<string>, emails: ReadonlyMap<string, string> = new Map()): MirrorMember | null {
  const projectCode = text(r.projet_code);
  const name = text(r.personne_nom);
  const id = text(r.affectation_id != null ? String(r.affectation_id) : null);
  if (!projectCode || !projects.has(projectCode) || !name || !id) return null;
  const employeeNumber = text(r.matricule);
  const activity = text(r.activite);
  const email = employeeNumber ? emails.get(employeeNumber) ?? null : null;
  return {
    projectCode,
    assignment: `${text(r.source) ?? 'keystone'}:${id}`,
    employeeNumber,
    personName: name,
    email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.toLowerCase() : null,
    discipline: disciplineOfActivity(activity),
    activity,
  };
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
