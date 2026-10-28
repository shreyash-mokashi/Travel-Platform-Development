import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/EmptyState';
import { apiFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Admin audit log' };

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  actor: string;
  actorEmail: string | null;
  createdAt: string;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Number((await searchParams).page) || 1;
  const data = await apiFetch<{ items: AuditRow[]; total: number }>(
    `/admin/audit?page=${page}&pageSize=50`,
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-muted">
        {data.total} administrative action(s) recorded. Every inventory, room and rate-plan change
        is written here with the acting administrator.
      </p>

      {data.items.length === 0 ? (
        <EmptyState
          title="No administrative changes yet"
          description="Changes made from the inventory screens appear here."
          icon="📋"
        />
      ) : (
        <ol className="space-y-3" data-testid="audit-list">
          {data.items.map((entry) => (
            <li key={entry.id} className="vg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">
                  {entry.action.replace(/_/g, ' ').toLowerCase()}
                </p>
                <p className="text-xs text-ink-muted">
                  {new Date(entry.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {entry.entityType} · <span className="font-mono">{entry.entityId}</span> · by{' '}
                {entry.actor}
              </p>
              {entry.metadata ? (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-sand-100 p-3 text-xs text-ink-soft">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
