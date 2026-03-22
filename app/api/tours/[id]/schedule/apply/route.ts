import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { isInCurrentMoscowWeek, isDateInPast } from '@/lib/moscow-time'

const flightTemplateSchema = z.object({
  flight_number: z.string().min(1),
  departure_time: z.string().regex(/^\d{1,2}:\d{2}$/, 'Формат HH:mm'),
  max_places: z.number().int().positive(),
  duration_minutes: z.number().int().positive().optional().nullable(),
  boarding_location_url: z.string().url().optional().nullable().or(z.literal('')),
})

const applySchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
  prices: z.object({
    partner_min_adult_price: z.number().positive(),
    partner_min_child_price: z.number().positive().optional().nullable(),
    partner_min_concession_price: z.number().positive().optional().nullable(),
    partner_commission_type: z.enum(['percentage', 'fixed']).optional().nullable(),
    partner_commission_percentage: z.number().min(0).max(100).optional().nullable(),
    partner_fixed_adult_price: z.number().min(0).optional().nullable(),
    partner_fixed_child_price: z.number().min(0).optional().nullable(),
    partner_fixed_concession_price: z.number().min(0).optional().nullable(),
  }).optional(),
  flights: z.array(flightTemplateSchema).min(1),
})

// POST /api/tours/:id/schedule/apply — применить расписание к выбранным дням
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.partner) {
          return NextResponse.json(
            { success: false, error: 'Only partners can apply schedule' },
            { status: 403 }
          )
        }

        const { id: tourId } = params
        const body = await request.json()
        const data = applySchema.parse(body)

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
            { success: false, error: 'You can only edit your own tours' },
            { status: 403 }
          )
        }

        for (const d of data.dates) {
          if (isDateInPast(d)) {
            return NextResponse.json(
              { success: false, error: `Нельзя создавать рейсы на прошедшие даты (${d})` },
              { status: 400 }
            )
          }
          if (!isInCurrentMoscowWeek(d)) {
            return NextResponse.json(
              { success: false, error: `Дата ${d} не входит в текущую неделю` },
              { status: 400 }
            )
          }
        }

        const priceData = data.prices ? {
          partner_min_adult_price: data.prices.partner_min_adult_price,
          partner_min_child_price: data.prices.partner_min_child_price ?? null,
          partner_min_concession_price: data.prices.partner_min_concession_price ?? null,
          partner_commission_type: data.prices.partner_commission_type ?? null,
          partner_commission_percentage: data.prices.partner_commission_percentage ?? null,
          partner_fixed_adult_price: data.prices.partner_fixed_adult_price ?? null,
          partner_fixed_child_price: data.prices.partner_fixed_child_price ?? null,
          partner_fixed_concession_price: data.prices.partner_fixed_concession_price ?? null,
        } : {}

        if (Object.keys(priceData).length > 0) {
          await prisma.tour.update({
            where: { id: tourId },
            data: priceData as Prisma.TourUpdateInput,
          })
        }

        const created: { id: string; date: string; flight_number: string }[] = []
        const flightPriceData = data.prices ? {
          partner_min_adult_price: data.prices.partner_min_adult_price,
          partner_min_child_price: data.prices.partner_min_child_price ?? null,
          partner_min_concession_price: data.prices.partner_min_concession_price ?? null,
        } : {}

        for (const dateStr of data.dates) {
          const dateObj = new Date(dateStr + 'T12:00:00+03:00')
          for (const f of data.flights) {
            const departureTime = new Date(`${dateStr}T${f.departure_time}:00+03:00`)

            const flight = await prisma.flight.create({
              data: {
                tour_id: tourId,
                flight_number: f.flight_number,
                departure_time: departureTime,
                date: dateObj,
                max_places: f.max_places,
                duration_minutes: f.duration_minutes ?? null,
                boarding_location_url: f.boarding_location_url || null,
                ...flightPriceData,
              },
            })
            created.push({
              id: flight.id,
              date: dateStr,
              flight_number: f.flight_number,
            })
          }
        }

        return NextResponse.json({
          success: true,
          data: { created },
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { success: false, error: 'Invalid input', details: error.errors },
            { status: 400 }
          )
        }
        console.error('Apply schedule error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.partner]
  )
}
