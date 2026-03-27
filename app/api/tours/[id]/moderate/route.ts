import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, ModerationStatus, CommissionType } from '@prisma/client'
import { z } from 'zod'
import { calcIncomeSplit, getPreviewScenarios, getPreviewScenariosForRule } from '@/lib/domain/commission-calc'
import { isDateInPast, isFlightStarted } from '@/lib/moscow-time'

const optionalNumber = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}, z.number().min(0).optional())

const requiredPrice = z.preprocess((v) => Number(v), z.number().min(0.01))

const ruleSchema = z.object({
  threshold_adult: z.number().min(0),
  threshold_child: z.number().min(0),
  threshold_concession: z.number().min(0),
  commission_percentage: z.number().min(0).max(100),
})

const moderateSchema = z.object({
  moderation_status: z.enum(['approved', 'rejected']),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  owner_min_adult_price: requiredPrice,
  owner_min_child_price: requiredPrice,
  owner_min_concession_price: optionalNumber,
  commission_type: z.enum(['percentage', 'fixed']),
  commission_percentage: optionalNumber,
  commission_fixed_amount: optionalNumber,
  commission_fixed_adult: optionalNumber,
  commission_fixed_child: optionalNumber,
  commission_fixed_concession: optionalNumber,
  commission_rules: z.array(ruleSchema).optional(),
}).refine((data) => {
  if (data.commission_type === 'percentage') {
    return data.commission_percentage !== undefined
  }
  return (data.commission_fixed_adult ?? data.commission_fixed_child ?? data.commission_fixed_concession ?? data.commission_fixed_amount) !== undefined
}, {
  message: "Укажите процент или фикс. суммы по типам билетов",
})

