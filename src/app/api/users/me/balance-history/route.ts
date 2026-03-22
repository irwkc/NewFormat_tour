import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { BalanceType, TransactionType } from '@prisma/client'

// GET /api/users/me/balance-history - история баланса текущего пользователя
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        const { searchParams } = new URL(request.url)
        const balanceType = searchParams.get('balance_type') as BalanceType | null
        const transactionType = searchParams.get('transaction_type') as TransactionType | null
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')

        const where: any = {
          user_id: req.user!.userId,
        }

        if (balanceType) {
          where.balance_type = balanceType
        }

        if (transactionType) {
          where.transaction_type = transactionType
        }

        const [history, total] = await Promise.all([
          prisma.balanceHistory.findMany({
            where,
            orderBy: { created_at: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
              ticket: {
                select: {
                  id: true,
                  ticket_number: true,
                  ticket_status: true,
                },
              },
              sale: {
                select: {
                  id: true,
                  total_amount: true,
                },
              },
              performedBy: {
                select: {
                  id: true,
                  full_name: true,
                  role: true,
                },
              },
            },
          }),
          prisma.balanceHistory.count({ where }),
        ])

        return NextResponse.json({
          success: true,
          data: history,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        })
      } catch (error) {
        console.error('Get balance history error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
}
