// The switch-over of each object from Keystone to Ingenium (docs/spec/06 § 1, ING-26): one row per object once switched (from
// then on Ingenium is its only writer and the Keystone connector stops mirroring it), and the journal of every transfer run,
// dry run or applied (append-only, trigger of the migration 0004).
import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { TRANSFER_MODES, TRANSFER_OBJECTS } from '@/domain/transfer';
import { MIRROR_SOURCES } from '@/domain/vocab';
import { ingenium } from './_schema';
import { id, inList, notBlank } from './_common';

export const transferRuns = ingenium.table('transfer_runs', {
  id: id(),
  object: text('object').notNull(),
  mode: text('mode').notNull(),
  source: text('source').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  byName: text('by_name').notNull(),
  byUserId: uuid('by_user_id'),
  /** Rows read, kept and refused per nature ({ "input": 12, … }). */
  counts: jsonb('counts').$type<Record<string, number>>().notNull(),
  refused: integer('refused').notNull(),
  /** Refusals: key of the row and EN source reason (never a value of a person). */
  refusals: jsonb('refusals').$type<{ nature: string; key: string; reason: string }[]>().notNull(),
}, (t) => [
  index('transfer_runs_object_idx').on(t.object, t.occurredAt),
  check('transfer_runs_object_check', inList(t.object, TRANSFER_OBJECTS)),
  check('transfer_runs_mode_check', inList(t.mode, TRANSFER_MODES)),
  check('transfer_runs_source_check', inList(t.source, MIRROR_SOURCES)),
  check('transfer_runs_by_check', notBlank(t.byName)),
  check('transfer_runs_refused_check', sql`${t.refused} >= 0`),
]);

/** An object held by Ingenium since its switch-over; absent = still held in Keystone. */
export const objectSwitchovers = ingenium.table('object_switchovers', {
  object: text('object').primaryKey(),
  switchedAt: timestamp('switched_at', { withTimezone: true }).notNull(),
  byName: text('by_name').notNull(),
  transferRunId: uuid('transfer_run_id').notNull().references(() => transferRuns.id),
}, (t) => [
  check('object_switchovers_object_check', inList(t.object, TRANSFER_OBJECTS)),
  check('object_switchovers_by_check', notBlank(t.byName)),
]);
