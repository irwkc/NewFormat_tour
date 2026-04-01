import { prisma } from '@/lib/prisma'
import { TicketStatus, PaymentMethod } from '@prisma/client'
import { calcIncomeSplit } from '@/lib/domain/commission-calc'
import { buildTourParamsFromTourAndRules } from '@/lib/domain/tour-commission-params'

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

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

  const tourParams = buildTourParamsFromTourAndRules(tour, rules)

  const split = calcIncomeSplit(saleParams, tourParams)
  const commissionAmount = split.promoter
  const totalAmountNum = Number(sale.total_amount)
  const managerPct =
    sale.manager_commission_percent_of_ticket != null
      ? Number(sale.manager_commission_percent_of_ticket)
      : 0
  let managerCut =
    isManagerSaleForPromoter && managerPct > 0
      ? roundMoney(totalAmountNum * (managerPct / 100))
      : 0
  managerCut = Math.min(managerCut, commissionAmount)
  const promoterCredit = Math.max(0, commissionAmount - managerCut)

  const balanceBefore = Number(seller.balance)
  const balanceAfter = balanceBefore + promoterCredit

  await prisma.user.update({
    where: { id: seller.id },
    data: { balance: balanceAfter },
  })

  await prisma.balanceHistory.create({
    data: {
      user_id: seller.id,
      balance_type: 'balance',
      transaction_type: 'credit',
      amount: promoterCredit,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description:
        managerCut > 0
          ? `Пополнение от продажи билета #${ticket.id}, сумма продажи: ${sale.total_amount}₽, доля промоутера: ${promoterCredit}₽ (из ${commissionAmount}₽ до сплита с менеджером)`
          : `Пополнение от продажи билета #${ticket.id}, сумма продажи: ${sale.total_amount}₽, доля промоутера: ${promoterCredit}₽`,
      ticket_id: ticket.id,
      sale_id: sale.id,
      performed_by_user_id: performedByUserId,
    },
  })

  if (managerCut > 0) {
    const managerUser = sale.seller
    const mbBefore = Number(managerUser.balance)
    const mbAfter = mbBefore + managerCut
    await prisma.user.update({
      where: { id: managerUser.id },
      data: { balance: mbAfter },
    })
    await prisma.balanceHistory.create({
      data: {
        user_id: managerUser.id,
        balance_type: 'balance',
        transaction_type: 'credit',
        amount: managerCut,
        balance_before: mbBefore,
        balance_after: mbAfter,
        description: `Комиссия менеджера от продажи билета #${ticket.id} за промоутера (${managerPct}% от суммы билетов): ${managerCut}₽`,
        ticket_id: ticket.id,
        sale_id: sale.id,
        performed_by_user_id: performedByUserId,
      },
    })
  }

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
