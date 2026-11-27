import 'server-only';
// Reads of the engineering register (lot 2a). A project's register is read only for a project of the viewer's scope (the caller
// passes a ProjectRow from projectInScope: outside the scope the page is a 404 before anything is read). Every state is
// computed on read by deriveRegister (src/domain/register.ts).
import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm';
import { cache } from 'react';
import {
  deriveRegister, type ChangeKind, type CheckSeverity, type CheckStatus, type DeliverableStatus, type DerivedRegister, type Party,
  type RawCheck, type RawDeliverable,
} from '@/domain/register';
import type { DisciplineCode } from '@/domain/vocab';
import { getDb } from '@/server/db/client';
import {
  consistencyRules, deliverableRevisions, registerChanges, registerChecks, registerDeliverables, registerInputs, registerOutputs,
} from '@/server/db/schema';
import type { DB, Tx } from '@/server/db/types';
import { switchoverOf } from '@/server/integrations/keystone/register';

type Q = DB | Tx;

export interface ChangeRow { id: string; occurredOn: string; kind: ChangeKind; objectRef: string | null; revision: string | null; text: string | null; recipients: Party[]; byName: string }

export interface ProjectRegister extends DerivedRegister {
  /** Ingenium holds the register (switched over); false = Keystone's mirror, read only. */
  held: boolean;
  switchedAt: Date | null;
  changes: ChangeRow[];
  rules: { code: string; label: string }[];
}

/** The raw rows of the register of some projects (one query per table). */
export async function registerRows(q: Q, codes: readonly string[]) {
  if (!codes.length) return { inputs: [], deliverables: [], outputs: [], checks: [], revisions: [] };
  const [inputs, deliverables, outputs, checks, rules] = await Promise.all([
    q.select().from(registerInputs).where(inArray(registerInputs.projectCode, [...codes])).orderBy(asc(registerInputs.consumer), asc(registerInputs.documentNumber)),
    q.select().from(registerDeliverables).where(inArray(registerDeliverables.projectCode, [...codes])).orderBy(asc(registerDeliverables.discipline), asc(registerDeliverables.number)),
    q.select().from(registerOutputs).where(inArray(registerOutputs.projectCode, [...codes])).orderBy(asc(registerOutputs.number)),
    q.select().from(registerChecks).where(inArray(registerChecks.projectCode, [...codes])).orderBy(asc(registerChecks.number)),
    q.select().from(consistencyRules),
  ]);
  const ids = deliverables.map((d) => d.id);
  const revisions = ids.length
    ? await q.select().from(deliverableRevisions).where(and(inArray(deliverableRevisions.deliverableId, ids), ne(deliverableRevisions.status, 'draft'))).orderBy(desc(deliverableRevisions.occurredAt))
    : [];
  const ruleLabel = new Map(rules.map((r) => [r.code, r.label]));
  return {
    inputs, outputs, revisions,
    deliverables: deliverables.map((d): RawDeliverable & { projectCode: string } => ({
      id: d.id, projectCode: d.projectCode, number: d.number, title: d.title, discipline: d.discipline as DisciplineCode, equipmentRef: d.equipmentRef,
      revision: d.revision, status: d.status as DeliverableStatus, issuedOn: d.issuedOn, authorName: d.authorName, recipients: d.recipients as Party[],
      rowVersion: d.rowVersion,
      // Last revision that left the draft (history), or the current one when it is not a draft.
      lastReference: revisions.find((r) => r.deliverableId === d.id)?.revision ?? null,
    })),
    checks: checks.map((c): RawCheck & { projectCode: string } => ({
      id: c.id, projectCode: c.projectCode, number: c.number, ruleCode: c.ruleCode, ruleLabel: ruleLabel.get(c.ruleCode) ?? c.ruleCode, severity: c.severity as CheckSeverity,
      title: c.title, detail: c.detail, owner: c.owner as DisciplineCode, status: c.status as CheckStatus, note: c.note, closedByName: c.closedByName, rowVersion: c.rowVersion,
    })),
  };
}

/** The derived registers of some projects, by code (shared by the pages, the Home counters and the projection of the tasks). */
export async function derivedRegisters(q: Q, codes: readonly string[]): Promise<Map<string, DerivedRegister>> {
  const rows = await registerRows(q, codes);
  const out = new Map<string, DerivedRegister>();
  for (const code of codes)
    out.set(code, deriveRegister({
      inputs: rows.inputs.filter((i) => i.projectCode === code).map((i) => ({
        id: i.id, consumer: i.consumer as DisciplineCode, documentNumber: i.documentNumber, externalParty: i.externalParty as Party | null, externalTitle: i.externalTitle,
        revisionInUse: i.revisionInUse, acknowledged: !!i.acknowledgedAt, acknowledgedByName: i.acknowledgedByName,
      })),
      deliverables: rows.deliverables.filter((d) => d.projectCode === code),
      outputs: rows.outputs.filter((o) => o.projectCode === code).map((o) => ({
        id: o.id, number: o.number, discipline: o.discipline as DisciplineCode, name: o.name, recipients: o.recipients as Party[], sourceDeliverable: o.sourceDeliverable,
        sourceText: o.sourceText, generatedAt: o.generatedAt, generatedByName: o.generatedByName, generatedFromRevision: o.generatedFromRevision,
      })),
      checks: rows.checks.filter((c) => c.projectCode === code),
    }));
  return out;
}

/** The register of one project of the viewer's scope (memoised per request). */
export const projectRegister = cache(async (code: string): Promise<ProjectRegister> => {
  const db = await getDb();
  const [derived, sw, changes, rules] = await Promise.all([
    derivedRegisters(db, [code]),
    switchoverOf(db, 'register'),
    db.select().from(registerChanges).where(eq(registerChanges.projectCode, code)).orderBy(desc(registerChanges.occurredOn), desc(registerChanges.createdAt)).limit(30),
    db.select({ code: consistencyRules.code, label: consistencyRules.label }).from(consistencyRules).where(eq(consistencyRules.active, true)).orderBy(asc(consistencyRules.position)),
  ]);
  return {
    ...derived.get(code)!, held: !!sw, switchedAt: sw?.switchedAt ?? null, rules,
    changes: changes.map((c) => ({ id: c.id, occurredOn: c.occurredOn, kind: c.kind as ChangeKind, objectRef: c.objectRef, revision: c.revision, text: c.text, recipients: c.recipients as Party[], byName: c.byName })),
  };
});

/** Every consistency rule (administration). */
export async function allRules() {
  const db = await getDb();
  return db.select().from(consistencyRules).orderBy(asc(consistencyRules.position));
}
