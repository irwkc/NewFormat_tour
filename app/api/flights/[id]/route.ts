import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { ModerationStatus, UserRole } from '@prisma/client'
import { z } from 'zod'
import { isInCurrentOrNextMoscowWeeks } from '@/lib/moscow-time'

const updateFlightSchema = z.object({
  flight_number: z.string().min(1).optional(),
  departure_time: z.string().regex(/^\d{1,2}:\d{2}$/, 'Формат HH:mm').optional(),
  max_places: z.number().int().positive().optional(),
  duration_minutes: z.number().int().positive().optional().nullable(),
  boarding_location_url: z.string().url().optional().nullable().or(z.literal('')),
})

// PATCH /api/flights/:id — редактирование рейса (партнёр)
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
            { success: false, error: 'Only partners can edit flights' },
            { status: 403 }
          )
        }

        const { id } = params
        const body = await request.json()
        const data = updateFlightSchema.parse(body)

        const flight = await prisma.flight.findUnique({
          where: { id },
          include: { tour: true },
        })

        if (!flight) {
          return NextResponse.json(
            { success: false, error: 'Flight not found' },
            { status: 404 }
          )
        }

        if (flight.tour.created_by_user_id !== req.user!.userId) {
          return NextResponse.json(
            { success: false, error: 'You can only edit flights of your tours' },
            { status: 403 }
          )
        }

        const dateStr = flight.date.toISOString().split('T')[0]
        if (!isInCurrentOrNextMoscowWeeks(dateStr)) {
          return NextResponse.json(
            { success: false, error: 'Можно редактировать только рейсы текущей и следующей недели' },
            { status: 400 }
          )
        }

        const updateData: Record<string, unknown> = {}
        if (data.flight_number !== undefined) updateData.flight_number = data.flight_number
        if (data.max_places !== undefined) updateData.max_places = data.max_places
        if (data.duration_minutes !== undefined) updateData.duration_minutes = data.duration_minutes
        if (data.boarding_location_url !== undefined) {
          updateData.boarding_location_url = data.boarding_location_url || null
        }
        if (data.departure_time !== undefined) {
          const depTime = new Date(`${dateStr}T${data.departure_time}:00+03:00`)
          updateData.departure_time = depTime
        }

        const updated = await prisma.flight.update({
          where: { id },
          data: {
            ...updateData,
            // Редактирование рейса партнёром требует повторной модерации этого рейса.
            is_moderated: false,
          },
        })

        await prisma.tour.update({
          where: { id: flight.tour_id },
          data: {
            moderation_status: ModerationStatus.pending,
          },
        })

        return NextResponse.json({
          success: true,
          data: updated,
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { success: false, error: 'Invalid input', details: error.errors },
            { status: 400 }
          )
        }
        console.error('Update flight error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.partner]
  )
}
