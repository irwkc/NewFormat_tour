import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

const bodySchema = z.object({
  reserved: z.number().int().min(0),
})

// PATCH /api/flights/:id/reserved - партнёр задаёт/меняет зарезервированные места
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
      const { reserved } = bodySchema.parse(body)

      const availableForReserve = flight.max_places - flight.current_booked_places
      if (reserved > availableForReserve) {
        return NextResponse.json(
          { success: false, error: `Можно зарезервировать не более ${availableForReserve} мест` },
          { status: 400 }
        )
      }

      const updated = await prisma.flight.update({
        where: { id: params.id },
        data: { reserved_for_partner: reserved },
      })

      return NextResponse.json({ success: true, data: updated })
    },
    [UserRole.partner]
  )
}
