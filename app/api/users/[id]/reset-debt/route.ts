import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// POST /api/users/:id/reset-debt - обнуление долга (только владелец, только менеджеры)
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
            { success: false, error: 'Only owner can reset debt' },
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

        if (user.role !== 'manager') {
          return NextResponse.json(
            { success: false, error: 'Can only reset debt for managers' },
            { status: 400 }
          )
        }

        const debtBefore = Number(user.debt_to_company)

        // Обнулить долг
        await prisma.user.update({
          where: { id },
          data: {
            debt_to_company: 0,
          },
        })

        // Записать историю
        await prisma.balanceHistory.create({
          data: {
            user_id: id,
            balance_type: 'debt_to_company',
            transaction_type: 'debit',
            amount: debtBefore,
            balance_before: debtBefore,
            balance_after: 0,
            description: 'Выплата владельцем, долг обнулен',
            performed_by_user_id: req.user!.userId,
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Debt reset successfully',
        })
      } catch (error) {
        console.error('Reset debt error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
