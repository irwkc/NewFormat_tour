import { PaymentMethod, UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { generateRandomToken } from '@/lib/auth'
import { generateTicketPDF } from '@/utils/pdf'
import { sendTicketEmail } from '@/lib/email'

const optionalPrice = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}, z.number().positive().optional())

export const createSaleSchema = z.object({
  tour_id: z.string().uuid(),
  flight_id: z.string().uuid(),
  adult_count: z.number().int().positive(),
  child_count: z.number().int().min(0).default(0),
  concession_count: z.number().int().min(0).default(0),
  adult_price: z.number().positive(),
  child_price: optionalPrice,
  concession_price: optionalPrice,
  payment_method: z.enum(['online_yookassa', 'cash', 'acquiring']),
  promoter_user_id: z.string().uuid().optional(),
}).refine((data) => {
  if (data.child_count > 0) return data.child_price !== undefined
  return true
}, { message: 'child_price is required when child_count > 0', path: ['child_price'] })
  .refine((data) => {
    if (data.concession_count > 0) return data.concession_price !== undefined
    return true
  }, { message: 'concession_price is required when concession_count > 0', path: ['concession_price'] })

export async function createSaleDomain(input: z.infer<typeof createSaleSchema>, user: { id: string; role: UserRole }) {
  // Проверка экскурсии
  const tour = await prisma.tour.findUnique({
    where: { id: input.tour_id },
  })
  if (!tour) {
    return { status: 'tour_not_found' } as const
  }
  if (tour.moderation_status !== 'approved') {
    return { status: 'tour_not_approved' } as const
  }

  // Проверка рейса
  const flight = await prisma.flight.findUnique({
    where: { id: input.flight_id },
  })
  if (!flight) {
    return { status: 'flight_not_found' } as const
  }
  if (flight.tour_id !== input.tour_id) {
    return { status: 'flight_mismatch' } as const
  }
  if (flight.is_sale_stopped) {
    return { status: 'flight_sales_stopped' } as const
  }

  const { isFlightStarted } = await import('@/lib/moscow-time')
  if (isFlightStarted(flight.departure_time)) {
    return { status: 'flight_already_started' } as const
  }

  // Проверить доступность мест
  const totalPlaces = input.adult_count + input.child_count + (input.concession_count || 0)
  const availablePlaces = flight.max_places - flight.current_booked_places
  if (totalPlaces > availablePlaces) {
    return {
      status: 'not_enough_places',
      availablePlaces,
      requestedPlaces: totalPlaces,
    } as const
  }

  // Проверить минимальные цены: owner_min (floor) vs partner_min (flight или tour)
  const flightAdult = flight.partner_min_adult_price != null ? Number(flight.partner_min_adult_price) : null
  const flightChild = flight.partner_min_child_price != null ? Number(flight.partner_min_child_price) : null
  const flightConcession = flight.partner_min_concession_price != null ? Number(flight.partner_min_concession_price) : null
  const partnerMinAdult = flightAdult ?? Number(tour.partner_min_adult_price ?? 0)
  const partnerMinChild = flightChild ?? Number(tour.partner_min_child_price ?? 0)
  const partnerMinConcession = flightConcession ?? Number(tour.partner_min_concession_price ?? 0)
  const minAdult = Number((tour.owner_min_adult_price ?? partnerMinAdult) || 0)
  if (minAdult > 0 && input.adult_price < minAdult) {
    return { status: 'adult_price_too_low', min: minAdult } as const
  }

  const minChild = Number((tour.owner_min_child_price ?? partnerMinChild) || 0)
  if (input.child_count > 0 && input.child_price && minChild > 0 && input.child_price < minChild) {
    return { status: 'child_price_too_low', min: minChild } as const
  }

  const minConcession = Number((tour.owner_min_concession_price ?? partnerMinConcession) || 0)
  if (input.concession_count > 0 && input.concession_price && minConcession > 0 && input.concession_price < minConcession) {
    return { status: 'concession_price_too_low', min: minConcession } as const
  }

  // Проверить промоутера, если указан
  if (input.promoter_user_id) {
    if (user.role !== UserRole.manager) {
      return { status: 'only_manager_can_sell_for_promoter' } as const
    }
    const promoter = await prisma.user.findUnique({
      where: { id: input.promoter_user_id },
    })
    if (!promoter || promoter.role !== UserRole.promoter) {
      return { status: 'promoter_not_found' } as const
    }
  }

  // Вычислить общую сумму
  const childPrice = input.child_count > 0 ? (input.child_price || 0) : 0
  const concessionPrice = input.concession_count > 0 ? (input.concession_price || 0) : 0
  const totalAmount = (input.adult_count * input.adult_price) +
    (input.child_count * childPrice) +
    ((input.concession_count || 0) * concessionPrice)

  // Генерация уникального 6-значного номера продажи
  let saleNumber = ''
  for (let attempt = 0; attempt < 10; attempt++) {
    saleNumber = String(Math.floor(100000 + Math.random() * 900000))
    const existing = await prisma.sale.findUnique({ where: { sale_number: saleNumber } })
    if (!existing) break
    if (attempt === 9) throw new Error('Could not generate unique sale number')
  }

  // Создать продажу
  const sale = await prisma.sale.create({
    data: {
      sale_number: saleNumber,
      tour_id: input.tour_id,
      flight_id: input.flight_id,
      seller_user_id: user.id,
      promoter_user_id: input.promoter_user_id || null,
      adult_count: input.adult_count,
      child_count: input.child_count,
      concession_count: input.concession_count,
      adult_price: input.adult_price,
      child_price: input.child_count > 0 ? (input.child_price || null) : null,
      concession_price: input.concession_count > 0 ? (input.concession_price || null) : null,
      total_amount: totalAmount,
      payment_method: input.payment_method as PaymentMethod,
      payment_status: 'pending',
      payment_link_token: generateRandomToken(),
    },
    include: {
      tour: {
        include: {
          category: true,
        },
      },
      flight: true,
      seller: {
        select: {
          id: true,
          full_name: true,
        },
      },
      promoter: {
        select: {
          id: true,
          full_name: true,
        },
      },
    },
  })

  let paymentLinkUrl: string | null = null
  if (input.payment_method === 'online_yookassa') {
    paymentLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/${sale.payment_link_token}`
    await prisma.sale.update({
      where: { id: sale.id },
      data: {
        payment_link_url: paymentLinkUrl,
      },
    })
  }

  return { status: 'ok', sale: { ...sale, payment_link_url: paymentLinkUrl } } as const
}

export async function completeSaleFromYookassaDomain(payment: any) {
  const paymentId = payment.id
  const saleId = payment.metadata?.sale_id

  if (!saleId) {
    console.error('No sale_id in payment metadata')
    return { status: 'no_sale_id' } as const
  }

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      tour: {
        include: {
          category: true,
        },
      },
      flight: true,
      seller: true,
      promoter: true,
    },
  })

  if (!sale) {
    console.error('Sale not found:', saleId)
    return { status: 'sale_not_found' } as const
  }

  // Idempotency: повторный webhook — просто подтверждаем получение
  if (sale.payment_status === 'completed') {
    return { status: 'already_completed' } as const
  }

  await prisma.sale.update({
    where: { id: saleId },
    data: {
      payment_status: 'completed',
    },
  })

  await prisma.yookassaPayment.updateMany({
    where: { payment_id: paymentId },
    data: {
      status: payment.status,
    },
  })

  // Создать билет с временным QR, затем перегенерировать с реальным ID
  const tempTicketId = `temp-${saleId}-${Date.now()}`
  const qrData = `ticket-${tempTicketId}`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const qrUrl = `${appUrl}/tickets/check/${qrData}`

  const pdfUrl = await generateTicketPDF({
    id: tempTicketId,
    sale,
    adult_count: sale.adult_count,
    child_count: sale.child_count,
    concession_count: sale.concession_count || 0,
    qr_code_data: qrData,
  })

  const ticket = await prisma.ticket.create({
    data: {
      sale_id: saleId,
      tour_id: sale.tour_id,
      adult_count: sale.adult_count,
      child_count: sale.child_count,
      concession_count: sale.concession_count || 0,
      ticket_status: 'sold',
      qr_code_data: qrData,
      qr_code_url: qrUrl,
      ticket_pdf_url: pdfUrl,
    },
  })

  const correctQrData = `ticket-${ticket.id}`
  const correctQrUrl = `${appUrl}/tickets/check/${correctQrData}`

  const correctPdfUrl = await generateTicketPDF({
    id: ticket.id,
    sale,
    adult_count: sale.adult_count,
    child_count: sale.child_count,
    concession_count: sale.concession_count || 0,
    qr_code_data: correctQrData,
  })

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      qr_code_data: correctQrData,
      qr_code_url: correctQrUrl,
      ticket_pdf_url: correctPdfUrl,
    },
  })

  const placesToAdd = sale.adult_count + sale.child_count + (sale.concession_count || 0)
  const updatedFlight = await prisma.flight.update({
    where: { id: sale.flight_id },
    data: {
      current_booked_places: {
        increment: placesToAdd,
      },
    },
  })

  if (updatedFlight.current_booked_places >= updatedFlight.max_places) {
    await prisma.flight.update({
      where: { id: sale.flight_id },
      data: {
        is_sale_stopped: true,
      },
    })
  }

  if (sale.customer_email && correctPdfUrl) {
    try {
      const fullPdfUrl = `${appUrl}${correctPdfUrl}`
      await sendTicketEmail(sale.customer_email, fullPdfUrl)
    } catch (emailError) {
      console.error('Error sending ticket email:', emailError)
    }
  }

  return { status: 'ok' } as const
}

