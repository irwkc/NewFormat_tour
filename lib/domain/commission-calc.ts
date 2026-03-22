/**
 * Расчёт долей при продаже: партнёр, промоутер/менеджер, владелец.
 * Модели (везде партнёр выставляет мин. цены билетов):
 * 1. Партнёр мин. цены + фикс с билета → Owner фикс. (promoter)
 * 2. Партнёр мин. цены + фикс с билета → Owner % + пороги
 * 3. Партнёр мин. цены + процент → Owner фикс. (promoter)
 * 4. Партнёр мин. цены + процент → Owner % + пороги
 */

export type CommissionRule = {
  threshold_adult: number
  threshold_child: number
  threshold_concession: number
  commission_percentage: number
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
  partner_commission_type?: 'fixed' | 'percentage' | null
  partner_fixed_adult_price?: number | null
  partner_fixed_child_price?: number | null
  partner_fixed_concession_price?: number | null
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

/** Партнёр получает: фикс с билета каждого типа или % от суммы */
function calcPartnerShare(
  totalAmount: number,
  adultCount: number,
  childCount: number,
  concessionCount: number,
  partnerType: 'fixed' | 'percentage' | null | undefined,
  partnerMinAdult: number,
  partnerMinChild: number,
  partnerMinConcession: number,
  partnerFixedAdult: number | null | undefined,
  partnerFixedChild: number | null | undefined,
  partnerFixedConcession: number | null | undefined,
  partnerPercent: number | null | undefined
): number {
  if (partnerType === 'percentage' && partnerPercent != null && partnerPercent > 0) {
    return totalAmount * (partnerPercent / 100)
  }
  const useFixed = partnerType === 'fixed' || (partnerType != 'percentage' && partnerFixedAdult != null)
  if (useFixed) {
    const fa = partnerFixedAdult ?? partnerMinAdult
    const fc = partnerFixedChild ?? partnerMinChild
    const fconc = partnerFixedConcession ?? partnerMinConcession
    return adultCount * fa + childCount * fc + concessionCount * fconc
  }
  return 0
}

type TicketType = 'adult' | 'child' | 'concession'

/** Процент промоутера за одну позицию: правило по цене билета (порог для типа ≤ цена). */
function calcCommissionForUnitPrice(
  unitPrice: number,
  ticketType: TicketType,
  rules: CommissionRule[] | undefined,
  fallbackPercent: number | null | undefined
): number {
  if (rules && rules.length > 0) {
    const threshold = ticketType === 'adult' ? (r: CommissionRule) => r.threshold_adult
      : ticketType === 'child' ? (r: CommissionRule) => r.threshold_child
      : (r: CommissionRule) => r.threshold_concession
    const sorted = [...rules].filter((r) => threshold(r) <= unitPrice)
      .sort((a, b) => threshold(b) - threshold(a))
    const rule = sorted[0]
    if (rule && rule.commission_percentage != null) {
      return unitPrice * (rule.commission_percentage / 100)
    }
  }
  if (fallbackPercent != null) {
    return unitPrice * (fallbackPercent / 100)
  }
  return 0
}

/** Промоутер получает: %/фикс с каждой позиции. Пороги — по цене за билет (не по сумме). */
function calcPromoterShare(
  sale: SaleParams,
  commissionType: 'percentage' | 'fixed',
  commissionPercent: number | null | undefined,
  commissionFixed: number | null | undefined,
  rules: CommissionRule[] | undefined
): number {
  const childPrice = sale.child_price || 0
  const concessionPrice = sale.concession_price ?? childPrice
  const fallbackPercent = commissionType === 'percentage' ? commissionPercent : undefined

  let total = 0
  for (let i = 0; i < sale.adult_count; i++) {
    total += calcCommissionForUnitPrice(sale.adult_price, 'adult', rules, fallbackPercent)
  }
  for (let i = 0; i < sale.child_count; i++) {
    total += calcCommissionForUnitPrice(childPrice, 'child', rules, fallbackPercent)
  }
  for (let i = 0; i < sale.concession_count; i++) {
    total += calcCommissionForUnitPrice(concessionPrice, 'concession', rules, fallbackPercent)
  }

  // Без правил и при базовом фиксе — одна сумма на всю продажу
  if (total === 0 && commissionType === 'fixed' && commissionFixed != null) {
    return commissionFixed
  }
  return total
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
    tour.partner_commission_type ?? (tour.partner_commission_percentage != null ? 'percentage' : 'fixed'),
    tour.partner_min_adult_price,
    tour.partner_min_child_price,
    tour.partner_min_concession_price ?? 0,
    tour.partner_fixed_adult_price != null ? Number(tour.partner_fixed_adult_price) : null,
    tour.partner_fixed_child_price != null ? Number(tour.partner_fixed_child_price) : null,
    tour.partner_fixed_concession_price != null ? Number(tour.partner_fixed_concession_price) : null,
    tour.partner_commission_percentage
  )
  const promoter = calcPromoterShare(
    sale,
    tour.commission_type,
    tour.commission_percentage,
    tour.commission_fixed_amount,
    tour.commission_rules
  )
  const owner = Math.max(0, total - partner - promoter)
  return { partner, promoter, owner, total }
}

/** Примеры продаж для превью: 1 взрослый, 1 детский, 1 льготный */
export function getPreviewScenarios(tour: TourParams): SaleParams[] {
  const { owner_min_adult_price, owner_min_child_price, owner_min_concession_price } = tour
  const childPrice = owner_min_child_price || 0
  const concessionPrice = owner_min_concession_price ?? childPrice

  return [
    { adult_count: 1, child_count: 0, concession_count: 0, adult_price: owner_min_adult_price, child_price: childPrice, concession_price: concessionPrice, total_amount: owner_min_adult_price },
    { adult_count: 0, child_count: 1, concession_count: 0, adult_price: owner_min_adult_price, child_price: childPrice, concession_price: concessionPrice, total_amount: childPrice },
    { adult_count: 0, child_count: 0, concession_count: 1, adult_price: owner_min_adult_price, child_price: childPrice, concession_price: concessionPrice, total_amount: concessionPrice },
  ]
}
