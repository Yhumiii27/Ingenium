// Screens of the engineering register (lot 2a): the project summary (who waits for what, progress by discipline, open checks,
// recent changes) and one screen per discipline (inputs, deliverables up to the release, generated lists, checks). Server
// components; every state is computed on read (src/domain/register.ts). While Keystone holds the register, its rows are shown
// read-only with the banner « Held in Keystone ». Typed text (titles, notes, names) is shown as typed.
import { Table, Td, Th } from '@norma/charte/ds/Table';
import { Tag, type TagTone } from '@norma/charte/ds/Tag';
import { Callout } from '@/components/app/Callout';
import { EmptyState } from '@/components/app/EmptyState';
import { KpiGrid, KpiTile } from '@/components/app/Kpi';
import { SectionCard } from '@/components/app/SectionCard';
import { screenHref } from '@/config/screens';
import {
  CHANGE_KIND_LABEL, CHECK_SEVERITY_LABEL, CHECK_STATUS_LABEL, DELIVERABLE_STATUS_LABEL, INPUT_STATE_LABEL, OUTPUT_STATE_LABEL, PARTIES, PARTY_LABEL,
  checkStepsFrom, isOpenCheck, mayTake, stepsFrom, writesDiscipline, DELIVERABLE_STEP, CHECK_STEP, type Party, type RegisterActor,
} from '@/domain/register';
import { DISCIPLINE_CODES, DISCIPLINE_LABEL, type DisciplineCode } from '@/domain/vocab';
import type { Lang, T } from '@/i18n/translate';
import { fmtDate, fmtInstant } from '@/lib/format';
import type { ProjectRegister } from '@/server/dal/register';
import s from '@/features/pages/pages.module.css';
import { CheckStepButton, ConfirmInputButton, DeliverableStepButton, GenerateOutputButton } from './forms';
import r from './register.module.css';

const parties = (t: T, ps: readonly Party[]) => (ps.length ? ps.map((p) => t(PARTY_LABEL[p])).join(' · ') : '—');
const TONE_INPUT = { up_to_date: 'outline', to_confirm: 'neutral', outdated: 'accent' } as const satisfies Record<string, TagTone>;
const TONE_OUTPUT = { blocked: 'accent', to_generate: 'neutral', stale: 'accent-2', up_to_date: 'outline' } as const satisfies Record<string, TagTone>;
const TONE_DELIVERABLE = { draft: 'neutral', frozen: 'accent-2', release_proposed: 'accent-2', released: 'outline', obsolete: 'neutral' } as const satisfies Record<string, TagTone>;

export function HeldBanner({ t, lang, reg }: { t: T; lang: Lang; reg: ProjectRegister }) {
  if (reg.held) return null;
  return (
    <Callout variant="emphasis" role="status">
      {t('Held in Keystone until its switch-over to Ingenium: these rows are Keystone’s, read only.')}{' '}
      {t('The administrator switches the register over from « Activity and integrations » (dry run first).')}
      {reg.switchedAt ? ` ${fmtInstant(reg.switchedAt, lang)}` : ''}
    </Callout>
  );
}

function changeText(t: T, c: ProjectRegister['changes'][number]): string {
  if (c.kind === 'note') return c.text ?? '';
  return `${c.objectRef ?? ''}${c.revision ? ` ${t('rev.')} ${c.revision}` : ''} — ${t(CHANGE_KIND_LABEL[c.kind])}${c.text ? ` · ${c.text}` : ''}`;
}

export function ChangesCard({ t, lang, reg, limit = 10 }: { t: T; lang: Lang; reg: ProjectRegister; limit?: number }) {
  return (
    <SectionCard title={t('Recent changes and their impact')}>
      {reg.changes.length ? (
        <Table>
          <thead><tr><Th>{t('Date')}</Th><Th>{t('Change')}</Th><Th>{t('Impact on')}</Th><Th>{t('By')}</Th></tr></thead>
          <tbody>
            {reg.changes.slice(0, limit).map((c) => (
              <tr key={c.id}><Td nowrap>{fmtDate(c.occurredOn, lang)}</Td><Td>{changeText(t, c)}</Td><Td>{parties(t, c.recipients)}</Td><Td nowrap>{c.byName}</Td></tr>
            ))}
          </tbody>
        </Table>
      ) : <EmptyState variant="boxed">{t('No change recorded.')}</EmptyState>}
    </SectionCard>
  );
}

