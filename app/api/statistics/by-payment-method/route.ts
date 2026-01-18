import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, PaymentStatus, PaymentMethod } from '@prisma/client'

// GET /api/statistics/by-payment-method - статистика по способам оплаты (для владельца)
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json(
            { success: false, error: 'Only owner can view statistics' },
            { status: 403 }
          )
        }

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('start_date')
        const endDate = searchParams.get('end_date')

        const dateFilter: any = {}
        if (startDate) {
          dateFilter.gte = new Date(startDate)
        }
        if (endDate) {
          dateFilter.lte = new Date(endDate)
        }

        const where = {
          payment_status: PaymentStatus.completed,
          ...(startDate || endDate ? { created_at: dateFilter } : {}),
        }

        const [onlineSales, cashSales, acquiringSales] = await Promise.all([
          prisma.sale.findMany({
            where: {
              ...where,
              payment_method: PaymentMethod.online_yookassa,
            },
          }),
          prisma.sale.findMany({
            where: {
              ...where,
              payment_method: PaymentMethod.cash,
            },
          }),
          prisma.sale.findMany({
            where: {
              ...where,
              payment_method: PaymentMethod.acquiring,
            },
          }),
        ])

        const onlineRevenue = onlineSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)
        const cashRevenue = cashSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)
        const acquiringRevenue = acquiringSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)

        return NextResponse.json({
          success: true,
          data: {
            online_yookassa: {
              count: onlineSales.length,
              revenue: onlineRevenue,
            },
            cash: {
              count: cashSales.length,
              revenue: cashRevenue,
            },
            acquiring: {
              count: acquiringSales.length,
              revenue: acquiringRevenue,
            },
            total: {
              count: onlineSales.length + cashSales.length + acquiringSales.length,
              revenue: onlineRevenue + cashRevenue + acquiringRevenue,
            },
          },
        })
      } catch (error) {
        console.error('Get statistics by payment method error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
