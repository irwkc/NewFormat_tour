import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, TicketStatus } from '@prisma/client'

// GET /api/tours/:id - детали экскурсии
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const tour = await prisma.tour.findUnique({
      where: { id },
      include: {
        category: true,
        flights: {
          orderBy: [
            { date: 'asc' },
            { departure_time: 'asc' },
          ],
        },
        createdBy: {
          select: {
            id: true,
            full_name: true,
          },
        },
        moderatedBy: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    })

    if (!tour) {
      return NextResponse.json(
        { success: false, error: 'Tour not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: tour,
    })
  } catch (error) {
    console.error('Get tour error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/tours/:id - удаление экскурсии (партнер для своих экскурсий)
export async function DELETE(
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

        // Владелец может удалить любую экскурсию
        // Партнер может удалить только свои экскурсии
        if (req.user!.role === UserRole.partner && tour.created_by_user_id !== req.user!.userId) {
          return NextResponse.json(
            { success: false, error: 'You can only delete your own tours' },
            { status: 403 }
          )
        }

        if (req.user!.role !== UserRole.owner && req.user!.role !== UserRole.partner) {
          return NextResponse.json(
            { success: false, error: 'Only owner and partner can delete tours' },
            { status: 403 }
          )
        }

        // Проверить, есть ли проданные билеты
        const ticketsCount = await prisma.ticket.count({
          where: {
            tour_id: id,
            ticket_status: {
              in: [TicketStatus.sold, TicketStatus.used],
            },
          },
        })

        if (ticketsCount > 0) {
          return NextResponse.json(
            { success: false, error: 'Cannot delete tour with sold tickets' },
            { status: 400 }
          )
        }

        // Удалить продажи со статусом pending
        await prisma.sale.deleteMany({
          where: {
            tour_id: id,
            payment_status: 'pending',
          },
        })

        // Удалить экскурсию
        await prisma.tour.delete({
          where: { id },
        })

        return NextResponse.json({
          success: true,
          message: 'Tour deleted successfully',
        })
      } catch (error) {
        console.error('Delete tour error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner, UserRole.partner]
  )
}
