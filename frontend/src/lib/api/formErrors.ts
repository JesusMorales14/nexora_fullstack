import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

import { type ApiError, getErrorMessage, type ProblemDetails } from '@/lib/api/apiErrors'

function getProblemDetails(error: ApiError): ProblemDetails | undefined {
  if (
    typeof error === 'object' &&
    'data' in error &&
    typeof error.data === 'object' &&
    error.data !== null
  ) {
    return error.data
  }
  return undefined
}

/**
 * Shows server-side validation errors next to their fields (the server is the final authority).
 * `fieldMap` translates API field names to form field names when they differ.
 * Returns the message to show at form level, if any error could not be attached to a field.
 */
export function applyServerErrors<TFields extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<TFields>,
  fieldMap: Partial<Record<string, Path<TFields>>>,
): string | null {
  const problem = getProblemDetails(error)
  const unmatchedMessages: string[] = []

  for (const [apiField, messages] of Object.entries(problem?.errors ?? {})) {
    const formField = fieldMap[apiField]
    const message = messages[0]
    if (!message) continue

    if (formField) setError(formField, { type: 'server', message }, { shouldFocus: true })
    else unmatchedMessages.push(message)
  }

  if (unmatchedMessages.length > 0) return unmatchedMessages.join(' ')
  if (problem?.errors && Object.keys(problem.errors).length > 0) return null
  return problem?.detail ?? getErrorMessage(error)
}
