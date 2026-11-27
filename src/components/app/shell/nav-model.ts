// Sidebar model (pure): the common block (Norma's base-nav, norma/charte/COQUE.md § 2 bis) then the sections by theme the
// viewer sees, with the active entry. The project section points at the current project (the one of the page, else the
// last one opened, else the first of the viewer's scope); without a project in scope it is left out.
import type { RoleKey } from '@/config/roles';
import { SCREENS, SECTION_LABEL, canSee, matchScreen, screenHref, type ScreenId, type Section } from '@/config/screens';
import { baseNav, type BaseNavItem } from '@norma/charte/ds/base-nav';

export interface NavEntry {
  id: ScreenId;
  label: string;
  href: string;
  active: boolean;
  count?: number;
}

export interface NavSection {
  key: Exclude<Section, 'base'>;
  label: string;
  entries: NavEntry[];
  active: boolean;
  /** Context line under the title (the current project), typed data shown as is. */
  context?: string;
}

export interface NavInput {
  roles: readonly RoleKey[];
  pathname: string;
  /** Current project (code and label), null when none is in scope. */
  project: { code: string; label: string } | null;
  /** Badges of the common block (open tasks and approvals of the person in the whole suite). */
  counts?: { tasks?: number; approvals?: number };
}

export function buildNav({ roles, pathname, project, counts = {} }: NavInput): { base: BaseNavItem[]; sections: NavSection[] } {
  const active = matchScreen(pathname)?.id ?? null;
  const base = baseNav('ingenium', { counts });
  const sections: NavSection[] = [];
  for (const key of ['project', 'reference', 'admin'] as const) {
    if (key === 'project' && !project) continue;
    const entries = SCREENS.filter((s) => s.section === key && canSee(roles, s.id)).map((s) => ({
      id: s.id,
      label: s.title,
      href: s.path.includes('[code]') ? screenHref(s.id, { code: project!.code }) : s.path,
      active: s.id === active,
    }));
    if (entries.length)
      sections.push({ key, label: SECTION_LABEL[key], entries, active: entries.some((e) => e.active), ...(key === 'project' ? { context: project!.label } : {}) });
  }
  return { base, sections };
}
