import 'server-only';
// « My tasks » and « My approvals » (Norma 2.4): the person's rows of the whole suite (src/server/integrations/matrix/tasks.ts),
// memoised per request. Ingenium's own computed tasks join them with the registers of delivery 2 (ING-25).
import { dedupe, type TaskRow } from '@norma/charte/ds/task-rules';
import { cache } from 'react';
import { ownTaskRows } from '@/server/tasks/projection';
import { getConfig } from '@/server/config';
import { getDb } from '@/server/db/client';
import { readSuiteTasks, type SuiteTasks } from '@/server/integrations/matrix/tasks';
import type { Viewer } from '@/server/viewer';

export const suiteTasksOf = cache(async (v: Viewer, today: string): Promise<SuiteTasks> =>
  readSuiteTasks(await getDb(), { mode: getConfig().connectors.suiteTasks, personId: v.oid, today }));

/** The viewer's own rows of Ingenium (the projection, read by e-mail), shaped like the rows of matrix.pub_taches. */
export const ownTasksOf = cache(async (v: Viewer): Promise<TaskRow[]> => {
  const rows = await ownTaskRows(await getDb(), v.email);
  return rows.map((r): TaskRow => ({
    outil: 'ingenium', tache_id: r.taskId, nature: r.nature as TaskRow['nature'], type: r.type, type_libelle: r.typeLabel, type_libelle_en: r.typeLabelEn,
    objet_ref: r.objectRef, titre: r.title, personne_id: v.oid ?? v.userId, pour_le_compte_de: null, etat: r.state as TaskRow['etat'], resultat: null,
    echeance: r.dueOn, priorite: r.priority as TaskRow['priorite'], actions: r.actions as TaskRow['actions'], decision_a_distance: false, sensible: r.sensitive,
    projet: r.projectCode, site: null, filiale: null, lien: r.link, version: r.version, cree_le: r.createdAt.toISOString(), maj_le: r.updatedAt.toISOString(),
  }));
});

/** Every task of the viewer: Ingenium's own rows and those of the whole suite, each counted once (`dedupe`). */
export const allTasksOf = cache(async (v: Viewer, today: string): Promise<SuiteTasks> => {
  const [suite, own] = await Promise.all([suiteTasksOf(v, today), ownTasksOf(v)]);
  return { ...suite, rows: dedupe([...suite.rows.filter((r) => r.outil !== 'ingenium' || !own.some((o) => o.tache_id === r.tache_id)), ...own]) };
});
