'use server';
// Server Functions of the engineering register (lot 2a). Each one validates its input, reads the project in the viewer's scope,
// refuses while Keystone holds the register, checks the right (src/domain/register.ts: an engineer writes in their discipline,
// the engineering lead proposes releases and closes checks), re-reads the record inside its transaction (optimistic lock on
// deliverables and checks), writes, journals (append-only audit trail, revision history, recent changes) and rewrites the
// projection of the tasks in the same transaction.
import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/components/app/ActionForm';
import {
  CHECK_SEVERITIES, CHECK_STEP, DELIVERABLE_STEP, PARTIES, inputStateOf, isCheckStep, isDeliverableStep, isDocumentNumber, isOpenCheck, isRevision,
  mayTake, nextNumber, nextRevision, outputStateOf, referenceRevision, writesDiscipline, type CheckStatus, type DeliverableStatus, type Party,
} from '@/domain/register';
import { DISCIPLINE_CODES, type DisciplineCode } from '@/domain/vocab';
import { FORBIDDEN } from '@/domain/rights';
import { businessToday } from '@/server/clock';
import { getDb } from '@/server/db/client';
import { writeAudit } from '@/server/db/helpers';
import {
  consistencyRules, deliverableRevisions, registerChanges, registerChecks, registerDeliverables, registerInputs, registerOutputs,
} from '@/server/db/schema';
import type { Tx } from '@/server/db/types';
import { registerRows } from '@/server/dal/register';
import { NOT_FOUND, registerContext, STALE, type RegisterContext } from '@/server/register/guard';
import { rebuildPublishedTasks } from '@/server/tasks/projection';

type Ok = Extract<RegisterContext, { ok: true }>;
const INVALID = 'Some fields are missing or invalid';
const AREA = 'Engineering register';

const text = (max: number) => z.string().trim().min(1).max(max);
const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const discipline = z.enum(DISCIPLINE_CODES);
const party = z.enum(PARTIES);
const docNumber = z.string().trim().toUpperCase().refine(isDocumentNumber);
const revision = z.string().trim().toUpperCase().refine(isRevision);
const version = z.coerce.number().int().min(1);

const fields = (fd: FormData) => Object.fromEntries([...fd.keys()].map((k) => [k, fd.getAll(k).length > 1 ? fd.getAll(k) : fd.get(k) ?? undefined]));
const list = (v: unknown) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);

class Refused extends Error {}

