import { describe, expect, it } from 'vitest';
import { computeOwnTasks, freeMovesFrom, type TaskFree, type TaskProject } from './own-tasks';

const now = new Date('2026-11-24T10:00:00Z');
const project: TaskProject = {
  code: 'HLT-026', label: '#026 · HLT-026', confidential: false,
  team: [
    { email: 'lead@demo.example', personName: 'Lead', discipline: null, activity: 'Responsable ingénierie' },
    { email: 'elec@demo.example', personName: 'Elec', discipline: 'electrical', activity: 'Ingénierie électrique' },
    { email: null, personName: 'Sans adresse', discipline: 'electrical', activity: null },
  ],
  inputs: [
    { consumer: 'electrical', documentNumber: 'PID-HLT-026', reference: 'D', state: 'outdated' },
    { consumer: 'electrical', documentNumber: 'GA-HLT-026', reference: 'C', state: 'up_to_date' },
  ],
  checks: [
    { number: 'C-01', owner: 'electrical', severity: 'blocking', status: 'open', title: 'x' },
    { number: 'C-02', owner: 'electrical', severity: 'info', status: 'resolved', title: 'x' },
  ],
  deliverables: [{ number: 'LST-IO-026', discipline: 'electrical', revision: 'B', status: 'frozen', title: 'I/O' }],
  outputs: [{ number: 'O-03', discipline: 'electrical', name: 'I/O list', state: 'blocked' }, { number: 'O-05', discipline: 'electrical', name: 'Cables', state: 'stale' }],
};

describe('own tasks', () => {
  it('computed from the register, one row per recipient with an e-mail', () => {
    const t = computeOwnTasks([project], [], now);
    expect(t.map((x) => [x.taskId, x.recipientEmail, x.nature, x.priority])).toEqual([
      ['entree:HLT-026:electrical:PID-HLT-026', 'elec@demo.example', 'tache', 'haute'],
      ['controle:HLT-026:C-01', 'elec@demo.example', 'tache', 'haute'],
      ['liste:HLT-026:O-05', 'elec@demo.example', 'tache', 'normale'],
      ['diffusion:HLT-026:LST-IO-026:B', 'lead@demo.example', 'approbation', 'normale'],
    ]);
    expect(t.every((x) => !x.sensitive && x.actions.includes('ouvrir'))).toBe(true);
  });
  it('a confidential project gives sensitive tasks', () => {
    expect(computeOwnTasks([{ ...project, confidential: true }], [], now).every((x) => x.sensitive)).toBe(true);
  });
  it('free tasks: actions of the board, closed ones kept 30 days', () => {
    const f = (state: TaskFree['state'], doneAt: Date | null = null): TaskFree => ({
      id: state, title: 'T', projectCode: null, assigneeEmail: 'a@demo.example', dueOn: null, priority: 'normal', state, doneAt, updatedAt: doneAt ?? now, rowVersion: 1, projectConfidential: false,
    });
    const t = computeOwnTasks([], [f('todo'), f('done', new Date('2026-11-20T00:00:00Z')), f('done', new Date('2026-09-01T00:00:00Z'))], now);
    expect(t.map((x) => [x.taskId, x.state, x.actions.join(',')])).toEqual([
      ['libre:todo', 'a_faire', 'ouvrir,demarrer,suspendre,terminer'],
      ['libre:done', 'faite', 'ouvrir'],
    ]);
    expect(freeMovesFrom('waiting')).toEqual(['reprendre', 'terminer']);
  });
});
