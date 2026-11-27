// The screens of a project: one per discipline (lot 2a, the register of the discipline), then the screens of later lots
// (P&ID, BOM, interfaces, pack, CE technical file) as navigable placeholders until their delivery (docs/PLAN.md). The project
// is read in the viewer's scope: outside it, 404.
import { notFound } from 'next/navigation';
import { SCREEN_CONTENT } from '@/config/screen-content';
import { SCREENS } from '@/config/screens';
import { mayTake, writesDiscipline } from '@/domain/register';
import { isDiscipline } from '@/domain/vocab';
import { Placeholder } from '@/features/pages/placeholder';
import { ProjectHeader, projectOrNotFound } from '@/features/pages/project';
import { AddDeliverableForm, AddInputForm, AddOutputForm, RaiseCheckForm } from '@/features/register/forms';
import { DisciplineRegister } from '@/features/register/views';
import { projectRegister } from '@/server/dal/register';
import { getI18n, getViewer } from '@/server/session';

export default async function ProjectScreenPage({ params }: { params: Promise<{ code: string; screen: string }> }) {
  const { code, screen } = await params;
  const def = SCREENS.find((x) => x.section === 'project' && x.path === `/projects/[code]/${screen}`);
  if (!def) notFound();
  const p = await projectOrNotFound(code);
  if (!isDiscipline(def.id))
    return (
      <>
        <ProjectHeader project={p} screen={def.id} path={`/${screen}`} />
        <Placeholder delivery={def.delivery} lot={def.lot} items={SCREEN_CONTENT[def.id] ?? []} />
      </>
    );
  const discipline = def.id;
  const [{ t, lang }, viewer, reg] = await Promise.all([getI18n(), getViewer(), projectRegister(p.code)]);
  const actor = { roles: viewer.roles, disciplines: p.myDisciplines };
  const writes = reg.held && writesDiscipline(actor, discipline);
  const documents = reg.deliverables.map((d) => d.number);
  return (
    <>
      <ProjectHeader
        project={p} screen={def.id} path={`/${screen}`}
        primary={writes ? <AddDeliverableForm t={t} project={p.code} disciplines={[discipline]} variant="primary" /> : undefined}
        actions={writes || (reg.held && mayTake(actor, 'lead', discipline)) ? (
          <>
            <AddInputForm t={t} project={p.code} disciplines={[discipline]} documents={documents} />
            <AddOutputForm t={t} project={p.code} disciplines={[discipline]} documents={documents.filter((n) => reg.deliverables.find((d) => d.number === n)?.discipline === discipline)} />
            <RaiseCheckForm t={t} project={p.code} rules={reg.rules} />
          </>
        ) : undefined}
      />
      <DisciplineRegister t={t} lang={lang} reg={reg} code={p.code} discipline={discipline} actor={actor} />
    </>
  );
}
