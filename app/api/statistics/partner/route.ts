import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { TicketStatus, UserRole } from '@prisma/client'
import { calcIncomeSplit } from '@/lib/domain/commission-calc'

function parseDateRange(searchParams: URLSearchParams) {
  const now = new Date()
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const defaultEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  const startRaw = searchParams.get('start_date')
  const endRaw = searchParams.get('end_date')

  const start = startRaw ? new Date(startRaw) : defaultStart
  start.setHours(0, 0, 0, 0)
  const end = endRaw ? new Date(endRaw) : defaultEnd
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

// GET /api/statistics/partner - статистика партнёра по прошедшим посадку билетам
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.partner) {
          return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const { start, end } = parseDateRange(searchParams)

        const tickets = await prisma.ticket.findMany({
          where: {
            ticket_status: TicketStatus.used,
            used_at: {
              gte: start,
              lte: end,
            },
            tour: {
              created_by_user_id: req.user!.userId,
            },
          },
          include: {
            sale: true,
            tour: {
              include: {
                commissionRules: true,
              },
            },
          },
        })

        let turnover = 0
        let profit = 0
        let soldPlaces = 0
        let ticketsCount = 0

        for (const ticket of tickets) {
          const sale = ticket.sale
          const tour = ticket.tour
          const saleChildPrice = sale.child_price != null ? Number(sale.child_price) : 0
          const saleConcessionPrice = sale.concession_price != null ? Number(sale.concession_price) : 0

          const rules = (tour.commissionRules || []).map((r) => ({
            threshold_adult: Number((r as any).threshold_adult ?? (r as any).threshold_amount ?? 0),
            threshold_child: Number((r as any).threshold_child ?? (r as any).threshold_amount ?? 0),
            threshold_concession: Number((r as any).threshold_concession ?? (r as any).threshold_amount ?? 0),
            commission_percentage: Number(r.commission_percentage ?? 0),
          }))

          const split = calcIncomeSplit(
            {
              adult_count: ticket.adult_count,
              child_count: ticket.child_count ?? 0,
              concession_count: ticket.concession_count ?? 0,
              adult_price: Number(sale.adult_price),
              child_price: saleChildPrice,
              concession_price: saleConcessionPrice,
              total_amount: Number(sale.total_amount),
            },
            {
              partner_min_adult_price: Number(tour.partner_min_adult_price),
              partner_min_child_price: Number(tour.partner_min_child_price),
              partner_min_concession_price: tour.partner_min_concession_price != null ? Number(tour.partner_min_concession_price) : 0,
              partner_commission_type: (tour.partner_commission_type as 'fixed' | 'percentage') ?? undefined,
              partner_fixed_adult_price: tour.partner_fixed_adult_price != null ? Number(tour.partner_fixed_adult_price) : null,
              partner_fixed_child_price: tour.partner_fixed_child_price != null ? Number(tour.partner_fixed_child_price) : null,
              partner_fixed_concession_price:
                tour.partner_fixed_concession_price != null ? Number(tour.partner_fixed_concession_price) : null,
              partner_commission_percentage: tour.partner_commission_percentage != null ? Number(tour.partner_commission_percentage) : null,

              owner_min_adult_price: tour.owner_min_adult_price != null ? Number(tour.owner_min_adult_price) : Number(tour.partner_min_adult_price),
              owner_min_child_price: tour.owner_min_child_price != null ? Number(tour.owner_min_child_price) : Number(tour.partner_min_child_price),
              owner_min_concession_price:
                tour.owner_min_concession_price != null ? Number(tour.owner_min_concession_price) : Number(tour.partner_min_concession_price ?? 0),

              commission_type: (tour.commission_type ?? 'percentage') as 'percentage' | 'fixed',
              commission_percentage: tour.commission_percentage != null ? Number(tour.commission_percentage) : undefined,
              commission_fixed_amount: tour.commission_fixed_amount != null ? Number(tour.commission_fixed_amount) : undefined,
              commission_fixed_adult: tour.commission_fixed_adult != null ? Number(tour.commission_fixed_adult) : null,
              commission_fixed_child: tour.commission_fixed_child != null ? Number(tour.commission_fixed_child) : null,
              commission_fixed_concession:
                tour.commission_fixed_concession != null ? Number(tour.commission_fixed_concession) : null,
              commission_rules: rules,
            }
          )

          const places = ticket.adult_count + (ticket.child_count ?? 0) + (ticket.concession_count ?? 0)
          turnover += split.total
          profit += split.partner
          soldPlaces += places
          ticketsCount += 1
        }

        return NextResponse.json({
          success: true,
          data: {
            range: { start, end },
            turnover,
            profit,
            sold_places: soldPlaces,
            tickets_count: ticketsCount,
          },
        })
      } catch (error) {
        console.error('Get partner statistics error:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
      }
    },
    [UserRole.partner]
  )
}

