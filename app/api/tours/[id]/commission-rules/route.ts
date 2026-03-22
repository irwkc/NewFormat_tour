import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, CommissionType } from '@prisma/client'
import { z } from 'zod'

const ruleSchema = z.object({
  threshold_adult: z.number().min(0),
  threshold_child: z.number().min(0),
  threshold_concession: z.number().min(0),
  commission_percentage: z.number().min(0).max(100),
  order: z.number().int().min(0).optional(),
})

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
            threshold_adult: r.threshold_adult,
            threshold_child: r.threshold_child,
            threshold_concession: r.threshold_concession,
            commission_type: 'percentage' as CommissionType,
            commission_percentage: r.commission_percentage,
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
