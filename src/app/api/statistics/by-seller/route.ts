import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, PaymentStatus } from '@prisma/client'

// GET /api/statistics/by-seller - статистика по продавцам (для владельца)
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

        const managers = await prisma.user.findMany({
          where: {
            role: UserRole.manager,
          },
          include: {
            salesAsSeller: {
              where: {
                payment_status: PaymentStatus.completed,
              },
            },
            salesAsPromoter: {
              where: {
                payment_status: PaymentStatus.completed,
              },
            },
          },
        })

        const promoters = await prisma.user.findMany({
          where: {
            role: UserRole.promoter,
          },
          include: {
            salesAsPromoter: {
              where: {
                payment_status: PaymentStatus.completed,
              },
            },
          },
        })

        const managerStats = managers.map((manager) => {
          const sales = [...manager.salesAsSeller, ...manager.salesAsPromoter]
          const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)

          return {
            user: {
              id: manager.id,
              email: manager.email,
              full_name: manager.full_name,
              promoter_id: manager.promoter_id,
            },
            sales: {
              total: sales.length,
              revenue: totalRevenue,
            },
            balance: Number(manager.balance),
            debt_to_company: Number(manager.debt_to_company),
          }
        })

        const promoterStats = promoters.map((promoter) => {
          const sales = promoter.salesAsPromoter
          const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)

          return {
            user: {
              id: promoter.id,
              email: promoter.email,
              full_name: promoter.full_name,
              promoter_id: promoter.promoter_id,
            },
            sales: {
              total: sales.length,
              revenue: totalRevenue,
            },
            balance: Number(promoter.balance),
          }
        })

        return NextResponse.json({
          success: true,
          data: {
            managers: managerStats,
            promoters: promoterStats,
          },
        })
      } catch (error) {
        console.error('Get statistics by seller error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