/** Runs a write of the register: context, transaction, projection, revalidation; a refusal is a translated message. */
async function write(code: unknown, run: (c: Ok, tx: Tx, today: string, now: Date) => Promise<void>): Promise<ActionResult> {
  const c = await registerContext(code);
  if (!c.ok) return c;
  const today = await businessToday();
  const now = new Date();
  try {
    await (await getDb()).transaction(async (tx) => {
      await run(c, tx, today, now);
      await rebuildPublishedTasks(tx, now);
    });
  } catch (e) {
    if (e instanceof Refused) return { ok: false, error: e.message };
    throw e;
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

const refuse = (m: string): never => { throw new Refused(m); };
const actorOf = (c: Ok) => ({ actorName: c.viewer.name, actorUserId: c.viewer.userId, actorRole: c.viewer.role, area: AREA });
const change = (tx: Tx, c: Ok, today: string, v: { kind: typeof registerChanges.$inferInsert.kind; objectRef: string | null; revision?: string | null; text?: string | null; recipients: Party[] }) =>
  tx.insert(registerChanges).values({ projectCode: c.project.code, occurredOn: today, kind: v.kind, objectRef: v.objectRef, revision: v.revision ?? null, text: v.text ?? null, recipients: v.recipients, byName: c.viewer.name, source: 'ingenium' });

// ── Inputs ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The discipline confirms it uses the reference revision of an input (the revision in use becomes the reference one). */
export async function confirmInputAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(fd.get('id'));
  if (!id.success) return { ok: false, error: INVALID };
  return write(fd.get('project'), async (c, tx, today, now) => {
    const [i] = await tx.select().from(registerInputs).where(and(eq(registerInputs.id, id.data), eq(registerInputs.projectCode, c.project.code))).for('update');
    if (!i) refuse(NOT_FOUND);
    if (!writesDiscipline(c.actor, i.consumer as DisciplineCode)) refuse(FORBIDDEN);
    const rows = await registerRows(tx, [c.project.code]);
    const doc = i.externalParty ? null : rows.deliverables.find((d) => d.number === i.documentNumber) ?? null;
    const reference = referenceRevision(i.revisionInUse, doc);
    if (inputStateOf(i.revisionInUse, reference, !!i.acknowledgedAt) === 'up_to_date') refuse('This input is already up to date');
    await tx.update(registerInputs).set({ revisionInUse: reference, acknowledgedAt: now, acknowledgedByName: c.viewer.name, updatedAt: now }).where(eq(registerInputs.id, i.id));
    await change(tx, c, today, { kind: 'input_confirmed', objectRef: i.documentNumber, revision: reference, recipients: [i.consumer as Party] });
    await writeAudit(tx, { ...actorOf(c), objectRef: `${c.project.code} ${i.documentNumber}`, change: `input confirmed by ${i.consumer}: rev ${i.revisionInUse} → ${reference}`, entityType: 'register_input', entityId: i.id });
  });
}

const InputForm = z.object({
  consumer: discipline, document: docNumber, revision, party: z.union([party, z.literal('')]).optional(), title: optText(200),
});

/** A discipline declares a document it consumes: a deliverable of the project's register, or an outside document (client…). */
export async function addInputAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const f = InputForm.safeParse(fields(fd));
  if (!f.success) return { ok: false, error: INVALID };
  const external = f.data.party && !(DISCIPLINE_CODES as readonly string[]).includes(f.data.party) ? f.data.party : null;
  if (external && !f.data.title) return { ok: false, error: 'An outside document needs its title' };
  return write(fd.get('project'), async (c, tx, _today, now) => {
    if (!writesDiscipline(c.actor, f.data.consumer)) refuse(FORBIDDEN);
    if (!external) {
      const [doc] = await tx.select({ id: registerDeliverables.id }).from(registerDeliverables)
        .where(and(eq(registerDeliverables.projectCode, c.project.code), eq(registerDeliverables.number, f.data.document)));
      if (!doc) refuse('No deliverable of the project has this number: choose an outside provider');
    }
    const [dup] = await tx.select({ id: registerInputs.id }).from(registerInputs)
      .where(and(eq(registerInputs.projectCode, c.project.code), eq(registerInputs.consumer, f.data.consumer), eq(registerInputs.documentNumber, f.data.document)));
    if (dup) refuse('This discipline already consumes this document');
    const [row] = await tx.insert(registerInputs).values({
      projectCode: c.project.code, consumer: f.data.consumer, documentNumber: f.data.document, externalParty: external, externalTitle: external ? f.data.title : null,
      revisionInUse: f.data.revision, acknowledgedAt: now, acknowledgedByName: c.viewer.name, source: 'ingenium', createdAt: now, updatedAt: now,
    }).returning({ id: registerInputs.id });
    await writeAudit(tx, { ...actorOf(c), objectRef: `${c.project.code} ${f.data.document}`, change: `input added for ${f.data.consumer} at rev ${f.data.revision}`, entityType: 'register_input', entityId: row.id });
  });
}

// ── Deliverables ──────────────────────────────────────────────────────────────────────────────────────────────────

const DeliverableForm = z.object({
  discipline, number: docNumber, title: text(200), revision, equipment: optText(60), recipients: z.array(party).max(PARTIES.length),
});

