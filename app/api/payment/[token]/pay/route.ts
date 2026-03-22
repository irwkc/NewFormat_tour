import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { createYooKassaPayment } from '@/utils/yookassa'

const paySchema = z.object({
  email: z.string().email().optional(),
})

// POST /api/payment/:token/pay - создание платежа и переход на оплату
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const body = await request.json()
    const { email } = paySchema.parse(body)

    const sale = await prisma.sale.findFirst({
      where: {
        payment_link_token: token,
      },
    })

    if (!sale) {
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      )
    }

    if (sale.payment_method !== 'online_yookassa') {
      return NextResponse.json(
        { success: false, error: 'This is not an online payment' },
        { status: 400 }
      )
    }

    // Обновить email клиента, если указан
    if (email) {
      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          customer_email: email,
        },
      })
    }

    // Создать платеж в ЮКассе, если еще не создан
    if (!sale.yookassa_payment_id) {
      const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/${token}`
      const description = `Билеты на экскурсию`

      const payment = await createYooKassaPayment(
        Number(sale.total_amount),
        description,
        returnUrl,
        {
          sale_id: sale.id,
        }
      )

      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          yookassa_payment_id: payment.id,
          yookassa_payment_url: payment.confirmation?.return_url || null,
        },
      })

      await prisma.yookassaPayment.create({
        data: {
          sale_id: sale.id,
          payment_id: payment.id,
          status: payment.status || 'pending',
          amount: Number(payment.amount.value),
          currency: payment.amount.currency,
        },
      })
    }

    const updatedSale = await prisma.sale.findUnique({
      where: { id: sale.id },
    })

    return NextResponse.json({
      success: true,
      data: {
        payment_url: updatedSale?.yookassa_payment_url,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Pay error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
