import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, PaymentStatus } from '@prisma/client'

// GET /api/statistics/by-partner/:partner_id - статистика по конкретному партнеру (для владельца и партнера)
export async function GET(
  request: NextRequest,
  { params }: { params: { partner_id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        const { partner_id } = params

        // Владелец может просматривать статистику любого партнера
        // Партнер может просматривать только свою статистику
        if (req.user!.role === UserRole.partner && req.user!.userId !== partner_id) {
          return NextResponse.json(
            { success: false, error: 'You can only view your own statistics' },
            { status: 403 }
          )
        }

        if (req.user!.role !== UserRole.owner && req.user!.role !== UserRole.partner) {
          return NextResponse.json(
            { success: false, error: 'Forbidden' },
            { status: 403 }
          )
        }

        const partner = await prisma.user.findUnique({
          where: { id: partner_id },
          include: {
            toursCreated: {
              include: {
                flights: true,
                sales: {
                  where: {
                    payment_status: PaymentStatus.completed,
                  },
                  include: {
                    ticket: true,
                  },
                },
                tickets: true,
              },
            },
          },
        })

        if (!partner || partner.role !== UserRole.partner) {
          return NextResponse.json(
            { success: false, error: 'Partner not found' },
            { status: 404 }
          )
        }

        const tours = partner.toursCreated
        const totalTours = tours.length
        const approvedTours = tours.filter((t) => t.moderation_status === 'approved').length
        const totalRevenue = tours.reduce((sum, tour) => {
          return sum + tour.sales.reduce((saleSum, sale) => saleSum + Number(sale.total_amount), 0)
        }, 0)
        const totalSales = tours.reduce((sum, tour) => sum + tour.sales.length, 0)
        const totalTickets = tours.reduce((sum, tour) => sum + tour.tickets.length, 0)
        const usedTickets = tours.reduce((sum, tour) => sum + tour.tickets.filter((t) => t.ticket_status === 'used').length, 0)

        return NextResponse.json({
          success: true,
          data: {
            partner: {
              id: partner.id,
              full_name: partner.full_name,
              email: partner.email,
            },
            tours: {
              total: totalTours,
              approved: approvedTours,
              pending: totalTours - approvedTours,
            },
            sales: {
              total: totalSales,
              revenue: totalRevenue,
            },
            tickets: {
              total: totalTickets,
              used: usedTickets,
            },
            tours_details: tours.map((tour) => ({
              id: tour.id,
              company: tour.company,
              flights_count: tour.flights?.length || 0,
              sales_count: tour.sales.length,
              tickets_count: tour.tickets.length,
              revenue: tour.sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0),
            })),
          },
        })
      } catch (error) {
        console.error('Get statistics by partner error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner, UserRole.partner]
  )
}
