import { NextRequest, NextResponse } from 'next/server'
import {
  completeSaleFromYookassaDomain,
  deletePromoterPendingOnlineSaleOnYooKassaCanceled,
} from '@/lib/domain/sales'
import { isYooKassaWebhookRequest } from '@/lib/yookassa-webhook'

// POST /api/webhooks/yookassa - webhook от ЮКассы для обновления статуса платежа
export async function POST(request: NextRequest) {
  if (!isYooKassaWebhookRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const event = body.event || body.type
    const payment = body.object || body

    if (event === 'payment.succeeded') {
      const result = await completeSaleFromYookassaDomain(payment)
      if (result.status === 'no_sale_id') {
        return NextResponse.json({ received: true })
      }
      return NextResponse.json({ received: true })
    }

    // Отмена / срок оплаты истёк — не оставляем продажу промоутера в «ожидании»
    if (event === 'payment.canceled' || payment?.status === 'canceled') {
      await deletePromoterPendingOnlineSaleOnYooKassaCanceled(payment)
      return NextResponse.json({ received: true })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('YooKassa webhook error:', error)
    return NextResponse.json({ received: true }, { status: 500 })
  }
}
