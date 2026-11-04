import { type ComponentProps, useId } from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils/cn'

interface SelectFieldProps extends ComponentProps<'select'> {
  label: string
  error?: string
}

/** Native select with label and accessible error, matching FormField. */
export function SelectField({
  label,
  error,
  id,
  className,
  children,
  ...selectProps
}: SelectFieldProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = `${selectId}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={selectId}>{label}</Label>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'h-10 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive',
          className,
        )}
        {...selectProps}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
