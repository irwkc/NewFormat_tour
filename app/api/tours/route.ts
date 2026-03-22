import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, ModerationStatus, Prisma } from '@prisma/client'
import { z } from 'zod'
import sharp from 'sharp'
import { mkdir } from 'fs/promises'
import path from 'path'
import { isFlightStarted } from '@/lib/moscow-time'

const createTourSchema = z.object({
  category_id: z.string().uuid(),
  company: z.string().min(1),
  description: z.string().optional().nullable(),
  photos: z.array(z.string()).optional().default([]), // base64
})

// GET /api/tours - список экскурсий
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')
    const categoryName = searchParams.get('category_name')
    const moderationStatus = searchParams.get('moderation_status') as ModerationStatus | null

    const where: Record<string, unknown> = {}

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

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('token')?.value

    if (!token || !authHeader) {
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
            where.moderation_status = ModerationStatus.approved
          } else if (user.role === UserRole.partner) {
            where.created_by_user_id = payload.userId
            if (moderationStatus) {
              where.moderation_status = moderationStatus
            }
          } else if (user.role === UserRole.owner) {
            if (moderationStatus) {
              where.moderation_status = moderationStatus
              if (moderationStatus === ModerationStatus.pending) {
                where.flights = { some: {} }
              }
            }
          }
        }
      } catch {
        where.moderation_status = ModerationStatus.approved
      }
    }

    const tours = await prisma.tour.findMany({
      where,
      include: {
        category: true,
        flights: {
          orderBy: [
            { date: 'asc' },
            { departure_time: 'asc' },
          ],
        },
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

    // Для менеджеров и промоутеров — исключаем начавшиеся рейсы (нельзя продавать)
    let resultTours = tours
    if (token && authHeader) {
      try {
        const { verifyToken } = await import('@/lib/auth')
        const payload = verifyToken(token)
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { role: true },
        })
        if (user && (user.role === UserRole.manager || user.role === UserRole.promoter)) {
          resultTours = tours.map((t) => {
            let flights = (t.flights || []).filter((f) => !isFlightStarted(f.departure_time))
            const hasModerated = flights.some((f) => (f as { is_moderated?: boolean }).is_moderated)
            if (hasModerated) {
              flights = flights.filter((f) => (f as { is_moderated?: boolean }).is_moderated)
            }
            return { ...t, flights }
          })
        }
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      success: true,
      data: resultTours,
    })
  } catch (error) {
    console.error('Get tours error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/tours - создание экскурсии (только партнер, базовая инфо без цен и рейсов)
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

        let photoUrls: string[] = []
        if (data.photos && data.photos.length > 0) {
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tours')
          await mkdir(uploadDir, { recursive: true })

          for (const photo of data.photos) {
            const base64Data = photo.includes(',') ? photo.split(',')[1] : photo
            const buffer = Buffer.from(base64Data, 'base64')
            const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
            const filepath = path.join(uploadDir, filename)
            await sharp(buffer)
              .resize(1200, 1200, { fit: 'inside' })
              .jpeg({ quality: 85 })
              .toFile(filepath)
            photoUrls.push(`/uploads/tours/${filename}`)
          }
        }

        const tour = await prisma.tour.create({
          data: {
            created_by_user_id: req.user!.userId,
            category_id: data.category_id,
            company: data.company,
            description: data.description || null,
            photo_urls: photoUrls.length > 0 ? photoUrls : Prisma.DbNull,
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
