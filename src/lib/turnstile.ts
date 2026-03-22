/**
 * Верификация токена Cloudflare Turnstile на сервере.
 * Ключи: TURNSTILE_SECRET_KEY (сервер), NEXT_PUBLIC_TURNSTILE_SITE_KEY (клиент).
 * Получить: https://dash.cloudflare.com/?to=/:account/turnstile
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export type TurnstileVerifyResult =
  | { success: true }
  | { success: false; errorCodes: string[] }

export async function verifyTurnstile(
  token: string,
  remoteip?: string | null
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not set')
    return { success: false, errorCodes: ['missing-input-secret'] }
  }

  if (!token || typeof token !== 'string' || token.length > 2048) {
    return { success: false, errorCodes: ['invalid-input-response'] }
  }

  try {
    const body = new URLSearchParams()
    body.append('secret', secret)
    body.append('response', token)
    if (remoteip) body.append('remoteip', remoteip)

    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const data = (await res.json()) as {
      success?: boolean
      'error-codes'?: string[]
    }
    if (data.success) {
      return { success: true }
    }
    return {
      success: false,
      errorCodes: Array.isArray(data['error-codes']) ? data['error-codes'] : ['unknown'],
    }
  } catch (e) {
    console.error('Turnstile verify error:', e)
    return { success: false, errorCodes: ['internal-error'] }
  }
}
