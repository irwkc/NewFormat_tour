import { prisma } from '@/lib/prisma'
import { TicketStatus, PaymentMethod } from '@prisma/client'
import { calcIncomeSplit } from '@/lib/domain/commission-calc'

/**
 * Обновление баланса при подтверждении билета.
 * Процент промоутера считается по каждой позиции: пороги применяются к цене за билет, не к сумме.
 */
export async function updateBalanceOnTicketConfirm(
  ticketId: string,
  performedByUserId?: string
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      sale: {
        include: {
          seller: true,
          promoter: true,
          tour: true,
        },
      },
    },
  })

  if (!ticket || ticket.ticket_status !== TicketStatus.sold) {
    throw new Error('Ticket not found or not in sold status')
  }

  const { sale } = ticket
  const tour = sale.tour
  const paymentMethod = sale.payment_method

  const seller = sale.promoter || sale.seller
  const isPromoterSale = !!sale.promoter_user_id
  const isManagerSaleForPromoter = sale.seller.role === 'manager' && isPromoterSale

  const rules = await prisma.tourCommissionRule.findMany({
    where: { tour_id: tour.id },
    orderBy: { order: 'asc' },
  })

  const saleParams = {
    adult_count: sale.adult_count,
    child_count: sale.child_count || 0,
    concession_count: sale.concession_count || 0,
    adult_price: Number(sale.adult_price),
    child_price: sale.child_price != null ? Number(sale.child_price) : 0,
    concession_price: sale.concession_price != null ? Number(sale.concession_price) : 0,
    total_amount: Number(sale.total_amount),
  }

  const t = tour as {
    partner_commission_type?: string | null
    partner_fixed_adult_price?: unknown
    partner_fixed_child_price?: unknown
    partner_fixed_concession_price?: unknown
  }
  const tourParams = {
    partner_min_adult_price: Number(tour.partner_min_adult_price),
    partner_min_child_price: Number(tour.partner_min_child_price),
    partner_min_concession_price: tour.partner_min_concession_price != null ? Number(tour.partner_min_concession_price) : 0,
    partner_commission_type: (t.partner_commission_type as 'fixed' | 'percentage') ?? undefined,
    partner_fixed_adult_price: t.partner_fixed_adult_price != null ? Number(t.partner_fixed_adult_price) : null,
    partner_fixed_child_price: t.partner_fixed_child_price != null ? Number(t.partner_fixed_child_price) : null,
    partner_fixed_concession_price: t.partner_fixed_concession_price != null ? Number(t.partner_fixed_concession_price) : null,
    partner_commission_percentage: tour.partner_commission_percentage != null ? Number(tour.partner_commission_percentage) : null,
    owner_min_adult_price: tour.owner_min_adult_price != null ? Number(tour.owner_min_adult_price) : Number(tour.partner_min_adult_price),
    owner_min_child_price: tour.owner_min_child_price != null ? Number(tour.owner_min_child_price) : Number(tour.partner_min_child_price),
    owner_min_concession_price: tour.owner_min_concession_price != null ? Number(tour.owner_min_concession_price) : 0,
    commission_type: tour.commission_type as 'percentage' | 'fixed',
    commission_percentage: tour.commission_percentage != null ? Number(tour.commission_percentage) : undefined,
    commission_fixed_amount: tour.commission_fixed_amount != null ? Number(tour.commission_fixed_amount) : undefined,
    commission_fixed_adult: tour.commission_fixed_adult != null ? Number(tour.commission_fixed_adult) : null,
    commission_fixed_child: tour.commission_fixed_child != null ? Number(tour.commission_fixed_child) : null,
    commission_fixed_concession: tour.commission_fixed_concession != null ? Number(tour.commission_fixed_concession) : null,
    commission_rules: rules.map((r) => ({
      threshold_adult: Number((r as any).threshold_adult ?? r.threshold_amount ?? 0),
      threshold_child: Number((r as any).threshold_child ?? r.threshold_amount ?? 0),
      threshold_concession: Number((r as any).threshold_concession ?? r.threshold_amount ?? 0),
      commission_percentage: Number(r.commission_percentage ?? 0),
    })),
  }

  const split = calcIncomeSplit(saleParams, tourParams)
  const commissionAmount = split.promoter

  const balanceBefore = Number(seller.balance)
  const balanceAfter = balanceBefore + commissionAmount

  await prisma.user.update({
    where: { id: seller.id },
    data: { balance: balanceAfter },
  })

  await prisma.balanceHistory.create({
    data: {
      user_id: seller.id,
      balance_type: 'balance',
      transaction_type: 'credit',
      amount: commissionAmount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: `Пополнение от продажи билета #${ticket.id}, сумма продажи: ${sale.total_amount}₽, процент промоутера: ${commissionAmount}₽`,
      ticket_id: ticket.id,
      sale_id: sale.id,
      performed_by_user_id: performedByUserId,
    },
  })

  if (
    (paymentMethod === PaymentMethod.cash || paymentMethod === PaymentMethod.acquiring) &&
    sale.seller.role === 'manager'
  ) {
    const manager = sale.seller

    if (!isPromoterSale) {
      const debtBefore = Number(manager.debt_to_company)
      const debtAfter = debtBefore + Number(sale.total_amount)
      await prisma.user.update({
        where: { id: manager.id },
        data: { debt_to_company: debtAfter },
      })
      await prisma.balanceHistory.create({
        data: {
          user_id: manager.id,
          balance_type: 'debt_to_company',
          transaction_type: 'credit',
          amount: Number(sale.total_amount),
          balance_before: debtBefore,
          balance_after: debtAfter,
          description: `Пополнение долга от продажи билета #${ticket.id} за наличку, сумма: ${sale.total_amount}₽`,
          ticket_id: ticket.id,
          sale_id: sale.id,
          performed_by_user_id: performedByUserId,
        },
      })
    } else if (isManagerSaleForPromoter) {
      const debtBefore = Number(manager.debt_to_company)
      const debtAfter = debtBefore + Number(sale.total_amount)
      await prisma.user.update({
        where: { id: manager.id },
        data: { debt_to_company: debtAfter },
      })
      await prisma.balanceHistory.create({
        data: {
          user_id: manager.id,
          balance_type: 'debt_to_company',
          transaction_type: 'credit',
          amount: Number(sale.total_amount),
          balance_before: debtBefore,
          balance_after: debtAfter,
          description: `Пополнение долга от продажи билета #${ticket.id} за промоутера наличкой, сумма: ${sale.total_amount}₽`,
          ticket_id: ticket.id,
          sale_id: sale.id,
          performed_by_user_id: performedByUserId,
        },
      })
    }
  }
}