function ChecksTable({ t, reg, code, actor, only }: { t: T; reg: ProjectRegister; code: string; actor: RegisterActor | null; only?: DisciplineCode }) {
  const checks = reg.checks.filter((c) => (only ? c.owner === only : isOpenCheck(c.status)));
  if (!checks.length) return <EmptyState variant="boxed">{t('No consistency check.')}</EmptyState>;
  return (
    <Table>
      <thead><tr><Th>{t('Check')}</Th><Th>{t('Rule')}</Th><Th>{t('Severity')}</Th><Th>{t('Inconsistency')}</Th><Th>{t('Owner')}</Th><Th>{t('State')}</Th><Th align="right">{t('Actions')}</Th></tr></thead>
      <tbody>
        {checks.map((c) => (
          <tr key={c.id}>
            <Td nowrap>{c.number}</Td>
            <Td>{c.ruleLabel}</Td>
            <Td nowrap><Tag size="xs" tone={c.severity === 'blocking' ? 'accent' : 'outline'}>{t(CHECK_SEVERITY_LABEL[c.severity])}</Tag></Td>
            <Td>{c.title}{c.detail && <span className={r.sub}>{c.detail}</span>}{c.note && <span className={r.sub}>{c.note}{c.closedByName ? ` · ${c.closedByName}` : ''}</span>}</Td>
            <Td nowrap>{t(DISCIPLINE_LABEL[c.owner])}</Td>
            <Td nowrap><Tag size="xs" tone={isOpenCheck(c.status) ? 'neutral' : 'outline'}>{t(CHECK_STATUS_LABEL[c.status])}</Tag></Td>
            <Td>
              <div className={r.rowActions}>
                {actor && reg.held && checkStepsFrom(c.status).filter((st) => mayTake(actor, CHECK_STEP[st].who, c.owner)).map((st) => (
                  <CheckStepButton key={st} t={t} project={code} id={c.id} version={c.rowVersion} step={st} />
                ))}
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/** Summary of a project's register. */
export function RegisterSummary({ t, lang, reg, code, actor }: { t: T; lang: Lang; reg: ProjectRegister; code: string; actor: RegisterActor }) {
  const total = reg.summary.reduce((a, x) => ({ d: a.d + x.deliverables, r: a.r + x.released, w: a.w + x.inputsWaiting, c: a.c + x.openChecks, b: a.b + x.openBlocking }), { d: 0, r: 0, w: 0, c: 0, b: 0 });
  const providers = PARTIES.filter((p) => DISCIPLINE_CODES.some((d) => reg.wait[d][p]));
  return (
    <>
      <HeldBanner t={t} lang={lang} reg={reg} />
      <KpiGrid min={170}>
        <KpiTile label={t('Deliverables released')} value={total.d ? `${Math.round((100 * total.r) / total.d)} %` : '—'} sub={`${total.r} / ${total.d}`} />
        <KpiTile label={t('Inputs waiting')} value={total.w} sub={t('outdated or to confirm')} tone={total.w ? 'alert' : 'default'} />
        <KpiTile label={t('Open checks')} value={total.c} sub={`${total.b} ${t('blocking')}`} tone={total.b ? 'alert' : 'default'} />
        <KpiTile label={t('Generated lists blocked')} value={reg.outputs.filter((o) => o.state === 'blocked').length} sub={`${reg.outputs.length} ${t('lists')}`} />
      </KpiGrid>
      <div className={s.grid2}>
        <SectionCard title={t('Who waits for what')} hint={t('Inputs not up to date, by consuming discipline and provider')}>
          {providers.length ? (
            <Table className={r.matrix}>
              <thead><tr><Th>{t('Consumer')} \ {t('Provider')}</Th>{providers.map((p) => <Th key={p}>{t(PARTY_LABEL[p])}</Th>)}</tr></thead>
              <tbody>
                {DISCIPLINE_CODES.map((d) => (
                  <tr key={d}>
                    <Th>{t(DISCIPLINE_LABEL[d])}</Th>
                    {providers.map((p) => {
                      const c = reg.wait[d][p];
                      return <Td key={p} numeric>{c ? <span className={c.waiting ? r.waiting : r.ok}>{c.waiting} / {c.total}</span> : '—'}</Td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : <EmptyState variant="boxed">{t('No input recorded.')}</EmptyState>}
        </SectionCard>
        <SectionCard title={t('Progress by discipline')}>
          <Table>
            <thead><tr><Th>{t('Discipline')}</Th><Th align="right">{t('Deliverables')}</Th><Th align="right">{t('Released')}</Th><Th align="right">{t('Inputs waiting')}</Th><Th align="right">{t('Open checks')}</Th></tr></thead>
            <tbody>
              {reg.summary.map((x) => (
                <tr key={x.discipline}>
                  <Td><a className={s.link} href={screenHref(x.discipline, { code })}>{t(DISCIPLINE_LABEL[x.discipline])}</a></Td>
                  <Td numeric align="right">{x.deliverables}</Td>
                  <Td numeric align="right">{x.releasedShare == null ? '—' : `${x.releasedShare} %`}</Td>
                  <Td numeric align="right">{x.inputsWaiting}</Td>
                  <Td numeric align="right">{x.openChecks}{x.openBlocking ? ` (${x.openBlocking} ${t('blocking')})` : ''}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </SectionCard>
      </div>
      <SectionCard title={t('Open consistency checks')}><ChecksTable t={t} reg={reg} code={code} actor={actor} /></SectionCard>
      <ChangesCard t={t} lang={lang} reg={reg} />
    </>
  );
}

/** One discipline's screen. */
export function DisciplineRegister({ t, lang, reg, code, discipline, actor }: { t: T; lang: Lang; reg: ProjectRegister; code: string; discipline: DisciplineCode; actor: RegisterActor }) {
  const writes = reg.held && writesDiscipline(actor, discipline);
  const inputs = reg.inputs.filter((i) => i.consumer === discipline);
  const docs = reg.deliverables.filter((d) => d.discipline === discipline);
  const outputs = reg.outputs.filter((o) => o.discipline === discipline);
  const sum = reg.summary.find((x) => x.discipline === discipline)!;
  return (
    <>
      <HeldBanner t={t} lang={lang} reg={reg} />
      <KpiGrid min={170}>
        <KpiTile label={t('Deliverables released')} value={sum.releasedShare == null ? '—' : `${sum.releasedShare} %`} sub={`${sum.released} / ${sum.deliverables}`} />
        <KpiTile label={t('Inputs waiting')} value={sum.inputsWaiting} sub={`${inputs.length} ${t('inputs')}`} tone={sum.inputsWaiting ? 'alert' : 'default'} />
        <KpiTile label={t('Open checks')} value={sum.openChecks} sub={`${sum.openBlocking} ${t('blocking')}`} tone={sum.openBlocking ? 'alert' : 'default'} />
        <KpiTile label={t('Generated lists blocked')} value={sum.outputsBlocked} sub={`${outputs.length} ${t('lists')}`} />
      </KpiGrid>
      <SectionCard title={t('Inputs consumed')} hint={t('The latest frozen or released revision of each document')}>
        {inputs.length ? (
          <Table>
            <thead><tr><Th>{t('Document')}</Th><Th>{t('Provider')}</Th><Th>{t('Revision in use')}</Th><Th>{t('Reference revision')}</Th><Th>{t('State')}</Th><Th align="right">{t('Actions')}</Th></tr></thead>
            <tbody>
              {inputs.map((i) => (
                <tr key={i.id}>
                  <Td>{i.documentNumber}{i.title && <span className={r.sub}>{i.title}</span>}</Td>
                  <Td nowrap>{t(PARTY_LABEL[i.provider])}</Td>
                  <Td nowrap>{i.revisionInUse}</Td>
                  <Td nowrap>{i.reference}</Td>
                  <Td nowrap><Tag size="xs" tone={TONE_INPUT[i.state]}>{t(INPUT_STATE_LABEL[i.state])}</Tag></Td>
                  <Td><div className={r.rowActions}>{writes && i.state !== 'up_to_date' && <ConfirmInputButton project={code} id={i.id} />}</div></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : <EmptyState variant="boxed">{t('No input recorded.')}</EmptyState>}
      </SectionCard>
      <SectionCard title={t('Deliverables')} hint={t('Codex references: the files stay in Codex, whose circuit decides the release (ING-20)')}>
        {docs.length ? (
          <Table>
            <thead><tr><Th>{t('Document')}</Th><Th>{t('Revision')}</Th><Th>{t('State')}</Th><Th>{t('Date')}</Th><Th>{t('Author')}</Th><Th>{t('Recipients')}</Th><Th align="right">{t('Actions')}</Th></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <Td>{d.number}<span className={r.sub}>{d.title}{d.equipmentRef ? ` · ${d.equipmentRef}` : ''}</span></Td>
                  <Td nowrap>{d.revision}</Td>
                  <Td nowrap><Tag size="xs" tone={TONE_DELIVERABLE[d.status]}>{t(DELIVERABLE_STATUS_LABEL[d.status])}</Tag></Td>
                  <Td nowrap>{fmtDate(d.issuedOn, lang)}</Td>
                  <Td nowrap>{d.authorName}</Td>
                  <Td>{parties(t, d.recipients)}</Td>
                  <Td>
                    <div className={r.rowActions}>
                      {reg.held && stepsFrom(d.status).filter((st) => mayTake(actor, DELIVERABLE_STEP[st].who, discipline)).map((st) => (
                        <DeliverableStepButton key={st} t={t} project={code} id={d.id} version={d.rowVersion} step={st} revision={d.revision} />
                      ))}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : <EmptyState variant="boxed">{t('No deliverable recorded.')}</EmptyState>}
      </SectionCard>
      <SectionCard title={t('Generated lists')} hint={t('Blocked while the discipline has an open blocking check; stale when their source has a newer revision')}>
        {outputs.length ? (
          <Table>
            <thead><tr><Th>{t('List')}</Th><Th>{t('Recipients')}</Th><Th>{t('Source')}</Th><Th>{t('State')}</Th><Th>{t('Last generation')}</Th><Th align="right">{t('Actions')}</Th></tr></thead>
            <tbody>
              {outputs.map((o) => (
                <tr key={o.id}>
                  <Td>{o.number}<span className={r.sub}>{o.name}</span></Td>
                  <Td>{parties(t, o.recipients)}</Td>
                  <Td>{o.sourceDeliverable ? `${o.sourceDeliverable}${o.sourceRevision ? ` ${t('rev.')} ${o.sourceRevision}` : ''}` : o.sourceText ?? '—'}</Td>
                  <Td nowrap><Tag size="xs" tone={TONE_OUTPUT[o.state]}>{t(OUTPUT_STATE_LABEL[o.state])}</Tag></Td>
                  <Td nowrap>{o.generatedAt ? `${fmtInstant(o.generatedAt, lang)}${o.generatedFromRevision ? ` · ${t('rev.')} ${o.generatedFromRevision}` : ''}` : '—'}</Td>
                  <Td><div className={r.rowActions}>{writes && o.state !== 'blocked' && o.state !== 'up_to_date' && <GenerateOutputButton project={code} id={o.id} />}</div></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : <EmptyState variant="boxed">{t('No generated list.')}</EmptyState>}
      </SectionCard>
      <SectionCard title={t('Consistency checks of the discipline')}><ChecksTable t={t} reg={reg} code={code} actor={actor} only={discipline} /></SectionCard>
    </>
  );
}