// POST /api/tours/:id/moderate - модерация экскурсии (только владелец)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json(
            { success: false, error: 'Only owner can moderate tours' },
            { status: 403 }
          )
        }

        const { id } = params
        const body = await request.json()
        const data = moderateSchema.parse(body)

        if (data.moderation_status === 'approved') {
          if (data.dates && data.dates.length > 0) {
            for (const d of data.dates) {
              if (isDateInPast(d)) {
                return NextResponse.json(
                  { success: false, error: `Нельзя применять модерацию к прошедшим датам (${d})` },
                  { status: 400 }
                )
              }
            }
          }
          const existing = await prisma.tour.findUnique({ where: { id } })
          if (!existing) {
            return NextResponse.json({ success: false, error: 'Tour not found' }, { status: 404 })
          }
          const rulesRaw = (data.commission_rules || []).filter(
            (r: { commission_percentage?: number }) => r && Number.isFinite(Number(r.commission_percentage ?? 0)) && (r.commission_percentage ?? 0) >= 0
          )
          const rules = rulesRaw.map((r: { threshold_adult?: number; threshold_child?: number; threshold_concession?: number; commission_percentage?: number }) => ({
            threshold_adult: Number(r.threshold_adult ?? 0) || 0,
            threshold_child: Number(r.threshold_child ?? 0) || 0,
            threshold_concession: Number(r.threshold_concession ?? 0) || 0,
            commission_percentage: Number(r.commission_percentage ?? 0) || 0,
          }))

          const tourParams = {
            partner_min_adult_price: Number(existing.partner_min_adult_price),
            partner_min_child_price: Number(existing.partner_min_child_price),
            partner_min_concession_price: existing.partner_min_concession_price != null ? Number(existing.partner_min_concession_price) : 0,
            partner_commission_type: (existing.partner_commission_type as 'fixed' | 'percentage') ?? (existing.partner_commission_percentage != null ? 'percentage' : 'fixed'),
            partner_fixed_adult_price: existing.partner_fixed_adult_price != null ? Number(existing.partner_fixed_adult_price) : null,
            partner_fixed_child_price: existing.partner_fixed_child_price != null ? Number(existing.partner_fixed_child_price) : null,
            partner_fixed_concession_price: existing.partner_fixed_concession_price != null ? Number(existing.partner_fixed_concession_price) : null,
            partner_commission_percentage: existing.partner_commission_percentage != null ? Number(existing.partner_commission_percentage) : null,
            owner_min_adult_price: data.owner_min_adult_price,
            owner_min_child_price: data.owner_min_child_price,
            owner_min_concession_price: data.owner_min_concession_price ?? 0,
            commission_type: data.commission_type,
            commission_percentage: data.commission_percentage,
            commission_fixed_amount: data.commission_fixed_amount,
            commission_fixed_adult: data.commission_fixed_adult,
            commission_fixed_child: data.commission_fixed_child,
            commission_fixed_concession: data.commission_fixed_concession,
            commission_rules: rules.length ? rules : undefined,
          }

          const minScenarios = getPreviewScenarios(tourParams)
          const badMin = minScenarios.find((s) => calcIncomeSplit(s, tourParams).owner <= 0)
          if (badMin) {
            return NextResponse.json(
              { success: false, error: 'Нельзя одобрить: при этих параметрах владелец не зарабатывает (доход ≤ 0). Уменьшите процент промоутера или увеличьте минимальные цены.' },
              { status: 400 }
            )
          }

          for (const rule of rules) {
            const ruleParams = { ...tourParams, commission_rules: [rule] }
            const ruleScenarios = getPreviewScenariosForRule(tourParams, rule)
            const badRule = ruleScenarios.find((s) => calcIncomeSplit(s, ruleParams).owner <= 0)
            if (badRule) {
              return NextResponse.json(
                { success: false, error: `Нельзя одобрить: при пороге взр. ${rule.threshold_adult}₽, дет. ${rule.threshold_child}₽, льг. ${rule.threshold_concession}₽ (${rule.commission_percentage}%) владелец не зарабатывает. Уменьшите процент или измените пороги.` },
                { status: 400 }
              )
            }
          }
        }

        const tour = await prisma.tour.update({
          where: { id },
          data: {
            moderation_status: ModerationStatus.pending,
            moderated_by_user_id: req.user!.userId,
            moderated_at: new Date(),
            owner_min_adult_price: data.owner_min_adult_price,
            owner_min_child_price: data.owner_min_child_price,
            owner_min_concession_price: data.owner_min_concession_price || null,
            commission_type: data.commission_type as CommissionType,
            commission_percentage: data.commission_percentage ?? null,
            commission_fixed_amount: data.commission_fixed_amount ?? null,
            commission_fixed_adult: data.commission_fixed_adult ?? null,
            commission_fixed_child: data.commission_fixed_child ?? null,
            commission_fixed_concession: data.commission_fixed_concession ?? null,
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

        const dateSet = data.dates && data.dates.length > 0 ? new Set(data.dates) : null
        const selectedFlightIds = (tour.flights || [])
          .filter((flight) => {
            const flightDateStr = flight.date instanceof Date
              ? flight.date.toISOString().split('T')[0]
              : String(flight.date).split('T')[0]
            return !dateSet || dateSet.has(flightDateStr)
          })
          .map((flight) => flight.id)

        if (selectedFlightIds.length > 0) {
          await prisma.flight.updateMany({
            where: { id: { in: selectedFlightIds } },
            data: { is_moderated: data.moderation_status === 'approved' },
          })
        }

        // После точечной модерации пересчитываем общий статус экскурсии:
        // - если есть хотя бы один неотмодерированный будущий рейс -> pending
        // - если все будущие рейсы отмодерированы -> approved
        // - если будущих рейсов нет -> rejected (или пусто)
        const refreshedFlights = await prisma.flight.findMany({
          where: { tour_id: id },
        })
        const futureFlights = refreshedFlights.filter((f) => !isFlightStarted(f.departure_time))
        const hasAnyFuture = futureFlights.length > 0
        const hasUnmoderatedFuture = futureFlights.some((f) => !f.is_moderated)
        const nextStatus: ModerationStatus = !hasAnyFuture
          ? ModerationStatus.rejected
          : hasUnmoderatedFuture
            ? ModerationStatus.pending
            : ModerationStatus.approved

        await prisma.tour.update({
          where: { id },
          data: { moderation_status: nextStatus },
        })

        const { flights, ...tourWithoutFlights } = tour
        const filteredFlights = (tour.flights || []).filter((f) => !isFlightStarted(f.departure_time))
        return NextResponse.json({
          success: true,
          data: { ...tourWithoutFlights, flights: filteredFlights },
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { success: false, error: 'Invalid input', details: error.errors },
            { status: 400 }
          )
        }
        
        console.error('Moderate tour error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
