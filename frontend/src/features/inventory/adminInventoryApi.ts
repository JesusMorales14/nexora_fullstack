import type { PagedResponse } from '@/features/products/types'
import { baseApi } from '@/lib/api/baseApi'

export interface InventoryItem {
  variantId: string
  productId: string
  productName: string
  variantName: string
  sku: string
  onHand: number
  reserved: number
  available: number
  lowStockThreshold: number
  isLowStock: boolean
}

export const ADJUSTMENT_REASONS = [
  { value: 'Restock', label: 'Reposición' },
  { value: 'Correction', label: 'Corrección de conteo' },
  { value: 'Damage', label: 'Daño o pérdida' },
  { value: 'Return', label: 'Devolución de cliente' },
] as const

export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number]['value']

export const MOVEMENT_REASON_LABELS: Record<string, string> = {
  Restock: 'Reposición',
  Correction: 'Corrección',
  Damage: 'Daño o pérdida',
  Return: 'Devolución',
  Sale: 'Venta',
}

export interface InventoryMovement {
  id: string
  quantityChange: number
  reason: string
  note: string | null
  reference: string | null
  createdAt: string
}

export interface InventoryAdjustment {
  quantityChange: number
  reason: AdjustmentReason
  note: string
}

export interface InventoryListParams {
  page?: number
  q?: string
  lowStockOnly?: boolean
}

const PAGE_SIZE = 20

export const adminInventoryApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getInventory: build.query<PagedResponse<InventoryItem>, InventoryListParams>({
      query: (params) => ({ url: 'admin/inventory', params: { ...params, pageSize: PAGE_SIZE } }),
      providesTags: ['AdminInventory'],
    }),
    getInventoryMovements: build.query<InventoryMovement[], string>({
      query: (variantId) => `admin/inventory/${variantId}/movements`,
      providesTags: ['AdminInventory'],
    }),
    adjustInventory: build.mutation<
      InventoryItem,
      { variantId: string; body: InventoryAdjustment }
    >({
      query: ({ variantId, body }) => ({
        url: `admin/inventory/${variantId}/adjustments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        'AdminInventory',
        'AdminProduct',
        'AdminSummary',
        'AuditLog',
        { type: 'Product', id: 'LIST' },
      ],
    }),
  }),
})

export const { useGetInventoryQuery, useGetInventoryMovementsQuery, useAdjustInventoryMutation } =
  adminInventoryApi
