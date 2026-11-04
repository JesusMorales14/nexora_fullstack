import { Download } from 'lucide-react'
import { useState } from 'react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { API_BASE_URL } from '@/lib/api/baseApi'

const DEFAULT_RANGE_DAYS = 30
const MAX_RANGE_DAYS = 366
const DAY_MS = 86_400_000

/** yyyy-mm-dd in Peru's time zone (what the API interprets the dates as). */
function limaDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(date)
}

function buildOrdersReportUrl(from: string, to: string): string {
  return `${API_BASE_URL}/admin/reports/orders.csv?${new URLSearchParams({ from, to }).toString()}`
}

export function ReportsPage() {
  const today = new Date()
  const [from, setFrom] = useState(
    limaDate(new Date(today.getTime() - DEFAULT_RANGE_DAYS * DAY_MS)),
  )
  const [to, setTo] = useState(limaDate(today))

  const rangeDays = (Date.parse(to) - Date.parse(from)) / DAY_MS
  const rangeError =
    Number.isNaN(rangeDays) || rangeDays < 0
      ? 'La fecha inicial debe ser anterior a la final.'
      : rangeDays > MAX_RANGE_DAYS
        ? 'El rango máximo es de un año.'
        : null

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <title>Reportes | Nexora Admin</title>
      <PageHeader
        title="Reportes"
        description="Exporta pedidos a CSV (Excel, Google Sheets) con totales, IGV y estado."
      />

      <section
        aria-labelledby="orders-report-heading"
        className="flex flex-col gap-4 rounded-xl border bg-card p-5"
      >
        <h2 id="orders-report-heading" className="font-semibold">
          Pedidos por fecha (hora de Lima)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-from">Desde</Label>
            <Input
              id="report-from"
              type="date"
              value={from}
              max={to}
              onChange={(event) => {
                setFrom(event.target.value)
              }}
              aria-describedby={rangeError ? 'report-range-error' : undefined}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-to">Hasta (inclusive)</Label>
            <Input
              id="report-to"
              type="date"
              value={to}
              min={from}
              onChange={(event) => {
                setTo(event.target.value)
              }}
              aria-describedby={rangeError ? 'report-range-error' : undefined}
            />
          </div>
        </div>
        {rangeError && (
          <p id="report-range-error" role="alert" className="text-sm text-destructive">
            {rangeError}
          </p>
        )}
        {rangeError ? (
          <Button disabled className="self-start">
            <Download aria-hidden="true" />
            Descargar CSV
          </Button>
        ) : (
          // A plain link: the browser downloads the file with the session cookie, no JS involved.
          <Button asChild className="self-start">
            <a href={buildOrdersReportUrl(from, to)} download>
              <Download aria-hidden="true" />
              Descargar CSV
            </a>
          </Button>
        )}
      </section>
    </div>
  )
}
