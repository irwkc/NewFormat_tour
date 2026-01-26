import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateQRCode } from '@/utils/qr'
import { generateTicketPDF } from '@/utils/pdf'
import { sendTicketEmail } from '@/lib/email'

// POST /api/webhooks/yookassa - webhook от ЮКассы для обновления статуса платежа
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const event = body.event || body.type // Зависит от формата ЮКассы

    if (event !== 'payment.succeeded') {
      return NextResponse.json({ received: true })
    }

    const payment = body.object || body // Зависит от формата ЮКассы
    const paymentId = payment.id
    const saleId = payment.metadata?.sale_id

    if (!saleId) {
      console.error('No sale_id in payment metadata')
      return NextResponse.json({ received: true })
    }

    // Найти продажу
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        tour: {
          include: {
            category: true,
          },
        },
        seller: true,
        promoter: true,
      },
    })

    if (!sale) {
      console.error('Sale not found:', saleId)
      return NextResponse.json({ received: true })
    }

    // Обновить статус продажи
    await prisma.sale.update({
      where: { id: saleId },
      data: {
        payment_status: 'completed',
      },
    })

    // Обновить платеж ЮКассы
    await prisma.yookassaPayment.updateMany({
      where: {
        payment_id: paymentId,
      },
      data: {
        status: payment.status,
      },
    })

    // Создать билет (сначала создаем с временным ID для QR)
    const tempTicketId = `temp-${saleId}-${Date.now()}`
    const qrData = `ticket-${tempTicketId}`
    const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tickets/check/${qrData}`

    // Генерировать PDF билета
    const pdfUrl = await generateTicketPDF({
      id: tempTicketId,
      sale,
      adult_count: sale.adult_count,
      child_count: sale.child_count,
      concession_count: (sale as any).concession_count || 0,
      qr_code_data: qrData,
    })

    // Создать билет
    const ticket = await prisma.ticket.create({
      data: {
        sale_id: saleId,
        tour_id: sale.tour_id,
        adult_count: sale.adult_count,
        child_count: sale.child_count,
        concession_count: (sale as any).concession_count || 0,
        ticket_status: 'sold',
        qr_code_data: qrData,
        qr_code_url: qrUrl,
        ticket_pdf_url: pdfUrl,
      },
      include: {
        sale: {
          include: {
            tour: true,
          },
        },
      },
    })

    // Обновить QR код с правильным ID билета
    const correctQrData = `ticket-${ticket.id}`
    const correctQrUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tickets/check/${correctQrData}`
    
    // Регенерировать PDF с правильным QR кодом
    const correctPdfUrl = await generateTicketPDF({
      id: ticket.id,
      sale,
      adult_count: sale.adult_count,
      child_count: sale.child_count,
      concession_count: (sale as any).concession_count || 0,
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

    // Обновить количество мест
    const placesToAdd = sale.adult_count + sale.child_count + ((sale as any).concession_count || 0)
    const updatedTour = await prisma.tour.update({
      where: { id: sale.tour_id },
      data: {
        current_booked_places: {
          increment: placesToAdd,
        },
      },
    })

    // Проверить, нужно ли остановить продажи
    if (updatedTour.current_booked_places >= updatedTour.max_places) {
      await prisma.tour.update({
        where: { id: sale.tour_id },
        data: {
          is_sale_stopped: true,
        },
      })
    }

    // Отправить PDF билета на email клиента (используем правильный PDF URL)
    if (sale.customer_email && correctPdfUrl) {
      try {
        const fullPdfUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${correctPdfUrl}`
        await sendTicketEmail(sale.customer_email, fullPdfUrl)
      } catch (emailError) {
        console.error('Error sending ticket email:', emailError)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('YooKassa webhook error:', error)
    return NextResponse.json({ received: true }, { status: 500 })
  }
}
