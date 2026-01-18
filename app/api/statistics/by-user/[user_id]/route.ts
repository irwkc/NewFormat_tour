import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, PaymentStatus } from '@prisma/client'

// GET /api/statistics/by-user/:user_id - статистика по конкретному менеджеру/промоутеру (для владельца)
export async function GET(
  request: NextRequest,
  { params }: { params: { user_id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json(
            { success: false, error: 'Only owner can view user statistics' },
            { status: 403 }
          )
        }

        const { user_id } = params

        const user = await prisma.user.findUnique({
          where: { id: user_id },
          include: {
            salesAsSeller: {
              where: {
                payment_status: PaymentStatus.completed,
              },
              include: {
                ticket: true,
                tour: {
                  include: {
                    category: true,
                  },
                },
              },
            },
            salesAsPromoter: {
              where: {
                payment_status: PaymentStatus.completed,
              },
              include: {
                ticket: true,
                tour: {
                  include: {
                    category: true,
                  },
                },
              },
            },
          },
        })

        if (!user || (user.role !== UserRole.manager && user.role !== UserRole.promoter)) {
          return NextResponse.json(
            { success: false, error: 'User not found or invalid role' },
            { status: 404 }
          )
        }

        const allSales = [...user.salesAsSeller, ...user.salesAsPromoter]
        const totalRevenue = allSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)
        const totalTickets = allSales.filter((s) => s.ticket).length
        const usedTickets = allSales.filter((s) => s.ticket?.ticket_status === 'used').length

        // Статистика по экскурсиям
        const toursStats = new Map()
        allSales.forEach((sale) => {
          const tourId = sale.tour_id
          if (!toursStats.has(tourId)) {
            toursStats.set(tourId, {
              tour: sale.tour,
              sales_count: 0,
              revenue: 0,
              tickets_count: 0,
            })
          }
          const stat = toursStats.get(tourId)
          stat.sales_count++
          stat.revenue += Number(sale.total_amount)
          if (sale.ticket) stat.tickets_count++
        })

        return NextResponse.json({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              full_name: user.full_name,
              promoter_id: user.promoter_id,
              role: user.role,
              balance: Number(user.balance),
              debt_to_company: user.role === UserRole.manager ? Number(user.debt_to_company) : null,
            },
            sales: {
              total: allSales.length,
              revenue: totalRevenue,
            },
            tickets: {
              total: totalTickets,
              used: usedTickets,
            },
            by_tour: Array.from(toursStats.values()),
          },
        })
      } catch (error) {
        console.error('Get statistics by user error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
