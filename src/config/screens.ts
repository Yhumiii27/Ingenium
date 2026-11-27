// Screen registry (docs/spec/03-menus-ecrans.md): id, route, title (EN source string), sidebar section and the roles that see
// it. The common block of the sidebar (Home, My tasks, My approvals, My projects, Technical reference) is Norma's `BaseNav`
// (norma/charte/COQUE.md § 2 bis): its screens have the section `base`. Pure: no component, no server import, so server code,
// the proxy and scripts can load it. Icons are in ./screen-icons.ts.
import type { RoleKey } from './roles';

export type ScreenId =
  // Common block (Norma 3.1, § 2 bis)
  | 'home' | 'tasks' | 'approvals' | 'myProjects' | 'reference'
  // Project section (a project chosen with the project switcher)
  | 'projectSummary' | 'process' | 'mechanical' | 'electrical' | 'automation' | 'pid' | 'bom' | 'interfaces' | 'pack' | 'ceFile'
  // Technical reference section
  | 'parts' | 'structures' | 'spares' | 'drawings' | 'changes'
  // Administration
  | 'disciplines' | 'rules' | 'importTools' | 'packTemplates' | 'ceLists' | 'activity' | 'journal';

export type Section = 'base' | 'project' | 'reference' | 'admin';

export interface ScreenDef {
  id: ScreenId;
  path: string;
  title: string;
  section: Section;
  roles: readonly RoleKey[] | 'all';
  /** Delivery that builds the screen's content (docs/PLAN.md); until then the screen is a placeholder. */
  delivery: 1 | 2 | 3 | 4;
  /** Lot of the delivery that builds it (docs/DELIVERY-2.md: 2a register, 2b P&ID and import assistant, 2c drawings and PDM). */
  lot?: string;
}

const ADMIN: readonly RoleKey[] = ['admin', 'engineering_lead'];

export const SCREENS: readonly ScreenDef[] = [
  { id: 'home', path: '/', title: 'Home', section: 'base', roles: 'all', delivery: 1 },
  { id: 'tasks', path: '/my/tasks', title: 'My tasks', section: 'base', roles: 'all', delivery: 1 },
  { id: 'approvals', path: '/my/approvals', title: 'My approvals', section: 'base', roles: 'all', delivery: 1 },
  { id: 'myProjects', path: '/my/projects', title: 'My projects', section: 'base', roles: 'all', delivery: 1 },
  { id: 'reference', path: '/reference', title: 'Technical reference', section: 'base', roles: 'all', delivery: 1 },

  { id: 'projectSummary', path: '/projects/[code]', title: 'Summary', section: 'project', roles: 'all', delivery: 2 },
  { id: 'process', path: '/projects/[code]/process', title: 'Process', section: 'project', roles: 'all', delivery: 2 },
  { id: 'mechanical', path: '/projects/[code]/mechanical', title: 'Mechanical', section: 'project', roles: 'all', delivery: 2 },
  { id: 'electrical', path: '/projects/[code]/electrical', title: 'Electrical', section: 'project', roles: 'all', delivery: 2 },
  { id: 'automation', path: '/projects/[code]/automation', title: 'Automation', section: 'project', roles: 'all', delivery: 2 },
  { id: 'pid', path: '/projects/[code]/pid', title: 'P&ID', section: 'project', roles: 'all', delivery: 2, lot: '2b' },
  { id: 'bom', path: '/projects/[code]/bom', title: 'Bill of materials', section: 'project', roles: 'all', delivery: 3 },
  { id: 'interfaces', path: '/projects/[code]/interfaces', title: 'Interfaces', section: 'project', roles: 'all', delivery: 4 },
  { id: 'pack', path: '/projects/[code]/pack', title: 'Engineering pack', section: 'project', roles: 'all', delivery: 4 },
  { id: 'ceFile', path: '/projects/[code]/ce-file', title: 'CE technical file', section: 'project', roles: 'all', delivery: 4 },

  { id: 'parts', path: '/reference/parts', title: 'Parts', section: 'reference', roles: 'all', delivery: 3 },
  { id: 'structures', path: '/reference/structures', title: 'Structures', section: 'reference', roles: 'all', delivery: 3 },
  { id: 'spares', path: '/reference/spares', title: 'Wear and spare parts', section: 'reference', roles: 'all', delivery: 3 },
  { id: 'drawings', path: '/reference/drawings', title: 'Drawings (PDM)', section: 'reference', roles: 'all', delivery: 2, lot: '2c' },
  { id: 'changes', path: '/reference/changes', title: 'Engineering changes', section: 'reference', roles: 'all', delivery: 3 },

  { id: 'disciplines', path: '/admin/disciplines', title: 'Disciplines and leads', section: 'admin', roles: ADMIN, delivery: 1 },
  { id: 'rules', path: '/admin/rules', title: 'Consistency rules', section: 'admin', roles: ADMIN, delivery: 2 },
  { id: 'importTools', path: '/admin/import-tools', title: 'Import tools and mappings', section: 'admin', roles: ADMIN, delivery: 2, lot: '2b' },
  { id: 'packTemplates', path: '/admin/pack-templates', title: 'Pack templates', section: 'admin', roles: ADMIN, delivery: 4 },
  { id: 'ceLists', path: '/admin/ce-lists', title: 'CE lists', section: 'admin', roles: ADMIN, delivery: 4 },
  { id: 'activity', path: '/admin/activity', title: 'Activity and integrations', section: 'admin', roles: ADMIN, delivery: 1 },
  { id: 'journal', path: '/journal', title: 'Journal', section: 'admin', roles: ADMIN, delivery: 1 },
];

export const SCREEN_BY_ID = Object.fromEntries(SCREENS.map((s) => [s.id, s])) as Record<ScreenId, ScreenDef>;

export const SECTION_LABEL: Record<Exclude<Section, 'base'>, string> = {
  project: 'Project', reference: 'Technical reference', admin: 'Administration',
};

/** Screens of the project section, in the order of the sidebar (spec 03 § 3). */
export const PROJECT_SCREENS = SCREENS.filter((s) => s.section === 'project').map((s) => s.id);

/** Disciplines of the project section (one screen each): the code of the reference table `disciplines`. */
export const DISCIPLINE_SCREENS = { process: 'process', mechanical: 'mechanical', electrical: 'electrical', automation: 'automation' } as const;

export function canSee(role: RoleKey | readonly RoleKey[], id: ScreenId): boolean {
  const r = SCREEN_BY_ID[id].roles;
  const held = typeof role === 'string' ? [role] : role;
  return r === 'all' || held.some((x) => r.includes(x));
}

export function screenHref(id: ScreenId, params: { code?: string } = {}): string {
  const p = SCREEN_BY_ID[id].path;
  if (!p.includes('[code]')) return p;
  if (!params.code) throw new Error(`screenHref(${id}) needs a code`);
  return p.replace('[code]', encodeURIComponent(params.code));
}

export function matchScreen(pathname: string): ScreenDef | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const byLength = [...SCREENS].sort((a, b) => b.path.length - a.path.length);
  for (const s of byLength) {
    const re = new RegExp('^' + s.path.replace(/\[code\]/, '[^/]+').replace(/\//g, '\\/') + '$');
    if (s.path === '/' ? clean === '/' : re.test(clean)) return s;
  }
  return null;
}

/** The project code of a project path (`/projects/HLT-026/pid` → `HLT-026`), else null. */
export function projectOfPath(pathname: string): string | null {
  const m = /^\/projects\/([^/]+)/.exec(pathname);
  return m ? decodeURIComponent(m[1]) : null;
}
