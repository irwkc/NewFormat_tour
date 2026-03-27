import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TicketStatus } from '@prisma/client'
import { z } from 'zod'
import { allowPublicTicketLookup } from '@/lib/public-ticket-lookup-limit'

const bodySchema = z.object({
  sale_number: z.string().regex(/^\d{6}$/, 'Номер заказа — 6 цифр'),
})

function clientIp(request: NextRequest): string {
  const xf = request.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

function statusLabel(status: TicketStatus): string {
  switch (status) {
    case TicketStatus.sold:
      return 'Действителен'
    case TicketStatus.used:
      return 'Использован'
    case TicketStatus.cancelled:
      return 'Отменён'
    default:
      return status
  }
}

// POST /api/public/ticket-lookup — публичная проверка по 6-значному номеру заказа (sale_number)
export async function POST(request: NextRequest) {
  const ip = clientIp(request)
  if (!allowPublicTicketLookup(ip)) {
    return NextResponse.json(
      { success: false, error: 'Слишком много запросов. Попробуйте через минуту.' },
      { status: 429 }
    )
  }

  try {
    const json = await request.json()
    const { sale_number } = bodySchema.parse(json)

    const ticketInclude = {
      tour: {
        include: { category: true },
      },
      sale: {
        include: {
          flight: true,
        },
      },
    }

    const sale = await prisma.sale.findUnique({
      where: { sale_number },
      include: { ticket: { include: ticketInclude } },
    })
    const ticket = sale?.ticket ?? null

    if (!ticket) {
      return NextResponse.json({
        success: true,
        data: {
          found: false,
          message: 'Заказ с таким номером не найден. Проверьте цифры на чеке.',
        },
      })
    }

    const flight = ticket.sale?.flight
    const message =
      ticket.ticket_status === TicketStatus.sold
        ? 'Билет действителен. Предъявите его контролёру при посадке.'
        : ticket.ticket_status === TicketStatus.used
          ? 'Билет уже использован.'
          : 'Билет отменён.'

    return NextResponse.json({
      success: true,
      data: {
        found: true,
        message,
        status: ticket.ticket_status,
        status_label: statusLabel(ticket.ticket_status),
        tour: {
          company: ticket.tour.company,
          category: ticket.tour.category.name,
        },
        flight: flight
          ? {
              flight_number: flight.flight_number,
              date: flight.date.toISOString(),
              departure_time: flight.departure_time,
              boarding_location_url: flight.boarding_location_url,
            }
          : null,
        adult_count: ticket.adult_count,
        child_count: ticket.child_count,
        concession_count: ticket.concession_count,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message ?? 'Неверный формат' },
        { status: 400 }
      )
    }
    console.error('public ticket-lookup:', error)
    return NextResponse.json(
      { success: false, error: 'Не удалось проверить. Попробуйте позже.' },
      { status: 500 }
    )
  }
}
