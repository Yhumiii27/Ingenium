// ING-29 / ING-30: who sees a project and the default filter of the project list.
import { describe, expect, it } from 'vitest';
import { ROLE_KEYS } from '@/config/roles';
import { filterProjects, projectFilterHref, projectFilterOf, projectVisible, type ProjectFacts } from './confidential';

const f = (x: Partial<ProjectFacts>): ProjectFacts => ({ confidential: false, open: true, onTeam: false, ...x });

describe('project visibility (ING-29)', () => {
  it('every role sees every project in progress that is not confidential', () => {
    for (const r of ROLE_KEYS) expect(projectVisible([r], f({}))).toBe(true);
  });
  it('a closed project: its team and the roles with all_projects', () => {
    expect(projectVisible(['engineer'], f({ open: false }))).toBe(false);
    expect(projectVisible(['engineer'], f({ open: false, onTeam: true }))).toBe(true);
    for (const r of ['engineering_lead', 'admin', 'reader'] as const) expect(projectVisible([r], f({ open: false }))).toBe(true);
  });
  it('a confidential project: its team only, whatever the role', () => {
    for (const r of ROLE_KEYS) {
      expect(projectVisible([r], f({ confidential: true }))).toBe(false);
      expect(projectVisible([r], f({ confidential: true, onTeam: true }))).toBe(true);
      expect(projectVisible([r], f({ confidential: true, onTeam: true, open: false }))).toBe(true);
    }
    expect(projectVisible([...ROLE_KEYS], f({ confidential: true }))).toBe(false);
  });
});

describe('project list filter', () => {
  const ps = [{ code: 'A', mine: true, open: true }, { code: 'B', mine: false, open: true }, { code: 'C', mine: true, open: false }, { code: 'D', mine: false, open: false }];
  it('defaults to my projects; « tous » keeps every project in progress', () => {
    expect(projectFilterOf(undefined)).toBe('mine');
    expect(projectFilterOf('autre')).toBe('mine');
    expect(projectFilterOf('tous')).toBe('all');
    expect(projectFilterOf(['tous'])).toBe('all');
    expect(filterProjects(ps, 'mine').map((p) => p.code)).toEqual(['A', 'C']);
    expect(filterProjects(ps, 'all').map((p) => p.code)).toEqual(['A', 'B']);
    expect(projectFilterHref('all')).toBe('/my/projects?projets=tous');
    expect(projectFilterHref('mine')).toBe('/my/projects');
  });
});
