const TICKET_REGEX = /^([A-Z]{2})(\d{8})$/

export function parseTicketNumber(ticket: string): { prefix: string; num: number } | null {
  const m = ticket.toUpperCase().match(TICKET_REGEX)
  if (!m) return null
  return { prefix: m[1], num: parseInt(m[2], 10) }
}

export function isTicketInRange(
  ticket: string,
  start: string,
  end: string
): boolean {
  const t = parseTicketNumber(ticket)
  const s = parseTicketNumber(start)
  const e = parseTicketNumber(end)
  if (!t || !s || !e) return false
  if (t.prefix !== s.prefix || s.prefix !== e.prefix) return false
  return t.num >= s.num && t.num <= e.num
}

export function* numbersInRange(start: string, end: string): Generator<string> {
  const s = parseTicketNumber(start)
  const e = parseTicketNumber(end)
  if (!s || !e || s.prefix !== e.prefix || s.num > e.num) return
  for (let n = s.num; n <= e.num; n++) {
    yield `${s.prefix}${n.toString().padStart(8, '0')}`
  }
}

export function validateTicketRange(
  start: string,
  end: string
): { ok: true } | { ok: false; error: string } {
  const startUp = start.toUpperCase().trim()
  const endUp = end.toUpperCase().trim()
  if (!/^[A-Z]{2}\d{8}$/.test(startUp))
    return { ok: false, error: 'Начало диапазона: формат AA00000000 (2 буквы + 8 цифр)' }
  if (!/^[A-Z]{2}\d{8}$/.test(endUp))
    return { ok: false, error: 'Конец диапазона: формат AA00000000 (2 буквы + 8 цифр)' }
  const s = parseTicketNumber(startUp)
  const e = parseTicketNumber(endUp)
  if (!s || !e) return { ok: false, error: 'Неверный формат диапазона' }
  if (s.prefix !== e.prefix)
    return { ok: false, error: 'Начало и конец диапазона должны иметь одинаковый буквенный префикс (2 буквы)' }
  if (s.num > e.num)
    return { ok: false, error: 'Начальный номер не может быть больше конечного' }
  const count = e.num - s.num + 1
  if (count > 10000)
    return { ok: false, error: 'Диапазон не более 10000 билетов за раз' }
  return { ok: true }
}
