'use client';
// « My tasks » and « My approvals » of Norma (charte/ds/MyTasks.tsx, MyApprovals.tsx) with the state in the URL: view
// (`?vue=liste|kanban|calendrier`), scope (`?portee=suite|outil`, TA-15) and the calendar's mode and day. The rows come from the
// page (Ingenium's own rows and matrix.pub_taches, src/server/dal/tasks.ts). A free task of Ingenium moves along the board
// (moveFreeTaskAction re-checks everything); a computed task moves with its object in the register; the rows of other tools open
// in their own tool (phase 1 of the contract).
import { MyApprovals } from '@norma/charte/ds/MyApprovals';
import { MyTasks } from '@norma/charte/ds/MyTasks';
import type { CalendarMode, TaskRow, TaskView } from '@norma/charte/ds/task-rules';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { showToast } from '@norma/charte/ds/Toast';
import { useI18n } from '@/i18n/client';
import { moveFreeTaskAction } from './actions';
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
  const router = useRouter();
  const { t } = useI18n();
  const [, start] = useTransition();
  return (
    <MyTasks
      onMove={(row, action) => {
        if (row.outil !== 'ingenium' || !row.tache_id.startsWith('libre:')) return;
        start(async () => {
          const r = await moveFreeTaskAction(row.tache_id.slice('libre:'.length), action);
          if (!r.ok) showToast(t(r.error));
          router.refresh();
        });
      }}
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
