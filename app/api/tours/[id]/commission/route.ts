import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, CommissionType } from '@prisma/client'
import { z } from 'zod'

const optionalNumber = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}, z.number().min(0).optional())

const updateCommissionSchema = z.object({
  commission_type: z.enum(['percentage', 'fixed']),
  commission_percentage: optionalNumber,
  commission_fixed_amount: optionalNumber,
  commission_fixed_adult: optionalNumber,
  commission_fixed_child: optionalNumber,
  commission_fixed_concession: optionalNumber,
}).refine((data) => {
  if (data.commission_type === 'percentage') {
    return data.commission_percentage !== undefined
  }
  return (data.commission_fixed_adult ?? data.commission_fixed_child ?? data.commission_fixed_concession ?? data.commission_fixed_amount) !== undefined
}, {
  message: "commission_percentage or commission_fixed_amount / commission_fixed_* is required based on commission_type"
})

// PATCH /api/tours/:id/commission - изменение процента промоутера (только владелец)
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
            { success: false, error: 'Only owner can update promoter percent' },
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
            commission_percentage: data.commission_percentage ?? null,
            commission_fixed_amount: data.commission_fixed_amount ?? null,
            commission_fixed_adult: data.commission_fixed_adult ?? null,
            commission_fixed_child: data.commission_fixed_child ?? null,
            commission_fixed_concession: data.commission_fixed_concession ?? null,
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
        
        console.error('Update promoter percent error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
