// The administration screens built in a later delivery (consistency rules, import tools, pack templates, CE lists): navigable
// placeholders for the administrator and the engineering lead; 404 for the other roles.
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/app/shell/page-header';
import { SCREEN_CONTENT } from '@/config/screen-content';
import { SCREENS, canSee } from '@/config/screens';
import { Placeholder } from '@/features/pages/placeholder';
import { getViewer } from '@/server/session';

export default async function AdminScreenPage({ params }: { params: Promise<{ screen: string }> }) {
  const [{ screen }, viewer] = await Promise.all([params, getViewer()]);
  const def = SCREENS.find((x) => x.section === 'admin' && x.path === `/admin/${screen}`);
  if (!def || !canSee(viewer.roles, def.id)) notFound();
  return (
    <>
      <PageHeader screen={def.id} crumbs={['Administration']} />
      <Placeholder delivery={def.delivery} lot={def.lot} items={SCREEN_CONTENT[def.id] ?? []} />
    </>
  );
}
