'use client';
// Sidebar, rendered with Norma's common shell (norma/charte/COQUE.md § 2 and § 2 bis): brand (Ingenium's logo), ⌘K page search
// right under it, the common block of the suite (`BaseNav`: Home, My tasks, My approvals, My projects, Technical reference),
// then the sections by theme — Project (with the current project as context line), Technical reference, Administration —,
// collapsible (cookie ingenium-nav). At the bottom the "View as" switcher (demo mode) or the account menu (Entra mode: roles
// held, sign out). Neither the language nor the display is here: the pair is the last element of every page header and of
// the top bar.
import { CaretUpDown, Eye, SignOut } from '@phosphor-icons/react/dist/ssr';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { BaseNav, BASE_ICONS } from '@norma/charte/ds/BaseNav';
import { cx } from '@norma/charte/ds/cx';
import { Tag } from '@norma/charte/ds/Tag';
import { NavEntry, NavSection, NavSections, PageSearch, Sidebar as CoqueSidebar, type PageHit } from '@norma/charte/ds/Sidebar';
import { ToolLogo } from '@norma/charte/ds/ToolLogo';
import { ROLE_LABEL, type RoleKey } from '@/config/roles';
import { SCREEN_ICONS } from '@/config/screen-icons';
import { projectOfPath } from '@/config/screens';
import { AUTH_PATHS } from '@/domain/auth';
import { useI18n } from '@/i18n/client';
import { setViewAs } from '@/server/actions/preferences';
import { buildNav } from './nav-model';
import styles from './sidebar.module.css';

export interface SidebarPersona {
  role: RoleKey;
  name: string;
  initials: string;
}

export interface SidebarAccount {
  name: string;
  initials: string;
  roles: RoleKey[];
}

export interface SidebarProps {
  role: RoleKey;
  roles: RoleKey[];
  personas: SidebarPersona[];
  account: SidebarAccount | null;
  /** Open tasks and approvals of the person in the whole suite (badges of the common block). */
  counts: { tasks?: number; approvals?: number };
  /** Projects of the viewer's scope (code and label of ING-22), for the project section. */
  projects: { code: string; label: string }[];
  /** Last project opened (cookie ingenium-project), when still in scope. */
  lastProject: string | null;
  folded: string[];
}

const YEAR = 60 * 60 * 24 * 365;
const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${YEAR}; samesite=lax`;
};

function useDismiss(open: boolean, setOpen: (v: boolean) => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);
  return ref;
}

export function Sidebar({ role, roles, personas, account, counts, projects, lastProject, folded: initialFolded }: SidebarProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  // Current project: the page's, else the last one opened, else the first of the scope.
  const onPage = projectOfPath(pathname);
  const project = projects.find((p) => p.code === onPage) ?? projects.find((p) => p.code === lastProject) ?? projects[0] ?? null;
  useEffect(() => {
    if (onPage && projects.some((p) => p.code === onPage) && onPage !== lastProject) setCookie('ingenium-project', onPage);
  }, [onPage, projects, lastProject]);
  const nav = buildNav({ roles, pathname, project, counts });
  const [folded, setFolded] = useState<string[]>(initialFolded);

  const toggle = (key: string) => {
    const next = folded.includes(key) ? folded.filter((k) => k !== key) : [...folded, key];
    setFolded(next);
    setCookie('ingenium-nav', next.join(','));
  };

  // Every page the viewer may open, for the ⌘K page search (labels translated).
  const pages = useMemo<PageHit[]>(
    () => [
      ...nav.base.map((e) => ({ href: e.href, label: t(e.label), icon: BASE_ICONS[e.icon], badge: e.badge || undefined })),
      ...nav.sections.flatMap((s) => s.entries.map((e) => ({ href: e.href, label: t(e.label), section: t(s.label), icon: SCREEN_ICONS[e.id] ?? Eye }))),
    ],
    [nav, t],
  );

  return (
    <CoqueSidebar
      name="Ingenium"
      logo={<ToolLogo code="ingenium" />}
      footer={
        <>
          {/* Discreet beta mark (delivery 1): the charter's Tag, tokens only. */}
          <div className={styles.beta}><Tag tone="outline" size="micro" title={t('Beta version: the data of the demonstration are fictitious')}>{t('Beta')}</Tag></div>
          {account ? <AccountMenu account={account} /> : <ViewAs role={role} personas={personas} />}
        </>
      }
    >
      <PageSearch pages={pages}>
        <BaseNav tool="ingenium" counts={counts} />
        <NavSections>
          {nav.sections.map((sec) => {
            const open = !folded.includes(sec.key) || sec.active;
            return (
              <NavSection
                key={sec.key}
                label={t(sec.label)}
                open={open}
                onToggle={() => toggle(sec.key)}
                bright={sec.active}
                count={open ? undefined : sec.entries.length}
                sub={sec.context}
              >
                {sec.entries.map((n) => <NavEntry key={n.id} href={n.href} label={t(n.label)} icon={SCREEN_ICONS[n.id] ?? Eye} active={n.active} item />)}
              </NavSection>
            );
          })}
        </NavSections>
      </PageSearch>
    </CoqueSidebar>
  );
}

function ViewAs({ role, personas }: { role: RoleKey; personas: SidebarPersona[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useDismiss(open, setOpen);
  const viewer = personas.find((p) => p.role === role) ?? personas[0];
  if (!viewer) return null;
  return (
    <div ref={ref}>
      {open && (
        <div className={cx('elev-md', styles.menu)} role="menu">
          <div className={styles.menuHead}>{t('View as')}</div>
          {personas.map((p) => (
            <button
              key={p.role}
              type="button"
              role="menuitemradio"
              aria-checked={p.role === role}
              className={cx(styles.persona, p.role === role && styles.personaOn)}
              onClick={() => {
                setOpen(false);
                startTransition(async () => {
                  await setViewAs(p.role);
                });
              }}
            >
              <span className={styles.avatarSm}>{p.initials}</span>
              <span className="coque-who">
                <span className={styles.whoName}>{p.name}</span>
                <span className="coque-who-role">{t(ROLE_LABEL[p.role])}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <button type="button" className="coque-user" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <div className="coque-avatar">{viewer.initials}</div>
        <div className="coque-who">
          <span className="coque-who-name">{viewer.name}</span>
          <span className="coque-who-role">{t(ROLE_LABEL[viewer.role])}</span>
        </div>
        <CaretUpDown className="coque-user-caret" aria-hidden />
      </button>
    </div>
  );
}

function AccountMenu({ account }: { account: SidebarAccount }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, setOpen);
  return (
    <div ref={ref}>
      {open && (
        <div className={cx('elev-md', styles.menu)} role="menu">
          <div className={styles.menuHead}>{t('Roles granted in Clavis')}</div>
          {account.roles.map((r) => (
            <div key={r} className={styles.persona}>
              <span className={styles.whoName}>{t(ROLE_LABEL[r])}</span>
            </div>
          ))}
          <div className={styles.menuSep} />
          <form method="post" action={AUTH_PATHS.signOut} className={styles.signOutForm}>
            <button type="submit" className={styles.persona}>
              <SignOut size={14} aria-hidden />
              <span className={styles.whoName}>{t('Sign out')}</span>
            </button>
          </form>
        </div>
      )}
      <button type="button" className="coque-user" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <div className="coque-avatar">{account.initials}</div>
        <div className="coque-who">
          <span className="coque-who-name">{account.name}</span>
          <span className="coque-who-role">{t(ROLE_LABEL[account.roles[0]])}</span>
        </div>
        <CaretUpDown className="coque-user-caret" aria-hidden />
      </button>
    </div>
  );
}
