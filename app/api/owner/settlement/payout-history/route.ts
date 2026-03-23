import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { BalanceType, TransactionType, UserRole } from '@prisma/client'

function getCurrentMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = now
  return { start, end }
}

// GET /api/owner/settlement/payout-history?partner_id=...&start_date=...&end_date=...
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const partnerId = searchParams.get('partner_id')
        if (!partnerId) {
          return NextResponse.json({ success: false, error: 'partner_id is required' }, { status: 400 })
        }

        const startDateRaw = searchParams.get('start_date')
        const endDateRaw = searchParams.get('end_date')

        const now = new Date()
        const { start: monthStart, end: monthEnd } = getCurrentMonthRange(now)

        const start = startDateRaw ? new Date(startDateRaw) : monthStart
        const end = endDateRaw ? new Date(endDateRaw) : monthEnd

        const ownerId = req.user!.userId

        const history = await prisma.balanceHistory.findMany({
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
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            amount: true,
            created_at: true,
            description: true,
          },
        })

        return NextResponse.json({
          success: true,
          data: {
            items: history.map((h) => ({
              id: h.id,
              amount: Number(h.amount),
              created_at: h.created_at.toISOString(),
              description: h.description,
            })),
          },
        })
      } catch (error) {
        console.error('Owner settlement payout history error:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
      }
    },
    [UserRole.owner]
  )
}

