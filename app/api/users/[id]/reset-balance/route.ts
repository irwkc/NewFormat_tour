import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// POST /api/users/:id/reset-balance — выплата промоутеру/менеджеру с баланса (как выплата партнёру: тело JSON { amount })
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

        let body: { amount?: unknown } = {}
        try {
          body = (await request.json()) as { amount?: unknown }
        } catch {
          body = {}
        }
        const amountRaw = body?.amount
        const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw)

        if (!Number.isFinite(amount) || amount <= 0) {
          return NextResponse.json(
            { success: false, error: 'Укажите сумму выплаты (amount), больше 0' },
            { status: 400 }
          )
        }

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

        if (amount - balanceBefore > 0.0001) {
          return NextResponse.json(
            { success: false, error: `Сумма превышает баланс. Доступно: ${balanceBefore.toFixed(2)}₽` },
            { status: 400 }
          )
        }

        const balanceAfter = Math.round((balanceBefore - amount) * 100) / 100

        const payoutLabel =
          user.role === UserRole.promoter ? 'Выплата промоутеру' : 'Выплата менеджеру'
        const description = `${payoutLabel}: ${amount.toFixed(2)}₽`

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id },
            data: { balance: balanceAfter },
          })

          await tx.balanceHistory.create({
            data: {
              user_id: id,
              balance_type: 'balance',
              transaction_type: 'debit',
              amount,
              balance_before: balanceBefore,
              balance_after: balanceAfter,
              description,
              performed_by_user_id: req.user!.userId,
            },
          })
        })

        return NextResponse.json({
          success: true,
          message: 'Payout recorded',
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
