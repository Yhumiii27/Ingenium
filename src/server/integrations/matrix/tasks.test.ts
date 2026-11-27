// Tasks of the whole suite: the simulation follows the contract taches-v1; the views read the person's rows; a missing view is
// the banner « Matrix: source unavailable », never an error.
import { rowProblems } from '@norma/charte/ds/task-rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testDatabase, type TestDatabase } from '@/test/db';
import { readSuiteTasks, simulatedSuiteTasks, taskRowOf } from './tasks';

let t: TestDatabase;
beforeAll(async () => {
  t = await testDatabase({ seed: 'production' });
});
afterAll(() => t.close());

describe('suite tasks', () => {
  it('the simulated rows follow the contract and are dated from the business day', () => {
    const rows = simulatedSuiteTasks('2026-11-24');
    for (const r of rows) expect(rowProblems(r), r.tache_id).toEqual([]);
    expect(rows.some((r) => r.echeance! < '2026-11-24' && r.etat !== 'faite')).toBe(true);
    expect(rows.every((r) => r.outil !== 'ingenium')).toBe(true);
  });
  it('a row breaking the contract is left out', () => {
    expect(taskRowOf({ outil: 'x' })).toBeNull();
  });
  it('off: nothing; views without the view: « matrix » unavailable', async () => {
    expect(await readSuiteTasks(t.db, { mode: 'off', personId: null, today: '2026-11-24' })).toEqual({ rows: [], unavailable: [], simulated: false });
    expect(await readSuiteTasks(t.db, { mode: 'views', personId: '00000000-0000-4000-8000-000000000009', today: '2026-11-24' })).toEqual({ rows: [], unavailable: ['matrix'], simulated: false });
    expect((await readSuiteTasks(t.db, { mode: 'simulation', personId: null, today: '2026-11-24' })).simulated).toBe(true);
  });
});
