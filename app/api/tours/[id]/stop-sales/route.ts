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
          include: {
            flights: true,
          },
        })

        if (!tour) {
          return NextResponse.json(
            { success: false, error: 'Tour not found' },
            { status: 404 }
          )
        }

        // Только партнёр может остановить продажи (владелец — нет)
        if (req.user!.role !== UserRole.partner || tour.created_by_user_id !== req.user!.userId) {
          return NextResponse.json(
            { success: false, error: 'Only partner can stop sales for their tours' },
            { status: 403 }
          )
        }

        // Остановить продажи для всех рейсов тура
        await prisma.flight.updateMany({
          where: {
            tour_id: id,
          },
          data: {
            is_sale_stopped: true,
          },
        })

        const updatedTour = await prisma.tour.findUnique({
          where: { id },
          include: {
            category: true,
            flights: true,
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
    [UserRole.partner]
  )
}
