import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import sharp from 'sharp'
import { mkdir } from 'fs/promises'
import path from 'path'

const updateProfileSchema = z.object({
  full_name: z.string().min(2).optional(),
  phone: z.string().regex(/^\+7\d{10}$/, 'Телефон должен быть в формате +7XXXXXXXXXX').optional(),
  photo: z.string().optional(), // base64 image
})

export async function PATCH(request: NextRequest) {
  return withAuth(request, async (req: AuthRequest) => {
    try {
      const body = await request.json()
      const { full_name, phone, photo } = updateProfileSchema.parse(body)

      const data: any = {}
      if (typeof full_name === 'string') data.full_name = full_name
      if (typeof phone === 'string') data.phone = phone

      if (photo) {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'photos')
        await mkdir(uploadDir, { recursive: true })

        const base64Data = photo.includes(',') ? photo.split(',')[1] : photo
        const buffer = Buffer.from(base64Data, 'base64')
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
        const filepath = path.join(uploadDir, filename)

        await sharp(buffer)
          .resize(800, 800, { fit: 'cover' })
          .jpeg({ quality: 85 })
          .toFile(filepath)

        data.photo_url = `/uploads/photos/${filename}`
      }

      if (Object.keys(data).length === 0) {
        return NextResponse.json(
          { success: false, error: 'Нет данных для обновления' },
          { status: 400 }
        )
      }

      const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data,
        select: {
          id: true,
          email: true,
          promoter_id: true,
          full_name: true,
          phone: true,
          role: true,
          photo_url: true,
          balance: true,
          debt_to_company: true,
        },
      })

      return NextResponse.json({
        success: true,
        data: user,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Неверные данные', details: error.errors },
          { status: 400 }
        )
      }

      console.error('Update profile error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

