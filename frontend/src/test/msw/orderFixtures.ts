import type { CartQuote } from '@/features/cart/types'
import type { Order } from '@/features/orders/types'

export const VARIANT_ID = '0193a1c2-0000-7000-8000-0000000000a1'
export const ORDER_NUMBER = 'NX-7K3M9Q2A'

export function quoteFixture(overrides: Partial<CartQuote> = {}): CartQuote {
  return {
    lines: [
      {
        variantId: VARIANT_ID,
        productSlug: 'logitech-mx-master-3s',
        productName: 'Logitech MX Master 3S',
        variantName: 'Grafito',
        sku: 'LOG-MXM3S-GRAF',
        image: { url: '/images/products/mouse.svg', altText: 'Mouse', width: 800, height: 800 },
        unitPrice: 449,
        compareAtPrice: 499,
        quantity: 2,
        lineTotal: 898,
        isAvailable: true,
        maxQuantity: 10,
      },
    ],
    unavailableVariantIds: [],
    subtotal: 898,
    shipping: null,
    freeShippingThreshold: 500,
    total: 898,
    tax: { rate: 0.18, taxableAmount: 761.02, taxAmount: 136.98 },
    currency: 'PEN',
    canCheckout: true,
    ...overrides,
  }
}

export function orderFixture(overrides: Partial<Order> = {}): Order {
  return {
    orderNumber: ORDER_NUMBER,
    status: 'PendingPayment',
    createdAt: '2026-11-03T15:30:00Z',
    paidAt: null,
    items: [
      {
        variantId: VARIANT_ID,
        productSlug: 'logitech-mx-master-3s',
        productName: 'Logitech MX Master 3S',
        variantName: 'Grafito',
        sku: 'LOG-MXM3S-GRAF',
        unitPrice: 449,
        quantity: 2,
        lineTotal: 898,
      },
    ],
    shippingAddress: {
      recipientName: 'Ana Pérez',
      phone: '987654321',
      department: 'Arequipa',
      province: 'Arequipa',
      district: 'Yanahuara',
      addressLine: 'Calle Misti 456',
      reference: null,
    },
    shippingMethod: 'Provincias',
    shippingCost: 0,
    subtotal: 898,
    total: 898,
    taxRate: 0.18,
    taxableAmount: 761.02,
    taxAmount: 136.98,
    currency: 'PEN',
    ...overrides,
  }
}
