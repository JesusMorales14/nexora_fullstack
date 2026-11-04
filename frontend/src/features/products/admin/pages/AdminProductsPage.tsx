import { Plus, Search } from 'lucide-react'
import { type SubmitEvent, useState } from 'react'
import { Link } from 'react-router'

import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/PageLoader'
import { Pagination } from '@/components/shared/Pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGetAdminCategoriesQuery } from '@/features/categories/adminCategoriesApi'
import { useGetAdminProductsQuery } from '@/features/products/admin/adminProductsApi'
import type { AdminProductListParams } from '@/features/products/admin/types'
import { getErrorMessage } from '@/lib/api/apiErrors'
import { cn } from '@/lib/utils/cn'
import { formatDateTime } from '@/lib/utils/formatDate'
import { getFormText } from '@/lib/utils/formData'
import { formatPrice } from '@/lib/utils/formatPrice'

const SELECT_CLASS_NAME =
  'h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function AdminProductsPage() {
  const [filters, setFilters] = useState<AdminProductListParams>({ page: 1 })
  const { data, error, isLoading, isFetching, isError, refetch } = useGetAdminProductsQuery(filters)
  const { data: categories = [] } = useGetAdminCategoriesQuery()

  function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = getFormText(new FormData(event.currentTarget), 'q')
    setFilters((current) => ({ ...current, q: q || undefined, page: 1 }))
  }

  return (
    <div className="flex flex-col gap-6">
      <title>Productos | Nexora Admin</title>
      <PageHeader
        title="Productos"
        description="Incluye borradores. Los cambios se registran en la auditoría."
        actions={
          <Button asChild>
            <Link to="/admin/products/new">
              <Plus aria-hidden="true" />
              Nuevo producto
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <form role="search" onSubmit={handleSearch} className="flex gap-2">
          <label htmlFor="admin-product-search" className="sr-only">
            Buscar por nombre, slug o SKU
          </label>
          <Input
            id="admin-product-search"
            name="q"
            type="search"
            placeholder="Nombre, slug o SKU…"
            className="h-9 w-56"
          />
          <Button type="submit" variant="outline" size="icon-lg" aria-label="Buscar">
            <Search aria-hidden="true" />
          </Button>
        </form>
        <div className="flex flex-col gap-1">
          <Label htmlFor="admin-product-status" className="text-xs text-muted-foreground">
            Estado
          </Label>
          <select
            id="admin-product-status"
            className={SELECT_CLASS_NAME}
            value={filters.status ?? ''}
            onChange={(event) => {
              const value = event.target.value
              setFilters((current) => ({
                ...current,
                status: value === 'published' || value === 'draft' ? value : undefined,
                page: 1,
              }))
            }}
          >
            <option value="">Todos</option>
            <option value="published">Publicados</option>
            <option value="draft">Borradores</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="admin-product-category" className="text-xs text-muted-foreground">
            Categoría
          </Label>
          <select
            id="admin-product-category"
            className={SELECT_CLASS_NAME}
            value={filters.categoryId ?? ''}
            onChange={(event) => {
              setFilters((current) => ({
                ...current,
                categoryId: event.target.value || undefined,
                page: 1,
              }))
            }}
          >
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No hay productos con esos filtros" />
      ) : (
        <>
          {/* Horizontal scroll inside the card on small screens; the page itself never scrolls sideways. */}
          <div
            className={cn('overflow-x-auto rounded-xl border bg-card', isFetching && 'opacity-70')}
          >
            <table className="w-full min-w-[720px] text-sm">
              <caption className="sr-only">Productos del catálogo</caption>
              <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Producto
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Categoría
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Desde
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Disponibles
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Actualizado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/40">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <Link
                        to={`/admin/products/${product.id}`}
                        className="font-medium hover:underline"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {product.brandName} · {product.variantCount}{' '}
                        {product.variantCount === 1 ? 'variante' : 'variantes'}
                      </p>
                    </th>
                    <td className="px-4 py-3">{product.categoryName}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {product.minPrice === null ? '—' : formatPrice(product.minPrice)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{product.availableUnits}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                          product.isPublished
                            ? 'bg-success text-success-foreground'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {product.isPublished ? 'Publicado' : 'Borrador'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(product.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={(page) => {
              setFilters((current) => ({ ...current, page }))
            }}
          />
        </>
      )}
    </div>
  )
}
