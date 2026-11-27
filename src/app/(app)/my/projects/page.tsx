// My projects (Norma 3.1, COQUE.md § 2 bis.3; ING-29): by default the projects the person is part of (team published by
// Keystone: assigned to a task or stakeholder, ING-30); without the filter (`?projets=tous`) every project in progress. A
// project confidential in Keystone is seen by its team only: the data layer never reads it for anyone else. The design
// offices' number first, then Keystone's code (ING-22); the team by discipline. Progress by discipline comes with deliveries 2 to 4.
import Link from 'next/link';
import { FilterBar, FilterChips, FilterGroup, FilterLabel } from '@norma/charte/ds/FilterBar';
import { Table, Td, Th } from '@norma/charte/ds/Table';
import { Tag } from '@norma/charte/ds/Tag';
import { EmptyState } from '@/components/app/EmptyState';
import { SectionCard } from '@/components/app/SectionCard';
import { PageHeader } from '@/components/app/shell/page-header';
import { screenHref } from '@/config/screens';
import { filterProjects, projectFilterHref, projectFilterOf } from '@/domain/confidential';
import { DISCIPLINE_CODES, DISCIPLINE_LABEL, projectLabel } from '@/domain/vocab';
import s from '@/features/pages/pages.module.css';
import { fmtInstant } from '@/lib/format';
import { projectsInScope, type ProjectRow } from '@/server/dal/projects';
import { getI18n, getViewer } from '@/server/session';

type SP = Record<string, string | string[] | undefined>;

export default async function MyProjectsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const [{ t, lang }, viewer, sp] = await Promise.all([getI18n(), getViewer(), searchParams]);
  const projects = await projectsInScope(viewer);
  const filter = projectFilterOf(sp.projets);
  const mine = filterProjects(projects, 'mine');
  const inProgress = filterProjects(projects, 'all');
  const rows = filter === 'mine' ? mine : inProgress;
  const synced = projects.reduce<Date | null>((a, p) => (!a || p.syncedAt > a ? p.syncedAt : a), null);
  const table = (rows: ProjectRow[]) => (
    <Table>
      <thead>
        <tr>
          <Th>{t('Project')}</Th>
          <Th>{t('Name')}</Th>
          <Th>{t('Client')}</Th>
          <Th>{t('Phase')}</Th>
          {DISCIPLINE_CODES.map((d) => <Th key={d} align="right">{t(DISCIPLINE_LABEL[d])}</Th>)}
          <Th>{t('My disciplines')}</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.code}>
            <Td nowrap>
              <Link className={s.link} href={screenHref('projectSummary', { code: p.code })}>{projectLabel(p)}</Link>
              {p.confidential && <> <Tag tone="accent-2" size="xs">{t('Confidential')}</Tag></>}
            </Td>
            <Td>{p.name}</Td>
            <Td>{p.client ?? '—'}</Td>
            <Td nowrap>{p.phase ?? '—'}{!p.open && <> <Tag tone="outline" size="xs">{t('Closed')}</Tag></>}</Td>
            {DISCIPLINE_CODES.map((d) => <Td key={d} numeric align="right">{p.team.filter((m) => m.discipline === d).length || '—'}</Td>)}
            <Td><span className={s.tags}>{p.myDisciplines.map((d) => <Tag key={d} tone="accent" size="xs">{t(DISCIPLINE_LABEL[d])}</Tag>)}</span></Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
  return (
    <>
      <PageHeader
        screen="myProjects"
        subtitle={synced ? `${t('Read in Keystone')} · ${fmtInstant(synced, lang)}` : undefined}
        toolbar={
          <FilterBar>
            <FilterGroup>
              <FilterLabel>{t('Projects')}</FilterLabel>
              <FilterChips
                label={t('Projects')}
                value={filter}
                options={[
                  { value: 'mine', label: t('My projects'), count: mine.length, href: projectFilterHref('mine') },
                  { value: 'all', label: t('Every project in progress'), count: inProgress.length, href: projectFilterHref('all') },
                ]}
              />
            </FilterGroup>
          </FilterBar>
        }
      />
      <SectionCard
        title={filter === 'mine' ? t('Projects I am part of') : t('Every project in progress')}
        hint={t('Project team read in Keystone: assigned to a task or stakeholder. A confidential project is shown to its team only.')}
      >
        {rows.length ? table(rows) : (
          <EmptyState variant="boxed">
            {filter === 'mine' ? t('You are on no team of a Keystone project.') : t('No project in progress.')}{' '}
            {filter === 'mine' && <Link className={s.link} href={projectFilterHref('all')}>{t('Every project in progress')}</Link>}
          </EmptyState>
        )}
      </SectionCard>
    </>
  );
}
