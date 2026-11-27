// My tasks (Norma 3.1, COQUE.md § 2 bis.4; ING-25): every task of the person in the whole suite — list, board, calendar —
// read in matrix.pub_taches, with the « Whole suite » / « This tool » tabs. Ingenium's own computed tasks (input to confirm,
// check to close, list to generate, release to propose; lot 2a) and the free tasks (ING-31) join them; « New task » creates one.
import { Segmented } from '@norma/charte/ds/Segmented';
import { FilterBar } from '@norma/charte/ds/FilterBar';
import { TASK_VIEWS, type CalendarMode, type TaskView } from '@norma/charte/ds/task-rules';
import { Callout } from '@/components/app/Callout';
import { PageHeader } from '@/components/app/shell/page-header';
import { tasksHref, type TaskScope } from '@/features/tasks/href';
import { TasksView } from '@/features/tasks/views';
import { NewTaskForm } from '@/features/tasks/forms';
import { projectLabel } from '@/domain/vocab';
import { projectsInScope } from '@/server/dal/projects';
import { businessToday } from '@/server/clock';
import { allTasksOf } from '@/server/dal/tasks';
import { getI18n, getViewer } from '@/server/session';

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function MyTasksPage({ searchParams }: { searchParams: Promise<SP> }) {
  const [{ t }, viewer, today, sp] = await Promise.all([getI18n(), getViewer(), businessToday(), searchParams]);
  const [tasks, projects] = await Promise.all([allTasksOf(viewer, today), projectsInScope(viewer)]);
  const vue = one(sp.vue);
  const view: TaskView = (TASK_VIEWS as readonly string[]).includes(vue ?? '') ? (vue as TaskView) : 'liste';
  const scope: TaskScope = one(sp.portee) === 'outil' ? 'outil' : 'suite';
  const mode: CalendarMode = one(sp.mode) === 'semaine' ? 'semaine' : 'mois';
  const d = one(sp.date);
  const date = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today;
  const items = scope === 'outil' ? tasks.rows.filter((r) => r.outil === 'ingenium') : tasks.rows;
  return (
    <>
      <PageHeader
        screen="tasks"
        primary={<NewTaskForm t={t} projects={projects.filter((p) => p.open).map((p) => ({ value: p.code, label: `${projectLabel(p)} — ${p.name}` }))} />}
        toolbar={
          <FilterBar>
            <Segmented
              label={t('Scope')}
              value={scope}
              options={[
                { value: 'suite', label: t('Whole suite'), href: tasksHref({ view, scope: 'suite' }) },
                { value: 'outil', label: t('This tool'), href: tasksHref({ view, scope: 'outil' }) },
              ]}
            />
          </FilterBar>
        }
      />
      {tasks.simulated && <Callout variant="compact">{t('Tasks of the other tools simulated (demonstration data set)')}</Callout>}
      <TasksView items={items} today={today} view={view} scope={scope} mode={mode} date={date} unavailable={tasks.unavailable} />
    </>
  );
}
