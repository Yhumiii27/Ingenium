// Home — « Ma discipline » (Norma 3.1, COQUE.md § 2 bis.2; default answer of ING-23): what waits for the person's discipline,
// then one card per project of their engineering team, then the « To handle » box (first tasks and approvals of the whole
// suite, linking to My tasks). The engineering registers (inputs, deliverables, checks, P&ID tags, parts, ECO keys) come with
// deliveries 2 and 3: their tiles say so instead of showing an invented figure. Every figure is computed on display.
import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { dedupe, isLate, isOpen, sortTasks } from '@norma/charte/ds/task-rules';
import { ButtonLink } from '@norma/charte/ds/Button';
import { Tag } from '@norma/charte/ds/Tag';
import { Callout } from '@/components/app/Callout';
import { EmptyState } from '@/components/app/EmptyState';
import { KpiGrid, KpiTile } from '@/components/app/Kpi';
import { SectionCard } from '@/components/app/SectionCard';
import { PageHeader } from '@/components/app/shell/page-header';
import { screenHref } from '@/config/screens';
import { DISCIPLINE_CODES, DISCIPLINE_LABEL, projectLabel } from '@/domain/vocab';
import s from '@/features/pages/pages.module.css';
import { fmtDate } from '@/lib/format';
import { businessToday } from '@/server/clock';
import { projectsInScope } from '@/server/dal/projects';
import { projectFilterHref } from '@/domain/confidential';
import { suiteTasksOf } from '@/server/dal/tasks';
import { getI18n, getViewer } from '@/server/session';

/** The blocks of « Ma discipline » and the delivery that fills each (docs/PLAN.md). */
const DISCIPLINE_BLOCKS: readonly { label: string; delivery: number }[] = [
  { label: 'Blocking expected inputs', delivery: 2 },
  { label: 'Deliverables to release this week', delivery: 2 },
  { label: 'Open consistency checks', delivery: 2 },
  { label: 'P&ID tags not tied to a part', delivery: 2 },
  { label: 'Parts to validate', delivery: 3 },
  { label: 'ECO keys expected', delivery: 3 },
];

export default async function HomePage() {
  const [{ t, lang }, viewer, today] = await Promise.all([getI18n(), getViewer(), businessToday()]);
  const [projects, tasks] = await Promise.all([projectsInScope(viewer), suiteTasksOf(viewer, today)]);
  const mine = projects.filter((p) => p.mine && p.open);
  const shown = (mine.length ? mine : projects.filter((p) => p.open)).slice(0, 6);
  const open = dedupe(tasks.rows).filter(isOpen);
  const late = open.filter((r) => isLate(r, today));
  const toHandle = sortTasks(open).slice(0, 3);
  return (
    <>
      <PageHeader screen="home" title={t('My discipline')} subtitle={`${viewer.name} · ${fmtDate(today, lang)}`} />
      <KpiGrid min={170}>
        <KpiTile size="lg" label={t('Projects of my team')} value={projects.filter((p) => p.mine).length} sub={`${projects.filter((p) => p.mine && p.open).length} ${t('open')}`} />
        <KpiTile size="lg" label={t('Projects in progress')} value={projects.filter((p) => p.open).length} sub={t('read in Keystone')} />
        <KpiTile size="lg" label={t('Tasks to do')} value={open.filter((r) => r.nature === 'tache').length} sub={`${late.length} ${t('late')}`} tone={late.length ? 'alert' : 'default'} />
        <KpiTile size="lg" label={t('Approvals to decide')} value={open.filter((r) => r.nature === 'approbation').length} sub={t('whole suite')} />
      </KpiGrid>
      <div className={s.grid2}>
        <SectionCard title={t('My discipline')} hint={t('Filled by the engineering registers')}>
          <ul className={s.list}>
            {DISCIPLINE_BLOCKS.map((b) => (
              <li key={b.label}>
                {t(b.label)} <span className={s.muted}>· {t('Delivery')} {b.delivery}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard
          title={t('To handle')}
          hint={t('First tasks and approvals of the whole suite')}
          actions={<ButtonLink href={screenHref('tasks')} size="sm" variant="ghost" iconRight={ArrowRight}>{t('My tasks')}</ButtonLink>}
        >
          {toHandle.length ? (
            <ul className={s.list}>
              {toHandle.map((r) => (
                <li key={`${r.outil}:${r.tache_id}`}>
                  {r.sensible ? r.type_libelle : r.titre} <span className={s.muted}>· {r.objet_ref ?? r.type_libelle}{r.echeance ? ` · ${fmtDate(r.echeance, lang)}` : ''}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState variant="boxed">{t('Nothing to handle')}</EmptyState>
          )}
          {tasks.simulated && <Callout variant="compact">{t('Tasks of the other tools simulated (demonstration data set)')}</Callout>}
        </SectionCard>
      </div>
      <SectionCard title={mine.length ? t('Projects of my team') : t('Open projects')} hint={t('Progress of the deliverables, P&ID coverage and engineering pack: delivery 2 to 4')}>
        {shown.length ? (
          <div className={s.grid3}>
            {shown.map((p) => (
              <SectionCard key={p.code} variant="tinted" href={screenHref('projectSummary', { code: p.code })} title={projectLabel(p)} subtitle={p.name}>
                <div className={s.tags}>
                  {p.phase && <Tag tone="outline" size="sm">{p.phase}</Tag>}
                  {p.confidential && <Tag tone="accent-2" size="sm">{t('Confidential')}</Tag>}
                  {p.myDisciplines.map((d) => <Tag key={d} tone="accent" size="sm">{t(DISCIPLINE_LABEL[d])}</Tag>)}
                </div>
                <span className={s.muted}>
                  {DISCIPLINE_CODES.map((d) => `${t(DISCIPLINE_LABEL[d])} ${p.team.filter((m) => m.discipline === d).length}`).join(' · ')}
                </span>
              </SectionCard>
            ))}
          </div>
        ) : (
          <EmptyState variant="boxed">{t('No project in your scope: Keystone’s projects appear once the connector has read them.')}</EmptyState>
        )}
        {projects.length > shown.length && (
          <Link className={s.link} href={projectFilterHref('all')}>{t('Every project in progress')} ({projects.filter((p) => p.open).length})</Link>
        )}
      </SectionCard>
    </>
  );
}
