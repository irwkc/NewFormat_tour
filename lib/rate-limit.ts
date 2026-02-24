/**
 * In-memory rate limit для попыток входа по IP.
 * После FAIL_THRESHOLD неудачных попыток в течение окна требуется капча.
 */

const WINDOW_MS = 60 * 1000 // 1 минута
const FAIL_THRESHOLD = 3

const store = new Map<string, { count: number; firstAt: number }>()

function cleanup() {
  const now = Date.now()
  for (const [key, data] of store.entries()) {
    if (now - data.firstAt > WINDOW_MS) store.delete(key)
  }
}

export function recordFail(ip: string): void {
  cleanup()
  const entry = store.get(ip)
  if (!entry) {
    store.set(ip, { count: 1, firstAt: Date.now() })
    return
  }
  if (Date.now() - entry.firstAt > WINDOW_MS) {
    store.set(ip, { count: 1, firstAt: Date.now() })
    return
  }
  entry.count++
}

export function recordSuccess(ip: string): void {
  store.delete(ip)
}

export function requiresCaptcha(ip: string): boolean {
  cleanup()
  const entry = store.get(ip)
  if (!entry) return false
  if (Date.now() - entry.firstAt > WINDOW_MS) return false
  return entry.count >= FAIL_THRESHOLD
}
