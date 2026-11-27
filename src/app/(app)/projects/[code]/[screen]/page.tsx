// The screens of a project (disciplines, P&ID, BOM, interfaces, pack, CE technical file): navigable placeholders until their
// delivery (docs/PLAN.md). The project is read in the viewer's scope: outside it, 404.
import { notFound } from 'next/navigation';
import { SCREEN_CONTENT } from '@/config/screen-content';
import { SCREENS } from '@/config/screens';
import { Placeholder } from '@/features/pages/placeholder';
import { ProjectHeader, projectOrNotFound } from '@/features/pages/project';

export default async function ProjectScreenPage({ params }: { params: Promise<{ code: string; screen: string }> }) {
  const { code, screen } = await params;
  const def = SCREENS.find((x) => x.section === 'project' && x.path === `/projects/[code]/${screen}`);
  if (!def) notFound();
  const p = await projectOrNotFound(code);
  return (
    <>
      <ProjectHeader project={p} screen={def.id} path={`/${screen}`} />
      <Placeholder delivery={def.delivery} items={SCREEN_CONTENT[def.id] ?? []} />
    </>
  );
}
