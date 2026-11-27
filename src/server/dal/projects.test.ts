// Project scope in the data layer (ING-29, ING-30): every role sees every project in progress; a closed one its team and the
// roles with all_projects; a project confidential in Keystone only its team (assigned to a task or stakeholder) — never in a
// list, the page lookup (404) or the journal for anyone else. Demonstration data set: RDP-072 is confidential, its team is
// Anne Duval (stakeholder), Claire Renaud and Hugo Lemaire.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { RoleKey } from '@/config/roles';
import { filterProjects } from '@/domain/confidential';
import { parseJournalFilters } from '@/domain/journal';
import { writeAudit } from '@/server/db/helpers';
import type { Viewer } from '@/server/viewer';
import { testDatabase, type TestDatabase } from '@/test/db';
import { journalExport, journalPage } from './journal';
import { hiddenProjectCodes, projectInScope, projectsInScope } from './projects';

let t: TestDatabase;
beforeAll(async () => {
  t = await testDatabase();
  await writeAudit(t.db, { actorName: 'Système', actorUserId: null, objectRef: 'RDP-072', change: 'test entry', area: 'Administration' });
});
afterAll(() => t.close());

const viewer = (email: string, ...roles: RoleKey[]): Viewer => ({ userId: 'u', name: 'x', email, oid: null, initials: 'X', role: roles[0], roles, demo: true });
const codes = (ps: { code: string }[]) => ps.map((p) => p.code).sort();

describe('projects in scope (ING-29)', () => {
  it('« My projects » by default: the projects of the viewer’s team, with their disciplines', async () => {
    const ps = await projectsInScope(viewer('julien.faure@demo.example', 'designer'));
    expect(codes(filterProjects(ps, 'mine'))).toEqual(['EWA-051', 'HLT-026']);
    expect(ps.find((p) => p.code === 'HLT-026')!.myDisciplines).toEqual(['mechanical']);
  });
  it('without the filter: every project in progress, for every role', async () => {
    for (const r of ['designer', 'engineer', 'document_controller', 'reader'] as const) {
      const ps = await projectsInScope(viewer('nobody@demo.example', r));
      expect(codes(filterProjects(ps, 'all'))).toEqual(['EWA-051', 'HLT-026', 'NDC-031', 'PRS-038']);
    }
  });
  it('a closed project: its team and the roles with all_projects', async () => {
    expect(await projectInScope(viewer('nobody@demo.example', 'designer'), 'WSA-044')).toBeNull();
    expect(await projectInScope(viewer('claire.renaud@demo.example', 'engineer'), 'WSA-044')).not.toBeNull();
    expect(await projectInScope(viewer('nobody@demo.example', 'engineering_lead'), 'WSA-044')).not.toBeNull();
  });
  it('a confidential project never appears outside its team, whatever the role (list, direct URL)', async () => {
    const outsider = viewer('marc.lenoir@demo.example', 'engineering_lead', 'admin', 'reader', 'engineer');
    expect(codes(await projectsInScope(outsider))).not.toContain('RDP-072');
    expect(await projectInScope(outsider, 'RDP-072')).toBeNull();
    // On another project's team is not enough.
    expect(await projectInScope(viewer('julien.faure@demo.example', 'designer'), 'RDP-072')).toBeNull();
  });
  it('its team sees it, a stakeholder included, in « My projects » and in the projects in progress', async () => {
    for (const email of ['claire.renaud@demo.example', 'hugo.lemaire@demo.example', 'anne.duval@demo.example']) {
      const ps = await projectsInScope(viewer(email, 'reader'));
      const p = ps.find((x) => x.code === 'RDP-072');
      expect(p, email).toMatchObject({ confidential: true, mine: true });
      expect(codes(filterProjects(ps, 'all'))).toContain('RDP-072');
    }
    const anne = await projectInScope(viewer('anne.duval@demo.example', 'reader'), 'RDP-072');
    expect(anne!.team.find((m) => m.personName === 'Anne Duval')!.origin).toBe('stakeholder');
  });
  it('the journal leaves out the entries of a confidential project for those outside its team', async () => {
    const f = parseJournalFilters({});
    const lead = viewer('marc.lenoir@demo.example', 'engineering_lead');
    expect(await hiddenProjectCodes(lead)).toEqual(['RDP-072']);
    expect((await journalPage(lead, f)).rows.some((r) => r.objectRef === 'RDP-072')).toBe(false);
    expect((await journalExport(lead, f)).rows.some((r) => r.objectRef === 'RDP-072')).toBe(false);
    const member = viewer('hugo.lemaire@demo.example', 'engineering_lead');
    expect(await hiddenProjectCodes(member)).toEqual([]);
    expect((await journalPage(member, f)).rows.some((r) => r.objectRef === 'RDP-072')).toBe(true);
  });
});
