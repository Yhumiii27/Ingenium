import { describe, expect, it } from 'vitest';
import {
  checkStepsFrom, deriveRegister, disciplineOf, inputStateOf, isDocumentNumber, isLeadActivity, mayTake, nextNumber, nextRevision, outputStateOf,
  partyOf, referenceRevision, releasedShare, stepsFrom, waitMatrix, writesDiscipline,
} from './register';

describe('revisions and numbers', () => {
  it('next revision', () => {
    expect(nextRevision('A')).toBe('B');
    expect(nextRevision('Z')).toBe('AA');
    expect(nextRevision('AZ')).toBe('BA');
    expect(nextRevision('ZZZ')).toBeNull();
    expect(nextRevision('2')).toBe('3');
    expect(nextRevision('a')).toBeNull();
  });
  it('next number of a project', () => {
    expect(nextNumber('C', [])).toBe('C-01');
    expect(nextNumber('C', ['C-01', 'C-10', 'C-02'])).toBe('C-11');
    expect(nextNumber('O', ['O-99'])).toBe('O-100');
  });
  it('document numbers of Codex and of outside documents', () => {
    for (const n of ['PID-HLT-026', 'PLA-HLT-0042', 'BOD-CLI-026', 'LST-INS-026']) expect(isDocumentNumber(n), n).toBe(true);
    for (const n of ['pid-hlt-026', 'PID', 'PID HLT 026', '']) expect(isDocumentNumber(n), n).toBe(false);
  });
});

describe('inputs (E-5: the latest frozen or released revision)', () => {
  it('reference revision', () => {
    expect(referenceRevision('C', { revision: 'D', status: 'released', lastReference: 'D' })).toBe('D');
    expect(referenceRevision('B', { revision: 'C', status: 'draft', lastReference: 'B' })).toBe('B');
    expect(referenceRevision('A', { revision: 'A', status: 'draft', lastReference: null })).toBe('A');
    expect(referenceRevision('2', null)).toBe('2');
  });
  it('state', () => {
    expect(inputStateOf('C', 'D', true)).toBe('outdated');
    expect(inputStateOf('D', 'D', false)).toBe('to_confirm');
    expect(inputStateOf('D', 'D', true)).toBe('up_to_date');
  });
});

describe('generated lists', () => {
  it('blocked, to generate, stale, up to date', () => {
    expect(outputStateOf({ openBlocking: 1, generatedAt: new Date(), generatedFromRevision: 'D', sourceRevision: 'D' })).toBe('blocked');
    expect(outputStateOf({ openBlocking: 0, generatedAt: null, generatedFromRevision: null, sourceRevision: 'D' })).toBe('to_generate');
    expect(outputStateOf({ openBlocking: 0, generatedAt: new Date(), generatedFromRevision: 'C', sourceRevision: 'D' })).toBe('stale');
    expect(outputStateOf({ openBlocking: 0, generatedAt: new Date(), generatedFromRevision: 'D', sourceRevision: 'D' })).toBe('up_to_date');
    expect(outputStateOf({ openBlocking: 0, generatedAt: new Date(), generatedFromRevision: null, sourceRevision: null })).toBe('up_to_date');
  });
});

