/**
 * Простой лимит запросов по IP для публичной проверки билета (in-memory).
 */
const WINDOW_MS = 60 * 1000
const MAX_PER_WINDOW = 24

const store = new Map<string, { count: number; resetAt: number }>()

function cleanup(now: number) {
  for (const [k, v] of store.entries()) {
    if (now > v.resetAt) store.delete(k)
  }
}

export function allowPublicTicketLookup(ip: string): boolean {
  const now = Date.now()
  cleanup(now)
  const entry = store.get(ip)
  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_PER_WINDOW) return false
  entry.count++
  return true
}
