import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { FormAlert } from '@/components/shared/FormAlert'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useAddVariantMutation,
  useUpdateVariantMutation,
} from '@/features/products/admin/adminProductsApi'
import {
  editVariantSchema,
  toCompareAtPrice,
  type VariantValues,
  variantSchema,
} from '@/features/products/admin/schemas'
import type { AdminProductDetails, AdminVariant } from '@/features/products/admin/types'
import type { ApiError } from '@/lib/api/apiErrors'
import { applyServerErrors } from '@/lib/api/formErrors'
import { formatPrice } from '@/lib/utils/formatPrice'

/** API field → form field for the edit form (the SKU cannot be changed after creation). */
const EDIT_FIELD_MAP = {
  name: 'name',
  price: 'price',
  compareAtPrice: 'compareAtPrice',
  lowStockThreshold: 'lowStockThreshold',
} as const

const SERVER_FIELD_MAP = { ...EDIT_FIELD_MAP, sku: 'sku' } as const

/** `null` = closed, `'new'` = add variant, otherwise the variant being edited. */
type DialogTarget = AdminVariant | 'new' | null

export function VariantsSection({ product }: { product: AdminProductDetails }) {
  const [target, setTarget] = useState<DialogTarget>(null)

  return (
    <section
      className="flex flex-col gap-4 rounded-xl border bg-card p-5"
      aria-labelledby="variants-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="variants-heading" className="font-semibold">
          Variantes
        </h2>
        <Button
          variant="outline"
          onClick={() => {
            setTarget('new')
          }}
        >
          <Plus aria-hidden="true" />
          Agregar variante
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <caption className="sr-only">Variantes de {product.name}</caption>
          <thead className="border-b text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">
                SKU
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Variante
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                Precio
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                Stock
              </th>
              <th scope="col" className="py-2 font-medium">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {product.variants.map((variant) => (
              <tr key={variant.id}>
                <td className="py-2 pr-4 font-mono text-xs">{variant.sku}</td>
                <th scope="row" className="py-2 pr-4 text-left font-normal">
                  {variant.name}
                </th>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {formatPrice(variant.price)}
                  {variant.compareAtPrice !== null && (
                    <span className="block text-xs text-muted-foreground line-through">
                      <span className="sr-only">Precio anterior: </span>
                      {formatPrice(variant.compareAtPrice)}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {variant.available}
                  <span className="block text-xs text-muted-foreground">
                    {variant.onHand} en almacén · {variant.reserved} reservadas
                  </span>
                </td>
                <td className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Editar la variante ${variant.sku}`}
                    onClick={() => {
                      setTarget(variant)
                    }}
                  >
                    <Pencil aria-hidden="true" />
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        El stock se ajusta desde Inventario, para que cada cambio quede registrado con su motivo.
      </p>

      <Dialog
        open={target !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setTarget(null)
        }}
      >
        <DialogContent>
          {target === 'new' ? (
            <AddVariantForm
              productId={product.id}
              onDone={() => {
                setTarget(null)
              }}
            />
          ) : (
            target && (
              <EditVariantForm
                productId={product.id}
                variant={target}
                onDone={() => {
                  setTarget(null)
                }}
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}

interface VariantFormProps {
  productId: string
  onDone: () => void
}

function AddVariantForm({ productId, onDone }: VariantFormProps) {
  const [addVariant, { isLoading }] = useAddVariantMutation()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<VariantValues>({
    resolver: zodResolver(variantSchema),
    defaultValues: { sku: '', name: '', compareAtPrice: '', initialStock: 0, lowStockThreshold: 5 },
  })

  async function handleValidSubmit(values: VariantValues) {
    setFormError(null)
    try {
      await addVariant({
        productId,
        body: { ...values, compareAtPrice: toCompareAtPrice(values.compareAtPrice) },
      }).unwrap()
      onDone()
    } catch (error: unknown) {
      setFormError(applyServerErrors(error as ApiError, setError, SERVER_FIELD_MAP))
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Agregar variante</DialogTitle>
        <DialogDescription>Precio en soles con IGV incluido.</DialogDescription>
      </DialogHeader>
      {formError && <FormAlert message={formError} />}
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}
        className="grid gap-3 sm:grid-cols-2"
      >
        <FormField label="SKU" error={errors.sku?.message} {...register('sku')} />
        <FormField label="Nombre" error={errors.name?.message} {...register('name')} />
        <FormField
          label="Precio"
          type="number"
          step="0.01"
          inputMode="decimal"
          error={errors.price?.message}
          {...register('price', { valueAsNumber: true })}
        />
        <FormField
          label="Precio anterior (opcional)"
          type="number"
          step="0.01"
          inputMode="decimal"
          error={errors.compareAtPrice?.message}
          {...register('compareAtPrice')}
        />
        <FormField
          label="Stock inicial"
          type="number"
          inputMode="numeric"
          error={errors.initialStock?.message}
          {...register('initialStock', { valueAsNumber: true })}
        />
        <FormField
          label="Alerta de stock bajo"
          type="number"
          inputMode="numeric"
          error={errors.lowStockThreshold?.message}
          {...register('lowStockThreshold', { valueAsNumber: true })}
        />
        <Button type="submit" className="sm:col-span-2" disabled={isLoading}>
          {isLoading ? 'Guardando…' : 'Agregar variante'}
        </Button>
      </form>
    </>
  )
}

function EditVariantForm({
  productId,
  variant,
  onDone,
}: VariantFormProps & { variant: AdminVariant }) {
  const [updateVariant, { isLoading }] = useUpdateVariantMutation()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(editVariantSchema),
    defaultValues: {
      name: variant.name,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice === null ? '' : String(variant.compareAtPrice),
      lowStockThreshold: variant.lowStockThreshold,
    },
  })

  async function handleValidSubmit(values: {
    name: string
    price: number
    compareAtPrice: string
    lowStockThreshold: number
  }) {
    setFormError(null)
    try {
      await updateVariant({
        productId,
        variantId: variant.id,
        body: { ...values, compareAtPrice: toCompareAtPrice(values.compareAtPrice) },
      }).unwrap()
      onDone()
    } catch (error: unknown) {
      setFormError(applyServerErrors(error as ApiError, setError, EDIT_FIELD_MAP))
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar variante {variant.sku}</DialogTitle>
        <DialogDescription>El cambio de precio queda registrado en la auditoría.</DialogDescription>
      </DialogHeader>
      {formError && <FormAlert message={formError} />}
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}
        className="grid gap-3 sm:grid-cols-2"
      >
        <FormField label="Nombre" error={errors.name?.message} {...register('name')} />
        <FormField
          label="Precio"
          type="number"
          step="0.01"
          inputMode="decimal"
          error={errors.price?.message}
          {...register('price', { valueAsNumber: true })}
        />
        <FormField
          label="Precio anterior (opcional)"
          type="number"
          step="0.01"
          inputMode="decimal"
          error={errors.compareAtPrice?.message}
          {...register('compareAtPrice')}
        />
        <FormField
          label="Alerta de stock bajo"
          type="number"
          inputMode="numeric"
          error={errors.lowStockThreshold?.message}
          {...register('lowStockThreshold', { valueAsNumber: true })}
        />
        <Button type="submit" className="sm:col-span-2" disabled={isLoading}>
          {isLoading ? 'Guardando…' : 'Guardar variante'}
        </Button>
      </form>
    </>
  )
}
