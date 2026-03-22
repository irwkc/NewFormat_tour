import { TicketStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { updateBalanceOnTicketConfirm, updateDebtOnTicketCancel } from '@/utils/balance'

type ConfirmTicketResult =
  | { status: 'not_found' }
  | { status: 'invalid_status'; currentStatus: TicketStatus }
  | { status: 'ok' }

type CancelTicketResult =
  | { status: 'not_found' }
  | { status: 'already_cancelled' }
  | { status: 'ok' }

/**
 * Подтверждение использования билета:
 * - проверка, что билет существует и в статусе sold
 * - перевод в статус used
 * - обновление балансов (комиссия, долг менеджера и т.п.)
 */
export async function confirmTicketDomain(
  ticketId: string,
  usedByUserId: string | null
): Promise<ConfirmTicketResult> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      ticket_status: true,
    },
  })

  if (!ticket) {
    return { status: 'not_found' }
  }

  if (ticket.ticket_status !== TicketStatus.sold) {
    return { status: 'invalid_status', currentStatus: ticket.ticket_status }
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      ticket_status: TicketStatus.used,
      used_at: new Date(),
      used_by_user_id: usedByUserId ?? undefined,
    },
  })

  // Балансы считаем через существующую доменную функцию
  await updateBalanceOnTicketConfirm(ticketId, usedByUserId ?? undefined)

  return { status: 'ok' }
}

/**
 * Отмена билета владельцем:
 * - проверка существования билета
 * - перевod в статус cancelled (если ещё не отменён)
 * - перерасчёт занятых мест на рейсе и возможное возобновление продаж
 * - обновление долга менеджера при наличных/эквайринге
 */
export async function cancelTicketDomain(
  ticketId: string,
  cancelledByUserId: string
): Promise<CancelTicketResult> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      sale: {
        include: {
          flight: true,
        },
      },
    },
  })

  if (!ticket) {
    return { status: 'not_found' }
  }

  if (ticket.ticket_status === TicketStatus.cancelled) {
    return { status: 'already_cancelled' }
  }

  const oldStatus = ticket.ticket_status

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      ticket_status: TicketStatus.cancelled,
      cancelled_at: new Date(),
      cancelled_by_user_id: cancelledByUserId,
    },
  })

  // Если билет был продан, освобождаем места на рейсе и при необходимости возобновляем продажи
  if (oldStatus === TicketStatus.sold) {
    const placesToFree =
      ticket.adult_count + ticket.child_count + ((ticket as any).concession_count || 0)

    const updatedFlight = await prisma.flight.update({
      where: { id: ticket.sale.flight_id },
      data: {
        current_booked_places: {
          decrement: placesToFree,
        },
      },
    })

    if (
      updatedFlight.is_sale_stopped &&
      updatedFlight.current_booked_places < updatedFlight.max_places
    ) {
      await prisma.flight.update({
        where: { id: ticket.sale.flight_id },
        data: {
          is_sale_stopped: false,
        },
      })
    }
  }

  // Обновить баланс \"Должен компании\" в соответствии с типом оплаты
  await updateDebtOnTicketCancel(ticketId, cancelledByUserId)

  return { status: 'ok' }
}

