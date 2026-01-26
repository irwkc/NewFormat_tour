import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { TicketStatus } from '@prisma/client'

// GET /api/tickets - список билетов (с фильтрацией по статусу, экскурсии, продавцу)
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') as TicketStatus | null
        const tourId = searchParams.get('tour_id')
        const sellerId = searchParams.get('seller_id')

        const where: any = {}

        if (status) {
          where.ticket_status = status
        }

        if (tourId) {
          where.tour_id = tourId
        }

        // Фильтрация по продавцу
        if (sellerId) {
          where.sale = {
            OR: [
              { seller_user_id: sellerId },
              { promoter_user_id: sellerId },
            ],
          }
        }

        // Владелец видит все билеты
        // Партнер видит билеты только по своим экскурсиям
        // Менеджер/промоутер видит только свои билеты
        if (req.user!.role === 'partner') {
          // Проверить, что экскурсия принадлежит партнеру
          where.tour = {
            created_by_user_id: req.user!.userId,
          }
        } else if (req.user!.role === 'manager' || req.user!.role === 'promoter') {
          where.sale = {
            ...where.sale,
            OR: [
              { seller_user_id: req.user!.userId },
              { promoter_user_id: req.user!.userId },
            ],
          }
        }

        const tickets = await prisma.ticket.findMany({
          where,
          include: {
            sale: {
              include: {
                seller: {
                  select: {
                    id: true,
                    full_name: true,
                    email: true,
                    promoter_id: true,
                  },
                },
                promoter: {
                  select: {
                    id: true,
                    full_name: true,
                    email: true,
                    promoter_id: true,
                  },
                },
                tour: {
                  include: {
                    category: true,
                  },
                },
              },
            },
            tour: {
              include: {
                category: true,
              },
            },
            usedBy: {
              select: {
                id: true,
                full_name: true,
              },
            },
            cancelledBy: {
              select: {
                id: true,
                full_name: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
        })

        return NextResponse.json({
          success: true,
          data: tickets,
        })
      } catch (error) {
        console.error('Get tickets error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
}

// POST /api/tickets - создание билета для продажи (наличка/эквайринг)
export async function POST(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        // Только менеджеры могут создавать билеты для налички/эквайринга
        if (req.user!.role !== 'manager') {
          return NextResponse.json(
            { success: false, error: 'Only managers can create cash/acquiring tickets' },
            { status: 403 }
          )
        }

        const body = await request.json()
        const { sale_id, ticket_number, photo } = body

        // Валидация
        if (!sale_id || !ticket_number) {
          return NextResponse.json(
            { success: false, error: 'sale_id and ticket_number are required' },
            { status: 400 }
          )
        }

        // Проверить формат номера билета (AA00000000)
        const ticketNumberRegex = /^[A-Z]{2}\d{8}$/
        if (!ticketNumberRegex.test(ticket_number)) {
          return NextResponse.json(
            { success: false, error: 'Invalid ticket number format. Expected: AA00000000 (2 uppercase letters + 8 digits)' },
            { status: 400 }
          )
        }

        // Найти продажу
        const sale = await prisma.sale.findUnique({
          where: { id: sale_id },
          include: {
            tour: true,
          },
        })

        if (!sale) {
          return NextResponse.json(
            { success: false, error: 'Sale not found' },
            { status: 404 }
          )
        }

        // Проверить, что продажа принадлежит менеджеру
        if (sale.seller_user_id !== req.user!.userId && sale.promoter_user_id !== req.user!.userId) {
          return NextResponse.json(
            { success: false, error: 'You can only create tickets for your own sales' },
            { status: 403 }
          )
        }

        // Проверить, что билет еще не создан
        const existingTicket = await prisma.ticket.findFirst({
          where: { sale_id },
        })

        if (existingTicket) {
          return NextResponse.json(
            { success: false, error: 'Ticket already exists for this sale' },
            { status: 400 }
          )
        }

        // Проверить уникальность номера билета
        const existingTicketNumber = await prisma.ticket.findUnique({
          where: { ticket_number: ticket_number.toUpperCase() },
        })

        if (existingTicketNumber) {
          return NextResponse.json(
            { success: false, error: 'Ticket number already exists' },
            { status: 400 }
          )
        }

        // Обработать фото билета (если есть)
        let photoUrl: string | null = null
        if (photo) {
          const sharp = (await import('sharp')).default
          const { mkdir } = await import('fs/promises')
          const path = await import('path')
          
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tickets')
          await mkdir(uploadDir, { recursive: true })
          
          const buffer = Buffer.from(photo.split(',')[1] || photo, 'base64')
          const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
          const filepath = path.join(uploadDir, filename)

          // Сжать и сохранить
          await sharp(buffer)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toFile(filepath)

          photoUrl = `/uploads/tickets/${filename}`
        }

        // Создать билет
        const ticket = await prisma.ticket.create({
          data: {
            sale_id,
            tour_id: sale.tour_id,
            ticket_number: ticket_number.toUpperCase(),
            ticket_photo_url: photoUrl,
            adult_count: sale.adult_count,
            child_count: sale.child_count,
            concession_count: sale.concession_count || 0,
            ticket_status: 'sold',
            qr_code_data: null, // Для налички/эквайринга QR не генерируется
          },
          include: {
            sale: {
              include: {
                tour: true,
              },
            },
          },
        })

        // Обновить статус продажи на completed
        await prisma.sale.update({
          where: { id: sale_id },
          data: { payment_status: 'completed' },
        })

        // Обновить количество забронированных мест
        await prisma.tour.update({
          where: { id: sale.tour_id },
          data: {
            current_booked_places: {
              increment: sale.adult_count + sale.child_count + ((sale as any).concession_count || 0),
            },
          },
        })

        // Проверить, не закончились ли места
        const updatedTour = await prisma.tour.findUnique({
          where: { id: sale.tour_id },
        })

        if (updatedTour && updatedTour.current_booked_places >= updatedTour.max_places) {
          await prisma.tour.update({
            where: { id: sale.tour_id },
            data: { is_sale_stopped: true },
          })
        }

        return NextResponse.json({
          success: true,
          data: ticket,
        })
      } catch (error: any) {
        console.error('Create ticket error:', error)
        
        // Обработка ошибки дублирования
        if (error.code === 'P2002') {
          return NextResponse.json(
            { success: false, error: 'Ticket number already exists' },
            { status: 400 }
          )
        }

        return NextResponse.json(
          { success: false, error: error.message || 'Internal server error' },
          { status: 500 }
        )
      }
    },
    ['manager']
  )
}
