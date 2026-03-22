import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

const updateMinPricesSchema = z.object({
  owner_min_adult_price: z.number().positive(),
  owner_min_child_price: z.number().positive(),
  owner_min_concession_price: z.number().positive().optional(),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
})

// PATCH /api/tours/:id/min-prices - изменение минимальных цен (только владелец)
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
            { success: false, error: 'Only owner can update min prices' },
            { status: 403 }
          )
        }

        const { id } = params
        const body = await request.json()
        const data = updateMinPricesSchema.parse(body)

        const tour = await prisma.tour.update({
          where: { id },
          data: {
            owner_min_adult_price: data.owner_min_adult_price,
            owner_min_child_price: data.owner_min_child_price,
            owner_min_concession_price: data.owner_min_concession_price || null,
          },
          include: {
            category: true,
            flights: true,
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

        if (data.dates && data.dates.length > 0 && tour.flights.length > 0) {
          const dateSet = new Set(data.dates)
          for (const flight of tour.flights) {
            const flightDateStr = flight.date instanceof Date
              ? flight.date.toISOString().split('T')[0]
              : String(flight.date).split('T')[0]
            if (dateSet.has(flightDateStr)) {
              await prisma.flight.update({
                where: { id: flight.id },
                data: { is_moderated: true },
              })
            }
          }
        }

        const { flights, ...tourWithoutFlights } = tour
        return NextResponse.json({
          success: true,
          data: { ...tourWithoutFlights, flights: tour.flights },
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { success: false, error: 'Invalid input', details: error.errors },
            { status: 400 }
          )
        }
        
        console.error('Update min prices error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
