// The project of a project page, read in the viewer's scope (404 outside it, Norma § 6), and its header: breadcrumb
// « Project › #026 · HLT-026 », the Keystone name under the title and the project switcher in the toolbar.
import { notFound } from 'next/navigation';
import { FilterBar, FilterGroup, FilterLabel } from '@norma/charte/ds/FilterBar';
import { PageHeader } from '@/components/app/shell/page-header';
import type { ScreenId } from '@/config/screens';
import { projectLabel } from '@/domain/vocab';
import { projectInScope, projectsInScope, type ProjectRow } from '@/server/dal/projects';
import { getI18n, getViewer } from '@/server/session';
import { ProjectSwitcher } from './project-switcher';

export async function projectOrNotFound(code: string): Promise<ProjectRow> {
  const viewer = await getViewer();
  const p = await projectInScope(viewer, decodeURIComponent(code));
  if (!p) notFound();
  return p;
}

export async function ProjectHeader({ project, screen, path }: { project: ProjectRow; screen: ScreenId; path: string }) {
  const [{ t }, viewer] = await Promise.all([getI18n(), getViewer()]);
  const all = await projectsInScope(viewer);
  return (
    <PageHeader
      screen={screen}
      crumbs={['Project']}
      crumbData={projectLabel(project)}
      subtitle={`${project.name}${project.client ? ` · ${project.client}` : ''}`}
      toolbar={
        <FilterBar>
          <FilterGroup>
            <FilterLabel>{t('Project')}</FilterLabel>
            <ProjectSwitcher current={project.code} path={path} options={all.map((p) => ({ value: p.code, label: `${projectLabel(p)} — ${p.name}` }))} label={t('Project')} />
          </FilterGroup>
        </FilterBar>
      }
    />
  );
}
