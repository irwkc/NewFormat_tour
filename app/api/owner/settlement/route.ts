import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { BalanceType, TransactionType, TicketStatus, UserRole } from '@prisma/client'
import { calcIncomeSplit } from '@/lib/domain/commission-calc'

function getCurrentMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = now
  return { start, end }
}

// GET /api/owner/settlement - расчёт сколько владелец должен каждому партнёру
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
        }

        const ownerId = req.user!.userId

        const { searchParams } = new URL(request.url)
        const startDateRaw = searchParams.get('start_date')
        const endDateRaw = searchParams.get('end_date')

        const now = new Date()
        const { start: monthStart, end: monthEnd } = getCurrentMonthRange(now)

        const start = startDateRaw ? new Date(startDateRaw) : monthStart
        const end = endDateRaw ? new Date(endDateRaw) : monthEnd

        // Прибыль партнёра увеличивается только после посадки:
        // билет должен быть в статусе `used`, а дата посадки попадать в период.
        const tickets = await prisma.ticket.findMany({
          where: {
            ticket_status: TicketStatus.used,
            used_at: {
              gte: start,
              lte: end,
            },
          },
          include: {
            sale: true,
            tour: {
              include: {
                createdBy: {
                  select: {
                    id: true,
                    full_name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { used_at: 'desc' },
        })

        // Прибыль партнёра = доля партнёра из расчёта комиссий (не оборот).
        const byPartner = new Map<
          string,
          {
            partner: { id: string; full_name: string | null; email: string | null }
            profit: number
            sales_count: number
            places: number
          }
        >()

        for (const ticket of tickets) {
          const tour = ticket.tour
          const partnerUser = tour.createdBy
          if (!partnerUser) continue

          // В текущей модели партнёрами являются создатели тура
          const partnerId = partnerUser.id
          const key = partnerId

          const saleChildPrice = ticket.sale.child_price != null ? Number(ticket.sale.child_price) : 0
          const saleConcessionPrice = ticket.sale.concession_price != null ? Number(ticket.sale.concession_price) : 0

          const split = calcIncomeSplit(
            {
              adult_count: ticket.adult_count,
              child_count: ticket.child_count ?? 0,
              concession_count: ticket.concession_count ?? 0,
              adult_price: Number(ticket.sale.adult_price),
              child_price: saleChildPrice,
              concession_price: saleConcessionPrice,
              total_amount: Number(ticket.sale.total_amount),
            },
            {
              partner_min_adult_price: Number(tour.partner_min_adult_price),
              partner_min_child_price: Number(tour.partner_min_child_price),
              partner_min_concession_price:
                tour.partner_min_concession_price != null ? Number(tour.partner_min_concession_price) : 0,
              partner_commission_type: (tour.partner_commission_type as 'fixed' | 'percentage') ?? undefined,
              partner_fixed_adult_price: tour.partner_fixed_adult_price != null ? Number(tour.partner_fixed_adult_price) : null,
              partner_fixed_child_price: tour.partner_fixed_child_price != null ? Number(tour.partner_fixed_child_price) : null,
              partner_fixed_concession_price:
                tour.partner_fixed_concession_price != null ? Number(tour.partner_fixed_concession_price) : null,
              partner_commission_percentage:
                tour.partner_commission_percentage != null ? Number(tour.partner_commission_percentage) : null,

              owner_min_adult_price: tour.owner_min_adult_price != null ? Number(tour.owner_min_adult_price) : Number(tour.partner_min_adult_price),
              owner_min_child_price: tour.owner_min_child_price != null ? Number(tour.owner_min_child_price) : Number(tour.partner_min_child_price),
              owner_min_concession_price:
                tour.owner_min_concession_price != null ? Number(tour.owner_min_concession_price) : Number(tour.partner_min_concession_price ?? 0),

              commission_type: (tour.commission_type ?? 'percentage') as 'percentage' | 'fixed',
              commission_percentage: tour.commission_percentage != null ? Number(tour.commission_percentage) : undefined,
              commission_fixed_amount: tour.commission_fixed_amount != null ? Number(tour.commission_fixed_amount) : undefined,
              commission_fixed_adult:
                tour.commission_fixed_adult != null ? Number(tour.commission_fixed_adult) : null,
              commission_fixed_child:
                tour.commission_fixed_child != null ? Number(tour.commission_fixed_child) : null,
              commission_fixed_concession:
                tour.commission_fixed_concession != null ? Number(tour.commission_fixed_concession) : null,
              commission_rules: [],
            }
          )

          const splitPartner = split.partner

          const existing =
            byPartner.get(key) ||
            ({
              partner: {
                id: partnerId,
                full_name: partnerUser.full_name,
                email: partnerUser.email,
              },
              profit: 0,
              sales_count: 0,
              places: 0,
            } as const)

          const placesAdd = ticket.adult_count + (ticket.child_count ?? 0) + (ticket.concession_count ?? 0)
          const profitAfter = existing.profit + splitPartner
          const salesCountAfter = existing.sales_count + 1
          const placesAfter =
            existing.places + placesAdd

          byPartner.set(key, {
            ...existing,
            profit: profitAfter,
            sales_count: salesCountAfter,
            places: placesAfter,
          })
        }

        const partnerIds = [...byPartner.keys()]
        const paidByPartner = new Map<string, number>()

        if (partnerIds.length > 0) {
          const payoutEntries = await prisma.balanceHistory.findMany({
            where: {
              user_id: { in: partnerIds },
              balance_type: BalanceType.balance,
              transaction_type: TransactionType.debit,
              performed_by_user_id: ownerId,
              description: { startsWith: 'Выплата партнёру' },
              created_at: {
                gte: start,
                lte: end,
              },
            },
            select: { user_id: true, amount: true },
          })

          for (const p of payoutEntries) {
            paidByPartner.set(p.user_id, (paidByPartner.get(p.user_id) || 0) + Number(p.amount))
          }
        }

        const items = [...byPartner.values()]
          .map((it) => {
            const paid = paidByPartner.get(it.partner.id) || 0
            const remaining = Math.max(0, it.profit - paid)
            return { ...it, paid, remaining }
          })
          .sort((a, b) => b.remaining - a.remaining)

        const totalDebt = items.reduce((sum, i) => sum + i.remaining, 0)

        return NextResponse.json({
          success: true,
          data: {
            range: { start, end },
            total_debt: totalDebt,
            items,
          },
        })
      } catch (error) {
        console.error('Owner settlement error:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
      }
    },
    [UserRole.owner]
  )
}

