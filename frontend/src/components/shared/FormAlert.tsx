import { AlertCircle, CheckCircle2 } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

interface FormAlertProps {
  message: string
  variant?: 'error' | 'success'
}

/** Form-level feedback, announced by screen readers as soon as it appears. */
export function FormAlert({ message, variant = 'error' }: FormAlertProps) {
  const Icon = variant === 'error' ? AlertCircle : CheckCircle2

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm',
        variant === 'error'
          ? 'border-destructive/30 bg-destructive/5 text-destructive'
          : 'border-success-foreground/20 bg-success text-success-foreground',
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  )
}
