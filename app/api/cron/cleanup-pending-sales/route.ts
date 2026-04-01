import { NextRequest, NextResponse } from 'next/server'
import {
  DEFAULT_STALE_PENDING_SALE_MINUTES,
  deleteStalePendingSalesWithoutTicket,
} from '@/lib/domain/cleanup-stale-sales'

/**
 * Периодическая очистка незавершённых продаж (pending, без билета, старше порога).
 * Вызывать по cron (например Vercel Cron) с секретом в Authorization.
 *
 * Env: CRON_SECRET — обязателен в проде.
 * Env: STALE_PENDING_SALE_MINUTES — возраст в минутах (по умолчанию 10).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  const auth = request.headers.get('authorization')
  const ok = secret && auth === `Bearer ${secret}`

  if (!ok) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const raw = process.env.STALE_PENDING_SALE_MINUTES
  const minutes = raw != null && raw !== '' ? Number(raw) : DEFAULT_STALE_PENDING_SALE_MINUTES
  const maxAge = Number.isFinite(minutes) && minutes >= 1 ? minutes : DEFAULT_STALE_PENDING_SALE_MINUTES

  try {
    const result = await deleteStalePendingSalesWithoutTicket(maxAge)
    return NextResponse.json({
      success: true,
      data: {
        deleted: result.count,
        max_age_minutes: maxAge,
        sale_ids: result.ids,
      },
    })
  } catch (e) {
    console.error('cleanup-pending-sales:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
