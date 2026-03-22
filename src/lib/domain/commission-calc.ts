/**
 * Расчёт долей при продаже: партнёр, промоутер/менеджер, владелец.
 * Модели:
 * 1. Партнёр мин. цены → Owner фикс. (promoter fixed)
 * 2. Партнёр мин. цены → Owner % + пороги (promoter % with thresholds)
 * 3. Партнёр % → Owner фикс. (promoter fixed)
 * 4. Партнёр % → Owner % + пороги (promoter % with thresholds)
 */

export type CommissionRule = {
  threshold_amount: number
  commission_type: 'percentage' | 'fixed'
  commission_percentage?: number
  commission_fixed_amount?: number
}

export type SaleParams = {
  adult_count: number
  child_count: number
  concession_count: number
  adult_price: number
  child_price: number
  concession_price: number
  total_amount: number
}

export type TourParams = {
  partner_min_adult_price: number
  partner_min_child_price: number
  partner_min_concession_price?: number | null
  partner_commission_percentage?: number | null
  owner_min_adult_price: number
  owner_min_child_price: number
  owner_min_concession_price?: number | null
  commission_type: 'percentage' | 'fixed'
  commission_percentage?: number | null
  commission_fixed_amount?: number | null
  commission_rules?: CommissionRule[]
}

export type IncomeSplit = {
  partner: number
  promoter: number
  owner: number
  total: number
}

/** Партнёр получает: мин. цены или % от суммы */
function calcPartnerShare(
  totalAmount: number,
  adultCount: number,
  childCount: number,
  concessionCount: number,
  partnerMinAdult: number,
  partnerMinChild: number,
  partnerMinConcession: number,
  partnerPercent: number | null | undefined
): number {
  if (partnerPercent != null && partnerPercent > 0) {
    return totalAmount * (partnerPercent / 100)
  }
  return (
    adultCount * partnerMinAdult +
    childCount * partnerMinChild +
    concessionCount * partnerMinConcession
  )
}

/** Промоутер получает: фикс. (с продажи) или % (с учётом порогов) */
function calcPromoterShare(
  totalAmount: number,
  commissionType: 'percentage' | 'fixed',
  commissionPercent: number | null | undefined,
  commissionFixed: number | null | undefined,
  rules: CommissionRule[] | undefined
): number {
  let amount = 0

  if (rules && rules.length > 0) {
    const sorted = [...rules].filter((r) => r.threshold_amount <= totalAmount)
      .sort((a, b) => b.threshold_amount - a.threshold_amount)
    const rule = sorted[0]
    if (rule) {
      if (rule.commission_type === 'percentage' && rule.commission_percentage != null) {
        amount = totalAmount * (rule.commission_percentage / 100)
      } else if (rule.commission_type === 'fixed' && rule.commission_fixed_amount != null) {
        amount = rule.commission_fixed_amount
      }
    }
  }

  if (amount === 0) {
    if (commissionType === 'percentage' && commissionPercent != null) {
      amount = totalAmount * (commissionPercent / 100)
    } else if (commissionType === 'fixed' && commissionFixed != null) {
      amount = commissionFixed
    }
  }

  return amount
}

/** Расчёт при заданных параметрах продажи и настроек тура */
export function calcIncomeSplit(
  sale: SaleParams,
  tour: TourParams
): IncomeSplit {
  const total = sale.total_amount
  const partner = calcPartnerShare(
    total,
    sale.adult_count,
    sale.child_count,
    sale.concession_count,
    tour.partner_min_adult_price,
    tour.partner_min_child_price,
    tour.partner_min_concession_price ?? 0,
    tour.partner_commission_percentage
  )
  const promoter = calcPromoterShare(
    total,
    tour.commission_type,
    tour.commission_percentage,
    tour.commission_fixed_amount,
    tour.commission_rules
  )
  const owner = Math.max(0, total - partner - promoter)
  return { partner, promoter, owner, total }
}

/** Примеры продаж для превью (минимальная и выше) */
export function getPreviewScenarios(tour: TourParams): SaleParams[] {
  const { owner_min_adult_price, owner_min_child_price, owner_min_concession_price } = tour
  const childPrice = owner_min_child_price || 0
  const concessionPrice = owner_min_concession_price ?? childPrice

  return [
    { adult_count: 1, child_count: 0, concession_count: 0, adult_price: owner_min_adult_price, child_price: childPrice, concession_price: concessionPrice, total_amount: owner_min_adult_price },
    { adult_count: 2, child_count: 0, concession_count: 0, adult_price: owner_min_adult_price, child_price: childPrice, concession_price: concessionPrice, total_amount: 2 * owner_min_adult_price },
    { adult_count: 1, child_count: 1, concession_count: 0, adult_price: owner_min_adult_price, child_price: childPrice, concession_price: concessionPrice, total_amount: owner_min_adult_price + childPrice },
    { adult_count: 1, child_count: 0, concession_count: 0, adult_price: owner_min_adult_price * 1.2, child_price: childPrice, concession_price: concessionPrice, total_amount: Math.round(owner_min_adult_price * 1.2 * 100) / 100 },
    { adult_count: 2, child_count: 1, concession_count: 0, adult_price: owner_min_adult_price, child_price: childPrice, concession_price: concessionPrice, total_amount: 2 * owner_min_adult_price + childPrice },
  ]
}
