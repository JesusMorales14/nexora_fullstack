import { ShoppingCart } from 'lucide-react'
import { type SubmitEvent, useState } from 'react'
import { Link } from 'react-router'

import { useAppDispatch } from '@/app/store/hooks'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { itemAdded, MAX_QUANTITY_PER_ITEM } from '@/features/cart/cartSlice'

interface AddToCartFormProps {
  variantId: string
  productName: string
  isInStock: boolean
}

const QUANTITY_OPTIONS = Array.from({ length: MAX_QUANTITY_PER_ITEM }, (_, index) => index + 1)

/** Use `key={variantId}` so the quantity and the confirmation reset when the variant changes. */
export function AddToCartForm({ variantId, productName, isInStock }: AddToCartFormProps) {
  const dispatch = useAppDispatch()
  const [quantity, setQuantity] = useState(1)
  const [confirmation, setConfirmation] = useState<string | null>(null)

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    dispatch(itemAdded({ variantId, quantity }))
    setConfirmation(`Añadiste ${String(quantity)} × ${productName} al carrito.`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-to-cart-quantity">Cantidad</Label>
          <select
            id="add-to-cart-quantity"
            value={quantity}
            disabled={!isInStock}
            onChange={(event) => {
              setQuantity(Number(event.target.value))
            }}
            className="h-11 w-20 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {QUANTITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="lg" className="h-11 flex-1 sm:flex-none" disabled={!isInStock}>
          <ShoppingCart aria-hidden="true" />
          {isInStock ? 'Añadir al carrito' : 'Agotado'}
        </Button>
      </div>

      {/* Always rendered so screen readers announce the confirmation when its text changes. */}
      <p role="status" className="min-h-5 text-sm">
        {confirmation && (
          <span className="inline-flex animate-in flex-wrap gap-x-2 fade-in slide-in-from-bottom-1">
            {confirmation}
            <Link to="/cart" className="font-medium text-primary hover:underline">
              Ver carrito
            </Link>
          </span>
        )}
      </p>
    </form>
  )
}
