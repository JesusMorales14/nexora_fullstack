import { zodResolver } from '@hookform/resolvers/zod'
import { Lock } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'

import { useAppSelector } from '@/app/store/hooks'
import { EmptyState } from '@/components/shared/EmptyState'
import { FormAlert } from '@/components/shared/FormAlert'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { useQuoteCartQuery } from '@/features/cart/api/cartApi'
import { selectCartItems } from '@/features/cart/cartSlice'
import { CartSummary } from '@/features/cart/components/CartSummary'
import { PERU_DEPARTMENTS } from '@/features/checkout/peruDepartments'
import { type ShippingAddressFormValues, shippingAddressSchema } from '@/features/checkout/schemas'
import { usePlaceOrderMutation } from '@/features/orders/api/ordersApi'
import { type ApiError, getHttpStatus, type ProblemDetails } from '@/lib/api/apiErrors'
import { applyServerErrors } from '@/lib/api/formErrors'
import { formatPrice } from '@/lib/utils/formatPrice'

const HTTP_CONFLICT = 409

const SERVER_FIELD_MAP = {
  'shippingAddress.recipientName': 'recipientName',
  'shippingAddress.phone': 'phone',
  'shippingAddress.department': 'department',
  'shippingAddress.province': 'province',
  'shippingAddress.district': 'district',
  'shippingAddress.addressLine': 'addressLine',
  'shippingAddress.reference': 'reference',
} as const

function getConflictDetail(error: ApiError): string | undefined {
  if (error && 'data' in error && typeof error.data === 'object' && error.data !== null) {
    return (error.data as ProblemDetails).detail
  }
  return undefined
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const items = useAppSelector(selectCartItems)
  const [placeOrder, { isLoading: isPlacing }] = usePlaceOrderMutation()
  const [formError, setFormError] = useState<string | null>(null)
  // Reused while the outcome of a submit is unknown (network error, timeout), so retrying can
  // never create a second order. Replaced only after the server gave a definitive answer.
  const pendingIdempotencyKey = useRef<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<ShippingAddressFormValues>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: {
      recipientName: user?.fullName ?? '',
      phone: '',
      province: '',
      district: '',
      addressLine: '',
      reference: '',
    },
  })

  const department = useWatch({ control, name: 'department' })
  const {
    data: quote,
    isFetching: isQuoting,
    refetch: refetchQuote,
  } = useQuoteCartQuery({ items, department }, { skip: items.length === 0 })

  async function handleValidSubmit(address: ShippingAddressFormValues) {
    setFormError(null)
    const idempotencyKey = pendingIdempotencyKey.current ?? crypto.randomUUID()
    pendingIdempotencyKey.current = idempotencyKey

    try {
      const { paymentUrl } = await placeOrder({
        idempotencyKey,
        request: {
          items,
          shippingAddress: { ...address, reference: address.reference || undefined },
        },
      }).unwrap()
      pendingIdempotencyKey.current = null

      if (/^https?:\/\//.test(paymentUrl)) window.location.assign(paymentUrl)
      else void navigate(paymentUrl)
    } catch (error: unknown) {
      const apiError = error as ApiError
      // An HTTP status means the server answered: the next attempt is a new checkout.
      if (getHttpStatus(apiError) !== undefined) pendingIdempotencyKey.current = null

      if (getHttpStatus(apiError) === HTTP_CONFLICT) {
        setFormError(getConflictDetail(apiError) ?? 'Revisa tu carrito antes de continuar.')
        void refetchQuote()
        return
      }

      setFormError(applyServerErrors(apiError, setError, SERVER_FIELD_MAP))
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <title>Checkout | Nexora</title>
        <EmptyState
          title="No hay productos para comprar"
          description="Tu carrito está vacío."
          action={
            <Button asChild>
              <Link to="/products">Ver catálogo</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <title>Checkout | Nexora</title>
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Datos de envío</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <form
          id="checkout-form"
          noValidate
          onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}
          className="flex flex-col gap-4"
        >
          {formError && (
            <div className="flex flex-col items-start gap-2">
              <FormAlert message={formError} />
              <Link to="/cart" className="text-sm font-medium text-primary hover:underline">
                Revisar carrito
              </Link>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Nombre de quien recibe"
              autoComplete="name"
              error={errors.recipientName?.message}
              {...register('recipientName')}
            />
            <FormField
              label="Celular"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              hint="9 dígitos, por ejemplo 987654321."
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkout-department">Departamento</Label>
              <select
                id="checkout-department"
                autoComplete="address-level1"
                aria-invalid={errors.department ? true : undefined}
                aria-describedby={errors.department ? 'checkout-department-error' : undefined}
                defaultValue=""
                className="h-10 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
                {...register('department')}
              >
                <option value="" disabled>
                  Selecciona…
                </option>
                {PERU_DEPARTMENTS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {errors.department && (
                <p id="checkout-department-error" className="text-sm text-destructive">
                  {errors.department.message}
                </p>
              )}
            </div>
            <FormField
              label="Provincia"
              autoComplete="address-level2"
              error={errors.province?.message}
              {...register('province')}
            />
            <FormField
              label="Distrito"
              autoComplete="address-level3"
              error={errors.district?.message}
              {...register('district')}
            />
          </div>

          <FormField
            label="Dirección"
            autoComplete="address-line1"
            placeholder="Av., calle, número, dpto."
            error={errors.addressLine?.message}
            {...register('addressLine')}
          />
          <FormField
            label="Referencia (opcional)"
            placeholder="Frente al parque, portón negro…"
            error={errors.reference?.message}
            {...register('reference')}
          />
        </form>

        <div className="lg:sticky lg:top-24 lg:self-start">
          {quote && (
            <CartSummary quote={quote}>
              <ul className="flex flex-col gap-1 border-t pt-3 text-sm">
                {quote.lines.map((line) => (
                  <li key={line.variantId} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {line.quantity} × {line.productName}
                    </span>
                    <span className="shrink-0">{formatPrice(line.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <Button
                type="submit"
                form="checkout-form"
                size="lg"
                className="h-11"
                disabled={isPlacing || isQuoting || !quote.canCheckout}
              >
                <Lock aria-hidden="true" />
                {isPlacing ? 'Creando pedido…' : 'Ir a pagar'}
              </Button>
              {!quote.canCheckout && (
                <p className="text-sm text-destructive">
                  Hay productos sin stock suficiente.{' '}
                  <Link to="/cart" className="font-medium underline">
                    Revisa tu carrito
                  </Link>
                  .
                </p>
              )}
            </CartSummary>
          )}
        </div>
      </div>
    </div>
  )
}
