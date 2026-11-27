// Closed vocabularies and formats of Ingenium — pure, shared by the schema (CHECK constraints: formats live in the database,
// Norma § 4), the connectors and the pages (labels are EN source strings translated through t()).

/** The engineering disciplines (docs/spec/01; ING-D1 gives the real list). */
export const DISCIPLINE_CODES = ['process', 'mechanical', 'electrical', 'automation'] as const;
export type DisciplineCode = (typeof DISCIPLINE_CODES)[number];
export const isDiscipline = (v: unknown): v is DisciplineCode => typeof v === 'string' && (DISCIPLINE_CODES as readonly string[]).includes(v);

export const DISCIPLINE_LABEL: Record<DisciplineCode, string> = {
  process: 'Process', mechanical: 'Mechanical', electrical: 'Electrical', automation: 'Automation',
};

/** Where a mirrored row comes from: Keystone's views, or the simulation of the demonstration (never on the shared server). */
export const MIRROR_SOURCES = ['keystone', 'simulation'] as const;
export type MirrorSource = (typeof MIRROR_SOURCES)[number];

/** The readers of other tools that record their runs. */
export const SYNC_SOURCES = ['keystone'] as const;
export type SyncSource = (typeof SYNC_SOURCES)[number];
export const SYNC_OUTCOMES = ['ok', 'error', 'unavailable'] as const;
export type SyncOutcome = (typeof SYNC_OUTCOMES)[number];

/** Connector modes: off, the simulation of the demonstration data set, or the `pub_` views of the shared server. */
export const CONNECTOR_MODES = ['off', 'simulation', 'views'] as const;
export type ConnectorMode = (typeof CONNECTOR_MODES)[number];

/** Formats (POSIX regular expressions, also used by the CHECK constraints). */
export const PG_FORMATS = {
  /** Keystone's project code: three capitals, a dash, three digits (HLT-026). */
  projectCode: '^[A-Z]{3}-[0-9]{3}$',
  /** Number of the design offices: # and three or four digits (#026). */
  designOfficeNumber: '^#[0-9]{3,4}$',
} as const;

export const isProjectCode = (v: unknown): v is string => typeof v === 'string' && new RegExp(PG_FORMATS.projectCode).test(v);

/** Project label of ING-22: the design offices' number first, then Keystone's code (« #026 · HLT-026 »). */
export function projectLabel(p: { code: string; designOfficeNumber: string | null }): string {
  return p.designOfficeNumber ? `${p.designOfficeNumber} · ${p.code}` : p.code;
}
