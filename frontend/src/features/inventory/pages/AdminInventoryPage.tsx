import { zodResolver } from '@hookform/resolvers/zod'
import { History, Search, SlidersHorizontal } from 'lucide-react'
import { type SubmitEvent, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router'
import { z } from '@/lib/validation/z'

import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { FormAlert } from '@/components/shared/FormAlert'
import { FormField } from '@/components/shared/FormField'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/PageLoader'
import { Pagination } from '@/components/shared/Pagination'
import { SelectField } from '@/components/shared/SelectField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ADJUSTMENT_REASONS,
  type InventoryItem,
  MOVEMENT_REASON_LABELS,
  useAdjustInventoryMutation,
  useGetInventoryMovementsQuery,
  useGetInventoryQuery,
} from '@/features/inventory/adminInventoryApi'
import { type ApiError, getErrorMessage } from '@/lib/api/apiErrors'
import { applyServerErrors } from '@/lib/api/formErrors'
import { cn } from '@/lib/utils/cn'
import { formatDateTime } from '@/lib/utils/formatDate'
import { getFormText } from '@/lib/utils/formData'

const adjustmentSchema = z
  .object({
    quantityChange: z
      .number({ error: 'Ingresa una cantidad.' })
      .int('Usa números enteros.')
      .refine((value) => value !== 0, { error: 'La cantidad no puede ser 0.' }),
    reason: z.enum(['Restock', 'Correction', 'Damage', 'Return']),
    note: z.string().trim().max(300),
  })
  .refine((value) => !['Correction', 'Damage'].includes(value.reason) || value.note.length > 0, {
    path: ['note'],
    error: 'Explica el motivo de la corrección.',
  })

type AdjustmentValues = z.infer<typeof adjustmentSchema>
type DialogState = { kind: 'adjust' | 'history'; item: InventoryItem } | null

