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

const updateNotificationsSchema = z.object({
  notify_new_sale_email: z.boolean().optional(),
  notify_refund_email: z.boolean().optional(),
  notify_flight_change_email: z.boolean().optional(),
  notify_account_block_email: z.boolean().optional(),
  notify_promoter_report_email: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  return withAuth(request, async (req: AuthRequest) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
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
          notify_new_sale_email: true,
          notify_refund_email: true,
          notify_flight_change_email: true,
          notify_account_block_email: true,
          notify_promoter_report_email: true,
        } as any,
      })

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: user,
      })
    } catch (error) {
      console.error('Get profile error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

export async function PATCH(request: NextRequest) {
  return withAuth(request, async (req: AuthRequest) => {
    try {
      const body = await request.json()

      const profileResult = updateProfileSchema.safeParse(body)
      const notificationsResult = updateNotificationsSchema.safeParse(body)

      const data: any = {}

      if (profileResult.success) {
        const { full_name, phone, photo } = profileResult.data
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
      }

      if (notificationsResult.success) {
        const {
          notify_new_sale_email,
          notify_refund_email,
          notify_flight_change_email,
          notify_account_block_email,
          notify_promoter_report_email,
        } = notificationsResult.data
        if (typeof notify_new_sale_email === 'boolean') {
          data.notify_new_sale_email = notify_new_sale_email
        }
        if (typeof notify_refund_email === 'boolean') {
          data.notify_refund_email = notify_refund_email
        }
        if (typeof notify_flight_change_email === 'boolean') {
          data.notify_flight_change_email = notify_flight_change_email
        }
        if (typeof notify_account_block_email === 'boolean') {
          data.notify_account_block_email = notify_account_block_email
        }
        if (typeof notify_promoter_report_email === 'boolean') {
          data.notify_promoter_report_email = notify_promoter_report_email
        }
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
          notify_new_sale_email: true,
          notify_refund_email: true,
          notify_flight_change_email: true,
          notify_account_block_email: true,
          notify_promoter_report_email: true,
        } as any,
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

