import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

const bodySchema = z.object({
  add_places: z.number().int().positive('Укажите положительное количество мест'),
})

// PATCH /api/flights/:id/places — партнёр добавляет места к рейсу
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      if (req.user!.role !== UserRole.partner) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }

      const flight = await prisma.flight.findUnique({
        where: { id: params.id },
        include: { tour: true },
      })

      if (!flight) {
        return NextResponse.json({ success: false, error: 'Flight not found' }, { status: 404 })
      }

      if (flight.tour.created_by_user_id !== req.user!.userId) {
        return NextResponse.json({ success: false, error: 'Not your tour' }, { status: 403 })
      }

      const body = await request.json()
      const { add_places } = bodySchema.parse(body)

      const updated = await prisma.flight.update({
        where: { id: params.id },
        data: { max_places: flight.max_places + add_places },
      })

      return NextResponse.json({ success: true, data: updated })
    },
    [UserRole.partner]
  )
}
