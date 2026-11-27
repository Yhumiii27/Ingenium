// The engineering register of a project (delivery 2, lot 2a; docs/spec/03 § 4, ING-04): for each discipline the inputs it
// consumes (which document of whom, at which frozen or released revision), its deliverables up to the release (Codex
// references, never a file), the lists it generates for the next service, the consistency checks between disciplines and the
// recent changes. Pure rules and vocabularies, shared by the schema (CHECK constraints), the data layer, the Keystone transfer
// and the pages (labels are EN source strings translated through t()). Every state below is computed on read, never stored
// (docs/spec/04 § 1). Origin: Keystone's register (src/domain/engineering.ts of Keystone), rewritten for Ingenium.
import { can } from './rights';
import { DISCIPLINE_CODES, isDiscipline, type DisciplineCode } from './vocab';
import type { RoleKey } from '@/config/roles';

// ── Refusals of the Server Functions (EN source strings) ────────────────────────────────────────────────────────────

export const NOT_FOUND = 'Project not found';
export const HELD_IN_KEYSTONE = 'Held in Keystone until its switch-over to Ingenium: open it in Keystone';
export const STALE = 'Someone changed this record in the meantime: reload the page';

// ── Vocabularies ──────────────────────────────────────────────────────────────────────────────────────────────────

/** Who provides an input or receives a deliverable: a discipline, or a party outside the design offices. */
export const PARTIES = [...DISCIPLINE_CODES, 'client', 'site', 'purchasing', 'project_management'] as const;
export type Party = (typeof PARTIES)[number];
export const isParty = (v: unknown): v is Party => typeof v === 'string' && (PARTIES as readonly string[]).includes(v);
export const PARTY_LABEL: Record<Party, string> = {
  process: 'Process', mechanical: 'Mechanical', electrical: 'Electrical', automation: 'Automation',
  client: 'Client', site: 'Site', purchasing: 'Purchasing', project_management: 'Project management',
};

/**
 * State of a deliverable (a Codex document record of the discipline): Draft → Frozen → Release proposed → Released (the
 * circuit of the document type in Codex is authoritative, ING-20); Obsolete when withdrawn.
 */
export const DELIVERABLE_STATUSES = ['draft', 'frozen', 'release_proposed', 'released', 'obsolete'] as const;
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];
export const DELIVERABLE_STATUS_LABEL: Record<DeliverableStatus, string> = {
  draft: 'Draft', frozen: 'Frozen', release_proposed: 'Release proposed', released: 'Released', obsolete: 'Obsolete',
};
/** Statuses whose revision is a reference for the disciplines that consume it (a draft is still being written). */
export const REFERENCE_STATUSES: readonly DeliverableStatus[] = ['frozen', 'release_proposed', 'released', 'obsolete'];
export const isReferenceStatus = (s: DeliverableStatus) => REFERENCE_STATUSES.includes(s);

export const CHECK_SEVERITIES = ['blocking', 'warning', 'info'] as const;
export type CheckSeverity = (typeof CHECK_SEVERITIES)[number];
export const CHECK_SEVERITY_LABEL: Record<CheckSeverity, string> = { blocking: 'Blocking', warning: 'Warning', info: 'Information' };

export const CHECK_STATUSES = ['open', 'in_progress', 'sent_back', 'resolved', 'cancelled'] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];
export const CHECK_STATUS_LABEL: Record<CheckStatus, string> = {
  open: 'Open', in_progress: 'In progress', sent_back: 'Sent back to the tool', resolved: 'Resolved', cancelled: 'Cancelled',
};
export const OPEN_CHECK_STATUSES: readonly CheckStatus[] = ['open', 'in_progress', 'sent_back'];
export const isOpenCheck = (s: CheckStatus) => OPEN_CHECK_STATUSES.includes(s);

/** Kinds of a recent change (the sentence is built on display, translated; a typed note is shown as typed). */
export const CHANGE_KINDS = ['note', 'deliverable_frozen', 'deliverable_proposed', 'deliverable_released', 'deliverable_revised', 'deliverable_obsolete', 'input_confirmed', 'output_generated'] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];
export const CHANGE_KIND_LABEL: Record<ChangeKind, string> = {
  note: 'Note', deliverable_frozen: 'Frozen', deliverable_proposed: 'Release proposed', deliverable_released: 'Released', deliverable_revised: 'New revision started',
  deliverable_obsolete: 'Made obsolete', input_confirmed: 'Input confirmed', output_generated: 'List generated',
};

