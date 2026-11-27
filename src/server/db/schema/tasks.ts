// Ingenium's own tasks (ING-25, ING-31): the free tasks people create, and the projection `published_tasks` (the
// `taches_publiees` of the contract norma/contrats/taches-v1.md § 1) rewritten from the registers in the transaction of each
// write that opens, closes or reassigns a task, and by the job `tasks-projection`; the view ingenium.pub_taches (defined by
// Matrix from the reference query of src/server/publications/definitions.ts) reads it. Never read back to decide anything.
import { sql } from 'drizzle-orm';
import { boolean, check, date, index, integer, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { FREE_TASK_STATES, PUBLISHED_STATES, TASK_PRIORITIES } from '@/domain/own-tasks';
import { PG_FORMATS } from '@/domain/vocab';
import { ingenium } from './_schema';
import { id, inList, matches, notBlank, timestamps } from './_common';
import { users } from './platform';

const EMAIL = (col: Parameters<typeof notBlank>[0]) => sql`${col} ~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$' and ${col} = lower(${col})`;

export const freeTasks = ingenium.table('free_tasks', {
  id: id(),
  /** Title as typed (shown as typed; neutral: no health or personal data, contract § 3). */
  title: text('title').notNull(),
  projectCode: text('project_code'),
  assigneeEmail: text('assignee_email').notNull(),
  assigneeName: text('assignee_name').notNull(),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
  createdByName: text('created_by_name').notNull(),
  dueOn: date('due_on', { mode: 'string' }),
  priority: text('priority').notNull().default('normal'),
  state: text('state').notNull().default('todo'),
  doneAt: timestamp('done_at', { withTimezone: true }),
  /** Reason of a cancellation (no physical deletion, Norma § 4). */
  cancelReason: text('cancel_reason'),
  rowVersion: integer('row_version').notNull().default(1),
  ...timestamps,
}, (t) => [
  index('free_tasks_assignee_idx').on(t.assigneeEmail),
  check('free_tasks_title_check', sql`btrim(${t.title}) <> '' and length(${t.title}) <= 200`),
  check('free_tasks_project_check', sql`${t.projectCode} is null or ${matches(t.projectCode, PG_FORMATS.projectCode)}`),
  check('free_tasks_assignee_check', EMAIL(t.assigneeEmail)),
  check('free_tasks_assignee_name_check', notBlank(t.assigneeName)),
  check('free_tasks_created_by_check', notBlank(t.createdByName)),
  check('free_tasks_priority_check', inList(t.priority, TASK_PRIORITIES)),
  check('free_tasks_state_check', inList(t.state, FREE_TASK_STATES)),
  check('free_tasks_done_check', sql`(${t.state} = 'done') = (${t.doneAt} is not null)`),
  check('free_tasks_cancel_check', sql`(${t.state} = 'cancelled') = (${t.cancelReason} is not null) and (${t.cancelReason} is null or btrim(${t.cancelReason}) <> '')`),
  check('free_tasks_version_check', sql`${t.rowVersion} >= 1`),
]);

/** One row per task and recipient (contract § 2; the French codes of the contract are stored as such). */
export const publishedTasks = ingenium.table('published_tasks', {
  taskId: text('task_id').notNull(),
  recipientEmail: text('recipient_email').notNull(),
  /** Clavis person id (`oid`) of the recipient once they have signed in to Ingenium; the publication keeps only these rows. */
  personId: uuid('person_id'),
  nature: text('nature').notNull(),
  type: text('type').notNull(),
  typeLabel: text('type_label').notNull(),
  typeLabelEn: text('type_label_en').notNull(),
  objectRef: text('object_ref'),
  title: text('title').notNull(),
  state: text('state').notNull(),
  dueOn: date('due_on', { mode: 'string' }),
  priority: text('priority').notNull(),
  actions: text('actions').array().notNull(),
  sensitive: boolean('sensitive').notNull(),
  projectCode: text('project_code'),
  link: text('link').notNull(),
  version: text('version').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.taskId, t.recipientEmail] }),
  index('published_tasks_recipient_idx').on(t.recipientEmail),
  check('published_tasks_task_check', notBlank(t.taskId)),
  check('published_tasks_recipient_check', EMAIL(t.recipientEmail)),
  check('published_tasks_nature_check', inList(t.nature, ['tache', 'approbation'])),
  check('published_tasks_type_check', sql`${t.type} ~ '^[a-z][a-z_]{1,39}$'`),
  check('published_tasks_labels_check', sql`btrim(${t.typeLabel}) <> '' and btrim(${t.typeLabelEn}) <> '' and btrim(${t.title}) <> ''`),
  check('published_tasks_state_check', inList(t.state, PUBLISHED_STATES)),
  check('published_tasks_priority_check', inList(t.priority, ['normale', 'haute'])),
  check('published_tasks_actions_check', sql`${t.actions} <@ array['ouvrir', 'commenter', 'approuver', 'refuser', 'demarrer', 'suspendre', 'reprendre', 'terminer']::text[]`),
  check('published_tasks_project_check', sql`${t.projectCode} is null or ${matches(t.projectCode, PG_FORMATS.projectCode)}`),
  check('published_tasks_link_check', sql`${t.link} ~ '^https?://'`),
  check('published_tasks_version_check', notBlank(t.version)),
]);
