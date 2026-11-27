// Ingenium's own tasks and approvals (ING-25; contract norma/contrats/taches-v1.md): computed from the engineering register
// once it is held by Ingenium (an object still held in Keystone gives no task here: Keystone is its only writer), plus the
// free tasks people create (ING-31, default: with the registers). Pure: the rows of the projection `published_tasks`, one per
// task and recipient. Titles are neutral (contract § 3) and in French, as the publication is; the tasks of a confidential
// project are `sensible` (another tool shows their type only).
import type { TaskAction, TaskState } from '@norma/charte/ds/task-rules';
import { isLeadActivity, type CheckSeverity, type CheckStatus, type DeliverableStatus, type InputState, type OutputState } from './register';
import type { DisciplineCode } from './vocab';

export const FREE_TASK_STATES = ['todo', 'in_progress', 'waiting', 'done', 'cancelled'] as const;
export type FreeTaskState = (typeof FREE_TASK_STATES)[number];
export const TASK_PRIORITIES = ['normal', 'high'] as const;
export type TaskPriorityCode = (typeof TASK_PRIORITIES)[number];
export const PUBLISHED_STATES: readonly TaskState[] = ['a_faire', 'en_cours', 'en_attente', 'faite', 'annulee'];

/** French code of the contract for a free task's state. */
export const FREE_STATE_CODE: Record<FreeTaskState, TaskState> = { todo: 'a_faire', in_progress: 'en_cours', waiting: 'en_attente', done: 'faite', cancelled: 'annulee' };

/** Transitions of a free task (the contract's actions): from which states, to which state. */
export const FREE_TASK_MOVES: Record<'demarrer' | 'suspendre' | 'reprendre' | 'terminer', { from: readonly FreeTaskState[]; to: FreeTaskState }> = {
  demarrer: { from: ['todo'], to: 'in_progress' },
  suspendre: { from: ['todo', 'in_progress'], to: 'waiting' },
  reprendre: { from: ['waiting'], to: 'in_progress' },
  terminer: { from: ['todo', 'in_progress', 'waiting'], to: 'done' },
};
export type FreeTaskMove = keyof typeof FREE_TASK_MOVES;
export const isFreeTaskMove = (v: unknown): v is FreeTaskMove => typeof v === 'string' && Object.hasOwn(FREE_TASK_MOVES, v);
export const freeMovesFrom = (s: FreeTaskState): FreeTaskMove[] => (Object.keys(FREE_TASK_MOVES) as FreeTaskMove[]).filter((m) => FREE_TASK_MOVES[m].from.includes(s));

/** A done or cancelled task stays published this many days (contract § 1), then leaves the projection. */
export const CLOSED_KEPT_DAYS = 30;

export interface TaskMember { email: string | null; personName: string; discipline: DisciplineCode | null; activity: string | null }

export interface TaskProject {
  code: string;
  label: string;
  confidential: boolean;
  team: readonly TaskMember[];
  inputs: readonly { consumer: DisciplineCode; documentNumber: string; reference: string; state: InputState }[];
  checks: readonly { number: string; owner: DisciplineCode; severity: CheckSeverity; status: CheckStatus; title: string }[];
  deliverables: readonly { number: string; discipline: DisciplineCode; revision: string; status: DeliverableStatus; title: string }[];
  outputs: readonly { number: string; discipline: DisciplineCode; name: string; state: OutputState }[];
}

export interface TaskFree {
  id: string;
  title: string;
  projectCode: string | null;
  assigneeEmail: string;
  dueOn: string | null;
  priority: TaskPriorityCode;
  state: FreeTaskState;
  doneAt: Date | null;
  updatedAt: Date;
  rowVersion: number;
  projectConfidential: boolean;
}

export interface OwnTask {
  taskId: string;
  recipientEmail: string;
  nature: 'tache' | 'approbation';
  type: string;
  typeLabel: string;
  typeLabelEn: string;
  objectRef: string | null;
  title: string;
  state: TaskState;
  dueOn: string | null;
  priority: 'normale' | 'haute';
  actions: TaskAction[];
  sensitive: boolean;
  projectCode: string | null;
  /** Path in Ingenium (made absolute with the public address by the writer). */
  path: string;
  version: string;
}

const DISCIPLINE_FR: Record<DisciplineCode, string> = { process: 'process', mechanical: 'mécanique', electrical: 'électrique', automation: 'automatisme' };
const DISCIPLINE_PATH: Record<DisciplineCode, string> = { process: 'process', mechanical: 'mechanical', electrical: 'electrical', automation: 'automation' };

const emailsOf = (team: readonly TaskMember[], pick: (m: TaskMember) => boolean) =>
  [...new Set(team.filter((m) => m.email && pick(m)).map((m) => m.email!))];

/**
 * Every task of the register held by Ingenium and every free task, one row per recipient. Inputs to confirm and outdated go to
 * the engineers of the consuming discipline; open checks to those of the owning discipline (a blocking one is high priority);
 * lists to generate or stale to those of their discipline; a frozen deliverable is an approval of the project's engineering
 * leads (propose the release, ING-20); a free task to its assignee.
 */
