const dateTimeFormatter = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Lima',
})

/** Formats an ISO date from the API in Peru's time zone, e.g. "3 nov 2026, 10:30 a. m.". */
export function formatDateTime(isoDate: string): string {
  return dateTimeFormatter.format(new Date(isoDate))
}
