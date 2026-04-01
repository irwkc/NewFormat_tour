import type { Tour, TourCommissionRule } from '@prisma/client'
import type { TourParams } from '@/lib/domain/commission-calc'

/** Параметры тура для calcIncomeSplit (как в balance.ts). */
export function buildTourParamsFromTourAndRules(
  tour: Tour,
  rules: TourCommissionRule[]
): TourParams {
  const t = tour as {
    partner_commission_type?: string | null
    partner_fixed_adult_price?: unknown
    partner_fixed_child_price?: unknown
    partner_fixed_concession_price?: unknown
  }
  return {
    partner_min_adult_price: Number(tour.partner_min_adult_price),
    partner_min_child_price: Number(tour.partner_min_child_price),
    partner_min_concession_price:
      tour.partner_min_concession_price != null ? Number(tour.partner_min_concession_price) : 0,
    partner_commission_type: (t.partner_commission_type as 'fixed' | 'percentage') ?? undefined,
    partner_fixed_adult_price: t.partner_fixed_adult_price != null ? Number(t.partner_fixed_adult_price) : null,
    partner_fixed_child_price: t.partner_fixed_child_price != null ? Number(t.partner_fixed_child_price) : null,
    partner_fixed_concession_price:
      t.partner_fixed_concession_price != null ? Number(t.partner_fixed_concession_price) : null,
    partner_commission_percentage:
      tour.partner_commission_percentage != null ? Number(tour.partner_commission_percentage) : null,
    owner_min_adult_price:
      tour.owner_min_adult_price != null ? Number(tour.owner_min_adult_price) : Number(tour.partner_min_adult_price),
    owner_min_child_price:
      tour.owner_min_child_price != null ? Number(tour.owner_min_child_price) : Number(tour.partner_min_child_price),
    owner_min_concession_price:
      tour.owner_min_concession_price != null ? Number(tour.owner_min_concession_price) : 0,
    commission_type: tour.commission_type as 'percentage' | 'fixed',
    commission_percentage: tour.commission_percentage != null ? Number(tour.commission_percentage) : undefined,
    commission_fixed_amount: tour.commission_fixed_amount != null ? Number(tour.commission_fixed_amount) : undefined,
    commission_fixed_adult: tour.commission_fixed_adult != null ? Number(tour.commission_fixed_adult) : null,
    commission_fixed_child: tour.commission_fixed_child != null ? Number(tour.commission_fixed_child) : null,
    commission_fixed_concession:
      tour.commission_fixed_concession != null ? Number(tour.commission_fixed_concession) : null,
    commission_rules: rules.map((r) => ({
      threshold_adult: Number((r as { threshold_adult?: unknown }).threshold_adult ?? r.threshold_amount ?? 0),
      threshold_child: Number((r as { threshold_child?: unknown }).threshold_child ?? r.threshold_amount ?? 0),
      threshold_concession: Number(
        (r as { threshold_concession?: unknown }).threshold_concession ?? r.threshold_amount ?? 0
      ),
      commission_percentage: Number(r.commission_percentage ?? 0),
    })),
  }
}