describe('steps and rights', () => {
  it('deliverable and check steps by state', () => {
    expect(stepsFrom('draft')).toEqual(['freeze', 'obsolete']);
    expect(stepsFrom('frozen')).toEqual(['propose', 'revise', 'obsolete']);
    expect(stepsFrom('release_proposed')).toEqual(['withdraw', 'release']);
    expect(stepsFrom('obsolete')).toEqual([]);
    expect(checkStepsFrom('open')).toEqual(['start', 'send_back', 'resolve', 'cancel']);
    expect(checkStepsFrom('resolved')).toEqual([]);
  });
  it('an engineer writes in their discipline; the lead everywhere; the release by the lead or the document controller', () => {
    const engineer = { roles: ['engineer'] as const, disciplines: ['electrical'] as const };
    expect(writesDiscipline(engineer, 'electrical')).toBe(true);
    expect(writesDiscipline(engineer, 'process')).toBe(false);
    expect(mayTake(engineer, 'lead', 'electrical')).toBe(false);
    expect(writesDiscipline({ roles: ['engineering_lead'], disciplines: [] }, 'process')).toBe(true);
    expect(writesDiscipline({ roles: ['designer'], disciplines: ['mechanical'] }, 'mechanical')).toBe(false);
    expect(mayTake({ roles: ['document_controller'], disciplines: [] }, 'release', 'process')).toBe(true);
    expect(mayTake({ roles: ['reader'], disciplines: [] }, 'release', 'process')).toBe(false);
  });
  it('the engineering lead of a project from the activity Keystone publishes', () => {
    expect(isLeadActivity('Responsable ingénierie')).toBe(true);
    expect(isLeadActivity('Ingénierie électrique')).toBe(false);
    expect(isLeadActivity(null)).toBe(false);
  });
});

describe('Keystone codes', () => {
  it('disciplines and parties', () => {
    expect(disciplineOf('meca')).toBe('mechanical');
    expect(disciplineOf('process')).toBe('process');
    expect(partyOf('achats')).toBe('purchasing');
    expect(partyOf('client')).toBe('client');
    expect(partyOf('nobody')).toBeNull();
  });
});

describe('derived register', () => {
  const deliverable = (number: string, discipline: 'process' | 'electrical', revision: string, status: 'draft' | 'frozen' | 'released' | 'obsolete', lastReference: string | null = null) =>
    ({ id: number, number, title: number, discipline, equipmentRef: null, revision, status, issuedOn: '2026-11-01', authorName: 'X', recipients: [], rowVersion: 1, lastReference });
  const r = deriveRegister({
    deliverables: [deliverable('PID-HLT-026', 'process', 'D', 'released'), deliverable('SCH-ELE-026', 'electrical', 'B', 'draft', 'A'), deliverable('OLD-HLT-026', 'electrical', 'A', 'obsolete')],
    inputs: [
      { id: '1', consumer: 'electrical', documentNumber: 'PID-HLT-026', externalParty: null, externalTitle: null, revisionInUse: 'C', acknowledged: true, acknowledgedByName: 'X' },
      { id: '2', consumer: 'process', documentNumber: 'BOD-CLI-026', externalParty: 'client', externalTitle: 'Basis', revisionInUse: '2', acknowledged: true, acknowledgedByName: 'X' },
    ],
    outputs: [{ id: 'o', number: 'O-01', discipline: 'electrical', name: 'I/O', recipients: [], sourceDeliverable: 'SCH-ELE-026', sourceText: null, generatedAt: new Date(), generatedByName: 'X', generatedFromRevision: 'A' }],
    checks: [{ id: 'c', number: 'C-01', ruleCode: 'revision', ruleLabel: 'Rev', severity: 'warning', title: 't', detail: null, owner: 'electrical', status: 'open', note: null, closedByName: null, rowVersion: 1 }],
  });
  it('inputs, lists and summary are computed', () => {
    expect(r.inputs.map((i) => [i.provider, i.reference, i.state])).toEqual([['process', 'D', 'outdated'], ['client', '2', 'up_to_date']]);
    expect(r.outputs[0].state).toBe('up_to_date');
    const elec = r.summary.find((s) => s.discipline === 'electrical')!;
    expect(elec).toMatchObject({ deliverables: 1, released: 0, releasedShare: 0, inputsWaiting: 1, openChecks: 1, openBlocking: 0 });
    expect(r.summary.find((s) => s.discipline === 'process')!.releasedShare).toBe(100);
    expect(r.wait.electrical.process).toEqual({ waiting: 1, total: 1 });
  });
  it('shares and the matrix', () => {
    expect(releasedShare([])).toBeNull();
    expect(releasedShare(['released', 'draft', 'obsolete'])).toBe(50);
    expect(waitMatrix([]).process).toEqual({});
  });
});
