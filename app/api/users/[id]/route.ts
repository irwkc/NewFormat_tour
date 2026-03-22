import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

// GET /api/users/:id - детальная информация о пользователе
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
            { success: false, error: 'Only owner can view user details' },
            { status: 403 }
          )
        }

        const { id } = params

        const user = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            promoter_id: true,
            full_name: true,
            phone: true,
            role: true,
            photo_url: true,
            balance: true,
            debt_to_company: true,
            is_active: true,
            email_confirmed: true,
            created_at: true,
            createdBy: {
              select: {
                id: true,
                full_name: true,
              },
            },
          },
        })

        if (!user) {
          return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 }
          )
        }

        // Получить статистику продаж
        const salesStats = await prisma.sale.aggregate({
          where: {
            OR: [
              { seller_user_id: id },
              { promoter_user_id: id },
            ],
            payment_status: 'completed',
          },
          _count: true,
          _sum: {
            total_amount: true,
          },
        })

        return NextResponse.json({
          success: true,
          data: {
            user,
            stats: {
              total_sales: salesStats._count,
              total_amount: salesStats._sum.total_amount || 0,
            },
          },
        })
      } catch (error) {
        console.error('Get user error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}

// PATCH /api/users/:id/status - блокировка/разблокировка пользователя
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json(
            { success: false, error: 'Only owner can change user status' },
            { status: 403 }
          )
        }

        const { id } = params
        const body = await request.json()
        const { is_active } = z.object({ is_active: z.boolean() }).parse(body)

        const user = await prisma.user.update({
          where: { id },
          data: {
            is_active,
          },
          select: {
            id: true,
            email: true,
            promoter_id: true,
            full_name: true,
            is_active: true,
          },
        })

        return NextResponse.json({
          success: true,
          data: user,
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { success: false, error: 'Invalid input', details: error.errors },
            { status: 400 }
          )
        }
        
        console.error('Update user status error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