/** A discipline registers a deliverable (its Codex document number; the file stays in Codex), as a draft. */
export async function addDeliverableAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const raw = fields(fd);
  const f = DeliverableForm.safeParse({ ...raw, recipients: list(raw.recipients) });
  if (!f.success) return { ok: false, error: INVALID };
  return write(fd.get('project'), async (c, tx, today, now) => {
    if (!writesDiscipline(c.actor, f.data.discipline)) refuse(FORBIDDEN);
    const [dup] = await tx.select({ id: registerDeliverables.id }).from(registerDeliverables)
      .where(and(eq(registerDeliverables.projectCode, c.project.code), eq(registerDeliverables.number, f.data.number)));
    if (dup) refuse('A deliverable of the project already has this number');
    const [row] = await tx.insert(registerDeliverables).values({
      projectCode: c.project.code, number: f.data.number, title: f.data.title, discipline: f.data.discipline, equipmentRef: f.data.equipment, revision: f.data.revision,
      status: 'draft', issuedOn: today, authorName: c.viewer.name, recipients: [...new Set(f.data.recipients)], source: 'ingenium', createdAt: now, updatedAt: now,
    }).returning({ id: registerDeliverables.id });
    await tx.insert(deliverableRevisions).values({ deliverableId: row.id, revision: f.data.revision, status: 'draft', occurredAt: now, byName: c.viewer.name });
    await writeAudit(tx, { ...actorOf(c), objectRef: `${c.project.code} ${f.data.number}`, change: `deliverable registered: rev ${f.data.revision} draft`, entityType: 'register_deliverable', entityId: row.id });
  });
}

const StepForm = z.object({ id: z.string().uuid(), step: z.string().refine(isDeliverableStep), version, reason: optText(500), revision: z.string().trim().toUpperCase().optional() });
const CHANGE_OF: Partial<Record<DeliverableStatus, typeof registerChanges.$inferInsert.kind>> = {
  frozen: 'deliverable_frozen', release_proposed: 'deliverable_proposed', released: 'deliverable_released', draft: 'deliverable_revised', obsolete: 'deliverable_obsolete',
};

/** A step of a deliverable (freeze, propose the release, withdraw, record the release decided in Codex, new revision, obsolete). */
export async function deliverableStepAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const f = StepForm.safeParse(fields(fd));
  if (!f.success || !isDeliverableStep(f.data.step)) return { ok: false, error: INVALID };
  const step = DELIVERABLE_STEP[f.data.step];
  if (step.reason && !f.data.reason) return { ok: false, error: 'A reason is required' };
  return write(fd.get('project'), async (c, tx, today, now) => {
    const [d] = await tx.select().from(registerDeliverables).where(and(eq(registerDeliverables.id, f.data.id), eq(registerDeliverables.projectCode, c.project.code))).for('update');
    if (!d) refuse(NOT_FOUND);
    if (!mayTake(c.actor, step.who, d.discipline as DisciplineCode)) refuse(FORBIDDEN);
    if (d.rowVersion !== f.data.version) refuse(STALE);
    if (!step.from.includes(d.status as DeliverableStatus)) refuse('This step is not open in the deliverable’s state');
    let rev = d.revision;
    if (f.data.step === 'revise') {
      const next = f.data.revision || nextRevision(d.revision);
      if (!next || !isRevision(next) || next === d.revision) refuse('Give the new revision (letter or number)');
      rev = next!;
    }
    await tx.update(registerDeliverables).set({ status: step.to, revision: rev, issuedOn: today, rowVersion: sql`${registerDeliverables.rowVersion} + 1`, updatedAt: now })
      .where(eq(registerDeliverables.id, d.id));
    await tx.insert(deliverableRevisions).values({ deliverableId: d.id, revision: rev, status: step.to, occurredAt: now, byName: c.viewer.name, reason: f.data.reason });
    await change(tx, c, today, { kind: CHANGE_OF[step.to]!, objectRef: d.number, revision: rev, text: f.data.reason, recipients: d.recipients as Party[] });
    await writeAudit(tx, {
      ...actorOf(c), objectRef: `${c.project.code} ${d.number}`, change: `deliverable ${f.data.step}: rev ${d.revision} ${d.status} → rev ${rev} ${step.to}`,
      entityType: 'register_deliverable', entityId: d.id, reason: f.data.reason, before: { revision: d.revision, status: d.status }, after: { revision: rev, status: step.to },
    });
  });
}

// ── Generated lists ───────────────────────────────────────────────────────────────────────────────────────────────