export function computeOwnTasks(projects: readonly TaskProject[], free: readonly TaskFree[], now: Date): OwnTask[] {
  const out: OwnTask[] = [];
  for (const p of projects) {
    const base = { sensitive: p.confidential, projectCode: p.code };
    const eng = (d: DisciplineCode) => emailsOf(p.team, (m) => m.discipline === d);
    const leads = emailsOf(p.team, (m) => isLeadActivity(m.activity));
    for (const i of p.inputs) {
      if (i.state === 'up_to_date') continue;
      for (const email of eng(i.consumer))
        out.push({
          ...base, taskId: `entree:${p.code}:${i.consumer}:${i.documentNumber}`, recipientEmail: email, nature: 'tache', type: 'input_to_confirm',
          typeLabel: 'Entrée à confirmer', typeLabelEn: 'Input to confirm', objectRef: i.documentNumber,
          title: `${i.documentNumber} rév. ${i.reference} à confirmer (${DISCIPLINE_FR[i.consumer]}, ${p.label})`, state: 'a_faire', dueOn: null,
          priority: i.state === 'outdated' ? 'haute' : 'normale', actions: ['ouvrir'], path: `/projects/${p.code}/${DISCIPLINE_PATH[i.consumer]}`, version: `${i.reference}:${i.state}`,
        });
    }
    for (const c of p.checks) {
      if (c.status !== 'open' && c.status !== 'in_progress' && c.status !== 'sent_back') continue;
      for (const email of eng(c.owner))
        out.push({
          ...base, taskId: `controle:${p.code}:${c.number}`, recipientEmail: email, nature: 'tache', type: 'check_to_close',
          typeLabel: 'Contrôle de cohérence', typeLabelEn: 'Consistency check', objectRef: `${p.code} ${c.number}`,
          title: `Contrôle ${c.number} à traiter (${DISCIPLINE_FR[c.owner]}, ${p.label})`,
          state: c.status === 'in_progress' ? 'en_cours' : c.status === 'sent_back' ? 'en_attente' : 'a_faire', dueOn: null,
          priority: c.severity === 'blocking' ? 'haute' : 'normale', actions: ['ouvrir'], path: `/projects/${p.code}/${DISCIPLINE_PATH[c.owner]}`, version: c.status,
        });
    }
    for (const o of p.outputs) {
      if (o.state !== 'to_generate' && o.state !== 'stale') continue;
      for (const email of eng(o.discipline))
        out.push({
          ...base, taskId: `liste:${p.code}:${o.number}`, recipientEmail: email, nature: 'tache', type: 'list_to_generate',
          typeLabel: 'Liste à générer', typeLabelEn: 'List to generate', objectRef: `${p.code} ${o.number}`,
          title: `${o.number} ${o.state === 'stale' ? 'à régénérer' : 'à générer'} (${DISCIPLINE_FR[o.discipline]}, ${p.label})`, state: 'a_faire', dueOn: null,
          priority: 'normale', actions: ['ouvrir'], path: `/projects/${p.code}/${DISCIPLINE_PATH[o.discipline]}`, version: o.state,
        });
    }
    for (const d of p.deliverables) {
      if (d.status !== 'frozen') continue;
      for (const email of leads)
        out.push({
          ...base, taskId: `diffusion:${p.code}:${d.number}:${d.revision}`, recipientEmail: email, nature: 'approbation', type: 'release_proposal',
          typeLabel: 'Proposition de diffusion', typeLabelEn: 'Release proposal', objectRef: d.number,
          title: `Diffusion de ${d.number} rév. ${d.revision} à proposer (${p.label})`, state: 'a_faire', dueOn: null,
          priority: 'normale', actions: ['ouvrir'], path: `/projects/${p.code}/${DISCIPLINE_PATH[d.discipline]}`, version: `${d.revision}:${d.status}`,
        });
    }
  }
  const keepSince = now.getTime() - CLOSED_KEPT_DAYS * 86_400_000;
  for (const f of free) {
    const closedAt = f.state === 'done' ? f.doneAt : f.state === 'cancelled' ? f.updatedAt : null;
    if (closedAt && closedAt.getTime() < keepSince) continue;
    out.push({
      taskId: `libre:${f.id}`, recipientEmail: f.assigneeEmail, nature: 'tache', type: 'free_task', typeLabel: 'Tâche', typeLabelEn: 'Task',
      objectRef: f.projectCode, title: f.title, state: FREE_STATE_CODE[f.state], dueOn: f.dueOn, priority: f.priority === 'high' ? 'haute' : 'normale',
      actions: ['ouvrir', ...freeMovesFrom(f.state)], sensitive: f.projectConfidential, projectCode: f.projectCode, path: '/my/tasks?portee=outil', version: String(f.rowVersion),
    });
  }
  return out;
}
