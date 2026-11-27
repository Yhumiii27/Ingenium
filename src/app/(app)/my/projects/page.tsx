// My projects (Norma 3.1, COQUE.md § 2 bis.3): the Keystone projects of the person's engineering team (read in Keystone), then —
// for the roles that see every project — the others of the scope. The design offices' number first, then Keystone's code
// (ING-22); the team by discipline. Progress by discipline (deliverables, P&ID coverage, pack) comes with deliveries 2 to 4.
import Link from 'next/link';
import { Table, Td, Th } from '@norma/charte/ds/Table';
import { Tag } from '@norma/charte/ds/Tag';
import { EmptyState } from '@/components/app/EmptyState';
import { SectionCard } from '@/components/app/SectionCard';
import { PageHeader } from '@/components/app/shell/page-header';
import { screenHref } from '@/config/screens';
import { DISCIPLINE_CODES, DISCIPLINE_LABEL, projectLabel } from '@/domain/vocab';
import s from '@/features/pages/pages.module.css';
import { fmtInstant } from '@/lib/format';
import { projectsInScope, type ProjectRow } from '@/server/dal/projects';
import { getI18n, getViewer } from '@/server/session';

export default async function MyProjectsPage() {
  const [{ t, lang }, viewer] = await Promise.all([getI18n(), getViewer()]);
  const projects = await projectsInScope(viewer);
  const mine = projects.filter((p) => p.mine);
  const others = projects.filter((p) => !p.mine);
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
            <Td nowrap><Link className={s.link} href={screenHref('projectSummary', { code: p.code })}>{projectLabel(p)}</Link></Td>
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
      <PageHeader screen="myProjects" subtitle={synced ? `${t('Read in Keystone')} · ${fmtInstant(synced, lang)}` : undefined} />
      <SectionCard title={t('Projects of my team')} hint={t('Engineering team read in Keystone (keystone.pub_affectations)')}>
        {mine.length ? table(mine) : <EmptyState variant="boxed">{t('You are on no engineering team of a Keystone project.')}</EmptyState>}
      </SectionCard>
      {others.length > 0 && <SectionCard title={t('Other projects of my scope')}>{table(others)}</SectionCard>}
    </>
  );
}
