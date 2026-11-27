// Disciplines and leads (administration): the engineering disciplines of the reference table and the size of their teams on
// the Keystone projects. Kept by the administration from delivery 2 (leads and headcount: data ING-D1); read-only here.
import { asc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Table, Td, Th } from '@norma/charte/ds/Table';
import { Tag } from '@norma/charte/ds/Tag';
import { Callout } from '@/components/app/Callout';
import { SectionCard } from '@/components/app/SectionCard';
import { PageHeader } from '@/components/app/shell/page-header';
import { canSee } from '@/config/screens';
import { getDb } from '@/server/db/client';
import { disciplines, teamMirror } from '@/server/db/schema';
import { getI18n, getViewer } from '@/server/session';

export default async function DisciplinesPage() {
  const [{ t }, viewer] = await Promise.all([getI18n(), getViewer()]);
  if (!canSee(viewer.roles, 'disciplines')) notFound();
  const db = await getDb();
  const [rows, team] = await Promise.all([db.select().from(disciplines).orderBy(asc(disciplines.position)), db.select().from(teamMirror)]);
  return (
    <>
      <PageHeader screen="disciplines" crumbs={['Administration']} />
      <Callout variant="compact">{t('The leads and headcount of each discipline come with the data ING-D1; the list is kept here from delivery 2.')}</Callout>
      <SectionCard title={t('Disciplines')}>
        <Table>
          <thead><tr><Th>{t('Code')}</Th><Th>{t('Name')}</Th><Th align="right">{t('Assignments on the projects')}</Th><Th>{t('State')}</Th></tr></thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.code}>
                <Td nowrap><code>{d.code}</code></Td>
                <Td>{d.label}</Td>
                <Td numeric align="right">{team.filter((m) => m.discipline === d.code).length}</Td>
                <Td><Tag tone={d.active ? 'accent' : 'outline'} size="xs">{d.active ? t('Active') : t('Inactive')}</Tag></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </SectionCard>
    </>
  );
}
