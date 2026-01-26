import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, PaymentMethod } from '@prisma/client'
import { z } from 'zod'
import { generateRandomToken } from '@/lib/auth'

const createSaleSchema = z.object({
  tour_id: z.string().uuid(),
  adult_count: z.number().int().positive(),
  child_count: z.number().int().min(0).default(0),
  concession_count: z.number().int().min(0).default(0),
  adult_price: z.number().positive(),
  child_price: z.number().positive().optional(),
  concession_price: z.number().positive().optional(),
  payment_method: z.enum(['online_yookassa', 'cash', 'acquiring']),
  promoter_user_id: z.string().uuid().optional(),
})

// GET /api/sales - список продаж
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        const { searchParams } = new URL(request.url)
        const tourId = searchParams.get('tour_id')
        const status = searchParams.get('status')

        const where: any = {}

        // Фильтрация по ролям
        if (req.user!.role === UserRole.manager || req.user!.role === UserRole.promoter) {
          where.OR = [
            { seller_user_id: req.user!.userId },
            { promoter_user_id: req.user!.userId },
          ]
        } else if (req.user!.role === UserRole.partner) {
          where.tour = {
            created_by_user_id: req.user!.userId,
          }
        }

        if (tourId) {
          where.tour_id = tourId
        }

        if (status) {
          where.payment_status = status
        }

        const sales = await prisma.sale.findMany({
          where,
          include: {
            tour: {
              include: {
                category: true,
              },
            },
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
            ticket: {
              select: {
                id: true,
                ticket_status: true,
                ticket_number: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
        })

        return NextResponse.json({
          success: true,
          data: sales,
        })
      } catch (error) {
        console.error('Get sales error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
}

// POST /api/sales - создание продажи
export async function POST(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.manager && req.user!.role !== UserRole.promoter) {
          return NextResponse.json(
            { success: false, error: 'Only managers and promoters can create sales' },
            { status: 403 }
          )
        }

        const body = await request.json()
        const data = createSaleSchema.parse(body)

        // Проверить экскурсию
        const tour = await prisma.tour.findUnique({
          where: { id: data.tour_id },
        })

        if (!tour) {
          return NextResponse.json(
            { success: false, error: 'Tour not found' },
            { status: 404 }
          )
        }

        if (tour.moderation_status !== 'approved') {
          return NextResponse.json(
            { success: false, error: 'Tour is not approved' },
            { status: 400 }
          )
        }

        if (tour.is_sale_stopped) {
          return NextResponse.json(
            { success: false, error: 'Sales are stopped for this tour' },
            { status: 400 }
          )
        }

        // Проверить минимальные цены
        if (data.adult_price < Number(tour.owner_min_adult_price)) {
          return NextResponse.json(
            { success: false, error: `Adult price must be at least ${tour.owner_min_adult_price}` },
            { status: 400 }
          )
        }

        if (data.child_count > 0 && data.child_price) {
          if (data.child_price < Number(tour.owner_min_child_price)) {
            return NextResponse.json(
              { success: false, error: `Child price must be at least ${tour.owner_min_child_price}` },
              { status: 400 }
            )
          }
        }

        if (data.concession_count > 0 && data.concession_price) {
          if (tour.owner_min_concession_price && data.concession_price < Number(tour.owner_min_concession_price)) {
            return NextResponse.json(
              { success: false, error: `Concession price must be at least ${tour.owner_min_concession_price}` },
              { status: 400 }
            )
          }
        }

        // Проверить промоутера, если указан
        if (data.promoter_user_id) {
          if (req.user!.role !== UserRole.manager) {
            return NextResponse.json(
              { success: false, error: 'Only managers can sell for promoters' },
              { status: 403 }
            )
          }

          const promoter = await prisma.user.findUnique({
            where: { id: data.promoter_user_id },
          })

          if (!promoter || promoter.role !== UserRole.promoter) {
            return NextResponse.json(
              { success: false, error: 'Promoter not found' },
              { status: 404 }
            )
          }
        }

        // Вычислить общую сумму
        const childPrice = data.child_price || 0
        const concessionPrice = data.concession_price || 0
        const totalAmount = (data.adult_count * data.adult_price) + (data.child_count * childPrice) + (data.concession_count * concessionPrice)

        // Создать продажу
        const sale = await prisma.sale.create({
          data: {
            tour_id: data.tour_id,
            seller_user_id: req.user!.userId,
            promoter_user_id: data.promoter_user_id || null,
            adult_count: data.adult_count,
            child_count: data.child_count,
            concession_count: data.concession_count,
            adult_price: data.adult_price,
            child_price: data.child_price || null,
            concession_price: data.concession_price || null,
            total_amount: totalAmount,
            payment_method: data.payment_method as PaymentMethod,
            payment_status: 'pending',
            payment_link_token: generateRandomToken(),
          },
          include: {
            tour: {
              include: {
                category: true,
              },
            },
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

        // Если онлайн оплата - создать payment link
        if (data.payment_method === 'online_yookassa') {
          const paymentLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/${sale.payment_link_token}`
          
          await prisma.sale.update({
            where: { id: sale.id },
            data: {
              payment_link_url: paymentLinkUrl,
            },
          })
        }

        return NextResponse.json({
          success: true,
          data: sale,
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { success: false, error: 'Invalid input', details: error.errors },
            { status: 400 }
          )
        }
        
        console.error('Create sale error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.manager, UserRole.promoter]
  )
}
