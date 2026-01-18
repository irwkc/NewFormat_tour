import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// POST /api/users/:id/reset-balance - обнуление баланса (только владелец)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json(
            { success: false, error: 'Only owner can reset balance' },
            { status: 403 }
          )
        }

        const { id } = params

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
            { success: false, error: 'Can only reset balance for managers and promoters' },
            { status: 400 }
          )
        }

        const balanceBefore = Number(user.balance)

        // Обнулить баланс
        await prisma.user.update({
          where: { id },
          data: {
            balance: 0,
          },
        })

        // Записать историю
        await prisma.balanceHistory.create({
          data: {
            user_id: id,
            balance_type: 'balance',
            transaction_type: 'debit',
            amount: balanceBefore,
            balance_before: balanceBefore,
            balance_after: 0,
            description: 'Выплата владельцем, баланс обнулен',
            performed_by_user_id: req.user!.userId,
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Balance reset successfully',
        })
      } catch (error) {
        console.error('Reset balance error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
