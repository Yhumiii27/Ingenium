// Address of « My tasks » with its view, scope and calendar in the URL (pure: used by the page and its client island).
import type { CalendarMode, TaskView } from '@norma/charte/ds/task-rules';

export type TaskScope = 'suite' | 'outil';

export function tasksHref(p: { view: TaskView; scope: TaskScope; mode?: CalendarMode; date?: string }): string {
  const q = new URLSearchParams();
  if (p.view !== 'liste') q.set('vue', p.view);
  if (p.scope !== 'suite') q.set('portee', p.scope);
  if (p.view === 'calendrier' && p.mode && p.mode !== 'mois') q.set('mode', p.mode);
  if (p.view === 'calendrier' && p.date) q.set('date', p.date);
  const s = q.toString();
  return `/my/tasks${s ? `?${s}` : ''}`;
}
