import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import sharp from 'sharp'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const createIssuedItemSchema = z.object({
  user_identifier: z.string().min(1),
  item_name: z.string().min(1),
  item_description: z.string().optional(),
  photo: z.string(), // base64 encoded image
})

// POST /api/issued-items - выдача вещи
export async function POST(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner && req.user!.role !== UserRole.owner_assistant) {
          return NextResponse.json(
            { success: false, error: 'Only owner and assistant can issue items' },
            { status: 403 }
          )
        }

        const body = await request.json()
        const data = createIssuedItemSchema.parse(body)

        // Найти пользователя по identifier
        // Промоутер: по promoter_id, Менеджер: по email
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { promoter_id: parseInt(data.user_identifier) ? parseInt(data.user_identifier) : undefined },
              { email: data.user_identifier },
            ],
          },
        })

        if (!user) {
          return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 }
          )
        }

        if (user.role !== 'manager' && user.role !== 'promoter') {
          return NextResponse.json(
            { success: false, error: 'Can only issue items to managers and promoters' },
            { status: 400 }
          )
        }

        // Сохранить фото
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'issued-items')
        await mkdir(uploadDir, { recursive: true })
        
        const buffer = Buffer.from(data.photo, 'base64')
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
        const filepath = path.join(uploadDir, filename)

        // Сжать и сохранить
        await sharp(buffer)
          .resize(1200, 1200, { fit: 'cover' })
          .jpeg({ quality: 85 })
          .toFile(filepath)

        const photoUrl = `/uploads/issued-items/${filename}`

        // Создать запись о выдаче
        const issuedItem = await prisma.issuedItem.create({
          data: {
            issued_by_user_id: req.user!.userId,
            issued_to_user_id: user.id,
            item_name: data.item_name,
            item_description: data.item_description || null,
            item_photo_url: photoUrl,
          },
          include: {
            issuedBy: {
              select: {
                id: true,
                full_name: true,
              },
            },
            issuedTo: {
              select: {
                id: true,
                full_name: true,
                email: true,
                promoter_id: true,
              },
            },
          },
        })

        return NextResponse.json({
          success: true,
          data: issuedItem,
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { success: false, error: 'Invalid input', details: error.errors },
            { status: 400 }
          )
        }
        
        console.error('Issue item error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner, UserRole.owner_assistant]
  )
}

// GET /api/issued-items - список выданных вещей (для владельца и помощника)
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner && req.user!.role !== UserRole.owner_assistant) {
          return NextResponse.json(
            { success: false, error: 'Only owner and assistant can view all issued items' },
            { status: 403 }
          )
        }

        const issuedItems = await prisma.issuedItem.findMany({
          include: {
            issuedBy: {
              select: {
                id: true,
                full_name: true,
              },
            },
            issuedTo: {
              select: {
                id: true,
                full_name: true,
                email: true,
                promoter_id: true,
              },
            },
            returnedBy: {
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
          data: issuedItems,
        })
      } catch (error) {
        console.error('Get issued items error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner, UserRole.owner_assistant]
  )
}