/** Where a register row comes from: Keystone (mirror, then the transfer), the demonstration's simulation, or Ingenium. */
export const REGISTER_SOURCES = ['keystone', 'simulation', 'ingenium'] as const;
export type RegisterSource = (typeof REGISTER_SOURCES)[number];

/** Formats (POSIX regular expressions, also the CHECK constraints). */
export const REGISTER_FORMATS = {
  /** Codex document number, or an external document's number (PID-HLT-026, PLA-HLT-0042, BOD-CLI-026). */
  documentNumber: '^[A-Z][A-Z0-9]{1,5}(-[A-Z0-9]{2,8}){1,3}$',
  /** Revision letter or number (A, B, AA, 2). */
  revision: '^[A-Z0-9]{1,3}$',
  /** Number of a check in its project (C-01). */
  checkNumber: '^C-[0-9]{2,4}$',
  /** Number of a generated list in its project (O-01). */
  outputNumber: '^O-[0-9]{2,4}$',
  /** Code of a consistency rule (process-electrical, revision). */
  ruleCode: '^[a-z][a-z0-9-]{1,39}$',
} as const;
const re = (k: keyof typeof REGISTER_FORMATS) => new RegExp(REGISTER_FORMATS[k]);
export const isDocumentNumber = (v: unknown): v is string => typeof v === 'string' && re('documentNumber').test(v);
export const isRevision = (v: unknown): v is string => typeof v === 'string' && re('revision').test(v);
export const isRuleCode = (v: unknown): v is string => typeof v === 'string' && re('ruleCode').test(v);

// ── Revisions ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The revision after `rev`: A → B, Z → AA, AZ → BA, 2 → 3; null when it has no successor in the format. */
export function nextRevision(rev: string): string | null {
  if (/^[0-9]{1,3}$/.test(rev)) {
    const n = Number(rev) + 1;
    return n <= 999 ? String(n) : null;
  }
  if (!/^[A-Z]{1,3}$/.test(rev)) return null;
  const chars = rev.split('');
  let i = chars.length - 1;
  while (i >= 0 && chars[i] === 'Z') chars[i--] = 'A';
  if (i < 0) return rev.length < 3 ? `A${chars.join('')}` : null;
  chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
  return chars.join('');
}

