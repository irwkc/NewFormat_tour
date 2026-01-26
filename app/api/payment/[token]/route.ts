import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/payment/:token - получение информации о продаже для публичной страницы оплаты
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    const sale = await prisma.sale.findFirst({
      where: {
        payment_link_token: token,
      },
      include: {
        tour: {
          include: {
            category: true,
          },
        },
      },
    })

    if (!sale) {
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      )
    }

    // Возвращаем данные для страницы оплаты
    return NextResponse.json({
      success: true,
      data: {
        sale: {
          id: sale.id,
          adult_count: sale.adult_count,
          child_count: sale.child_count,
          concession_count: sale.concession_count || 0,
          adult_price: sale.adult_price,
          child_price: sale.child_price,
          concession_price: sale.concession_price,
          total_amount: sale.total_amount,
          payment_method: sale.payment_method,
          tour: {
            id: sale.tour.id,
            company: sale.tour.company,
            flight_number: sale.tour.flight_number,
            date: sale.tour.date,
            departure_time: sale.tour.departure_time,
            category: sale.tour.category.name,
          },
          yookassa_payment_url: sale.yookassa_payment_url,
        },
      },
    })
  } catch (error) {
    console.error('Get payment info error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
