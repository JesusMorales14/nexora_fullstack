// Mirrors Nexora.Application.Orders.OrderContracts.

export type OrderStatus =
  'PendingPayment' | 'Paid' | 'PaymentFailed' | 'Cancelled' | 'Shipped' | 'Delivered'

export interface OrderItem {
  variantId: string
  productSlug: string
  productName: string
  variantName: string
  sku: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface OrderAddress {
  recipientName: string
  phone: string
  department: string
  province: string
  district: string
  addressLine: string
  reference: string | null
}

export interface Order {
  orderNumber: string
  status: OrderStatus
  createdAt: string
  paidAt: string | null
  items: OrderItem[]
  shippingAddress: OrderAddress
  shippingMethod: string
  shippingCost: number
  subtotal: number
  total: number
  taxRate: number
  taxableAmount: number
  taxAmount: number
  currency: 'PEN'
}

export interface OrderSummary {
  orderNumber: string
  status: OrderStatus
  createdAt: string
  itemCount: number
  total: number
  currency: 'PEN'
}

export interface CheckoutRequest {
  items: { variantId: string; quantity: number }[]
  shippingAddress: Omit<OrderAddress, 'reference'> & { reference?: string }
}

export interface CheckoutResponse {
  order: Order
  /** Site-relative for the simulated gateway, absolute for a hosted provider checkout. */
  paymentUrl: string
}
