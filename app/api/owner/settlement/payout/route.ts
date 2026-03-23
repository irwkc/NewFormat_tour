import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { BalanceType, PaymentStatus, TransactionType, UserRole } from '@prisma/client'
import { calcIncomeSplit } from '@/lib/domain/commission-calc'

function getCurrentMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = now
  return { start, end }
}

// POST /api/owner/settlement/payout - выплата партнёру из расчёта
export async function POST(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const partnerId = body?.partner_id as string | undefined
        const amountRaw = body?.amount as number | undefined
        const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw)

        if (!partnerId) {
          return NextResponse.json({ success: false, error: 'partner_id is required' }, { status: 400 })
        }
        if (!Number.isFinite(amount) || amount <= 0) {
          return NextResponse.json({ success: false, error: 'amount must be > 0' }, { status: 400 })
        }

        const partner = await prisma.user.findUnique({ where: { id: partnerId } })
        if (!partner || partner.role !== UserRole.partner) {
          return NextResponse.json({ success: false, error: 'Partner not found' }, { status: 404 })
        }

        const now = new Date()
        const { start, end } = getCurrentMonthRange(now)
        const ownerId = req.user!.userId

        // Прибыль партнёра за период
        const sales = await prisma.sale.findMany({
          where: {
            payment_status: PaymentStatus.completed,
            created_at: {
              gte: start,
              lte: end,
            },
            tour: {
              created_by_user_id: partnerId,
            },
          },
          include: {
            tour: true,
          },
        })

        let profit = 0
        for (const sale of sales) {
          const tour = sale.tour

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

          profit += split.partner
        }

        const paidSumRow = await prisma.balanceHistory.aggregate({
          where: {
            user_id: partnerId,
            balance_type: BalanceType.balance,
            transaction_type: TransactionType.debit,
            performed_by_user_id: ownerId,
            description: { startsWith: 'Выплата партнёру' },
            created_at: {
              gte: start,
              lte: end,
            },
          },
          _sum: { amount: true },
        })

        const paid = Number(paidSumRow._sum.amount || 0)
        const remaining = Math.max(0, profit - paid)

        if (amount - remaining > 0.0001) {
          return NextResponse.json(
            { success: false, error: `Сумма выплаты превышает остаток. Остаток: ${remaining.toFixed(2)}₽` },
            { status: 400 }
          )
        }

        // Логируем выплату в историю баланса (для расчёта "сколько уже выплатили")
        // Баланс партнёра в текущей логике не используется для партнёрской прибыли, поэтому просто уменьшаем его
        // чтобы запись была консистентной.
        const balanceBefore = Number(partner.balance)
        const balanceAfter = balanceBefore - amount

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: partnerId },
            data: { balance: balanceAfter },
          })

          await tx.balanceHistory.create({
            data: {
              user_id: partnerId,
              balance_type: BalanceType.balance,
              transaction_type: TransactionType.debit,
              amount,
              balance_before: balanceBefore,
              balance_after: balanceAfter,
              description: `Выплата партнёру за период: ${start.toISOString().slice(0, 10)}..${end.toISOString().slice(0, 10)}`,
              performed_by_user_id: ownerId,
            },
          })
        })

        return NextResponse.json({ success: true })
      } catch (error) {
        console.error('Owner settlement payout error:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
      }
    },
    [UserRole.owner]
  )
}

