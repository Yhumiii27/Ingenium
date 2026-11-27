// App shell: Norma's common shell (norma/charte/COQUE.md): 232 px sidebar | main, and up to 1024 px a top bar (menu button,
// logo, language / display pair) opening the sidebar as a drawer. Demo mode: "View as" at the bottom of the sidebar; Entra
// mode (sign-in through Clavis): the account menu with the roles Clavis grants. The badges of the common block count the
// person's open tasks and approvals in the whole suite (matrix.pub_taches), computed on each request.
import { cookies } from 'next/headers';
import { baseCounts } from '@norma/charte/ds/task-rules';
import { AppShell } from '@norma/charte/ds/AppShell';
import { ToastProvider } from '@norma/charte/ds/Toast';
import { ClockProvider } from '@/components/app/clock';
import { Sidebar } from '@/components/app/shell/sidebar';
import { IngeniumPrefs } from '@/components/app/shell/prefs';
import { IngeniumTopBar } from '@/components/app/shell/topbar';
import { projectLabel } from '@/domain/vocab';
import { authMode } from '@/server/auth/config';
import { businessToday } from '@/server/clock';
import { projectsInScope } from '@/server/dal/projects';
import { allTasksOf } from '@/server/dal/tasks';
import { DEMO_PERSONAS, getI18n, getTheme, getViewer } from '@/server/session';
import { initialsOf } from '@/server/viewer';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const [viewer, today, { lang }, theme, jar] = await Promise.all([getViewer(), businessToday(), getI18n(), getTheme(), cookies()]);
  const [projects, tasks] = await Promise.all([projectsInScope(viewer), allTasksOf(viewer, today)]);
  const entra = authMode() === 'entra';
  const personas = entra ? [] : DEMO_PERSONAS.map((p) => ({ role: p.role, name: p.name, initials: initialsOf(p.name) }));
  const folded = (jar.get('ingenium-nav')?.value ?? '').split(',').filter(Boolean);
  const scope = projects.map((p) => ({ code: p.code, label: projectLabel(p) }));
  const last = jar.get('ingenium-project')?.value ?? null;
  return (
    <ClockProvider today={today}>
      <ToastProvider>
        <AppShell
          topbar={<IngeniumTopBar prefs={<IngeniumPrefs lang={lang} theme={theme} />} />}
          sidebar={
            <Sidebar
              role={viewer.role}
              roles={viewer.roles}
              personas={personas}
              account={entra ? { name: viewer.name, initials: viewer.initials, roles: viewer.roles } : null}
              counts={baseCounts(tasks.rows)}
              projects={scope}
              lastProject={scope.some((p) => p.code === last) ? last : null}
              folded={folded}
            />
          }
        >
          {children}
        </AppShell>
      </ToastProvider>
    </ClockProvider>
  );
}
