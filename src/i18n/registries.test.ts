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
import { DISCIPLINE_LABEL } from '@/domain/vocab';
import { CONNECTORS } from '@/server/integrations/connectors';
import SAME from './same-in-french.json';
import { makeT } from './translate';

const fr = makeT('fr');
const same = new Set<string>(SAME.strings);
const untranslated = (list: readonly string[]) => [...new Set(list)].filter((s) => fr(s) === s && !same.has(s));

describe('French of the registries', () => {
  it('screens, sections, roles, disciplines, journal areas', () => {
    expect(untranslated([
      ...SCREENS.map((s) => s.title), ...Object.values(SECTION_LABEL), ...Object.values(SCREEN_CONTENT).flat(), ...Object.values(ROLE_LABEL),
      ...Object.values(DISCIPLINE_LABEL), ...JOURNAL_AREAS, FORBIDDEN, ...Object.values(SIGN_IN_ERROR),
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
