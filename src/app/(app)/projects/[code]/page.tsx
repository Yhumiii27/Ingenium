// Summary of a project (spec 03 § 4): the engineering team read in Keystone, by discipline, then what the summary will hold
// once the registers exist (delivery 2): « who waits for what », progress of the deliverables, open checks, recent changes.
import { Table, Td, Th } from '@norma/charte/ds/Table';
import { EmptyState } from '@/components/app/EmptyState';
import { KeyValueList } from '@/components/app/KeyValueList';
import { SectionCard } from '@/components/app/SectionCard';
import { SCREEN_CONTENT } from '@/config/screen-content';
import { DISCIPLINE_LABEL, TEAM_ORIGIN_LABEL } from '@/domain/vocab';
import s from '@/features/pages/pages.module.css';
import { Placeholder } from '@/features/pages/placeholder';
import { ProjectHeader, projectOrNotFound } from '@/features/pages/project';
import { fmtInstant } from '@/lib/format';
import { getI18n } from '@/server/session';

export default async function ProjectSummaryPage({ params }: { params: Promise<{ code: string }> }) {
  const [{ code }, { t, lang }] = await Promise.all([params, getI18n()]);
  const p = await projectOrNotFound(code);
  return (
    <>
      <ProjectHeader project={p} screen="projectSummary" path="" />
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
      <Placeholder delivery={2} items={SCREEN_CONTENT.projectSummary ?? []} />
    </>
  );
}