const OutputForm = z.object({ discipline, name: text(120), recipients: z.array(party).min(1).max(PARTIES.length), sourceDeliverable: z.union([docNumber, z.literal('')]).optional(), sourceText: optText(200) });

/** A discipline declares a list it generates for the next service (numbered O-nn in the project). */
export async function addOutputAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const raw = fields(fd);
  const f = OutputForm.safeParse({ ...raw, recipients: list(raw.recipients) });
  if (!f.success) return { ok: false, error: INVALID };
  return write(fd.get('project'), async (c, tx, _today, now) => {
    if (!writesDiscipline(c.actor, f.data.discipline)) refuse(FORBIDDEN);
    const src = f.data.sourceDeliverable || null;
    if (src) {
      const [doc] = await tx.select({ id: registerDeliverables.id }).from(registerDeliverables).where(and(eq(registerDeliverables.projectCode, c.project.code), eq(registerDeliverables.number, src)));
      if (!doc) refuse('No deliverable of the project has this number');
    }
    const used = (await tx.select({ n: registerOutputs.number }).from(registerOutputs).where(eq(registerOutputs.projectCode, c.project.code))).map((r) => r.n);
    const number = nextNumber('O', used);
    const [row] = await tx.insert(registerOutputs).values({
      projectCode: c.project.code, number, discipline: f.data.discipline, name: f.data.name, recipients: [...new Set(f.data.recipients)], sourceDeliverable: src,
      sourceText: f.data.sourceText, source: 'ingenium', createdAt: now, updatedAt: now,
    }).returning({ id: registerOutputs.id });
    await writeAudit(tx, { ...actorOf(c), objectRef: `${c.project.code} ${number}`, change: `generated list declared: ${f.data.discipline}`, entityType: 'register_output', entityId: row.id });
  });
}

/** Records the generation of a list (refused while it is blocked by an open blocking check of its discipline). */
export async function generateOutputAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(fd.get('id'));
  if (!id.success) return { ok: false, error: INVALID };
  return write(fd.get('project'), async (c, tx, today, now) => {
    const [o] = await tx.select().from(registerOutputs).where(and(eq(registerOutputs.id, id.data), eq(registerOutputs.projectCode, c.project.code))).for('update');
    if (!o) refuse(NOT_FOUND);
    if (!writesDiscipline(c.actor, o.discipline as DisciplineCode)) refuse(FORBIDDEN);
    const rows = await registerRows(tx, [c.project.code]);
    const openBlocking = rows.checks.filter((k) => k.owner === o.discipline && k.severity === 'blocking' && isOpenCheck(k.status)).length;
    const src = o.sourceDeliverable ? rows.deliverables.find((d) => d.number === o.sourceDeliverable) ?? null : null;
    const sourceRevision = src ? (src.status === 'draft' ? src.lastReference : src.revision) : null;
    if (outputStateOf({ openBlocking, generatedAt: null, generatedFromRevision: null, sourceRevision }) === 'blocked') refuse('Blocked by an open blocking check of the discipline');
    await tx.update(registerOutputs).set({ generatedAt: now, generatedByName: c.viewer.name, generatedFromRevision: sourceRevision, updatedAt: now }).where(eq(registerOutputs.id, o.id));
    await change(tx, c, today, { kind: 'output_generated', objectRef: o.number, revision: sourceRevision, recipients: o.recipients as Party[] });
    await writeAudit(tx, { ...actorOf(c), objectRef: `${c.project.code} ${o.number}`, change: `list generated${sourceRevision ? ` from rev ${sourceRevision}` : ''}`, entityType: 'register_output', entityId: o.id });
  });
}

// ── Checks ────────────────────────────────────────────────────────────────────────────────────────────────────────

const CheckForm = z.object({ rule: z.string().trim().min(2).max(40), severity: z.enum(CHECK_SEVERITIES), owner: discipline, title: text(200), detail: optText(500) });

