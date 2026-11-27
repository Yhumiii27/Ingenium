// The screens of the technical reference (parts, structures, wear and spare parts, drawings, engineering changes): navigable
// placeholders until their delivery (docs/PLAN.md).
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/app/shell/page-header';
import { SCREEN_CONTENT } from '@/config/screen-content';
import { SCREENS } from '@/config/screens';
import { Placeholder } from '@/features/pages/placeholder';

export default async function ReferenceScreenPage({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  const def = SCREENS.find((x) => x.section === 'reference' && x.path === `/reference/${screen}`);
  if (!def) notFound();
  return (
    <>
      <PageHeader screen={def.id} crumbs={['Technical reference']} />
      <Placeholder delivery={def.delivery} lot={def.lot} items={SCREEN_CONTENT[def.id] ?? []} />
    </>
  );
}