/**
 * Обновление баланса "Должен компании" при отмене билета
 */
export async function updateDebtOnTicketCancel(
  ticketId: string,
  performedByUserId: string
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      sale: {
        include: {
          seller: true,
          promoter: true,
        },
      },
    },
  })

  if (!ticket) {
    throw new Error('Ticket not found')
  }

  const { sale } = ticket
  const paymentMethod = sale.payment_method
  const isPromoterSale = !!sale.promoter_user_id
  const isManagerSaleForPromoter = sale.seller.role === 'manager' && isPromoterSale

  if (
    (paymentMethod === PaymentMethod.cash || paymentMethod === PaymentMethod.acquiring) &&
    sale.seller.role === 'manager'
  ) {
    const manager = sale.seller

    if (!isPromoterSale) {
      const debtBefore = Number(manager.debt_to_company)
      const debtAfter = debtBefore + Number(sale.total_amount)
      await prisma.user.update({
        where: { id: manager.id },
        data: { debt_to_company: debtAfter },
      })
      await prisma.balanceHistory.create({
        data: {
          user_id: manager.id,
          balance_type: 'debt_to_company',
          transaction_type: 'credit',
          amount: Number(sale.total_amount),
          balance_before: debtBefore,
          balance_after: debtAfter,
          description: `Пополнение долга от отмененного билета #${ticket.id} за наличку, сумма: ${sale.total_amount}₽`,
          ticket_id: ticket.id,
          sale_id: sale.id,
          performed_by_user_id: performedByUserId,
        },
      })
    } else if (isManagerSaleForPromoter) {
      const debtBefore = Number(manager.debt_to_company)
      const debtAfter = debtBefore + Number(sale.total_amount)
      await prisma.user.update({
        where: { id: manager.id },
        data: { debt_to_company: debtAfter },
      })
      await prisma.balanceHistory.create({
        data: {
          user_id: manager.id,
          balance_type: 'debt_to_company',
          transaction_type: 'credit',
          amount: Number(sale.total_amount),
          balance_before: debtBefore,
          balance_after: debtAfter,
          description: `Пополнение долга от отмененного билета #${ticket.id} за промоутера наличкой, сумма: ${sale.total_amount}₽`,
          ticket_id: ticket.id,
          sale_id: sale.id,
          performed_by_user_id: performedByUserId,
        },
      })
    }
  }
}
