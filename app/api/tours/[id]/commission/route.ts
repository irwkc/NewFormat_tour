import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, CommissionType } from '@prisma/client'
import { z } from 'zod'

const updateCommissionSchema = z.object({
  commission_type: z.enum(['percentage', 'fixed']),
  commission_percentage: z.number().positive().optional(),
  commission_fixed_amount: z.number().positive().optional(),
}).refine((data) => {
  if (data.commission_type === 'percentage') {
    return data.commission_percentage !== undefined
  } else {
    return data.commission_fixed_amount !== undefined
  }
}, {
  message: "commission_percentage or commission_fixed_amount is required based on commission_type"
})

// PATCH /api/tours/:id/commission - изменение комиссии (только владелец)
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
            { success: false, error: 'Only owner can update commission' },
            { status: 403 }
          )
        }

        const { id } = params
        const body = await request.json()
        const data = updateCommissionSchema.parse(body)

        const tour = await prisma.tour.update({
          where: { id },
          data: {
            commission_type: data.commission_type as CommissionType,
            commission_percentage: data.commission_percentage || null,
            commission_fixed_amount: data.commission_fixed_amount || null,
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
        
        console.error('Update commission error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
