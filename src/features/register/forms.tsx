// Forms of the engineering register, each in a side panel opened by a header or row button (Norma § 7: no form open in a page;
// the panel closes on success). Server components: the Server Functions of ./actions.ts do every check again.
import { Field, Input, Select, Textarea } from '@norma/charte/ds/Field';
import { ActionForm, Folded } from '@/components/app/ActionForm';
import {
  CHECK_SEVERITIES, CHECK_SEVERITY_LABEL, CHECK_STEP, DELIVERABLE_STEP, PARTIES, PARTY_LABEL, nextRevision, type CheckStep, type DeliverableStep,
} from '@/domain/register';
import { DISCIPLINE_LABEL, type DisciplineCode } from '@/domain/vocab';
import type { T } from '@/i18n/translate';
import {
  addChangeAction, addDeliverableAction, addInputAction, addOutputAction, checkStepAction, confirmInputAction, deliverableStepAction, generateOutputAction, raiseCheckAction,
} from './actions';
import s from './register.module.css';

const Hidden = ({ name, value }: { name: string; value: string }) => <input type="hidden" name={name} value={value} />;

function Recipients({ t, name = 'recipients' }: { t: T; name?: string }) {
  return (
    <Field label={t('Recipients')} span="full">
      <div className={s.checks}>
        {PARTIES.map((p) => (
          <label key={p} className={s.check}><input type="checkbox" name={name} value={p} /> {t(PARTY_LABEL[p])}</label>
        ))}
      </div>
    </Field>
  );
}

const disciplineOptions = (t: T, ds: readonly DisciplineCode[]) => ds.map((d) => ({ value: d, label: t(DISCIPLINE_LABEL[d]) }));

export function AddDeliverableForm({ t, project, disciplines, variant }: { t: T; project: string; disciplines: readonly DisciplineCode[]; variant?: 'primary' | 'secondary' }) {
  return (
    <Folded summary="Add a deliverable" variant={variant}>
      <ActionForm action={addDeliverableAction} submit="Add" done="Deliverable added">
        <Hidden name="project" value={project} />
        <Field label={t('Discipline')} required><Select name="discipline" options={disciplineOptions(t, disciplines)} /></Field>
        <Field label={t('Codex document number')} required hint={t('The file stays in Codex: Ingenium keeps the reference only')}><Input name="number" required placeholder="SCH-ELE-026" /></Field>
        <Field label={t('Title')} required span="full"><Input name="title" required maxLength={200} /></Field>
        <Field label={t('Revision')} required><Input name="revision" required defaultValue="A" maxLength={3} /></Field>
        <Field label={t('Equipment of the project')} hint={t('Until Keystone publishes the equipments (DI-K3), typed as is')}><Input name="equipment" maxLength={60} /></Field>
        <Recipients t={t} />
      </ActionForm>
    </Folded>
  );
}

export function AddInputForm({ t, project, disciplines, documents }: { t: T; project: string; disciplines: readonly DisciplineCode[]; documents: readonly string[] }) {
  return (
    <Folded summary="Add an input">
      <ActionForm action={addInputAction} submit="Add" done="Input added">
        <Hidden name="project" value={project} />
        <Field label={t('Consuming discipline')} required><Select name="consumer" options={disciplineOptions(t, disciplines)} /></Field>
        <Field label={t('Document number')} required hint={t('A deliverable of the project, or an outside document')}>
          <Input name="document" required list="register-documents" />
          <datalist id="register-documents">{documents.map((d) => <option key={d} value={d} />)}</datalist>
        </Field>
        <Field label={t('Revision in use')} required><Input name="revision" required maxLength={3} /></Field>
        <Field label={t('Outside provider')}>
          <Select name="party" defaultValue="">
            <option value="">{t('A deliverable of the project')}</option>
            {PARTIES.filter((p) => !['process', 'mechanical', 'electrical', 'automation'].includes(p)).map((p) => <option key={p} value={p}>{t(PARTY_LABEL[p])}</option>)}
          </Select>
        </Field>
        <Field label={t('Title of the outside document')} span="full"><Input name="title" maxLength={200} /></Field>
      </ActionForm>
    </Folded>
  );
}

