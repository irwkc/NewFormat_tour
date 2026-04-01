import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, TicketStatus, PaymentStatus } from '@prisma/client'
import { z } from 'zod'
import { isFlightStarted } from '@/lib/moscow-time'

const updateTourSchema = z.object({
  partner_min_adult_price: z.number().positive().optional(),
  partner_min_child_price: z.number().positive().optional().nullable(),
  partner_min_concession_price: z.number().positive().optional().nullable(),
  partner_commission_type: z.enum(['percentage', 'fixed']).optional().nullable(),
  partner_commission_percentage: z.number().min(0).max(100).optional().nullable(),
  partner_fixed_adult_price: z.number().min(0).optional().nullable(),
  partner_fixed_child_price: z.number().min(0).optional().nullable(),
  partner_fixed_concession_price: z.number().min(0).optional().nullable(),
})

// GET /api/tours/:id - детали экскурсии
// ?full_schedule=1 — все рейсы по дате (в т.ч. уже начавшиеся), для страницы экскурсии
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const fullSchedule =
      searchParams.get('full_schedule') === '1' ||
      searchParams.get('full_schedule') === 'true'

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

    const flights = tour.flights || []
    const outFlights = fullSchedule
      ? flights
      : flights.filter((f) => !isFlightStarted(f.departure_time))
    return NextResponse.json({
      success: true,
      data: { ...tour, flights: outFlights },
    })
  } catch (error) {
    console.error('Get tour error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/tours/:id - обновление цен/доли партнёра (только партнёр для своих)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.partner) {
          return NextResponse.json(
            { success: false, error: 'Only partners can update tour prices' },
            { status: 403 }
          )
        }

        const { id } = params
        const body = await request.json()
        const data = updateTourSchema.parse(body)

        const tour = await prisma.tour.findUnique({ where: { id } })
        if (!tour) {
          return NextResponse.json(
            { success: false, error: 'Tour not found' },
            { status: 404 }
          )
        }
        if (tour.created_by_user_id !== req.user!.userId) {
          return NextResponse.json(
            { success: false, error: 'You can only update your own tours' },
            { status: 403 }
          )
        }

        const updateData: Record<string, unknown> = {}
        if (data.partner_min_adult_price !== undefined) updateData.partner_min_adult_price = data.partner_min_adult_price
        if (data.partner_min_child_price !== undefined) updateData.partner_min_child_price = data.partner_min_child_price
        if (data.partner_min_concession_price !== undefined) updateData.partner_min_concession_price = data.partner_min_concession_price
        if (data.partner_commission_type !== undefined) updateData.partner_commission_type = data.partner_commission_type
        if (data.partner_commission_percentage !== undefined) updateData.partner_commission_percentage = data.partner_commission_percentage
        if (data.partner_fixed_adult_price !== undefined) updateData.partner_fixed_adult_price = data.partner_fixed_adult_price
        if (data.partner_fixed_child_price !== undefined) updateData.partner_fixed_child_price = data.partner_fixed_child_price
        if (data.partner_fixed_concession_price !== undefined) updateData.partner_fixed_concession_price = data.partner_fixed_concession_price

        const updated = await prisma.tour.update({
          where: { id },
          data: updateData,
          include: {
            category: true,
            flights: { orderBy: [{ date: 'asc' }, { departure_time: 'asc' }] },
            createdBy: { select: { id: true, full_name: true } },
            moderatedBy: { select: { id: true, full_name: true } },
          },
        })

        const filteredFlights = (updated.flights || []).filter((f) => !isFlightStarted(f.departure_time))
        return NextResponse.json({ success: true, data: { ...updated, flights: filteredFlights } })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { success: false, error: 'Invalid input', details: error.errors },
            { status: 400 }
          )
        }
        console.error('Update tour error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.partner]
  )
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

        const pendingSalesCount = await prisma.sale.count({
          where: {
            tour_id: id,
            payment_status: PaymentStatus.pending,
          },
        })

        if (pendingSalesCount > 0) {
          return NextResponse.json(
            {
              success: false,
              error:
                'Нельзя удалить экскурсию: есть неоплаченные продажи (ожидают оплаты). Дождитесь оплаты или отмените такие продажи.',
            },
            { status: 400 }
          )
        }

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
