// Transfer of an object from Keystone to Ingenium (docs/spec/06 § 1 and § 2, ING-26 default: temporary views
// keystone.pub_reprise_*, one import per object, dry run then applied once, journalled). Pure: what a row of a transfer view
// becomes in Ingenium, and the plan of a run (rows kept, rows refused with their reason — a gap is a motivated refusal, never
// an overwrite). Lot 2a transfers the engineering register (keystone.pub_reprise_registre_ingenierie, shape asked of Keystone in
// DI-K2: one row per object, columns `nature`, `projet_code`, `keystone_id`, `donnees` jsonb).
import {
  CHECK_SEVERITIES, CHECK_STATUSES, DELIVERABLE_STATUSES, disciplineOf, isDocumentNumber, isRevision, isRuleCode, partyOf,
  REGISTER_FORMATS, type CheckSeverity, type CheckStatus, type DeliverableStatus, type Party,
} from './register';
import { isProjectCode, type DisciplineCode } from './vocab';

/** The objects that switch over one by one (order of docs/spec/06 § 2, phase 2). Lot 2a builds the register's. */
export const TRANSFER_OBJECTS = ['register', 'pid', 'drawings', 'pack', 'interfaces', 'ce', 'parts', 'bom'] as const;
export type TransferObject = (typeof TRANSFER_OBJECTS)[number];
export const TRANSFER_OBJECT_LABEL: Record<TransferObject, string> = {
  register: 'Engineering register', pid: 'P&ID validation', drawings: 'Drawings', pack: 'Engineering pack', interfaces: 'Interfaces',
  ce: 'CE technical file', parts: 'Parts', bom: 'Engineering bill of materials',
};
export const TRANSFER_MODES = ['dry_run', 'applied'] as const;
export type TransferMode = (typeof TRANSFER_MODES)[number];

/** Natures of the rows of keystone.pub_reprise_registre_ingenierie. */
export const REGISTER_NATURES = ['regle', 'entree', 'livrable', 'liste', 'controle', 'changement'] as const;
export type RegisterNature = (typeof REGISTER_NATURES)[number];

export interface RuleRec { code: string; label: string }
export interface InputRec { projectCode: string; keystoneId: string | null; consumer: DisciplineCode; documentNumber: string; externalParty: Party | null; externalTitle: string | null; revisionInUse: string; acknowledged: boolean }
export interface DeliverableRec { projectCode: string; keystoneId: string | null; number: string; title: string; discipline: DisciplineCode; equipmentRef: string | null; revision: string; status: DeliverableStatus; issuedOn: string; authorName: string; recipients: Party[] }
export interface OutputRec { projectCode: string; keystoneId: string | null; number: string; discipline: DisciplineCode; name: string; recipients: Party[]; sourceDeliverable: string | null; sourceText: string | null; generatedAt: string | null; generatedByName: string | null; generatedFromRevision: string | null }
export interface CheckRec { projectCode: string; keystoneId: string | null; number: string; ruleCode: string; severity: CheckSeverity; title: string; detail: string | null; owner: DisciplineCode; status: CheckStatus; note: string | null; closedAt: string | null; closedByName: string | null }
export interface ChangeRec { projectCode: string; occurredOn: string; text: string; recipients: Party[] }

export interface RegisterRecords { rules: RuleRec[]; inputs: InputRec[]; deliverables: DeliverableRec[]; outputs: OutputRec[]; checks: CheckRec[]; changes: ChangeRec[] }
export interface Refusal { nature: string; key: string; reason: string }
export interface RegisterPlan { records: RegisterRecords; counts: Record<string, number>; refusals: Refusal[] }

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const day = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.slice(0, 10) : v instanceof Date ? v.toISOString().slice(0, 10) : null;
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) ? s : null;
};
const instant = (v: unknown): string | null => {
  if (v instanceof Date) return v.toISOString();
  return typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null;
};
const parties = (v: unknown): Party[] | null => {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,;]/) : [];
  const out = list.map((x) => partyOf(typeof x === 'string' ? x.trim() : x));
  return out.every((p): p is Party => !!p) ? [...new Set(out)] : null;
};
const oneOf = <T extends string>(list: readonly T[], v: unknown): T | null => (typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : null);
const reCheck = new RegExp(REGISTER_FORMATS.checkNumber);
const reOutput = new RegExp(REGISTER_FORMATS.outputNumber);

