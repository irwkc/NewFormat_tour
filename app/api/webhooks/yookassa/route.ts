import { NextRequest, NextResponse } from 'next/server'
import { completeSaleFromYookassaDomain } from '@/lib/domain/sales'

// POST /api/webhooks/yookassa - webhook от ЮКассы для обновления статуса платежа
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const event = body.event || body.type // Зависит от формата ЮКассы

    if (event !== 'payment.succeeded') {
      return NextResponse.json({ received: true })
    }

    const payment = body.object || body

    const result = await completeSaleFromYookassaDomain(payment)

    if (result.status === 'no_sale_id') {
      return NextResponse.json({ received: true })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('YooKassa webhook error:', error)
    return NextResponse.json({ received: true }, { status: 500 })
  }
}
