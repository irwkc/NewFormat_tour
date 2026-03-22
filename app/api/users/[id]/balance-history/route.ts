import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, BalanceType, TransactionType } from '@prisma/client'

// GET /api/users/:id/balance-history - история баланса пользователя (для владельца просматривающего промоутера/менеджера)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json(
            { success: false, error: 'Only owner can view user balance history' },
            { status: 403 }
          )
        }

        const { id } = params
        const { searchParams } = new URL(request.url)
        const balanceType = searchParams.get('balance_type') as BalanceType | null
        const transactionType = searchParams.get('transaction_type') as TransactionType | null
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')

        // Проверить, что пользователь существует
        const user = await prisma.user.findUnique({
          where: { id },
        })

        if (!user) {
          return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 }
          )
        }

        if (user.role !== 'manager' && user.role !== 'promoter') {
          return NextResponse.json(
            { success: false, error: 'Can only view balance history for managers and promoters' },
            { status: 400 }
          )
        }

        const where: any = {
          user_id: id,
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
        console.error('Get user balance history error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
