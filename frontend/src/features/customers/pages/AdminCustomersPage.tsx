import { Search } from 'lucide-react'
import { type SubmitEvent, useState } from 'react'

import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/PageLoader'
import { Pagination } from '@/components/shared/Pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useGetAdminCustomersQuery } from '@/features/customers/adminCustomersApi'
import { getErrorMessage } from '@/lib/api/apiErrors'
import { cn } from '@/lib/utils/cn'
import { formatDateTime } from '@/lib/utils/formatDate'
import { getFormText } from '@/lib/utils/formData'
import { formatPrice } from '@/lib/utils/formatPrice'

export function AdminCustomersPage() {
  const [page, setPage] = useState(1)
  const [q, setQ] = useState<string | undefined>()
  const { data, error, isLoading, isFetching, isError, refetch } = useGetAdminCustomersQuery({
    page,
    q,
  })

  function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setQ(getFormText(new FormData(event.currentTarget), 'q') || undefined)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      <title>Clientes | Nexora Admin</title>
      <PageHeader
        title="Clientes"
        description="El total gastado solo considera pedidos pagados, enviados o entregados."
      />

      <form role="search" onSubmit={handleSearch} className="flex gap-2">
        <label htmlFor="customer-search" className="sr-only">
          Buscar por nombre o correo
        </label>
        <Input
          id="customer-search"
          name="q"
          type="search"
          placeholder="Nombre o correo…"
          className="h-9 w-64"
        />
        <Button type="submit" variant="outline" size="icon-lg" aria-label="Buscar">
          <Search aria-hidden="true" />
        </Button>
      </form>

      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No hay clientes con ese criterio" />
      ) : (
        <>
          <div
            className={cn('overflow-x-auto rounded-xl border bg-card', isFetching && 'opacity-70')}
          >
            <table className="w-full min-w-[680px] text-sm">
              <caption className="sr-only">Clientes registrados</caption>
              <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Registro
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Pedidos
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Total gastado
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Último pedido
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((customer) => (
                  <tr key={customer.id}>
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <span className="font-medium">{customer.fullName}</span>
                      <span className="block text-xs text-muted-foreground">{customer.email}</span>
                    </th>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(customer.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{customer.orderCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatPrice(customer.totalSpent)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {customer.lastOrderAt ? formatDateTime(customer.lastOrderAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
