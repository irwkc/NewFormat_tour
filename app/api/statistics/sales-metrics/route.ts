import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { PaymentStatus, UserRole } from '@prisma/client'
import { calcIncomeSplit } from '@/lib/domain/commission-calc'

type Metric = 'turnover' | 'income' | 'salary'
type Group = 'total' | 'partner' | 'tour'

function parseDateRange(searchParams: URLSearchParams) {
  const startRaw = searchParams.get('start_date')
  const endRaw = searchParams.get('end_date')

  const now = new Date()
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)

  const start = startRaw ? new Date(startRaw) : defaultStart
  if (startRaw) start.setHours(0, 0, 0, 0)

  const end = endRaw ? new Date(endRaw) : now
  // Важно: end_date считается как "весь день"
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

// GET /api/statistics/sales-metrics?metric=turnover|income|salary&group=total|partner|tour&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const metric = (searchParams.get('metric') as Metric | null) ?? 'turnover'
        const group = (searchParams.get('group') as Group | null) ?? 'total'

        const { start, end } = parseDateRange(searchParams)

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
                commissionRules: true,
              },
            },
          },
        })

        const valueByKey = new Map<
          string,
          {
            id: string
            name: string
            value: number
            sales_count: number
            places: number
          }
        >()

        const total = sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0) // оборот "как total_amount"

        for (const sale of sales) {
          const tour = sale.tour
          const partner = tour.createdBy

          const saleChildPrice = sale.child_price != null ? Number(sale.child_price) : 0
          const saleConcessionPrice = sale.concession_price != null ? Number(sale.concession_price) : 0

          const commissionRules = (tour.commissionRules || []).map((r) => ({
            threshold_adult: Number((r as any).threshold_adult ?? (r as any).threshold_amount ?? 0),
            threshold_child: Number((r as any).threshold_child ?? (r as any).threshold_amount ?? 0),
            threshold_concession: Number((r as any).threshold_concession ?? (r as any).threshold_amount ?? 0),
            commission_percentage: Number(r.commission_percentage ?? 0),
          }))

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
              commission_fixed_adult:
                tour.commission_fixed_adult != null ? Number(tour.commission_fixed_adult) : null,
              commission_fixed_child:
                tour.commission_fixed_child != null ? Number(tour.commission_fixed_child) : null,
              commission_fixed_concession:
                tour.commission_fixed_concession != null ? Number(tour.commission_fixed_concession) : null,

              commission_rules: commissionRules,
            }
          )

          const places = sale.adult_count + (sale.child_count ?? 0) + (sale.concession_count ?? 0)

          const value =
            metric === 'turnover'
              ? split.total
              : metric === 'income'
                ? split.owner
                : split.partner

          let key = 'total'
          let id = 'total'
          let name = 'Общий'

          if (group === 'partner') {
            key = partner?.id || 'unknown'
            id = partner?.id || 'unknown'
            name = partner?.full_name || partner?.email || 'Партнёр'
          } else if (group === 'tour') {
            key = tour.id
            id = tour.id
            name = tour.company
          }

          const existing =
            valueByKey.get(key) ||
            ({
              id,
              name,
              value: 0,
              sales_count: 0,
              places: 0,
            } as const)

          valueByKey.set(key, {
            ...existing,
            value: existing.value + value,
            sales_count: existing.sales_count + 1,
            places: existing.places + places,
          })
        }

        const items = [...valueByKey.values()].sort((a, b) => b.value - a.value)

        const totalValue = items.reduce((sum, i) => sum + i.value, 0)
        const totalPlaces = items.reduce((sum, i) => sum + i.places, 0)
        const salesCount = items.reduce((sum, i) => sum + i.sales_count, 0)

        return NextResponse.json({
          success: true,
          data: {
            metric,
            group,
            range: { start, end },
            total_value: totalValue,
            sales_count: salesCount,
            places: totalPlaces,
            items,
            // для удобства: "оборот" всегда = total_amount
            оборот: total,
          },
        })
      } catch (error) {
        console.error('Get sales metrics error:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
      }
    },
    [UserRole.owner]
  )
}

