import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, PaymentStatus, TicketStatus } from '@prisma/client'

// GET /api/statistics/overview - общая статистика (для владельца)
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

        const where = startDate || endDate ? { created_at: dateFilter } : {}

        const [
          totalSales,
          totalRevenue,
          totalTickets,
          usedTickets,
          cancelledTickets,
          totalUsers,
          activeUsers,
          totalTours,
          approvedTours,
          totalManagers,
          totalPromoters,
          totalPartners,
        ] = await Promise.all([
          prisma.sale.count({
            where: {
              ...where,
              payment_status: PaymentStatus.completed,
            },
          }),
          prisma.sale.aggregate({
            where: {
              ...where,
              payment_status: PaymentStatus.completed,
            },
            _sum: {
              total_amount: true,
            },
          }),
          prisma.ticket.count({
            where: {
              ...where,
            },
          }),
          prisma.ticket.count({
            where: {
              ...where,
              ticket_status: TicketStatus.used,
            },
          }),
          prisma.ticket.count({
            where: {
              ...where,
              ticket_status: TicketStatus.cancelled,
            },
          }),
          prisma.user.count({
            where: {
              ...where,
              role: {
                notIn: [UserRole.owner, UserRole.owner_assistant],
              },
            },
          }),
          prisma.user.count({
            where: {
              ...where,
              is_active: true,
              role: {
                notIn: [UserRole.owner, UserRole.owner_assistant],
              },
            },
          }),
          prisma.tour.count({
            where,
          }),
          prisma.tour.count({
            where: {
              ...where,
              moderation_status: 'approved',
            },
          }),
          prisma.user.count({
            where: {
              ...where,
              role: UserRole.manager,
            },
          }),
          prisma.user.count({
            where: {
              ...where,
              role: UserRole.promoter,
            },
          }),
          prisma.user.count({
            where: {
              ...where,
              role: UserRole.partner,
            },
          }),
        ])

        return NextResponse.json({
          success: true,
          data: {
            sales: {
              total: totalSales,
              revenue: totalRevenue._sum.total_amount || 0,
            },
            tickets: {
              total: totalTickets,
              used: usedTickets,
              cancelled: cancelledTickets,
              sold: totalTickets - usedTickets - cancelledTickets,
            },
            users: {
              total: totalUsers,
              active: activeUsers,
              managers: totalManagers,
              promoters: totalPromoters,
              partners: totalPartners,
            },
            tours: {
              total: totalTours,
              approved: approvedTours,
              pending: totalTours - approvedTours,
            },
          },
        })
      } catch (error) {
        console.error('Get statistics overview error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
