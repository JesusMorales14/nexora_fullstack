import { AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

/** Recoverable error for a section of the page (the rest of the layout keeps working). */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
    >
      <AlertCircle aria-hidden="true" className="size-6 text-destructive" />
      <p className="max-w-md text-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
