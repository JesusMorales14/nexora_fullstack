import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-3">
      <Button
        variant="outline"
        disabled={page <= 1}
        onClick={() => {
          onPageChange(page - 1)
        }}
      >
        <ChevronLeft aria-hidden="true" />
        Anterior
      </Button>
      <p className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </p>
      <Button
        variant="outline"
        disabled={page >= totalPages}
        onClick={() => {
          onPageChange(page + 1)
        }}
      >
        Siguiente
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  )
}
