import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, CommissionType } from '@prisma/client'
import { z } from 'zod'

const ruleSchema = z.object({
  threshold_amount: z.number().min(0),
  commission_type: z.enum(['percentage', 'fixed']),
  commission_percentage: z.number().min(0).max(100).optional(),
  commission_fixed_amount: z.number().min(0).optional(),
  order: z.number().int().min(0).optional(),
}).refine((data) => {
  if (data.commission_type === 'percentage') {
    return data.commission_percentage !== undefined
  }
  return data.commission_fixed_amount !== undefined
}, { message: 'commission_percentage or commission_fixed_amount required' })

const updateRulesSchema = z.object({
  rules: z.array(ruleSchema),
})

// GET /api/tours/:id/commission-rules
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      if (req.user!.role !== UserRole.owner) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
      const rules = await prisma.tourCommissionRule.findMany({
        where: { tour_id: params.id },
        orderBy: { order: 'asc' },
      })
      return NextResponse.json({ success: true, data: rules })
    },
    [UserRole.owner]
  )
}

// PATCH /api/tours/:id/commission-rules
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      if (req.user!.role !== UserRole.owner) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }

      const tour = await prisma.tour.findUnique({
        where: { id: params.id },
      })
      if (!tour) {
        return NextResponse.json({ success: false, error: 'Tour not found' }, { status: 404 })
      }

      const body = await request.json()
      const { rules } = updateRulesSchema.parse(body)

      await prisma.tourCommissionRule.deleteMany({
        where: { tour_id: params.id },
      })

      if (rules.length > 0) {
        await prisma.tourCommissionRule.createMany({
          data: rules.map((r, i) => ({
            tour_id: params.id,
            threshold_amount: r.threshold_amount,
            commission_type: r.commission_type as CommissionType,
            commission_percentage: r.commission_type === 'percentage' ? r.commission_percentage : null,
            commission_fixed_amount: r.commission_type === 'fixed' ? r.commission_fixed_amount : null,
            order: r.order ?? i,
          })),
        })
      }

      const updated = await prisma.tourCommissionRule.findMany({
        where: { tour_id: params.id },
        orderBy: { order: 'asc' },
      })
      return NextResponse.json({ success: true, data: updated })
    },
    [UserRole.owner]
  )
}