/** Keystone's check states (Open, In progress, Resolved, Sent back) or Ingenium's codes. */
function checkStatusOf(v: unknown): CheckStatus | null {
  const s = typeof v === 'string' ? v.trim().toLowerCase().replace(/\s+/g, '_') : '';
  return oneOf(CHECK_STATUSES, s) ?? ({ resolu: 'resolved', ouvert: 'open', en_cours: 'in_progress', renvoye: 'sent_back' } as Record<string, CheckStatus>)[s] ?? null;
}
function deliverableStatusOf(v: unknown): DeliverableStatus | null {
  const s = typeof v === 'string' ? v.trim().toLowerCase().replace(/\s+/g, '_') : '';
  return oneOf(DELIVERABLE_STATUSES, s) ?? ({ brouillon: 'draft', fige: 'frozen', diffuse: 'released', obsolete: 'obsolete' } as Record<string, DeliverableStatus>)[s] ?? null;
}

/**
 * The plan of a transfer of the register: every row of the view parsed, refused with a reason when it cannot be imported
 * (unknown nature, project not published by Keystone, a value outside its format, a duplicate key, a check on an unknown
 * rule). `projects` are the codes of Keystone's mirror; `knownRules` the rules already held by Ingenium.
 */
export function planRegisterTransfer(rows: readonly Record<string, unknown>[], projects: ReadonlySet<string>, knownRules: ReadonlySet<string> = new Set()): RegisterPlan {
  const records: RegisterRecords = { rules: [], inputs: [], deliverables: [], outputs: [], checks: [], changes: [] };
  const refusals: Refusal[] = [];
  const counts: Record<string, number> = { read: rows.length };
  const seen = new Set<string>();
  const refuse = (nature: string, key: string, reason: string) => refusals.push({ nature, key, reason });
  const rules = new Set(knownRules);
  const ordered = [...rows].sort((a, b) => Number(a.nature !== 'regle') - Number(b.nature !== 'regle'));
  for (const r of ordered) {
    const nature = oneOf(REGISTER_NATURES, r.nature);
    const d = (r.donnees && typeof r.donnees === 'object' ? r.donnees : {}) as Record<string, unknown>;
    const keystoneId = r.keystone_id == null ? null : String(r.keystone_id);
    if (!nature) { refuse(String(r.nature ?? '?'), keystoneId ?? '?', 'Unknown nature'); continue; }
    if (nature === 'regle') {
      const code = str(d.code);
      const label = str(d.libelle);
      if (!code || !isRuleCode(code) || !label) { refuse(nature, code ?? keystoneId ?? '?', 'A value is outside its format'); continue; }
      if (seen.has(`regle|${code}`)) { refuse(nature, code, 'Duplicate'); continue; }
      seen.add(`regle|${code}`);
      rules.add(code);
      records.rules.push({ code, label });
      continue;
    }
    const projectCode = str(r.projet_code);
    if (!projectCode || !isProjectCode(projectCode) || !projects.has(projectCode)) { refuse(nature, keystoneId ?? '?', 'Project not published by Keystone'); continue; }
    if (nature === 'entree') {
      const consumer = disciplineOf(d.consommateur);
      const documentNumber = str(d.document);
      const revision = str(d.revision);
      const party = d.fournisseur == null || d.fournisseur === '' ? null : partyOf(d.fournisseur);
      const external = party && !disciplineOf(party) ? party : null;
      const key = `${projectCode} ${consumer ?? '?'} ${documentNumber ?? '?'}`;
      if (!consumer || !documentNumber || !isDocumentNumber(documentNumber) || !revision || !isRevision(revision) || (d.fournisseur && !party) || (external && !str(d.titre))) { refuse(nature, key, 'A value is outside its format'); continue; }
      if (seen.has(`entree|${key}`)) { refuse(nature, key, 'Duplicate'); continue; }
      seen.add(`entree|${key}`);
      records.inputs.push({ projectCode, keystoneId, consumer, documentNumber, externalParty: external, externalTitle: external ? str(d.titre) : null, revisionInUse: revision, acknowledged: d.confirmee === true });
    } else if (nature === 'livrable') {
      const number = str(d.numero);
      const discipline = disciplineOf(d.discipline);
      const revision = str(d.revision);
      const status = deliverableStatusOf(d.etat);
      const issuedOn = day(d.date);
      const recipients = parties(d.destinataires ?? []);
      const key = `${projectCode} ${number ?? '?'}`;
      if (!number || !isDocumentNumber(number) || !str(d.titre) || !discipline || !revision || !isRevision(revision) || !status || !issuedOn || !str(d.auteur) || !recipients) { refuse(nature, key, 'A value is outside its format'); continue; }
      if (seen.has(`livrable|${key}`)) { refuse(nature, key, 'Duplicate'); continue; }
      seen.add(`livrable|${key}`);
      records.deliverables.push({ projectCode, keystoneId, number, title: str(d.titre)!, discipline, equipmentRef: str(d.equipement), revision, status, issuedOn, authorName: str(d.auteur)!, recipients });
    } else if (nature === 'liste') {
      const number = str(d.numero);
      const discipline = disciplineOf(d.discipline);
      const recipients = parties(d.destinataires ?? []);
      const sourceDeliverable = str(d.document_source);
      const generatedAt = d.genere_le == null ? null : instant(d.genere_le);
      const from = str(d.revision_source);
      const key = `${projectCode} ${number ?? '?'}`;
      if (!number || !reOutput.test(number) || !discipline || !str(d.nom) || !recipients || (sourceDeliverable && !isDocumentNumber(sourceDeliverable)) || (d.genere_le != null && !generatedAt) || (from && !isRevision(from))) { refuse(nature, key, 'A value is outside its format'); continue; }
      if (seen.has(`liste|${key}`)) { refuse(nature, key, 'Duplicate'); continue; }
      seen.add(`liste|${key}`);
      records.outputs.push({
        projectCode, keystoneId, number, discipline, name: str(d.nom)!, recipients, sourceDeliverable, sourceText: str(d.source),
        generatedAt, generatedByName: generatedAt ? str(d.genere_par) ?? 'Keystone' : null, generatedFromRevision: generatedAt ? from : null,
      });
    } else if (nature === 'controle') {
      const number = str(d.numero);
      const ruleCode = str(d.regle);
      const severity = oneOf(CHECK_SEVERITIES, d.gravite);
      const owner = disciplineOf(d.discipline);
      const status = checkStatusOf(d.etat);
      const key = `${projectCode} ${number ?? '?'}`;
      if (!number || !reCheck.test(number) || !ruleCode || !severity || !str(d.titre) || !owner || !status) { refuse(nature, key, 'A value is outside its format'); continue; }
      if (!rules.has(ruleCode)) { refuse(nature, key, 'Unknown consistency rule'); continue; }
      if (seen.has(`controle|${key}`)) { refuse(nature, key, 'Duplicate'); continue; }
      seen.add(`controle|${key}`);
      const closed = status === 'resolved' || status === 'cancelled';
      const note = str(d.note) ?? (closed || status === 'sent_back' ? 'Repris de Keystone' : null);
      records.checks.push({
        projectCode, keystoneId, number, ruleCode, severity, title: str(d.titre)!, detail: str(d.detail), owner, status, note,
        // A closed check without its date is dated by the run that mirrors it (the writer).
        closedAt: closed ? instant(d.ferme_le) : null,
        closedByName: closed ? str(d.ferme_par) ?? 'Keystone' : null,
      });
    } else {
      const occurredOn = day(d.date);
      const text = str(d.texte);
      const recipients = parties(d.destinataires ?? []);
      if (!occurredOn || !text || !recipients) { refuse(nature, `${projectCode} ${keystoneId ?? '?'}`, 'A value is outside its format'); continue; }
      records.changes.push({ projectCode, occurredOn, text, recipients });
    }
  }
  counts.rules = records.rules.length;
  counts.inputs = records.inputs.length;
  counts.deliverables = records.deliverables.length;
  counts.outputs = records.outputs.length;
  counts.checks = records.checks.length;
  counts.changes = records.changes.length;
  counts.refused = refusals.length;
  return { records, counts, refusals };
}

/** Refusal reasons (EN source strings, translated on display). */
export const TRANSFER_REASONS = ['Unknown nature', 'Project not published by Keystone', 'A value is outside its format', 'Duplicate', 'Unknown consistency rule'] as const;
