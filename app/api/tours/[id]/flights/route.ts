import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// GET /api/tours/:id/flights?date=YYYY-MM-DD — рейсы на дату (для редактирования дня)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.partner) {
          return NextResponse.json(
            { success: false, error: 'Only partners can view tour flights' },
            { status: 403 }
          )
        }

        const { id: tourId } = params
        const { searchParams } = new URL(request.url)
        const dateStr = searchParams.get('date')

        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return NextResponse.json(
            { success: false, error: 'date query param required (YYYY-MM-DD)' },
            { status: 400 }
          )
        }

        const tour = await prisma.tour.findUnique({
          where: { id: tourId },
        })

        if (!tour) {
          return NextResponse.json(
            { success: false, error: 'Tour not found' },
            { status: 404 }
          )
        }

        if (tour.created_by_user_id !== req.user!.userId) {
          return NextResponse.json(
            { success: false, error: 'You can only view your own tours' },
            { status: 403 }
          )
        }

        const flights = await prisma.flight.findMany({
          where: {
            tour_id: tourId,
            date: new Date(dateStr + 'T12:00:00+03:00'),
          },
          orderBy: { departure_time: 'asc' },
        })

        return NextResponse.json({
          success: true,
          data: flights,
        })
      } catch (error) {
        console.error('Get flights error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.partner]
  )
}
