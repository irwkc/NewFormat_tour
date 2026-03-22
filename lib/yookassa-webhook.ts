/**
 * YooKassa webhook security: IP whitelist verification
 * https://yookassa.ru/developers/using-api/webhooks
 */
const YOOKASSA_IP_EXACT = ['77.75.156.35', '77.75.156.11']
const YOOKASSA_IP_PREFIXES = [
  '77.75.154.',   // 77.75.154.128/25 → .128-.255
  '77.75.153.',   // 77.75.153.0/25 → .0-.127
  '185.71.77.',   // 185.71.77.0/27 → .0-.31
  '185.71.76.',   // 185.71.76.0/27 → .0-.31
  '2a02:5180:',   // IPv6 2a02:5180::/32
]

function ipMatchesWhitelist(ip: string): boolean {
  if (!ip) return false
  const normalized = ip.trim()
  if (YOOKASSA_IP_EXACT.includes(normalized)) return true
  for (const prefix of YOOKASSA_IP_PREFIXES) {
    if (normalized.startsWith(prefix)) return true
  }
  return false
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || null
  }
  const realIp = request.headers.get('x-real-ip')
  return realIp?.trim() || null
}

export function isYooKassaWebhookRequest(request: Request): boolean {
  if (process.env.YOOKASSA_WEBHOOK_IP_CHECK === 'false') {
    return true
  }
  const ip = getClientIp(request)
  if (!ip) return false
  return ipMatchesWhitelist(ip)
}
