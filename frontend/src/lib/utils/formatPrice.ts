const priceFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
})

/** Formats an amount in soles for display, e.g. 1299 → "S/ 1,299.00". Prices are IGV-included. */
export function formatPrice(amount: number): string {
  return priceFormatter.format(amount)
}
