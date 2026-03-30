/** Период экспорта — как в `/api/statistics/sales-metrics` и на странице «Статистика» владельца. */
export function parseExportPeriod(searchParams: URLSearchParams): { start: Date; end: Date } {
  const startRaw = searchParams.get('start_date')
  const endRaw = searchParams.get('end_date')

  const now = new Date()
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)

  const start = startRaw ? new Date(startRaw) : defaultStart
  if (startRaw) start.setHours(0, 0, 0, 0)

  const end = endRaw ? new Date(endRaw) : now
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export function formatPeriodRu(start: Date, end: Date): string {
  const f = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
  return `${f(start)} — ${f(end)}`
}

/** YYYY-MM-DD в локальной таймзоне сервера (для имён файлов). */
export function formatLocalYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