/** The next number of a project's checks or lists (C-01…, O-01…), from the numbers already used. */
export function nextNumber(prefix: 'C' | 'O', used: readonly string[]): string {
  const max = used.reduce((m, n) => {
    const x = new RegExp(`^${prefix}-([0-9]+)$`).exec(n);
    return x ? Math.max(m, Number(x[1])) : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(2, '0')}`;
}

// ── Inputs ────────────────────────────────────────────────────────────────────────────────────────────────────────

export const INPUT_STATES = ['up_to_date', 'to_confirm', 'outdated'] as const;
export type InputState = (typeof INPUT_STATES)[number];
export const INPUT_STATE_LABEL: Record<InputState, string> = { up_to_date: 'Up to date', to_confirm: 'To confirm', outdated: 'Outdated' };

/** What the register knows of a document a discipline consumes: its current revision and state, and its last reference revision. */
export interface ProviderDoc {
  revision: string;
  status: DeliverableStatus;
  /** Last revision that was frozen or released (the history of the deliverable), null when none. */
  lastReference: string | null;
}

/**
 * The revision a consumer should use (E-5 of Keystone: the latest frozen or released revision): the current one once it is a
 * reference, else the last reference revision of the history; a document outside the register (the client's basis of design)
 * has no newer revision than the one in use.
 */
export function referenceRevision(revisionInUse: string, provider: ProviderDoc | null | undefined): string {
  if (!provider) return revisionInUse;
  if (isReferenceStatus(provider.status)) return provider.revision;
  return provider.lastReference ?? revisionInUse;
}

/** Outdated when the revision in use is not the reference one; else up to date once confirmed by the discipline, else to confirm. */
export const inputStateOf = (revisionInUse: string, reference: string, acknowledged: boolean): InputState =>
  revisionInUse !== reference ? 'outdated' : acknowledged ? 'up_to_date' : 'to_confirm';

// ── Deliverables ──────────────────────────────────────────────────────────────────────────────────────────────────

export const DELIVERABLE_STEPS = ['freeze', 'propose', 'withdraw', 'release', 'revise', 'obsolete'] as const;
export type DeliverableStep = (typeof DELIVERABLE_STEPS)[number];
export const isDeliverableStep = (v: unknown): v is DeliverableStep => typeof v === 'string' && (DELIVERABLE_STEPS as readonly string[]).includes(v);

/**
 * The steps of a deliverable: from which states, to which state, who takes them and whether a reason is required.
 * `writer` = an engineer of the deliverable's discipline on the project (or the engineering lead); `lead` = the engineering
 * lead (right `validate_parts`: he proposes the release, ING-20); `release` records the release decided by the circuit of the
 * document type in Codex (ING-20), by the engineering lead or the document controller (right `documents`).
 */
export const DELIVERABLE_STEP: Record<DeliverableStep, { from: readonly DeliverableStatus[]; to: DeliverableStatus; who: 'writer' | 'lead' | 'release'; reason: boolean; label: string }> = {
  freeze: { from: ['draft'], to: 'frozen', who: 'writer', reason: false, label: 'Freeze' },
  propose: { from: ['frozen'], to: 'release_proposed', who: 'lead', reason: false, label: 'Propose the release' },
  withdraw: { from: ['release_proposed'], to: 'frozen', who: 'lead', reason: true, label: 'Withdraw the release proposal' },
  release: { from: ['release_proposed'], to: 'released', who: 'release', reason: false, label: 'Record the release decided in Codex' },
  revise: { from: ['frozen', 'released'], to: 'draft', who: 'writer', reason: false, label: 'Start a new revision' },
  obsolete: { from: ['draft', 'frozen', 'released'], to: 'obsolete', who: 'lead', reason: true, label: 'Make obsolete' },
};

/** The steps a deliverable in `status` offers. */
export const stepsFrom = (status: DeliverableStatus): DeliverableStep[] => DELIVERABLE_STEPS.filter((s) => DELIVERABLE_STEP[s].from.includes(status));

/** Share of the deliverables released (obsolete ones left out), 0 to 100; null when there is none. */
export function releasedShare(statuses: readonly DeliverableStatus[]): number | null {
  const live = statuses.filter((s) => s !== 'obsolete');
  return live.length ? Math.round((100 * live.filter((s) => s === 'released').length) / live.length) : null;
}

// ── Generated lists ───────────────────────────────────────────────────────────────────────────────────────────────

export const OUTPUT_STATES = ['blocked', 'to_generate', 'stale', 'up_to_date'] as const;
export type OutputState = (typeof OUTPUT_STATES)[number];
export const OUTPUT_STATE_LABEL: Record<OutputState, string> = { blocked: 'Blocked', to_generate: 'To generate', stale: 'Stale', up_to_date: 'Up to date' };

/**
 * State of a generated list: blocked while its discipline has an open blocking check; else to generate when never generated;
 * stale when its source deliverable has a newer reference revision than the one it was generated from; else up to date.
 */
export function outputStateOf(f: { openBlocking: number; generatedAt: Date | string | null; generatedFromRevision: string | null; sourceRevision: string | null }): OutputState {
  if (f.openBlocking > 0) return 'blocked';
  if (!f.generatedAt) return 'to_generate';
  if (f.sourceRevision && f.generatedFromRevision !== f.sourceRevision) return 'stale';
  return 'up_to_date';
}

// ── Checks ────────────────────────────────────────────────────────────────────────────────────────────────────────

export const CHECK_STEPS = ['start', 'send_back', 'reopen', 'resolve', 'cancel'] as const;
export type CheckStep = (typeof CHECK_STEPS)[number];
export const isCheckStep = (v: unknown): v is CheckStep => typeof v === 'string' && (CHECK_STEPS as readonly string[]).includes(v);

/**
 * The steps of a consistency check. The engineers of the owning discipline take it in hand or send it back to their tool
 * (« closes on the next import »); the engineering lead closes it (ING-19: « ferme les contrôles ») or cancels it with a reason.
 */
export const CHECK_STEP: Record<CheckStep, { from: readonly CheckStatus[]; to: CheckStatus; who: 'writer' | 'lead'; note: boolean; label: string }> = {
  start: { from: ['open'], to: 'in_progress', who: 'writer', note: false, label: 'Take in hand' },
  send_back: { from: ['open', 'in_progress'], to: 'sent_back', who: 'writer', note: true, label: 'Send back to the tool' },
  reopen: { from: ['sent_back'], to: 'open', who: 'writer', note: false, label: 'Reopen' },
  resolve: { from: ['open', 'in_progress', 'sent_back'], to: 'resolved', who: 'lead', note: true, label: 'Close as resolved' },
  cancel: { from: ['open', 'in_progress', 'sent_back'], to: 'cancelled', who: 'lead', note: true, label: 'Cancel' },
};
export const checkStepsFrom = (status: CheckStatus): CheckStep[] => CHECK_STEPS.filter((s) => CHECK_STEP[s].from.includes(status));

// ── Rights ────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface RegisterActor {
  roles: readonly RoleKey[];
  /** The actor's disciplines on the project's team (published by Keystone). */
  disciplines: readonly DisciplineCode[];
}

/** The engineering lead writes in every discipline; an engineer writes in their discipline on their project and reads the others. */
export const writesDiscipline = (a: RegisterActor, d: DisciplineCode): boolean =>
  can(a.roles, 'engineering') && (can(a.roles, 'validate_parts') || a.disciplines.includes(d));

/** May the actor take this step of a deliverable or a check of discipline `d`? */
export function mayTake(a: RegisterActor, who: 'writer' | 'lead' | 'release', d: DisciplineCode): boolean {
  if (who === 'writer') return writesDiscipline(a, d);
  if (who === 'lead') return can(a.roles, 'validate_parts');
  return can(a.roles, 'validate_parts') || can(a.roles, 'documents');
}

/** An engineering lead on the project's team, as Keystone publishes it (activity « Responsable ingénierie »). */
export function isLeadActivity(activity: string | null | undefined): boolean {
  if (!activity) return false;
  const a = activity.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return /responsable (de l.)?ingenierie|engineering lead|chef (du )?bureau d.etudes/.test(a);
}

// ── Summary: who waits for what ───────────────────────────────────────────────────────────────────────────────────

export interface WaitCell { waiting: number; total: number }

/**
 * Matrix « who waits for what »: for each consuming discipline and each provider (a discipline or an outside party), the inputs
 * not up to date (outdated or to confirm) among those it consumes from that provider.
 */
export function waitMatrix(inputs: readonly { consumer: DisciplineCode; provider: Party; state: InputState }[]): Record<DisciplineCode, Partial<Record<Party, WaitCell>>> {
  const m = Object.fromEntries(DISCIPLINE_CODES.map((d) => [d, {}])) as Record<DisciplineCode, Partial<Record<Party, WaitCell>>>;
  for (const i of inputs) {
    const cell = (m[i.consumer][i.provider] ??= { waiting: 0, total: 0 });
    cell.total += 1;
    if (i.state !== 'up_to_date') cell.waiting += 1;
  }
  return m;
}

/** A discipline code read from an outside row (Keystone's `meca`, `elec`, `auto` included), else null. */
export function disciplineOf(v: unknown): DisciplineCode | null {
  if (isDiscipline(v)) return v;
  const alias: Record<string, DisciplineCode> = { meca: 'mechanical', elec: 'electrical', auto: 'automation' };
  return typeof v === 'string' ? alias[v] ?? null : null;
}

/** A party read from an outside row (Keystone's `achats` is purchasing, its short discipline codes are mapped), else null. */
export function partyOf(v: unknown): Party | null {
  const d = disciplineOf(v);
  if (d) return d;
  if (isParty(v)) return v;
  const alias: Record<string, Party> = { achats: 'purchasing', cp: 'project_management', pm: 'project_management' };
  return typeof v === 'string' ? alias[v] ?? null : null;
}

// ── The derived register of a project ────────────────────────────────────────────────────────────────────────────

export interface RawInput { id: string; consumer: DisciplineCode; documentNumber: string; externalParty: Party | null; externalTitle: string | null; revisionInUse: string; acknowledged: boolean; acknowledgedByName: string | null }
export interface RawDeliverable { id: string; number: string; title: string; discipline: DisciplineCode; equipmentRef: string | null; revision: string; status: DeliverableStatus; issuedOn: string; authorName: string; recipients: Party[]; rowVersion: number; lastReference: string | null }
export interface RawOutput { id: string; number: string; discipline: DisciplineCode; name: string; recipients: Party[]; sourceDeliverable: string | null; sourceText: string | null; generatedAt: Date | null; generatedByName: string | null; generatedFromRevision: string | null }
export interface RawCheck { id: string; number: string; ruleCode: string; ruleLabel: string; severity: CheckSeverity; title: string; detail: string | null; owner: DisciplineCode; status: CheckStatus; note: string | null; closedByName: string | null; rowVersion: number }

export interface DerivedInput extends RawInput { provider: Party; title: string | null; reference: string; state: InputState }
export interface DerivedOutput extends RawOutput { sourceRevision: string | null; state: OutputState }
export interface DisciplineSummary { discipline: DisciplineCode; deliverables: number; released: number; releasedShare: number | null; inputsWaiting: number; openChecks: number; openBlocking: number; outputsBlocked: number }

export interface DerivedRegister {
  inputs: DerivedInput[];
  deliverables: RawDeliverable[];
  outputs: DerivedOutput[];
  checks: RawCheck[];
  summary: DisciplineSummary[];
  wait: Record<DisciplineCode, Partial<Record<Party, WaitCell>>>;
}

/** Every computed state of a project's register (input states, list states, summary by discipline, « who waits for what »). */
export function deriveRegister(raw: { inputs: readonly RawInput[]; deliverables: readonly RawDeliverable[]; outputs: readonly RawOutput[]; checks: readonly RawCheck[] }): DerivedRegister {
  const byNumber = new Map(raw.deliverables.map((d) => [d.number, d]));
  const inputs = raw.inputs.map((i): DerivedInput => {
    const doc = i.externalParty ? null : byNumber.get(i.documentNumber) ?? null;
    const reference = referenceRevision(i.revisionInUse, doc);
    return {
      ...i, provider: i.externalParty ?? doc?.discipline ?? 'client', title: i.externalTitle ?? doc?.title ?? null, reference,
      state: inputStateOf(i.revisionInUse, reference, i.acknowledged),
    };
  });
  const openBlockingOf = (d: DisciplineCode) => raw.checks.filter((c) => c.owner === d && c.severity === 'blocking' && isOpenCheck(c.status)).length;
  const outputs = raw.outputs.map((o): DerivedOutput => {
    const src = o.sourceDeliverable ? byNumber.get(o.sourceDeliverable) ?? null : null;
    const sourceRevision = src ? (isReferenceStatus(src.status) ? src.revision : src.lastReference) : null;
    return { ...o, sourceRevision, state: outputStateOf({ openBlocking: openBlockingOf(o.discipline), generatedAt: o.generatedAt, generatedFromRevision: o.generatedFromRevision, sourceRevision }) };
  });
  const summary = DISCIPLINE_CODES.map((d): DisciplineSummary => {
    const docs = raw.deliverables.filter((x) => x.discipline === d);
    const live = docs.filter((x) => x.status !== 'obsolete');
    const checks = raw.checks.filter((c) => c.owner === d && isOpenCheck(c.status));
    return {
      discipline: d, deliverables: live.length, released: live.filter((x) => x.status === 'released').length, releasedShare: releasedShare(docs.map((x) => x.status)),
      inputsWaiting: inputs.filter((i) => i.consumer === d && i.state !== 'up_to_date').length, openChecks: checks.length,
      openBlocking: checks.filter((c) => c.severity === 'blocking').length, outputsBlocked: outputs.filter((o) => o.discipline === d && o.state === 'blocked').length,
    };
  });
  return { inputs, deliverables: [...raw.deliverables], outputs, checks: [...raw.checks], summary, wait: waitMatrix(inputs) };
}
