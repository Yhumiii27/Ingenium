// Read-only mirrors of the other tools (Norma § 5): written only by their connector (src/server/integrations/<tool>/), never by
// a page or a Server Function. Keystone's projects and engineering teams (keystone.pub_projets, pub_affectations — mode
// INGENIUM_KEYSTONE), and the journal of every read (sync_runs) shown on « Activity and integrations ».
import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { DISCIPLINE_CODES, MIRROR_SOURCES, PG_FORMATS, SYNC_OUTCOMES, SYNC_SOURCES, TEAM_ORIGINS } from '@/domain/vocab';
import { ingenium } from './_schema';
import { id, inList, matches, notBlank } from './_common';

/** One row per Keystone project (keystone.pub_projets): the exchange key is Keystone's code (ING-22). */
export const projectMirror = ingenium.table('project_mirror', {
  /** Keystone's project code (HLT-026), the key between tools. */
  code: text('code').primaryKey(),
  /** Number of the design offices (#026), shown first (ING-22); null when Keystone has none. */
  designOfficeNumber: text('design_office_number'),
  name: text('name').notNull(),
  client: text('client'),
  /** Keystone's phase label, shown as published. */
  phase: text('phase'),
  /** Keystone's `imputable`: the project is neither closed nor cancelled. */
  open: boolean('open').notNull(),
  source: text('source').notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull(),
  /**
   * Keystone's confidentiality level (`confidentialite` = 'confidentiel', ING-29 / owner 27 Nov 2026: Keystone gives it to every
   * tool): seen by its team only. False while Keystone does not publish the column (request DI-K5).
   */
  confidential: boolean('confidential').notNull().default(false),
}, (t) => [
  check('project_mirror_code_check', matches(t.code, PG_FORMATS.projectCode)),
  check('project_mirror_number_check', sql`${t.designOfficeNumber} is null or ${matches(t.designOfficeNumber, PG_FORMATS.designOfficeNumber)}`),
  check('project_mirror_name_check', notBlank(t.name)),
  check('project_mirror_source_check', inList(t.source, MIRROR_SOURCES)),
]);

/**
 * The team of a project as Keystone publishes it (ING-30): keystone.pub_equipes_projets (assignments and stakeholders) when the
 * view exists, else keystone.pub_affectations (assignments only) — who is on it, in which discipline. A person on it sees the
 * project in Ingenium; for a confidential project, only they do.
 */
export const teamMirror = ingenium.table('team_mirror', {
  projectCode: text('project_code').notNull().references(() => projectMirror.code, { onDelete: 'cascade' }),
  /** Keystone's assignment id (`source:affectation_id`), the key of the row. */
  assignment: text('assignment').notNull(),
  /** Employee number published by Keystone (matricule), null when unknown. */
  employeeNumber: text('employee_number'),
  personName: text('person_name').notNull(),
  /** Professional e-mail of the person when known (matches the signed-in user); lower case. */
  email: text('email'),
  /** Discipline of the person on the project, null when Keystone does not say it. */
  discipline: text('discipline'),
  /** Activity as published (« Ingénierie électrique »), shown as is. */
  activity: text('activity'),
  /** Assigned to a task or stakeholder of the project (ING-30). */
  origin: text('origin').notNull().default('assignment'),
  source: text('source').notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.projectCode, t.assignment] }),
  index('team_mirror_email_idx').on(t.email),
  check('team_mirror_assignment_check', notBlank(t.assignment)),
  check('team_mirror_name_check', notBlank(t.personName)),
  check('team_mirror_email_check', sql`${t.email} is null or (${t.email} ~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$' and ${t.email} = lower(${t.email}))`),
  check('team_mirror_discipline_check', sql`${t.discipline} is null or ${inList(t.discipline, DISCIPLINE_CODES)}`),
  check('team_mirror_source_check', inList(t.source, MIRROR_SOURCES)),
  check('team_mirror_origin_check', inList(t.origin, TEAM_ORIGINS)),
]);

/** Every read of another tool (connector runs): outcome and counts, never personal data. */
export const syncRuns = ingenium.table('sync_runs', {
  id: id(),
  source: text('source').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }).notNull(),
  outcome: text('outcome').notNull(),
  rows: integer('rows').notNull().default(0),
  /** EN source text of the outcome (« view keystone.pub_projets not readable »), never a value read. */
  message: text('message'),
  /** Who asked (« Read now »), null for the scheduled job. */
  requestedBy: uuid('requested_by'),
}, (t) => [
  index('sync_runs_started_idx').on(t.startedAt),
  check('sync_runs_source_check', inList(t.source, SYNC_SOURCES)),
  check('sync_runs_outcome_check', inList(t.outcome, SYNC_OUTCOMES)),
  check('sync_runs_rows_check', sql`${t.rows} >= 0`),
  check('sync_runs_order_check', sql`${t.finishedAt} >= ${t.startedAt}`),
]);