/** Raises a consistency check (numbered C-nn): an engineer in a discipline they write in, or the engineering lead. */
export async function raiseCheckAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const f = CheckForm.safeParse(fields(fd));
  if (!f.success) return { ok: false, error: INVALID };
  return write(fd.get('project'), async (c, tx, _today, now) => {
    if (!c.actor.disciplines.some((d) => writesDiscipline(c.actor, d)) && !mayTake(c.actor, 'lead', f.data.owner)) refuse(FORBIDDEN);
    const [rule] = await tx.select().from(consistencyRules).where(and(eq(consistencyRules.code, f.data.rule), eq(consistencyRules.active, true)));
    if (!rule) refuse('Unknown consistency rule');
    const used = (await tx.select({ n: registerChecks.number }).from(registerChecks).where(eq(registerChecks.projectCode, c.project.code))).map((r) => r.n);
    const number = nextNumber('C', used);
    const [row] = await tx.insert(registerChecks).values({
      projectCode: c.project.code, number, ruleCode: rule.code, severity: f.data.severity, title: f.data.title, detail: f.data.detail, owner: f.data.owner,
      status: 'open', raisedByName: c.viewer.name, source: 'ingenium', createdAt: now, updatedAt: now,
    }).returning({ id: registerChecks.id });
    await writeAudit(tx, { ...actorOf(c), objectRef: `${c.project.code} ${number}`, change: `check raised: ${f.data.severity}, owner ${f.data.owner}`, entityType: 'register_check', entityId: row.id });
  });
}

const CheckStepForm = z.object({ id: z.string().uuid(), step: z.string().refine(isCheckStep), version, note: optText(500) });

/** A step of a check (take in hand, send back to the tool, reopen; close as resolved or cancel: the engineering lead). */
export async function checkStepAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const f = CheckStepForm.safeParse(fields(fd));
  if (!f.success || !isCheckStep(f.data.step)) return { ok: false, error: INVALID };
  const step = CHECK_STEP[f.data.step];
  if (step.note && !f.data.note) return { ok: false, error: 'A note is required' };
  return write(fd.get('project'), async (c, tx, _today, now) => {
    const [k] = await tx.select().from(registerChecks).where(and(eq(registerChecks.id, f.data.id), eq(registerChecks.projectCode, c.project.code))).for('update');
    if (!k) refuse(NOT_FOUND);
    if (!mayTake(c.actor, step.who, k.owner as DisciplineCode)) refuse(FORBIDDEN);
    if (k.rowVersion !== f.data.version) refuse(STALE);
    if (!step.from.includes(k.status as CheckStatus)) refuse('This step is not open in the check’s state');
    const closed = step.to === 'resolved' || step.to === 'cancelled';
    await tx.update(registerChecks).set({
      status: step.to, note: f.data.note ?? (step.to === 'open' || step.to === 'in_progress' ? k.note : null), closedAt: closed ? now : null, closedByName: closed ? c.viewer.name : null,
      rowVersion: sql`${registerChecks.rowVersion} + 1`, updatedAt: now,
    }).where(eq(registerChecks.id, k.id));
    await writeAudit(tx, {
      ...actorOf(c), objectRef: `${c.project.code} ${k.number}`, change: `check ${f.data.step}: ${k.status} → ${step.to}`, entityType: 'register_check', entityId: k.id,
      reason: f.data.note, before: { status: k.status }, after: { status: step.to },
    });
  });
}

// ── Changes ───────────────────────────────────────────────────────────────────────────────────────────────────────

const NoteForm = z.object({ text: text(500), recipients: z.array(party).max(PARTIES.length) });

/** Records a change and its impact (a typed note, shown as typed): any engineer of the project's team or the lead. */
export async function addChangeAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const raw = fields(fd);
  const f = NoteForm.safeParse({ ...raw, recipients: list(raw.recipients) });
  if (!f.success) return { ok: false, error: INVALID };
  return write(fd.get('project'), async (c, tx, today) => {
    if (!c.actor.disciplines.some((d) => writesDiscipline(c.actor, d)) && !mayTake(c.actor, 'lead', 'process')) refuse(FORBIDDEN);
    await change(tx, c, today, { kind: 'note', objectRef: null, text: f.data.text, recipients: [...new Set(f.data.recipients)] });
    await writeAudit(tx, { ...actorOf(c), objectRef: c.project.code, change: 'change recorded' });
  });
}
