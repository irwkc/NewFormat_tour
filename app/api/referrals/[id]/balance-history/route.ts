import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// GET /api/referrals/:id/balance-history - история баланса реферального промоутера (для владельца)
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
            { success: false, error: 'Only owner can view referral balance history' },
            { status: 403 }
          )
        }

        const { id } = params

        // Проверить, что пользователь является промоутером и был приглашен другим промоутером
        const promoter = await prisma.user.findUnique({
          where: { id },
          include: {
            createdBy: {
              select: {
                role: true,
              },
            },
          },
        })

        if (!promoter || promoter.role !== UserRole.promoter) {
          return NextResponse.json(
            { success: false, error: 'User not found or not a promoter' },
            { status: 404 }
          )
        }

        // Получить историю баланса
        const balanceHistory = await prisma.balanceHistory.findMany({
          where: {
            user_id: id,
          },
          include: {
            ticket: {
              include: {
                tour: {
                  select: {
                    company: true,
                    flight_number: true,
                    date: true,
                  },
                },
              },
            },
            sale: {
              include: {
                tour: {
                  select: {
                    company: true,
                    flight_number: true,
                    date: true,
                  },
                },
              },
            },
          },
          orderBy: { created_at: 'desc' },
        })

        return NextResponse.json({
          success: true,
          data: balanceHistory,
        })
      } catch (error) {
        console.error('Get referral balance history error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
}
