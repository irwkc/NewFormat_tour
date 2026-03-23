import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { PaymentStatus, UserRole } from '@prisma/client'
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

        const { searchParams } = new URL(request.url)
        const startDateRaw = searchParams.get('start_date')
        const endDateRaw = searchParams.get('end_date')

        const now = new Date()
        const { start: monthStart, end: monthEnd } = getCurrentMonthRange(now)

        const start = startDateRaw ? new Date(startDateRaw) : monthStart
        const end = endDateRaw ? new Date(endDateRaw) : monthEnd

        const sales = await prisma.sale.findMany({
          where: {
            payment_status: PaymentStatus.completed,
            created_at: {
              gte: start,
              lte: end,
            },
          },
          include: {
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
          orderBy: { created_at: 'desc' },
        })

        // Суммируем долю партнёра по каждому партнёру (owner должен партнёрам).
        const byPartner = new Map<
          string,
          {
            partner: { id: string; full_name: string | null; email: string | null }
            debt: number
            sales_count: number
            places: number
          }
        >()

        for (const sale of sales) {
          const tour = sale.tour
          const partnerUser = tour.createdBy
          if (!partnerUser) continue

          // В текущей модели партнёрами являются создатели тура
          const partnerId = partnerUser.id
          const key = partnerId

          const saleChildPrice = sale.child_price != null ? Number(sale.child_price) : 0
          const saleConcessionPrice = sale.concession_price != null ? Number(sale.concession_price) : 0

          const split = calcIncomeSplit(
            {
              adult_count: sale.adult_count,
              child_count: sale.child_count ?? 0,
              concession_count: sale.concession_count ?? 0,
              adult_price: Number(sale.adult_price),
              child_price: saleChildPrice,
              concession_price: saleConcessionPrice,
              total_amount: Number(sale.total_amount),
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

          const existing =
            byPartner.get(key) ||
            ({
              partner: {
                id: partnerId,
                full_name: partnerUser.full_name,
                email: partnerUser.email,
              },
              debt: 0,
              sales_count: 0,
              places: 0,
            } as const)

          const debtAfter = existing.debt + split.partner
          const salesCountAfter = existing.sales_count + 1
          const placesAfter =
            existing.places + sale.adult_count + (sale.child_count ?? 0) + (sale.concession_count ?? 0)

          byPartner.set(key, {
            ...existing,
            debt: debtAfter,
            sales_count: salesCountAfter,
            places: placesAfter,
          })
        }

        const items = [...byPartner.values()].sort((a, b) => b.debt - a.debt)
        const totalDebt = items.reduce((sum, i) => sum + i.debt, 0)

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

