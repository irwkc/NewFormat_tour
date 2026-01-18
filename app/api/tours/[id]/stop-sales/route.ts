import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// PATCH /api/tours/:id/stop-sales - остановка продаж
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        const { id } = params

        const tour = await prisma.tour.findUnique({
          where: { id },
        })

        if (!tour) {
          return NextResponse.json(
            { success: false, error: 'Tour not found' },
            { status: 404 }
          )
        }

        // Владелец может остановить продажи на любую экскурсию
        // Партнер может остановить продажи только на свои экскурсии
        if (req.user!.role === UserRole.partner && tour.created_by_user_id !== req.user!.userId) {
          return NextResponse.json(
            { success: false, error: 'You can only stop sales for your own tours' },
            { status: 403 }
          )
        }

        if (req.user!.role !== UserRole.owner && req.user!.role !== UserRole.partner) {
          return NextResponse.json(
            { success: false, error: 'Only owner and partner can stop sales' },
            { status: 403 }
          )
        }

        const updatedTour = await prisma.tour.update({
          where: { id },
          data: {
            is_sale_stopped: true,
          },
          include: {
            category: true,
            createdBy: {
              select: {
                id: true,
                full_name: true,
              },
            },
          },
        })

        return NextResponse.json({
          success: true,
          data: updatedTour,
        })
      } catch (error) {
        console.error('Stop sales error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner, UserRole.partner]
  )
}
