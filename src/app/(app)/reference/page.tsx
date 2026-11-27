// Technical reference (Norma 3.1, COQUE.md § 2 bis.3): the parts, structures and drawings the design offices create — an
// overview of the section's screens. The reference itself is taken over from Keystone in delivery 3 (ING-06).
import { SectionCard } from '@/components/app/SectionCard';
import { PageHeader } from '@/components/app/shell/page-header';
import { SCREEN_CONTENT } from '@/config/screen-content';
import { SCREENS } from '@/config/screens';
import s from '@/features/pages/pages.module.css';
import { getI18n } from '@/server/session';

export default async function ReferencePage() {
  const { t } = await getI18n();
  const screens = SCREENS.filter((x) => x.section === 'reference');
  return (
    <>
      <PageHeader screen="reference" subtitle={t('Parts, structures, wear and spare parts, drawings of the PDM vault')} />
      <div className={s.grid3}>
        {screens.map((x) => (
          <SectionCard key={x.id} href={x.path} title={t(x.title)} hint={`${t('Delivery')} ${x.delivery}`}>
            <ul className={s.list}>{(SCREEN_CONTENT[x.id] ?? []).map((i) => <li key={i}>{t(i)}</li>)}</ul>
          </SectionCard>
        ))}
      </div>
    </>
  );
}
