import { useState } from 'react'

import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/PageLoader'
import { Pagination } from '@/components/shared/Pagination'
import { useGetAuditLogQuery } from '@/features/audit/auditLogApi'
import { getErrorMessage } from '@/lib/api/apiErrors'
import { formatDateTime } from '@/lib/utils/formatDate'

export function AuditLogPage() {
  const [page, setPage] = useState(1)
  const { data, error, isLoading, isError, refetch } = useGetAuditLogQuery(page)

  return (
    <div className="flex flex-col gap-6">
      <title>Auditoría | Nexora Admin</title>
      <PageHeader
        title="Auditoría"
        description="Registro de solo lectura de las acciones administrativas."
      />

      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Aún no hay acciones registradas" />
      ) : (
        <>
          <ol className="flex flex-col divide-y rounded-xl border bg-card">
            {data.items.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:gap-4"
              >
                <time
                  dateTime={entry.createdAt}
                  className="shrink-0 text-xs text-muted-foreground sm:w-40 sm:pt-0.5"
                >
                  {formatDateTime(entry.createdAt)}
                </time>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{entry.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.actorEmail} · <code>{entry.action}</code>
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
