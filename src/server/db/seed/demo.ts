// Demonstration data set of delivery 1 — entirely fictitious: the "View as" personas and their colleagues (demo.example only),
// and Keystone's projects and engineering teams as the simulated connector serves them (project codes of Keystone's own
// demonstration data set: HLT-026, NDC-031, EWA-051, PRS-038, WSA-044). The engineering registers come with deliveries 2 to 4.
import { addDays } from '@norma/charte/ds/task-rules';
import { freeTasks, syncRuns, users } from '../schema';
import { runRegisterTransferTx } from '@/server/integrations/keystone/register';
import { simulatedKeystoneRegister } from '@/server/integrations/keystone/register-demo';
import { rebuildPublishedTasks } from '@/server/tasks/projection';
import type { Tx } from '../types';
import { simulatedKeystone, writeMirror } from '@/server/integrations/keystone/sync';
import { DEMO_COLLEAGUES, DEMO_PERSONAS } from './personas';

export async function seedDemo(tx: Tx, now = new Date(), today = now.toISOString().slice(0, 10)): Promise<void> {
  const ids = new Map<string, string>();
  for (const p of [...DEMO_PERSONAS, ...DEMO_COLLEAGUES]) {
    const [u] = await tx.insert(users).values({ name: p.name, email: p.email }).returning({ id: users.id });
    ids.set(p.email, u.id);
  }
  // Keystone's mirror is written only by its connector: the seed runs the simulation once (the job keystone-sync refreshes it).
  const rows = simulatedKeystone();
  await writeMirror(tx, rows, 'simulation', now);
  await tx.insert(syncRuns).values({
    source: 'keystone', startedAt: now, finishedAt: now, outcome: 'ok', rows: rows.projects.length + rows.members.length,
    message: 'Simulated Keystone (demonstration data set)',
  });
  // Delivery 2 (lot 2a): the demonstration shows the register held by Ingenium — Keystone's simulated register imported by one
  // applied transfer (docs/spec/06, phase 2 for the register). A production database starts with the register held in Keystone.
  await runRegisterTransferTx(tx, {
    rows: simulatedKeystoneRegister(today), source: 'simulation', apply: true, at: now,
    actor: { userId: null, name: 'Jeu de démonstration', role: null },
  });
  const lead = DEMO_PERSONAS.find((p) => p.role === 'engineering_lead')!;
  const engineer = DEMO_PERSONAS.find((p) => p.role === 'engineer')!;
  for (const t of [
    { title: 'Préparer la revue P&ID rév. D avec le client', projectCode: 'HLT-026', who: lead, due: addDays(today, 4), priority: 'high' },
    { title: 'Relire la liste des instruments avant diffusion', projectCode: 'HLT-026', who: engineer, due: addDays(today, 2), priority: 'normal' },
    { title: 'Mettre à jour mes modèles de livrables', projectCode: null, who: engineer, due: null, priority: 'normal' },
  ])
    await tx.insert(freeTasks).values({
      title: t.title, projectCode: t.projectCode, assigneeEmail: t.who.email, assigneeName: t.who.name, createdByUserId: ids.get(lead.email)!,
      createdByName: lead.name, dueOn: t.due, priority: t.priority, createdAt: now, updatedAt: now,
    });
  await rebuildPublishedTasks(tx, now);
}
