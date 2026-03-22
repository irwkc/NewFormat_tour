/**
 * Утилиты для работы с московским временем (Europe/Moscow).
 * Все даты/время при отображении и проверках ориентируются на Москву.
 */

const MOSCOW_TZ = 'Europe/Moscow'

/** Текущая дата в Москве в формате YYYY-MM-DD */
export function getMoscowDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: MOSCOW_TZ })
}

/** Понедельник текущей недели по Москве (Date, начало дня) */
export function getMoscowWeekStart(): Date {
  const today = getMoscowDateString()
  const [y, m, d] = today.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const day = date.getDay()
  const diff = date.getDate() - (day === 0 ? 6 : day - 1)
  return new Date(date.getFullYear(), date.getMonth(), diff)
}

/** Даты текущей недели (Пн–Вс) по Москве */
export function getMoscowWeekDates(): Date[] {
  const start = getMoscowWeekStart()
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    dates.push(d)
  }
  return dates
}

/** YYYY-MM-DD для даты (по локальному времени сервера — для дат из getMoscowWeekDates) */
export function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Проверить, что дата входит в текущую неделю по Москве */
export function isInCurrentMoscowWeek(dateStr: string): boolean {
  const weekDates = getMoscowWeekDates()
  const weekStr = weekDates.map(toDateString)
  return weekStr.includes(dateStr)
}

/** Проверить, начался ли рейс (departure_time должен быть создан с учётом Moscow) */
export function isFlightStarted(departureTime: Date): boolean {
  return new Date() >= departureTime
}
