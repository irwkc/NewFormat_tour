import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { createYooKassaPayment } from '@/utils/yookassa'
import QRCode from 'qrcode'

// POST /api/sales/:id/create-payment - создание платежа ЮКасса и генерация QR/ссылки
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.manager && req.user!.role !== UserRole.promoter) {
          return NextResponse.json(
            { success: false, error: 'Only managers and promoters can create payments' },
            { status: 403 }
          )
        }

        const { id } = params

        const sale = await prisma.sale.findUnique({
          where: { id },
          include: {
            seller: true,
            tour: {
              include: {
                category: true,
              },
            },
            flight: true,
          },
        })

        if (!sale) {
          return NextResponse.json(
            { success: false, error: 'Sale not found' },
            { status: 404 }
          )
        }

        if (sale.seller_user_id !== req.user!.userId && sale.promoter_user_id !== req.user!.userId) {
          return NextResponse.json(
            { success: false, error: 'You can only create payments for your own sales' },
            { status: 403 }
          )
        }

        if (sale.payment_method !== 'online_yookassa') {
          return NextResponse.json(
            { success: false, error: 'This endpoint is only for online payments' },
            { status: 400 }
          )
        }

        // Создать платеж в ЮКассе
        const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/${sale.payment_link_token}`
        const flightInfo = sale.flight ? ` - ${sale.flight.flight_number}` : ''
        const description = `Билеты на экскурсию: ${sale.tour.company}${flightInfo}`

        const payment = await createYooKassaPayment(
          Number(sale.total_amount),
          description,
          returnUrl,
          {
            sale_id: sale.id,
          }
        )

        // Генерировать QR код для ссылки на страницу заказа (НЕ на оплату напрямую)
        const paymentLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/${sale.payment_link_token}`
        
        // Обновить payment_link_url в продаже
        await prisma.sale.update({
          where: { id },
          data: {
            payment_link_url: paymentLinkUrl,
          },
        })
        
        const qrDataURL = await QRCode.toDataURL(paymentLinkUrl, {
          errorCorrectionLevel: 'M',
          width: 300,
        })

        // Обновить продажу
        await prisma.sale.update({
          where: { id },
          data: {
            yookassa_payment_id: payment.id,
            yookassa_payment_url: payment.confirmation?.return_url || null,
            payment_link_url: paymentLinkUrl,
          },
        })

        // Сохранить платеж ЮКассы
        await prisma.yookassaPayment.create({
          data: {
            sale_id: sale.id,
            payment_id: payment.id,
            status: payment.status || 'pending',
            amount: Number(payment.amount.value),
            currency: payment.amount.currency,
          },
        })

        return NextResponse.json({
          success: true,
          data: {
            payment_link_url: paymentLinkUrl,
            qr_code: qrDataURL,
            yookassa_payment_url: payment.confirmation?.return_url || null,
          },
        })
      } catch (error) {
        console.error('Create payment error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.manager, UserRole.promoter]
  )
}
