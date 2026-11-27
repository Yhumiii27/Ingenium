import 'server-only';
// « My tasks » and « My approvals » (Norma 2.4): the person's rows of the whole suite (src/server/integrations/matrix/tasks.ts),
// memoised per request. Ingenium's own computed tasks join them with the registers of delivery 2 (ING-25).
import { cache } from 'react';
import { getConfig } from '@/server/config';
import { getDb } from '@/server/db/client';
import { readSuiteTasks, type SuiteTasks } from '@/server/integrations/matrix/tasks';
import type { Viewer } from '@/server/viewer';

export const suiteTasksOf = cache(async (v: Viewer, today: string): Promise<SuiteTasks> =>
  readSuiteTasks(await getDb(), { mode: getConfig().connectors.suiteTasks, personId: v.oid, today }));
