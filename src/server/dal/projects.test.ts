// Project scope in the data layer (spec 02 § 2): the lead, the administrator and the readers see every project; the others
// only those of their engineering team (matched by e-mail); a project outside the scope is not returned (its pages are 404).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { RoleKey } from '@/config/roles';
import type { Viewer } from '@/server/viewer';
import { testDatabase, type TestDatabase } from '@/test/db';
import { projectInScope, projectsInScope } from './projects';

let t: TestDatabase;
beforeAll(async () => {
  t = await testDatabase();
});
afterAll(() => t.close());

const viewer = (email: string, role: RoleKey): Viewer => ({ userId: 'u', name: 'x', email, oid: null, initials: 'X', role, roles: [role], demo: true });

describe('projects in scope', () => {
  it('a discipline engineer sees the projects of their team, with their disciplines', async () => {
    const v = viewer('claire.renaud@demo.example', 'engineer');
    const ps = await projectsInScope(v);
    expect(ps.map((p) => p.code)).toEqual(['EWA-051', 'HLT-026', 'WSA-044']);
    expect(ps.find((p) => p.code === 'HLT-026')!.myDisciplines).toEqual(['process']);
    expect(await projectInScope(v, 'NDC-031')).toBeNull();
  });
  it('the engineering lead and the readers see every project, open ones first', async () => {
    for (const r of ['engineering_lead', 'reader'] as const) {
      const ps = await projectsInScope(viewer('anne.duval@demo.example', r));
      expect(ps).toHaveLength(5);
      expect(ps.at(-1)!.code).toBe('WSA-044');
    }
  });
  it('a designer on no team sees nothing', async () => {
    expect(await projectsInScope(viewer('nobody@demo.example', 'designer'))).toEqual([]);
  });
});
