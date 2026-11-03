import type { SerializedError } from '@reduxjs/toolkit'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'

/** Subset of RFC 9457 Problem Details returned by the Nexora API. */
export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  traceId?: string
  errors?: Record<string, string[]>
}

export type ApiError = FetchBaseQueryError | SerializedError | undefined

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'La solicitud no es válida. Revisa los datos e inténtalo de nuevo.',
  401: 'Tu sesión expiró. Inicia sesión para continuar.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No encontramos lo que buscas.',
  409: 'El recurso cambió mientras lo editabas. Recarga e inténtalo de nuevo.',
  429: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.',
}

const GENERIC_SERVER_ERROR =
  'Tuvimos un problema en el servidor. Inténtalo de nuevo en unos minutos.'

function isFetchBaseQueryError(error: ApiError): error is FetchBaseQueryError {
  return typeof error === 'object' && 'status' in error
}

export function getHttpStatus(error: ApiError): number | undefined {
  return isFetchBaseQueryError(error) && typeof error.status === 'number' ? error.status : undefined
}

/** Maps any RTK Query error to a user-facing Spanish message. Never exposes server internals. */
export function getErrorMessage(error: ApiError): string {
  if (!isFetchBaseQueryError(error)) {
    return 'Ocurrió un error inesperado.'
  }

  switch (error.status) {
    case 'FETCH_ERROR':
      return 'No pudimos conectar con el servidor. Revisa tu conexión a internet.'
    case 'TIMEOUT_ERROR':
      return 'El servidor tardó demasiado en responder. Inténtalo de nuevo.'
    case 'PARSING_ERROR':
    case 'CUSTOM_ERROR':
      return GENERIC_SERVER_ERROR
    default:
      return HTTP_STATUS_MESSAGES[error.status] ?? GENERIC_SERVER_ERROR
  }
}
