import { describe, expect, it } from 'vitest';
import { CLAVIS_ROLE, ROLE_KEYS, activeRoleOf } from '@/config/roles';
import { can, inProjectScope } from './rights';
import { emailFromClaims, grantedRolesFromClavisAccess, isPublicPath, safeReturnTo, ingeniumRoleKeys } from './auth';

describe('roles read in Clavis', () => {
  it('maps the Clavis role keys of Ingenium (Clavis src/domain/app-roles.ts)', () => {
    expect(Object.values(CLAVIS_ROLE)).toEqual([
      'Ingenium.EngineeringLead', 'Ingenium.Engineer', 'Ingenium.Designer', 'Ingenium.DocumentController', 'Ingenium.Admin', 'Ingenium.Reader',
    ]);
    expect(ingeniumRoleKeys(['Ingenium.EngineeringLead', 'ingenium:designer', 'Ingenium.DocumentController', 'Keystone.Admin', 'reader']))
      .toEqual(['engineering_lead', 'designer', 'document_controller', 'reader']);
    for (const r of ROLE_KEYS) expect(ingeniumRoleKeys([CLAVIS_ROLE[r]])).toEqual([r]);
  });
  it('an access that is not open grants nothing (fail closed)', () => {
    expect(grantedRolesFromClavisAccess(null)).toEqual([]);
    expect(grantedRolesFromClavisAccess({ ouvert: false, role: 'Ingenium.Engineer' })).toEqual([]);
    expect(grantedRolesFromClavisAccess({ ouvert: true, role: 'Ingenium.Engineer', roles: ['Ingenium.Designer'] })).toEqual(['engineer', 'designer']);
  });
  it('active role', () => {
    expect(activeRoleOf(['reader', 'engineer'])).toBe('engineer');
    expect(activeRoleOf(['reader', 'engineer'], 'reader')).toBe('reader');
    expect(activeRoleOf([])).toBeNull();
  });
});

describe('rights (ING-19, spec 02)', () => {
  it('project scope: every project for the lead, the administrator and the readers; the team’s projects for the others', () => {
    for (const r of ['engineering_lead', 'admin', 'reader'] as const) expect(inProjectScope([r], false)).toBe(true);
    for (const r of ['engineer', 'designer', 'document_controller'] as const) {
      expect(inProjectScope([r], false)).toBe(false);
      expect(inProjectScope([r], true)).toBe(true);
    }
  });
  it('who does what', () => {
    expect(can(['engineering_lead'], 'validate_parts')).toBe(true);
    expect(can(['engineer'], 'validate_parts')).toBe(false);
    expect(can(['designer'], 'parts')).toBe(true);
    expect(can(['designer'], 'engineering')).toBe(false);
    expect(can(['document_controller'], 'documents')).toBe(true);
    expect(can(['admin'], 'administration')).toBe(true);
    expect(can(['engineering_lead'], 'administration')).toBe(false);
    expect(can(['reader'], 'journal')).toBe(false);
  });
});

describe('sign-in helpers', () => {
  it('e-mail, return path and public paths', () => {
    expect(emailFromClaims({ preferred_username: 'A.B@Groupe.Example' })).toBe('a.b@groupe.example');
    expect(emailFromClaims({})).toBeNull();
    expect(safeReturnTo('//evil.example')).toBe('/');
    expect(safeReturnTo('/my/projects?x=1')).toBe('/my/projects?x=1');
    expect(isPublicPath('/api/auth/callback')).toBe(true);
    expect(isPublicPath('/my/projects')).toBe(false);
  });
});
