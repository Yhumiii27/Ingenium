// Consistency rules between disciplines (administration, lot 2a): the rules the checks of the register cite. Seeded with
// Keystone's six rules; ING-D2 gives the real list. A rule is never deleted: it is deactivated (its checks keep it).
import { notFound } from 'next/navigation';
import { Field, Input, Select } from '@norma/charte/ds/Field';
import { Table, Td, Th } from '@norma/charte/ds/Table';
import { Tag } from '@norma/charte/ds/Tag';
import { ActionForm, Folded } from '@/components/app/ActionForm';
import { SectionCard } from '@/components/app/SectionCard';
import { PageHeader } from '@/components/app/shell/page-header';
import { canSee } from '@/config/screens';
import { can } from '@/domain/rights';
import { saveRuleAction } from '@/features/admin/actions';
import { allRules } from '@/server/dal/register';
import { getI18n, getViewer } from '@/server/session';

export default async function RulesPage() {
  const [{ t }, viewer] = await Promise.all([getI18n(), getViewer()]);
  if (!canSee(viewer.roles, 'rules')) notFound();
  const rules = await allRules();
  const edits = can(viewer.roles, 'administration') || can(viewer.roles, 'validate_parts');
  return (
    <>
      <PageHeader
        screen="rules"
        crumbs={['Administration']}
        primary={edits ? (
          <Folded summary="Add a rule" variant="primary">
            <ActionForm action={saveRuleAction} submit="Add" done="Rule saved">
              <Field label={t('Code')} required hint={t('Lower case, e.g. process-electrical')}><Input name="code" required maxLength={40} /></Field>
              <Field label={t('Name')} required><Input name="label" required maxLength={80} /></Field>
            </ActionForm>
          </Folded>
        ) : undefined}
      />
      <SectionCard title={t('Consistency rules')} hint={t('Cited by the checks of the register (ING-D2 gives the real list)')}>
        <Table>
          <thead><tr><Th>{t('Code')}</Th><Th>{t('Name')}</Th><Th>{t('State')}</Th><Th align="right">{t('Actions')}</Th></tr></thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.code}>
                <Td nowrap><code>{r.code}</code></Td>
                <Td>{r.label}</Td>
                <Td nowrap><Tag size="xs" tone={r.active ? 'outline' : 'neutral'}>{r.active ? t('Active') : t('Inactive')}</Tag></Td>
                <Td align="right">
                  {edits && (
                    <Folded summary="Edit" variant="ghost" title="Edit the rule">
                      <ActionForm action={saveRuleAction} submit="Save" done="Rule saved">
                        <input type="hidden" name="code" value={r.code} />
                        <Field label={t('Name')} required><Input name="label" required defaultValue={r.label} maxLength={80} /></Field>
                        <Field label={t('State')}>
                          <Select name="active" defaultValue={r.active ? 'on' : 'off'} options={[{ value: 'on', label: t('Active') }, { value: 'off', label: t('Inactive') }]} />
                        </Field>
                      </ActionForm>
                    </Folded>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </SectionCard>
    </>
  );
}
