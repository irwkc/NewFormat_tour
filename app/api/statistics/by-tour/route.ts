import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, PaymentStatus } from '@prisma/client'

// GET /api/statistics/by-tour - статистика по экскурсиям (для владельца)
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

        const tours = await prisma.tour.findMany({
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
          orderBy: { created_at: 'desc' },
        })

        const statistics = tours.map((tour) => {
          const completedSales = tour.sales.filter((s) => s.payment_status === PaymentStatus.completed)
          const totalRevenue = completedSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)
          const totalTickets = tour.tickets.length
          const usedTickets = tour.tickets.filter((t) => t.ticket_status === 'used').length
          const cancelledTickets = tour.tickets.filter((t) => t.ticket_status === 'cancelled').length
          
          // Подсчитать места по всем рейсам
          const totalMaxPlaces = tour.flights.reduce((sum, flight) => sum + flight.max_places, 0)
          const totalBookedPlaces = tour.flights.reduce((sum, flight) => sum + flight.current_booked_places, 0)

          return {
            tour: {
              id: tour.id,
              company: tour.company,
              flights_count: tour.flights.length,
              category: tour.category_id,
            },
            sales: {
              total: completedSales.length,
              revenue: totalRevenue,
            },
            tickets: {
              total: totalTickets,
              used: usedTickets,
              cancelled: cancelledTickets,
              sold: totalTickets - usedTickets - cancelledTickets,
            },
            places: {
              booked: totalBookedPlaces,
              max: totalMaxPlaces,
              available: totalMaxPlaces - totalBookedPlaces,
            },
          }
        })

        return NextResponse.json({
          success: true,
          data: statistics,
        })
      } catch (error) {
        console.error('Get statistics by tour error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
