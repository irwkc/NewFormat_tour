import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

// GET /api/sales/:id - детали продажи
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        const { id } = params

        const sale = await prisma.sale.findUnique({
          where: { id },
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
              include: {
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
            },
            yookassaPayments: {
              orderBy: { created_at: 'desc' },
            },
          },
        })

        if (!sale) {
          return NextResponse.json(
            { success: false, error: 'Sale not found' },
            { status: 404 }
          )
        }

        // Проверка прав доступа
        const isOwner = req.user!.role === 'owner'
        const isPartner = req.user!.role === 'partner'
        const isManagerOrPromoter = req.user!.role === 'manager' || req.user!.role === 'promoter'
        
        if (!isOwner && !isPartner && !isManagerOrPromoter) {
          return NextResponse.json(
            { success: false, error: 'Forbidden' },
            { status: 403 }
          )
        }

        // Менеджеры и промоутеры видят только свои продажи
        if (isManagerOrPromoter) {
          if (sale.seller_user_id !== req.user!.userId && sale.promoter_user_id !== req.user!.userId) {
            return NextResponse.json(
              { success: false, error: 'Forbidden' },
              { status: 403 }
            )
          }
        }

        // Партнеры видят только продажи своих экскурсий
        if (isPartner) {
          const tour = await prisma.tour.findUnique({
            where: { id: sale.tour_id },
            select: { created_by_user_id: true },
          })

          if (!tour || tour.created_by_user_id !== req.user!.userId) {
            return NextResponse.json(
              { success: false, error: 'Forbidden' },
              { status: 403 }
            )
          }
        }

        return NextResponse.json({
          success: true,
          data: sale,
        })
      } catch (error) {
        console.error('Get sale error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
}
