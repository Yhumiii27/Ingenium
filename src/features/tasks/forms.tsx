// « New task » (ING-25, ING-31): a free task for oneself, or for a member of a project's team (their e-mail, as Keystone
// publishes the team). In a side panel; createFreeTaskAction checks everything again.
import { Field, Input, Select } from '@norma/charte/ds/Field';
import { ActionForm, Folded } from '@/components/app/ActionForm';
import type { T } from '@/i18n/translate';
import { createFreeTaskAction } from './actions';

export function NewTaskForm({ t, projects }: { t: T; projects: readonly { value: string; label: string }[] }) {
  return (
    <Folded summary="New task" variant="primary">
      <ActionForm action={createFreeTaskAction} submit="Create" done="Task created">
        <Field label={t('Title')} required span="full" hint={t('Neutral title: no health or personal data (it is published to the whole suite)')}><Input name="title" required maxLength={200} /></Field>
        <Field label={t('Project')}>
          <Select name="project" defaultValue="">
            <option value="">—</option>
            {projects.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
        </Field>
        <Field label={t('For')} hint={t('Empty: for me; else the e-mail of a member of the project’s team')}><Input name="assignee" type="email" maxLength={200} /></Field>
        <Field label={t('Due date')}><Input name="due" type="date" /></Field>
        <Field label={t('Priority')}><Select name="priority" defaultValue="normal" options={[{ value: 'normal', label: t('Normal') }, { value: 'high', label: t('High') }]} /></Field>
      </ActionForm>
    </Folded>
  );
}
