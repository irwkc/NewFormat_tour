import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { createSaleSchema, createSaleDomain } from '@/lib/domain/sales'
import { canCreateSale } from '@/lib/permissions'

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
            flight: true,
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
        if (!canCreateSale({ id: req.user!.userId, role: req.user!.role as UserRole })) {
          return NextResponse.json(
            { success: false, error: 'Only managers and promoters can create sales' },
            { status: 403 }
          )
        }

        const body = await request.json()
        const data = createSaleSchema.parse(body)

        if (data.payment_method === 'online_yookassa') {
          return NextResponse.json(
            { success: false, error: 'На данный момент продажа таким способом недоступна' },
            { status: 400 }
          )
        }

        // Проверить экскурсию
        const result = await createSaleDomain(data, { id: req.user!.userId, role: req.user!.role as UserRole })

        if (result.status === 'tour_not_found') {
          return NextResponse.json(
            { success: false, error: 'Tour not found' },
            { status: 404 }
          )
        }
        if (result.status === 'tour_not_approved') {
          return NextResponse.json(
            { success: false, error: 'Tour is not approved' },
            { status: 400 }
          )
        }
        if (result.status === 'flight_not_found') {
          return NextResponse.json(
            { success: false, error: 'Flight not found' },
            { status: 404 }
          )
        }
        if (result.status === 'flight_mismatch') {
          return NextResponse.json(
            { success: false, error: 'Flight does not belong to this tour' },
            { status: 400 }
          )
        }
        if (result.status === 'flight_sales_stopped') {
          return NextResponse.json(
            { success: false, error: 'Sales are stopped for this flight' },
            { status: 400 }
          )
        }
        if (result.status === 'flight_already_started') {
          return NextResponse.json(
            { success: false, error: 'Рейс уже начался, продажа билетов недоступна' },
            { status: 400 }
          )
        }
        if (result.status === 'not_enough_places') {
          return NextResponse.json(
            {
              success: false,
              error: `Not enough places available. Available: ${result.availablePlaces}, Requested: ${result.requestedPlaces}`,
            },
            { status: 400 }
          )
        }
        if (result.status === 'adult_price_too_low') {
          return NextResponse.json(
            { success: false, error: `Adult price must be at least ${result.min}` },
            { status: 400 }
          )
        }
        if (result.status === 'child_price_too_low') {
          return NextResponse.json(
            { success: false, error: `Child price must be at least ${result.min}` },
            { status: 400 }
          )
        }
        if (result.status === 'concession_price_too_low') {
          return NextResponse.json(
            { success: false, error: `Concession price must be at least ${result.min}` },
            { status: 400 }
          )
        }
        if (result.status === 'only_manager_can_sell_for_promoter') {
          return NextResponse.json(
            { success: false, error: 'Only managers can sell for promoters' },
            { status: 403 }
          )
        }
        if (result.status === 'promoter_not_found') {
          return NextResponse.json(
            { success: false, error: 'Promoter not found' },
            { status: 404 }
          )
        }
        if (result.status === 'manager_percent_required') {
          return NextResponse.json(
            { success: false, error: 'Укажите процент менеджера от суммы билетов' },
            { status: 400 }
          )
        }
        if (result.status === 'manager_percent_forbidden') {
          return NextResponse.json(
            { success: false, error: 'Процент менеджера допустим только при продаже за промоутера' },
            { status: 400 }
          )
        }
        if (result.status === 'manager_percent_exceeds_owner_cap') {
          return NextResponse.json(
            {
              success: false,
              error: `Процент менеджера не может превышать ${result.max}% (лимит владельца)`,
            },
            { status: 400 }
          )
        }
        if (result.status === 'manager_percent_too_high_vs_promoter') {
          return NextResponse.json(
            {
              success: false,
              error:
                'Процент менеджера от суммы билетов должен быть строго меньше доли промоутера по этой продаже',
            },
            { status: 400 }
          )
        }

        const sale = result.sale

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
    }
  )
}
