import { prisma } from '@/lib/prisma'
import { TicketStatus, PaymentMethod, CommissionType } from '@prisma/client'

/**
 * Обновление баланса при подтверждении билета
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

  // Определить продавца
  const seller = sale.promoter || sale.seller
  const isPromoterSale = !!sale.promoter_user_id
  const isManagerSaleForPromoter = sale.seller.role === 'manager' && isPromoterSale

  // Вычислить сумму комиссии
  let commissionAmount = 0
  if (tour.commission_type === CommissionType.percentage && tour.commission_percentage) {
    commissionAmount = Number(sale.total_amount) * Number(tour.commission_percentage) / 100
  } else if (tour.commission_type === CommissionType.fixed && tour.commission_fixed_amount) {
    commissionAmount = Number(tour.commission_fixed_amount)
  }

  // Обновить баланс продавца (промоутера или менеджера)
  const balanceBefore = Number(seller.balance)
  const balanceAfter = balanceBefore + commissionAmount

  await prisma.user.update({
    where: { id: seller.id },
    data: {
      balance: balanceAfter,
    },
  })

  // Записать историю баланса
  await prisma.balanceHistory.create({
    data: {
      user_id: seller.id,
      balance_type: 'balance',
      transaction_type: 'credit',
      amount: commissionAmount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: `Пополнение от продажи билета #${ticket.id}, сумма продажи: ${sale.total_amount}₽, комиссия: ${commissionAmount}₽`,
      ticket_id: ticket.id,
      sale_id: sale.id,
      performed_by_user_id: performedByUserId,
    },
  })

  // Если это продажа менеджером за наличку/эквайринг
  if (
    (paymentMethod === PaymentMethod.cash || paymentMethod === PaymentMethod.acquiring) &&
    sale.seller.role === 'manager'
  ) {
    const manager = sale.seller
    
    // Если продажа за себя
    if (!isPromoterSale) {
      const debtBefore = Number(manager.debt_to_company)
      const debtAfter = debtBefore + Number(sale.total_amount)

      await prisma.user.update({
        where: { id: manager.id },
        data: {
          debt_to_company: debtAfter,
        },
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
    }
    // Если продажа за промоутера
    else if (isManagerSaleForPromoter) {
      const debtBefore = Number(manager.debt_to_company)
      const debtAfter = debtBefore + Number(sale.total_amount)

      await prisma.user.update({
        where: { id: manager.id },
        data: {
          debt_to_company: debtAfter,
        },
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

  // Если это продажа менеджером за наличку/эквайринг
  if (
    (paymentMethod === PaymentMethod.cash || paymentMethod === PaymentMethod.acquiring) &&
    sale.seller.role === 'manager'
  ) {
    const manager = sale.seller

    // Если продажа за себя
    if (!isPromoterSale) {
      const debtBefore = Number(manager.debt_to_company)
      const debtAfter = debtBefore + Number(sale.total_amount)

      await prisma.user.update({
        where: { id: manager.id },
        data: {
          debt_to_company: debtAfter,
        },
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
    }
    // Если продажа за промоутера
    else if (isManagerSaleForPromoter) {
      const debtBefore = Number(manager.debt_to_company)
      const debtAfter = debtBefore + Number(sale.total_amount)

      await prisma.user.update({
        where: { id: manager.id },
        data: {
          debt_to_company: debtAfter,
        },
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
