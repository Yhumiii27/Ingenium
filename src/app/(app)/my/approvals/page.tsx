// My approvals (Norma 3.1, COQUE.md § 2 bis.5): the decisions expected from the person in the whole suite (matrix.pub_taches),
// plus those decided in the last seven days. Those of other tools open in their own tool (phase 1 of the contract
// norma/contrats/taches-v1.md); Ingenium's own (part validation, release proposal, P&ID step, ECO key) come with deliveries 2–3.
import { Callout } from '@/components/app/Callout';
import { PageHeader } from '@/components/app/shell/page-header';
import { ApprovalsView } from '@/features/tasks/views';
import { businessToday } from '@/server/clock';
import { allTasksOf } from '@/server/dal/tasks';
import { getI18n, getViewer } from '@/server/session';

export default async function MyApprovalsPage() {
  const [{ t }, viewer, today] = await Promise.all([getI18n(), getViewer(), businessToday()]);
  const tasks = await allTasksOf(viewer, today);
  return (
    <>
      <PageHeader screen="approvals" />
      {tasks.simulated && <Callout variant="compact">{t('Tasks of the other tools simulated (demonstration data set)')}</Callout>}
      <ApprovalsView items={tasks.rows} today={today} unavailable={tasks.unavailable} />
    </>
  );
}
