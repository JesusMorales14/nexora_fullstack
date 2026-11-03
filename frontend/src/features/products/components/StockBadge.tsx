import { cn } from '@/lib/utils/cn'

interface StockBadgeProps {
  isInStock: boolean
  isLowStock?: boolean
}

/** Availability is communicated with text, not only with color (WCAG 1.4.1). */
export function StockBadge({ isInStock, isLowStock = false }: StockBadgeProps) {
  const { label, className } = !isInStock
    ? { label: 'Agotado', className: 'bg-muted text-muted-foreground' }
    : isLowStock
      ? { label: 'Últimas unidades', className: 'bg-warning text-warning-foreground' }
      : { label: 'Disponible', className: 'bg-success text-success-foreground' }

  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', className)}>
      {label}
    </span>
  )
}