export function AdminInventoryPage() {
  // The dashboard links here with ?lowStock=true.
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState<string | undefined>()
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('lowStock') === 'true')
  const [dialog, setDialog] = useState<DialogState>(null)
  const { data, error, isLoading, isFetching, isError, refetch } = useGetInventoryQuery({
    page,
    q,
    lowStockOnly: lowStockOnly || undefined,
  })

  function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setQ(getFormText(new FormData(event.currentTarget), 'q') || undefined)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      <title>Inventario | Nexora Admin</title>
      <PageHeader
        title="Inventario"
        description="Disponible = en almacén − reservado por pedidos pendientes de pago."
      />

      <div className="flex flex-wrap items-center gap-4">
        <form role="search" onSubmit={handleSearch} className="flex gap-2">
          <label htmlFor="inventory-search" className="sr-only">
            Buscar por producto o SKU
          </label>
          <Input
            id="inventory-search"
            name="q"
            type="search"
            placeholder="Producto o SKU…"
            className="h-9 w-56"
          />
          <Button type="submit" variant="outline" size="icon-lg" aria-label="Buscar">
            <Search aria-hidden="true" />
          </Button>
        </form>
        <div className="flex items-center gap-2">
          <input
            id="low-stock-only"
            type="checkbox"
            className="size-4 accent-primary"
            checked={lowStockOnly}
            onChange={(event) => {
              setLowStockOnly(event.target.checked)
              setPage(1)
            }}
          />
          <Label htmlFor="low-stock-only">Solo stock bajo</Label>
        </div>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title={lowStockOnly ? 'No hay variantes con stock bajo' : 'No hay resultados'}
        />
      ) : (
        <>
          <div
            className={cn('overflow-x-auto rounded-xl border bg-card', isFetching && 'opacity-70')}
          >
            <table className="w-full min-w-[760px] text-sm">
              <caption className="sr-only">Stock por variante, primero lo más urgente</caption>
              <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Producto
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    SKU
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    En almacén
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Reservado
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Disponible
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((item) => (
                  <tr key={item.variantId}>
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <span className="font-medium">{item.productName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {item.variantName}
                      </span>
                    </th>
                    <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.onHand}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.reserved}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className="font-semibold">{item.available}</span>
                      {item.isLowStock && (
                        <span className="ml-2 inline-flex rounded-full bg-warning px-2 py-0.5 text-xs font-medium text-warning-foreground">
                          {item.available <= 0 ? 'Agotado' : 'Stock bajo'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Ajustar stock de ${item.sku}`}
                        onClick={() => {
                          setDialog({ kind: 'adjust', item })
                        }}
                      >
                        <SlidersHorizontal aria-hidden="true" />
                        Ajustar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Ver movimientos de ${item.sku}`}
                        onClick={() => {
                          setDialog({ kind: 'history', item })
                        }}
                      >
                        <History aria-hidden="true" />
                        Movimientos
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}

      <Dialog
        open={dialog !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDialog(null)
        }}
      >
        <DialogContent>
          {dialog?.kind === 'adjust' && (
            <AdjustStockForm
              item={dialog.item}
              onDone={() => {
                setDialog(null)
              }}
            />
          )}
          {dialog?.kind === 'history' && <MovementsList item={dialog.item} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AdjustStockForm({ item, onDone }: { item: InventoryItem; onDone: () => void }) {
  const [adjust, { isLoading }] = useAdjustInventoryMutation()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AdjustmentValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { reason: 'Restock', note: '' },
  })

  async function handleValidSubmit(values: AdjustmentValues) {
    setFormError(null)
    try {
      await adjust({ variantId: item.variantId, body: values }).unwrap()
      onDone()
    } catch (error: unknown) {
      setFormError(
        applyServerErrors(error as ApiError, setError, {
          quantityChange: 'quantityChange',
          reason: 'reason',
          note: 'note',
        }),
      )
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Ajustar stock de {item.sku}</DialogTitle>
        <DialogDescription>
          En almacén: {item.onHand} · Reservado: {item.reserved}. Usa números negativos para
          descontar unidades.
        </DialogDescription>
      </DialogHeader>
      {formError && <FormAlert message={formError} />}
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}
        className="flex flex-col gap-3"
      >
        <FormField
          label="Cantidad (+ entra, − sale)"
          type="number"
          inputMode="numeric"
          error={errors.quantityChange?.message}
          {...register('quantityChange', { valueAsNumber: true })}
        />
        <SelectField label="Motivo" error={errors.reason?.message} {...register('reason')}>
          {ADJUSTMENT_REASONS.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label}
            </option>
          ))}
        </SelectField>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="adjustment-note">Nota</Label>
          <Textarea
            id="adjustment-note"
            rows={2}
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={errors.note ? 'adjustment-note-error' : undefined}
            {...register('note')}
          />
          {errors.note && (
            <p id="adjustment-note-error" className="text-sm text-destructive">
              {errors.note.message}
            </p>
          )}
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando…' : 'Registrar ajuste'}
        </Button>
      </form>
    </>
  )
}

function MovementsList({ item }: { item: InventoryItem }) {
  const {
    data: movements,
    isLoading,
    isError,
    error,
  } = useGetInventoryMovementsQuery(item.variantId)

  return (
    <>
      <DialogHeader>
        <DialogTitle>Movimientos de {item.sku}</DialogTitle>
        <DialogDescription>Últimos 100 cambios de stock en almacén.</DialogDescription>
      </DialogHeader>
      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <FormAlert message={getErrorMessage(error)} />
      ) : !movements || movements.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>
      ) : (
        <ul className="flex max-h-80 flex-col divide-y overflow-y-auto text-sm">
          {movements.map((movement) => (
            <li key={movement.id} className="flex items-start justify-between gap-3 py-2">
              <div>
                <p className="font-medium">
                  {MOVEMENT_REASON_LABELS[movement.reason] ?? movement.reason}
                  {movement.reference && ` · ${movement.reference}`}
                </p>
                {movement.note && <p className="text-muted-foreground">{movement.note}</p>}
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(movement.createdAt)}
                </p>
              </div>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  movement.quantityChange > 0 ? 'text-success-foreground' : 'text-destructive',
                )}
              >
                {movement.quantityChange > 0 ? '+' : '−'}
                {Math.abs(movement.quantityChange)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
