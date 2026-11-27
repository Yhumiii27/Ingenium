// Reference data of Ingenium (docs/spec/04 § 2): the engineering disciplines. Kept by the administration from delivery 2; seeded
// with the four disciplines of the bureaux d'études (ING-D1 gives the real list, leads and headcount).
import { sql } from 'drizzle-orm';
import { boolean, check, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { DISCIPLINE_CODES } from '@/domain/vocab';
import { ingenium } from './_schema';
import { inList, notBlank } from './_common';

export const disciplines = ingenium.table('disciplines', {
  /** Stable code (process, mechanical, electrical, automation): the key of the project screens and of the scope. */
  code: text('code').primaryKey(),
  /** Name in French as typed by the administration (shown as typed). */
  label: text('label').notNull(),
  position: integer('position').notNull(),
  active: boolean('active').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('disciplines_code_check', inList(t.code, DISCIPLINE_CODES)),
  check('disciplines_label_check', notBlank(t.label)),
  check('disciplines_position_check', sql`${t.position} between 1 and 99`),
]);
