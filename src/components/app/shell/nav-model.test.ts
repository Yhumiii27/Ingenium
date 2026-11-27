import { describe, expect, it } from 'vitest';
import { baseNavProblems } from '@norma/charte/ds/base-nav';
import { PROJECT_SCREENS, SCREENS, SECTION_LABEL, matchScreen, projectOfPath } from '@/config/screens';
import { makeT } from '@/i18n/translate';
import SAME from '@/i18n/same-in-french.json';
import { buildNav } from './nav-model';

const project = { code: 'HLT-026', label: '#026 · HLT-026' };

describe('sidebar model', () => {
  it('starts with Norma’s common block: Home, My tasks, My approvals, My projects, Technical reference', () => {
    const n = buildNav({ roles: ['reader'], pathname: '/', project, counts: { tasks: 3, approvals: 1 } });
    expect(baseNavProblems(n.base)).toEqual([]);
    expect(n.base.map((e) => e.href)).toEqual(['/', '/my/tasks', '/my/approvals', '/my/projects', '/reference']);
    expect(n.base.find((e) => e.id === 'tasks')!.badge).toBe(3);
    // Every route of the common block is a screen of the registry.
    for (const e of n.base) expect(matchScreen(e.href)?.section, e.href).toBe('base');
  });
  it('the administration is for the administrator and the engineering lead only', () => {
    expect(buildNav({ roles: ['engineer'], pathname: '/', project }).sections.map((s) => s.key)).toEqual(['project', 'reference']);
    expect(buildNav({ roles: ['admin'], pathname: '/', project }).sections.map((s) => s.key)).toEqual(['project', 'reference', 'admin']);
    expect(buildNav({ roles: ['engineering_lead'], pathname: '/', project }).sections.at(-1)!.entries.map((e) => e.id)).toContain('journal');
  });
  it('the project section points at the current project and lights the page', () => {
    const n = buildNav({ roles: ['engineer'], pathname: '/projects/HLT-026/pid', project });
    const sec = n.sections[0];
    expect(sec).toMatchObject({ key: 'project', context: '#026 · HLT-026', active: true });
    expect(sec.entries.map((e) => e.id)).toEqual(PROJECT_SCREENS);
    expect(sec.entries.find((e) => e.id === 'pid')).toMatchObject({ href: '/projects/HLT-026/pid', active: true });
    expect(projectOfPath('/projects/HLT-026/pid')).toBe('HLT-026');
  });
  it('without a project in scope the project section is left out', () => {
    expect(buildNav({ roles: ['designer'], pathname: '/', project: null }).sections.map((s) => s.key)).toEqual(['reference']);
  });
  it('every route resolves to its own screen', () => {
    for (const s of SCREENS) expect(matchScreen(s.path.replace('[code]', 'HLT-026'))?.id, s.path).toBe(s.id);
  });
  it('every section title is translated into French', () => {
    const fr = makeT('fr');
    for (const label of Object.values(SECTION_LABEL)) expect(fr(label) !== label || SAME.strings.includes(label)).toBe(true);
  });
});
