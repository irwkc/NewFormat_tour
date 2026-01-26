import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/sales/:id/payment-link/:token - публичная страница заказа (без авторизации)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; token: string } }
) {
  try {
    const { id, token } = params

    const sale = await prisma.sale.findUnique({
      where: {
        id,
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
          concession_count: (sale as any).concession_count || 0,
          adult_price: sale.adult_price,
          child_price: sale.child_price,
          concession_price: (sale as any).concession_price,
          total_amount: sale.total_amount,
          tour: {
            company: sale.tour.company,
            flight_number: sale.tour.flight_number,
            date: sale.tour.date,
            departure_time: sale.tour.departure_time,
            category: sale.tour.category.name,
          },
        },
      },
    })
  } catch (error) {
    console.error('Get payment link error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
