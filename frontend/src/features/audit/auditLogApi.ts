import type { PagedResponse } from '@/features/products/types'
import { baseApi } from '@/lib/api/baseApi'

export interface AuditLogEntry {
  id: string
  actorEmail: string
  action: string
  entityType: string
  entityId: string
  summary: string
  createdAt: string
}

const PAGE_SIZE = 25

export const auditLogApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAuditLog: build.query<PagedResponse<AuditLogEntry>, number>({
      query: (page) => ({ url: 'admin/audit-log', params: { page, pageSize: PAGE_SIZE } }),
      providesTags: ['AuditLog'],
    }),
  }),
})

export const { useGetAuditLogQuery } = auditLogApi
