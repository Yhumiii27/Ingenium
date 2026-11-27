// Activity and integrations (administration): every connector of Ingenium, its mode and the request that opens it, then the
// last reads of Keystone (outcome, rows, who asked) and « Read now ». A source that cannot be read is a state shown here,
// never a page error (Norma § 5).
import { notFound } from 'next/navigation';
import { Table, Td, Th } from '@norma/charte/ds/Table';
import { Tag } from '@norma/charte/ds/Tag';
import { ActionButton } from '@/components/app/ActionForm';
import { EmptyState } from '@/components/app/EmptyState';
import { SectionCard } from '@/components/app/SectionCard';
import { PageHeader } from '@/components/app/shell/page-header';
import { canSee } from '@/config/screens';
import { can } from '@/domain/rights';
import { applyRegisterTransferAction, dryRunRegisterTransferAction, readKeystoneNowAction } from '@/features/admin/actions';
import { TRANSFER_OBJECTS, TRANSFER_OBJECT_LABEL } from '@/domain/transfer';
import { objectSwitchovers } from '@/server/db/schema';
import { mirroredRegisterCount, transferRunsOf } from '@/server/integrations/keystone/register';
import { fmtInstant } from '@/lib/format';
import { getConfig } from '@/server/config';
import { getDb } from '@/server/db/client';
import { CONNECTORS } from '@/server/integrations/connectors';
import { lastSyncRuns } from '@/server/integrations/keystone/sync';
import { getI18n, getViewer } from '@/server/session';

const MODE_LABEL: Record<string, string> = { off: 'Off', simulation: 'Simulation', views: 'Views of the shared server' };

export default async function ActivityPage() {
  const [{ t, lang }, viewer] = await Promise.all([getI18n(), getViewer()]);
  if (!canSee(viewer.roles, 'activity')) notFound();
  const cfg = getConfig();
  const db = await getDb();
  const [runs, switched, transfers, mirrored] = await Promise.all([lastSyncRuns(db, 20), db.select().from(objectSwitchovers), transferRunsOf(db, 'register'), mirroredRegisterCount(db)]);
  const registerHeld = switched.some((x) => x.object === 'register');
  const admin = can(viewer.roles, 'administration');
  const modeOf = (variable: string | null): string => {
    if (variable === 'INGENIUM_KEYSTONE') return t(MODE_LABEL[cfg.connectors.keystone]);
    if (variable === 'INGENIUM_SUITE_TASKS') return t(MODE_LABEL[cfg.connectors.suiteTasks]);
    if (variable === 'INGENIUM_ACCESS_FROM_CLAVIS') return process.env.INGENIUM_ACCESS_FROM_CLAVIS === 'on' ? t('On') : t('Off');
    if (variable === 'MATRIX_URL') return process.env.MATRIX_URL ? t('On') : t('Off');
    return t('Not built yet');
  };
  return (
    <>
      <PageHeader
        screen="activity"
        crumbs={['Administration']}
        primary={can(viewer.roles, 'administration') && cfg.connectors.keystone !== 'off' ? <ActionButton run={readKeystoneNowAction} label="Read Keystone now" done="Keystone read" variant="primary" /> : undefined}
      />
      <SectionCard title={t('Connectors')} hint={t('Reading through the pub_ views of the shared server, writing through the owner’s API (Norma § 5)')}>
        <Table>
          <thead><tr><Th>{t('Tool')}</Th><Th>{t('Object')}</Th><Th>{t('Nature')}</Th><Th>{t('Use')}</Th><Th>{t('Mode')}</Th><Th>{t('Delivery')}</Th><Th>{t('Request')}</Th></tr></thead>
          <tbody>
            {CONNECTORS.map((c) => (
              <tr key={`${c.tool}-${c.object}`}>
                <Td nowrap>{c.tool}</Td>
                <Td><code>{c.object}</code></Td>
                <Td nowrap>{c.nature === 'read' ? t('Reading') : t('Writing')}</Td>
                <Td>{t(c.how)}</Td>
                <Td nowrap><Tag tone={c.variable ? 'outline' : 'neutral'} size="xs">{modeOf(c.variable)}</Tag></Td>
                <Td numeric>{c.delivery}</Td>
                <Td nowrap>{c.request}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </SectionCard>
      <SectionCard title={t('Switch-over from Keystone')} hint={t('One source per object: Keystone until its switch-over, Ingenium afterwards (docs/spec/06)')}
        actions={admin && !registerHeld && cfg.connectors.keystone !== 'off' ? (
          <>
            <ActionButton run={dryRunRegisterTransferAction} label="Dry run of the register" done="Dry run recorded" />
            <ActionButton run={applyRegisterTransferAction} label="Switch the register over" done="Register held by Ingenium" variant="primary" />
          </>
        ) : undefined}
      >
        <Table>
          <thead><tr><Th>{t('Object')}</Th><Th>{t('Held by')}</Th><Th>{t('Since')}</Th></tr></thead>
          <tbody>
            {TRANSFER_OBJECTS.map((o) => {
              const sw = switched.find((x) => x.object === o);
              return (
                <tr key={o}>
                  <Td>{t(TRANSFER_OBJECT_LABEL[o])}</Td>
                  <Td nowrap><Tag size="xs" tone={sw ? 'accent' : 'outline'}>{sw ? 'Ingenium' : 'Keystone'}</Tag></Td>
                  <Td nowrap>{sw ? `${fmtInstant(sw.switchedAt, lang)} · ${sw.byName}` : o === 'register' ? `${mirrored} ${t('deliverables mirrored from Keystone')}` : t('Later lot')}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        {transfers.length > 0 && (
          <Table>
            <thead><tr><Th>{t('Run')}</Th><Th>{t('Mode')}</Th><Th align="right">{t('Rows read')}</Th><Th align="right">{t('Refused')}</Th><Th>{t('Refusals')}</Th><Th>{t('By')}</Th></tr></thead>
            <tbody>
              {transfers.map((r) => (
                <tr key={r.id}>
                  <Td nowrap>{fmtInstant(r.occurredAt, lang)}</Td>
                  <Td nowrap>{r.mode === 'applied' ? t('Applied') : t('Dry run')}</Td>
                  <Td numeric align="right">{r.counts.read ?? 0}</Td>
                  <Td numeric align="right">{r.refused}</Td>
                  <Td>{r.refusals.length ? r.refusals.slice(0, 5).map((x) => `${x.key}: ${t(x.reason)}`).join(' · ') : '—'}</Td>
                  <Td nowrap>{r.byName}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </SectionCard>
      <SectionCard title={t('Last reads of Keystone')}>
        {runs.length ? (
          <Table>
            <thead><tr><Th>{t('Started')}</Th><Th>{t('Outcome')}</Th><Th align="right">{t('Rows')}</Th><Th>{t('Message')}</Th><Th>{t('Asked by')}</Th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <Td nowrap>{fmtInstant(r.startedAt, lang)}</Td>
                  <Td nowrap><Tag tone={r.outcome === 'ok' ? 'accent' : 'outline'} size="xs">{r.outcome === 'ok' ? t('Read') : t('Source unavailable')}</Tag></Td>
                  <Td numeric align="right">{r.rows}</Td>
                  <Td>{r.message ? t(r.message) : '—'}</Td>
                  <Td>{r.requestedBy ? t('Read now') : t('Scheduled job')}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState variant="boxed">{t('Keystone has not been read yet.')}</EmptyState>
        )}
      </SectionCard>
    </>
  );
}
