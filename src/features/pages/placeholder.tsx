// A screen of the registry whose content comes with a later delivery (docs/PLAN.md): it is navigable, says what it will hold
// and when, and shows nothing invented. Server component.
import { Hourglass } from '@phosphor-icons/react/dist/ssr';
import { EmptyState } from '@/components/app/EmptyState';
import { SectionCard } from '@/components/app/SectionCard';
import { getI18n } from '@/server/session';
import s from './pages.module.css';

export async function Placeholder({ delivery, items }: { delivery: number; items: readonly string[] }) {
  const { t } = await getI18n();
  return (
    <SectionCard title={t('What this screen will hold')} hint={`${t('Delivery')} ${delivery} · docs/PLAN.md`}>
      <ul className={s.list}>
        {items.map((i) => <li key={i}>{t(i)}</li>)}
      </ul>
      <EmptyState variant="boxed" icon={Hourglass}>{t('Nothing to show yet: this screen is built in a later delivery.')}</EmptyState>
    </SectionCard>
  );
}
