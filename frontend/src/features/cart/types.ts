import type { ProductImage } from '@/features/products/types'

// Mirrors Nexora.Application.Checkout.CheckoutContracts. Amounts in soles, IGV included.

export interface CartLine {
  variantId: string
  productSlug: string
  productName: string
  variantName: string
  sku: string
  image: ProductImage | null
  unitPrice: number
  compareAtPrice: number | null
  quantity: number
  lineTotal: number
  isAvailable: boolean
  maxQuantity: number
}

export interface ShippingQuote {
  code: string
  label: string
  cost: number
  estimatedDelivery: string
}

export interface TaxSummary {
  rate: number
  taxableAmount: number
  taxAmount: number
}

export interface CartQuote {
  lines: CartLine[]
  unavailableVariantIds: string[]
  subtotal: number
  shipping: ShippingQuote | null
  freeShippingThreshold: number
  total: number
  tax: TaxSummary
  currency: 'PEN'
  canCheckout: boolean
}

export interface CartQuoteRequest {
  items: { variantId: string; quantity: number }[]
  department?: string
}
