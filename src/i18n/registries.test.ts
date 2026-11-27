// The EN source strings kept in registries and passed to t() through a variable (screen titles and contents, roles,
// disciplines, connectors, journal areas, messages of the connectors) have their French too: the literal scan of
// ./completeness.test.ts does not see them.
import { describe, expect, it } from 'vitest';
import { ROLE_LABEL } from '@/config/roles';
import { SCREEN_CONTENT } from '@/config/screen-content';
import { SCREENS, SECTION_LABEL } from '@/config/screens';
import { SIGN_IN_ERROR } from '@/domain/auth';
import { JOURNAL_AREAS } from '@/domain/journal';
import { FORBIDDEN } from '@/domain/rights';
import { DISCIPLINE_LABEL, TEAM_ORIGIN_LABEL } from '@/domain/vocab';
import { CONNECTORS } from '@/server/integrations/connectors';
import {
  CHANGE_KIND_LABEL, HELD_IN_KEYSTONE, NOT_FOUND, STALE, CHECK_SEVERITY_LABEL, CHECK_STATUS_LABEL, CHECK_STEP, DELIVERABLE_STATUS_LABEL, DELIVERABLE_STEP, INPUT_STATE_LABEL, OUTPUT_STATE_LABEL, PARTY_LABEL,
} from '@/domain/register';
import { TRANSFER_OBJECT_LABEL, TRANSFER_REASONS } from '@/domain/transfer';
import SAME from './same-in-french.json';
import { makeT } from './translate';

const fr = makeT('fr');
const same = new Set<string>(SAME.strings);
const untranslated = (list: readonly string[]) => [...new Set(list)].filter((s) => fr(s) === s && !same.has(s));

describe('French of the registries', () => {
  it('screens, sections, roles, disciplines, journal areas', () => {
    expect(untranslated([
      ...SCREENS.map((s) => s.title), ...Object.values(SECTION_LABEL), ...Object.values(SCREEN_CONTENT).flat(), ...Object.values(ROLE_LABEL),
      ...Object.values(DISCIPLINE_LABEL), ...Object.values(TEAM_ORIGIN_LABEL), ...JOURNAL_AREAS, FORBIDDEN, ...Object.values(SIGN_IN_ERROR),
    ])).toEqual([]);
  });
  it('the engineering register: states, steps, parties, transfer and the refusals of its Server Functions', () => {
    expect(untranslated([
      ...Object.values(PARTY_LABEL), ...Object.values(DELIVERABLE_STATUS_LABEL), ...Object.values(CHECK_SEVERITY_LABEL), ...Object.values(CHECK_STATUS_LABEL),
      ...Object.values(INPUT_STATE_LABEL), ...Object.values(OUTPUT_STATE_LABEL), ...Object.values(CHANGE_KIND_LABEL), ...Object.values(DELIVERABLE_STEP).map((x) => x.label),
      ...Object.values(CHECK_STEP).map((x) => x.label), ...Object.values(TRANSFER_OBJECT_LABEL), ...TRANSFER_REASONS, NOT_FOUND, HELD_IN_KEYSTONE, STALE,
      'Some fields are missing or invalid', 'This input is already up to date', 'An outside document needs its title',
      'No deliverable of the project has this number: choose an outside provider', 'This discipline already consumes this document',
      'A deliverable of the project already has this number', 'A reason is required', 'This step is not open in the deliverable’s state',
      'Give the new revision (letter or number)', 'No deliverable of the project has this number', 'Blocked by an open blocking check of the discipline',
      'Unknown consistency rule', 'A note is required', 'This step is not open in the check’s state', 'Task not found',
      'A task for someone else belongs to a project of their team', 'This person is not on the project’s team', 'This step is not open in the task’s state',
      'The engineering register is already held by Ingenium', 'Transfer view of Keystone not readable (keystone.pub_reprise_registre_ingenierie: requests DI-K2, DI-M2)',
      'Transfer refused', 'Step recorded', 'Input confirmed', 'Generation recorded', 'Deliverable added', 'Input added', 'List declared', 'Check raised', 'Change recorded',
      'Rule saved', 'Task created', 'Dry run recorded', 'Register held by Ingenium',
    ])).toEqual([]);
  });
  it('connectors and their messages', () => {
    expect(untranslated([
      ...CONNECTORS.map((c) => c.how), 'Off', 'Simulation', 'Views of the shared server', 'Read Keystone now', 'Keystone read',
      'Simulated Keystone (demonstration data set)', 'Keystone views not readable (grant of Matrix missing or view absent)',
      'The Keystone connector is off (INGENIUM_KEYSTONE=off)',
      'Blocking expected inputs', 'Deliverables to release this week', 'Open consistency checks', 'P&ID tags not tied to a part', 'Parts to validate', 'ECO keys expected',
    ])).toEqual([]);
  });
});
