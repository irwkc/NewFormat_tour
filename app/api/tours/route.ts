import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, ModerationStatus } from '@prisma/client'
import { z } from 'zod'

const createTourSchema = z.object({
  category_id: z.string().uuid(),
  company: z.string().min(1),
  departure_time: z.string().datetime(),
  date: z.string().date(),
  max_places: z.number().int().positive(),
  partner_min_adult_price: z.number().positive(),
  partner_min_child_price: z.number().positive(),
  partner_min_concession_price: z.number().positive().optional(),
  flight_number: z.string().min(1),
  boarding_location_url: z.string().url().optional().or(z.literal('')),
})

// GET /api/tours - список экскурсий
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')
    const categoryName = searchParams.get('category_name')
    const moderationStatus = searchParams.get('moderation_status') as ModerationStatus | null

    const where: any = {}

    if (categoryId) {
      where.category_id = categoryId
    }

    if (categoryName) {
      where.category = {
        name: {
          contains: categoryName,
          mode: 'insensitive',
        },
      }
    }

    // Менеджеры и промоутеры видят только одобренные экскурсии
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('token')?.value
    
    if (!token || !authHeader) {
      // Без авторизации - только одобренные
      where.moderation_status = ModerationStatus.approved
    } else {
      try {
        const { verifyToken } = await import('@/lib/auth')
        const payload = verifyToken(token)
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { role: true },
        })

        if (user) {
          if (user.role === UserRole.manager || user.role === UserRole.promoter) {
            // Менеджеры и промоутеры видят только одобренные
            where.moderation_status = ModerationStatus.approved
          } else if (user.role === UserRole.partner) {
            // Партнеры видят только свои экскурсии (все статусы)
            where.created_by_user_id = payload.userId
            if (moderationStatus) {
              where.moderation_status = moderationStatus
            }
          } else if (user.role === UserRole.owner) {
            // Владелец видит все (может фильтровать по статусу)
            if (moderationStatus) {
              where.moderation_status = moderationStatus
            }
          }
        }
      } catch {
        // Невалидный токен - только одобренные
        where.moderation_status = ModerationStatus.approved
      }
    }

    const tours = await prisma.tour.findMany({
      where,
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            full_name: true,
          },
        },
        moderatedBy: {
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
      data: tours,
    })
  } catch (error) {
    console.error('Get tours error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/tours - создание экскурсии (только партнер)
export async function POST(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.partner) {
          return NextResponse.json(
            { success: false, error: 'Only partners can create tours' },
            { status: 403 }
          )
        }

        const body = await request.json()
        const data = createTourSchema.parse(body)

        const tour = await prisma.tour.create({
          data: {
            created_by_user_id: req.user!.userId,
            category_id: data.category_id,
            company: data.company,
            departure_time: new Date(data.departure_time),
            date: new Date(data.date),
            max_places: data.max_places,
            partner_min_adult_price: data.partner_min_adult_price,
            partner_min_child_price: data.partner_min_child_price,
            partner_min_concession_price: data.partner_min_concession_price || null,
            flight_number: data.flight_number,
            boarding_location_url: data.boarding_location_url || null,
            moderation_status: ModerationStatus.pending,
          },
          include: {
            category: true,
            createdBy: {
              select: {
                id: true,
                full_name: true,
              },
            },
          },
        })

        return NextResponse.json({
          success: true,
          data: tour,
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { success: false, error: 'Invalid input', details: error.errors },
            { status: 400 }
          )
        }
        
        console.error('Create tour error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.partner]
  )
}
