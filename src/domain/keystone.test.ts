import { describe, expect, it } from 'vitest';
import { disciplineOfActivity, memberFromKeystone, projectFromKeystone, uniqueMembers } from './keystone';
import { projectLabel } from './vocab';

describe('Keystone rows in the mirror', () => {
  it('a project keeps Keystone’s code and the design offices’ number (ING-22)', () => {
    const p = projectFromKeystone({ code: 'HLT-026', numero: '#026', nom: 'Harbor Line', client: 'Port', phase: 'Études', imputable: true });
    expect(p).toEqual({ code: 'HLT-026', designOfficeNumber: '#026', name: 'Harbor Line', client: 'Port', phase: 'Études', open: true });
    expect(projectLabel(p!)).toBe('#026 · HLT-026');
    expect(projectFromKeystone({ code: 'HLT-026', numero: '26', nom: 'X', imputable: false })).toMatchObject({ designOfficeNumber: null, open: false });
    expect(projectLabel({ code: 'HLT-026', designOfficeNumber: null })).toBe('HLT-026');
  });
  it('a row of another shape is left out', () => {
    expect(projectFromKeystone({ code: 'hlt-26', nom: 'X' })).toBeNull();
    expect(projectFromKeystone({ code: 'HLT-026', nom: ' ' })).toBeNull();
  });
  it('the discipline of an assignment comes from its activity', () => {
    expect(disciplineOfActivity('Ingénierie électrique')).toBe('electrical');
    expect(disciplineOfActivity('Ingénierie mécanique')).toBe('mechanical');
    expect(disciplineOfActivity('Automatisme')).toBe('automation');
    expect(disciplineOfActivity('Ingénierie process')).toBe('process');
    expect(disciplineOfActivity('Responsable ingénierie')).toBeNull();
    expect(disciplineOfActivity(null)).toBeNull();
  });
  it('a team member: known project only, e-mail from the directory, duplicates dropped', () => {
    const codes = new Set(['HLT-026']);
    const emails = new Map([['EMP-1', 'A.B@Demo.Example']]);
    const row = { source: 'planning', affectation_id: 7, matricule: 'EMP-1', personne_nom: 'A B', projet_code: 'HLT-026', activite: 'Automatisme' };
    const m = memberFromKeystone(row, codes, emails);
    expect(m).toEqual({ projectCode: 'HLT-026', assignment: 'planning:7', employeeNumber: 'EMP-1', personName: 'A B', email: 'a.b@demo.example', discipline: 'automation', activity: 'Automatisme' });
    expect(memberFromKeystone({ ...row, projet_code: 'NDC-031' }, codes, emails)).toBeNull();
    expect(memberFromKeystone({ ...row, matricule: 'EMP-2' }, codes, emails)!.email).toBeNull();
    expect(uniqueMembers([m!, m!])).toHaveLength(1);
  });
});
