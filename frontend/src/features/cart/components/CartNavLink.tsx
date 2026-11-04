import { ShoppingCart } from 'lucide-react'
import { NavLink } from 'react-router'

import { useAppSelector } from '@/app/store/hooks'
import { selectCartCount } from '@/features/cart/cartSlice'
import { cn } from '@/lib/utils/cn'

interface CartNavLinkProps {
  className: (state: { isActive: boolean }) => string
}

export function CartNavLink({ className }: CartNavLinkProps) {
  const count = useAppSelector(selectCartCount)
  const label =
    count === 0
      ? 'Carrito de compras, vacío'
      : `Carrito de compras, ${String(count)} ${count === 1 ? 'producto' : 'productos'}`

  return (
    <NavLink to="/cart" aria-label={label} className={(state) => cn(className(state), 'relative')}>
      <ShoppingCart aria-hidden="true" className="size-5" />
      {count > 0 && (
        <span
          aria-hidden="true"
          // Re-keyed on change so the small "pop" plays each time an item is added.
          key={count}
          className="absolute -top-0.5 -right-0.5 flex min-w-5 animate-in items-center justify-center rounded-full bg-primary px-1 text-[0.7rem] font-semibold text-primary-foreground zoom-in-75"
        >
          {count}
        </span>
      )}
    </NavLink>
  )
}
