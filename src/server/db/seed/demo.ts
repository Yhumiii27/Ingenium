// Demonstration data set of delivery 1 — entirely fictitious: the "View as" personas and their colleagues (demo.example only),
// and Keystone's projects and engineering teams as the simulated connector serves them (project codes of Keystone's own
// demonstration data set: HLT-026, NDC-031, EWA-051, PRS-038, WSA-044). The engineering registers come with deliveries 2 to 4.
import { syncRuns, users } from '../schema';
import type { Tx } from '../types';
import { simulatedKeystone, writeMirror } from '@/server/integrations/keystone/sync';
import { DEMO_COLLEAGUES, DEMO_PERSONAS } from './personas';

export async function seedDemo(tx: Tx, now = new Date()): Promise<void> {
  for (const p of [...DEMO_PERSONAS, ...DEMO_COLLEAGUES]) await tx.insert(users).values({ name: p.name, email: p.email });
  // Keystone's mirror is written only by its connector: the seed runs the simulation once (the job keystone-sync refreshes it).
  const rows = simulatedKeystone();
  await writeMirror(tx, rows, 'simulation', now);
  await tx.insert(syncRuns).values({
    source: 'keystone', startedAt: now, finishedAt: now, outcome: 'ok', rows: rows.projects.length + rows.members.length,
    message: 'Simulated Keystone (demonstration data set)',
  });
}
