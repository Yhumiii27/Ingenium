// The engineering register (delivery 2, lot 2a; docs/spec/04 § 2): consistency rules (reference data of the administration),
// and per project the inputs, deliverables (Codex references, never a file) and their revision history, generated lists,
// consistency checks and recent changes. No foreign key to project_mirror: the mirror is Keystone's and is rewritten by its
// connector, the register is Ingenium's (a project leaving Keystone's publication never deletes engineering data). Every
// state the pages show (input up to date, list blocked or stale, progress) is computed on read, never stored. One source per
// object (docs/spec/06): until the register's switch-over the rows are Keystone's mirror (source keystone | simulation),
// written only by the connector; afterwards only Ingenium writes them. The revision history and the changes are append-only
// and a frozen revision never changes (triggers of the migration 0004).
import { sql } from 'drizzle-orm';
import { boolean, check, date, index, integer, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import {
  CHANGE_KINDS, CHECK_SEVERITIES, CHECK_STATUSES, DELIVERABLE_STATUSES, PARTIES, REGISTER_FORMATS, REGISTER_SOURCES,
} from '@/domain/register';
import { DISCIPLINE_CODES, PG_FORMATS } from '@/domain/vocab';
import { ingenium } from './_schema';
import { id, inList, matches, notBlank, timestamps } from './_common';

const projectCode = () => text('project_code').notNull();
const partiesOk = (col: Parameters<typeof inList>[0]) =>
  sql`${col} <@ array[${sql.raw(PARTIES.map((p) => `'${p}'`).join(', '))}]::text[]`;

/** Consistency rules between disciplines (ING-D2 gives the real list): kept by the administration. */
export const consistencyRules = ingenium.table('consistency_rules', {
  code: text('code').primaryKey(),
  /** Name as typed by the administration (« Process ↔ Électrique »), shown as typed. */
  label: text('label').notNull(),
  position: integer('position').notNull(),
  active: boolean('active').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('consistency_rules_code_check', matches(t.code, REGISTER_FORMATS.ruleCode)),
  check('consistency_rules_label_check', notBlank(t.label)),
  check('consistency_rules_position_check', sql`${t.position} between 1 and 999`),
]);

/** A document a discipline consumes and the revision it uses; confirmed by the discipline. */
export const registerInputs = ingenium.table('register_inputs', {
  id: id(),
  projectCode: projectCode(),
  consumer: text('consumer').notNull(),
  documentNumber: text('document_number').notNull(),
  /** Provider of a document outside the register (client, site…); null: a deliverable of the project's register. */
  externalParty: text('external_party'),
  /** Title of an external document, as typed (« Basis of design du client »). */
  externalTitle: text('external_title'),
  revisionInUse: text('revision_in_use').notNull(),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  acknowledgedByName: text('acknowledged_by_name'),
  source: text('source').notNull(),
  /** Keystone's id of the row (transfer journal only, never published). */
  keystoneId: text('keystone_id'),
  importedAt: timestamp('imported_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [
  unique('register_inputs_unique').on(t.projectCode, t.consumer, t.documentNumber),
  check('register_inputs_project_check', matches(t.projectCode, PG_FORMATS.projectCode)),
  check('register_inputs_consumer_check', inList(t.consumer, DISCIPLINE_CODES)),
  check('register_inputs_number_check', matches(t.documentNumber, REGISTER_FORMATS.documentNumber)),
  check('register_inputs_party_check', sql`${t.externalParty} is null or (${inList(t.externalParty, PARTIES)} and ${t.externalParty} not in (${sql.raw(DISCIPLINE_CODES.map((d) => `'${d}'`).join(', '))}))`),
  check('register_inputs_title_check', sql`(${t.externalParty} is null and ${t.externalTitle} is null) or (${t.externalParty} is not null and ${t.externalTitle} is not null and btrim(${t.externalTitle}) <> '')`),
  check('register_inputs_revision_check', matches(t.revisionInUse, REGISTER_FORMATS.revision)),
  check('register_inputs_ack_check', sql`(${t.acknowledgedAt} is null) = (${t.acknowledgedByName} is null) and (${t.acknowledgedByName} is null or btrim(${t.acknowledgedByName}) <> '')`),
  check('register_inputs_source_check', inList(t.source, REGISTER_SOURCES)),
]);

/** A deliverable of a discipline: a Codex document record (number, title, revision), tied to an equipment of the project. */
export const registerDeliverables = ingenium.table('register_deliverables', {
  id: id(),
  projectCode: projectCode(),
  /** Codex document number, the business identifier (never changes). */
  number: text('number').notNull(),
  title: text('title').notNull(),
  discipline: text('discipline').notNull(),
  /** Equipment of the project (keystone.pub_equipements_projet, R-185, request DI-K3); null until Keystone publishes them. */
  equipmentRef: text('equipment_ref'),
  revision: text('revision').notNull(),
  status: text('status').notNull(),
  /** Day of the current revision's last step. */
  issuedOn: date('issued_on', { mode: 'string' }).notNull(),
  authorName: text('author_name').notNull(),
  recipients: text('recipients').array().notNull(),
  source: text('source').notNull(),
  keystoneId: text('keystone_id'),
  importedAt: timestamp('imported_at', { withTimezone: true }),
  /** Optimistic lock: a form sends the version it showed. */
  rowVersion: integer('row_version').notNull().default(1),
  ...timestamps,
}, (t) => [
  unique('register_deliverables_unique').on(t.projectCode, t.number),
  check('register_deliverables_project_check', matches(t.projectCode, PG_FORMATS.projectCode)),
  check('register_deliverables_number_check', matches(t.number, REGISTER_FORMATS.documentNumber)),
  check('register_deliverables_title_check', notBlank(t.title)),
  check('register_deliverables_discipline_check', inList(t.discipline, DISCIPLINE_CODES)),
  check('register_deliverables_equipment_check', sql`${t.equipmentRef} is null or btrim(${t.equipmentRef}) <> ''`),
  check('register_deliverables_revision_check', matches(t.revision, REGISTER_FORMATS.revision)),
  check('register_deliverables_status_check', inList(t.status, DELIVERABLE_STATUSES)),
  check('register_deliverables_author_check', notBlank(t.authorName)),
  check('register_deliverables_recipients_check', partiesOk(t.recipients)),
  check('register_deliverables_source_check', inList(t.source, REGISTER_SOURCES)),
  check('register_deliverables_version_check', sql`${t.rowVersion} >= 1`),
]);

/** Every step of a deliverable's revision (append-only, trigger): the history that gives the last reference revision. */
export const deliverableRevisions = ingenium.table('deliverable_revisions', {
  id: id(),
  deliverableId: uuid('deliverable_id').notNull().references(() => registerDeliverables.id),
  revision: text('revision').notNull(),
  status: text('status').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  byName: text('by_name').notNull(),
  reason: text('reason'),
}, (t) => [
  index('deliverable_revisions_deliverable_idx').on(t.deliverableId),
  check('deliverable_revisions_revision_check', matches(t.revision, REGISTER_FORMATS.revision)),
  check('deliverable_revisions_status_check', inList(t.status, DELIVERABLE_STATUSES)),
  check('deliverable_revisions_by_check', notBlank(t.byName)),
  check('deliverable_revisions_reason_check', sql`${t.reason} is null or btrim(${t.reason}) <> ''`),
]);

/** A list a discipline generates for the next service (instrument list, I/O list…); its state is computed. */
export const registerOutputs = ingenium.table('register_outputs', {
  id: id(),
  projectCode: projectCode(),
  number: text('number').notNull(),
  discipline: text('discipline').notNull(),
  name: text('name').notNull(),
  recipients: text('recipients').array().notNull(),
  /** Deliverable the list is generated from (its number), null when it draws on several (shown as `sourceText`). */
  sourceDeliverable: text('source_deliverable'),
  sourceText: text('source_text'),
  generatedAt: timestamp('generated_at', { withTimezone: true }),
  generatedByName: text('generated_by_name'),
  generatedFromRevision: text('generated_from_revision'),
  source: text('source').notNull(),
  keystoneId: text('keystone_id'),
  importedAt: timestamp('imported_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [
  unique('register_outputs_unique').on(t.projectCode, t.number),
  check('register_outputs_project_check', matches(t.projectCode, PG_FORMATS.projectCode)),
  check('register_outputs_number_check', matches(t.number, REGISTER_FORMATS.outputNumber)),
  check('register_outputs_discipline_check', inList(t.discipline, DISCIPLINE_CODES)),
  check('register_outputs_name_check', notBlank(t.name)),
  check('register_outputs_recipients_check', partiesOk(t.recipients)),
  check('register_outputs_deliverable_check', sql`${t.sourceDeliverable} is null or ${matches(t.sourceDeliverable, REGISTER_FORMATS.documentNumber)}`),
  check('register_outputs_source_text_check', sql`${t.sourceText} is null or btrim(${t.sourceText}) <> ''`),
  check('register_outputs_generated_check', sql`(${t.generatedAt} is null) = (${t.generatedByName} is null)`),
  check('register_outputs_from_check', sql`${t.generatedFromRevision} is null or ${matches(t.generatedFromRevision, REGISTER_FORMATS.revision)}`),
  check('register_outputs_source_check', inList(t.source, REGISTER_SOURCES)),
]);

/** An inconsistency between disciplines (C-01…), owned by a discipline, closed by the engineering lead. */
export const registerChecks = ingenium.table('register_checks', {
  id: id(),
  projectCode: projectCode(),
  number: text('number').notNull(),
  ruleCode: text('rule_code').notNull().references(() => consistencyRules.code),
  severity: text('severity').notNull(),
  title: text('title').notNull(),
  detail: text('detail'),
  owner: text('owner').notNull(),
  status: text('status').notNull(),
  /** Note of the last step (sent back, resolved, cancelled), as typed. */
  note: text('note'),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  closedByName: text('closed_by_name'),
  raisedByName: text('raised_by_name').notNull(),
  source: text('source').notNull(),
  keystoneId: text('keystone_id'),
  importedAt: timestamp('imported_at', { withTimezone: true }),
  rowVersion: integer('row_version').notNull().default(1),
  ...timestamps,
}, (t) => [
  unique('register_checks_unique').on(t.projectCode, t.number),
  check('register_checks_project_check', matches(t.projectCode, PG_FORMATS.projectCode)),
  check('register_checks_number_check', matches(t.number, REGISTER_FORMATS.checkNumber)),
  check('register_checks_severity_check', inList(t.severity, CHECK_SEVERITIES)),
  check('register_checks_title_check', notBlank(t.title)),
  check('register_checks_detail_check', sql`${t.detail} is null or btrim(${t.detail}) <> ''`),
  check('register_checks_owner_check', inList(t.owner, DISCIPLINE_CODES)),
  check('register_checks_status_check', inList(t.status, CHECK_STATUSES)),
  check('register_checks_note_check', sql`${t.note} is null or btrim(${t.note}) <> ''`),
  check('register_checks_closed_check', sql`(${t.status} in ('resolved', 'cancelled')) = (${t.closedAt} is not null) and (${t.closedAt} is null) = (${t.closedByName} is null)`),
  check('register_checks_closed_note_check', sql`${t.status} not in ('resolved', 'cancelled', 'sent_back') or ${t.note} is not null`),
  check('register_checks_raised_check', notBlank(t.raisedByName)),
  check('register_checks_source_check', inList(t.source, REGISTER_SOURCES)),
  check('register_checks_version_check', sql`${t.rowVersion} >= 1`),
]);

/** Recent changes of a project and their impact (append-only, trigger). */
export const registerChanges = ingenium.table('register_changes', {
  id: id(),
  projectCode: projectCode(),
  occurredOn: date('occurred_on', { mode: 'string' }).notNull(),
  kind: text('kind').notNull(),
  /** Object the change is about (document or list number), null for a free note. */
  objectRef: text('object_ref'),
  revision: text('revision'),
  /** Typed note (shown as typed), required for a note. */
  text: text('text'),
  recipients: text('recipients').array().notNull(),
  byName: text('by_name').notNull(),
  source: text('source').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('register_changes_project_idx').on(t.projectCode, t.occurredOn),
  check('register_changes_project_check', matches(t.projectCode, PG_FORMATS.projectCode)),
  check('register_changes_kind_check', inList(t.kind, CHANGE_KINDS)),
  check('register_changes_object_check', sql`${t.objectRef} is null or btrim(${t.objectRef}) <> ''`),
  check('register_changes_revision_check', sql`${t.revision} is null or ${matches(t.revision, REGISTER_FORMATS.revision)}`),
  check('register_changes_text_check', sql`(${t.kind} <> 'note' or ${t.text} is not null) and (${t.text} is null or btrim(${t.text}) <> '')`),
  check('register_changes_recipients_check', partiesOk(t.recipients)),
  check('register_changes_by_check', notBlank(t.byName)),
  check('register_changes_source_check', inList(t.source, REGISTER_SOURCES)),
]);
