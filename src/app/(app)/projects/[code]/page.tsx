// Summary of a project (spec 03 § 4): the register's summary (lot 2a: « who waits for what », progress of the deliverables by
// discipline, open checks, recent changes), then the project and its engineering team read in Keystone. The card of the
// engineering pack comes with delivery 4.
import { Table, Td, Th } from '@norma/charte/ds/Table';
import { EmptyState } from '@/components/app/EmptyState';
import { KeyValueList } from '@/components/app/KeyValueList';
import { SectionCard } from '@/components/app/SectionCard';
import { DISCIPLINE_LABEL, TEAM_ORIGIN_LABEL } from '@/domain/vocab';
import s from '@/features/pages/pages.module.css';
import { AddChangeForm, RaiseCheckForm } from '@/features/register/forms';
import { RegisterSummary } from '@/features/register/views';
import { writesDiscipline, mayTake } from '@/domain/register';
import { DISCIPLINE_CODES } from '@/domain/vocab';
import { projectRegister } from '@/server/dal/register';
import { ProjectHeader, projectOrNotFound } from '@/features/pages/project';
import { fmtInstant } from '@/lib/format';
import { getI18n, getViewer } from '@/server/session';

export default async function ProjectSummaryPage({ params }: { params: Promise<{ code: string }> }) {
  const [{ code }, { t, lang }] = await Promise.all([params, getI18n()]);
  const p = await projectOrNotFound(code);
  const [viewer, reg] = await Promise.all([getViewer(), projectRegister(p.code)]);
  const actor = { roles: viewer.roles, disciplines: p.myDisciplines };
  const writes = reg.held && (DISCIPLINE_CODES.some((d) => writesDiscipline(actor, d)) || mayTake(actor, 'lead', 'process'));
  return (
    <>
      <ProjectHeader
        project={p} screen="projectSummary" path=""
        actions={writes ? <><RaiseCheckForm t={t} project={p.code} rules={reg.rules} /><AddChangeForm t={t} project={p.code} /></> : undefined}
      />
      <RegisterSummary t={t} lang={lang} reg={reg} code={p.code} actor={actor} />
      <div className={s.grid2}>
        <SectionCard title={t('Project')} hint={t('Read in Keystone')}>
          <KeyValueList
            items={[
              { k: t('Keystone code'), v: p.code },
              { k: t('Design office number'), v: p.designOfficeNumber ?? '—' },
              { k: t('Client'), v: p.client ?? '—' },
              { k: t('Phase'), v: p.phase ?? '—' },
              { k: t('Confidentiality'), v: p.confidential ? t('Confidential: seen by the project team only') : t('Normal') },
              { k: t('Read on'), v: fmtInstant(p.syncedAt, lang) },
            ]}
          />
        </SectionCard>
        <SectionCard title={t('Project team')} hint={t('Read in Keystone: assigned to a task or stakeholder')}>
          {p.team.length ? (
            <Table>
              <thead><tr><Th>{t('Person')}</Th><Th>{t('Discipline')}</Th><Th>{t('Activity')}</Th><Th>{t('On the team as')}</Th></tr></thead>
              <tbody>
                {p.team.map((m, i) => (
                  <tr key={`${m.personName}-${i}`}>
                    <Td>{m.personName}</Td>
                    <Td>{m.discipline ? t(DISCIPLINE_LABEL[m.discipline]) : '—'}</Td>
                    <Td>{m.activity ?? '—'}</Td>
                    <Td>{t(TEAM_ORIGIN_LABEL[m.origin])}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState variant="boxed">{t('No team member published by Keystone.')}</EmptyState>
          )}
        </SectionCard>
      </div>
    </>
  );
}
