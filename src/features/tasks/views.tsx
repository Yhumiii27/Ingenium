'use client';
// « My tasks » and « My approvals » of Norma (charte/ds/MyTasks.tsx, MyApprovals.tsx) with the state in the URL: view
// (`?vue=liste|kanban|calendrier`), scope (`?portee=suite|outil`, TA-15) and the calendar's mode and day. The rows come from the
// page (matrix.pub_taches through src/server/dal/tasks.ts). No move and no decision here yet: Ingenium owns no task until its
// registers (delivery 2); the rows of other tools open in their own tool (phase 1 of the contract).
import { MyApprovals } from '@norma/charte/ds/MyApprovals';
import { MyTasks } from '@norma/charte/ds/MyTasks';
import type { CalendarMode, TaskRow, TaskView } from '@norma/charte/ds/task-rules';
import { tasksHref, type TaskScope } from './href';


export interface TasksViewProps {
  items: TaskRow[];
  today: string;
  view: TaskView;
  scope: TaskScope;
  mode: CalendarMode;
  date: string;
  unavailable: string[];
}

export function TasksView({ items, today, view, scope, mode, date, unavailable }: TasksViewProps) {
  return (
    <MyTasks
      tool="ingenium"
      items={items}
      today={today}
      view={view}
      viewHref={(v) => tasksHref({ view: v, scope })}
      unavailable={unavailable}
      calendar={{ mode, date, href: (m, d) => tasksHref({ view: 'calendrier', scope, mode: m, date: d }) }}
    />
  );
}

export function ApprovalsView({ items, today, unavailable }: { items: TaskRow[]; today: string; unavailable: string[] }) {
  return <MyApprovals tool="ingenium" items={items} today={today} unavailable={unavailable} />;
}