export function AddOutputForm({ t, project, disciplines, documents }: { t: T; project: string; disciplines: readonly DisciplineCode[]; documents: readonly string[] }) {
  return (
    <Folded summary="Declare a generated list">
      <ActionForm action={addOutputAction} submit="Declare" done="List declared">
        <Hidden name="project" value={project} />
        <Field label={t('Discipline')} required><Select name="discipline" options={disciplineOptions(t, disciplines)} /></Field>
        <Field label={t('Name')} required><Input name="name" required maxLength={120} /></Field>
        <Field label={t('Source deliverable')}>
          <Select name="sourceDeliverable" defaultValue="">
            <option value="">—</option>
            {documents.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label={t('Source (free text)')}><Input name="sourceText" maxLength={200} /></Field>
        <Recipients t={t} />
      </ActionForm>
    </Folded>
  );
}

export function RaiseCheckForm({ t, project, rules }: { t: T; project: string; rules: readonly { code: string; label: string }[] }) {
  return (
    <Folded summary="Raise a check">
      <ActionForm action={raiseCheckAction} submit="Raise" done="Check raised">
        <Hidden name="project" value={project} />
        <Field label={t('Rule')} required><Select name="rule" options={rules.map((r) => ({ value: r.code, label: r.label }))} /></Field>
        <Field label={t('Severity')} required><Select name="severity" options={CHECK_SEVERITIES.map((v) => ({ value: v, label: t(CHECK_SEVERITY_LABEL[v]) }))} /></Field>
        <Field label={t('Owning discipline')} required><Select name="owner" options={disciplineOptions(t, ['process', 'mechanical', 'electrical', 'automation'])} /></Field>
        <Field label={t('Title')} required span="full"><Input name="title" required maxLength={200} /></Field>
        <Field label={t('Detail')} span="full"><Textarea name="detail" short maxLength={500} /></Field>
      </ActionForm>
    </Folded>
  );
}

export function AddChangeForm({ t, project }: { t: T; project: string }) {
  return (
    <Folded summary="Record a change">
      <ActionForm action={addChangeAction} submit="Record" done="Change recorded">
        <Hidden name="project" value={project} />
        <Field label={t('Change and its impact')} required span="full"><Textarea name="text" required short maxLength={500} /></Field>
        <Recipients t={t} />
      </ActionForm>
    </Folded>
  );
}

/** A step of a deliverable: a button, or a panel when it asks a reason or a revision. */
export function DeliverableStepButton({ t, project, id, version, step, revision }: { t: T; project: string; id: string; version: number; step: DeliverableStep; revision: string }) {
  const def = DELIVERABLE_STEP[step];
  const hidden = <><Hidden name="project" value={project} /><Hidden name="id" value={id} /><Hidden name="version" value={String(version)} /><Hidden name="step" value={step} /></>;
  if (!def.reason && step !== 'revise')
    return <ActionForm action={deliverableStepAction} submit={def.label} done="Step recorded" inline variant="ghost">{hidden}</ActionForm>;
  return (
    <Folded summary={def.label} variant="ghost">
      <ActionForm action={deliverableStepAction} submit={def.label} done="Step recorded">
        {hidden}
        {step === 'revise' && <Field label={t('New revision')} required><Input name="revision" required defaultValue={nextRevision(revision) ?? ''} maxLength={3} /></Field>}
        <Field label={t('Reason')} required={def.reason} span="full"><Textarea name="reason" short required={def.reason} maxLength={500} /></Field>
      </ActionForm>
    </Folded>
  );
}

export function CheckStepButton({ t, project, id, version, step }: { t: T; project: string; id: string; version: number; step: CheckStep }) {
  const def = CHECK_STEP[step];
  const hidden = <><Hidden name="project" value={project} /><Hidden name="id" value={id} /><Hidden name="version" value={String(version)} /><Hidden name="step" value={step} /></>;
  if (!def.note) return <ActionForm action={checkStepAction} submit={def.label} done="Step recorded" inline variant="ghost">{hidden}</ActionForm>;
  return (
    <Folded summary={def.label} variant="ghost">
      <ActionForm action={checkStepAction} submit={def.label} done="Step recorded">
        {hidden}
        <Field label={t('Note')} required span="full"><Textarea name="note" short required maxLength={500} /></Field>
      </ActionForm>
    </Folded>
  );
}

export function ConfirmInputButton({ project, id }: { project: string; id: string }) {
  return <ActionForm action={confirmInputAction} submit="Confirm" done="Input confirmed" inline variant="ghost"><Hidden name="project" value={project} /><Hidden name="id" value={id} /></ActionForm>;
}

export function GenerateOutputButton({ project, id }: { project: string; id: string }) {
  return <ActionForm action={generateOutputAction} submit="Record the generation" done="Generation recorded" inline variant="ghost"><Hidden name="project" value={project} /><Hidden name="id" value={id} /></ActionForm>;
}
