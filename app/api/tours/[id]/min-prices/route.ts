import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

const updateMinPricesSchema = z.object({
  owner_min_adult_price: z.number().positive(),
  owner_min_child_price: z.number().positive(),
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
          },
          include: {
            category: true,
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

        return NextResponse.json({
          success: true,
          data: tour,
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
