import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/middleware'
import { UserRole } from '@prisma/client'

export async function POST(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        const payload = req.user!

        const { password } = await request.json()

        if (!password || password.length < 6) {
          return NextResponse.json(
            { error: 'Пароль должен содержать минимум 6 символов' },
            { status: 400 }
          )
        }

        const existingController = await prisma.user.findFirst({
          where: {
            main_partner_id: payload.userId,
            role: 'partner_controller',
          },
        })

        if (existingController) {
          return NextResponse.json(
            { error: 'Контролер уже создан' },
            { status: 400 }
          )
        }

        const partner = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { email: true },
        })

        if (!partner || !partner.email) {
          return NextResponse.json(
            { error: 'У партнера должен быть email' },
            { status: 400 }
          )
        }

        const bcrypt = require('bcryptjs')
        const password_hash = await bcrypt.hash(password, 10)

        const controller = await prisma.user.create({
          data: {
            email: partner.email,
            password_hash,
            role: 'partner_controller',
            main_partner_id: payload.userId,
            email_confirmed: true,
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Контролер успешно создан',
          controller: {
            id: controller.id,
            email: controller.email,
          },
        })
      } catch (error: any) {
        console.error('Error creating controller:', error)
        return NextResponse.json(
          { error: 'Ошибка при создании контролера' },
          { status: 500 }
        )
      }
    },
    [UserRole.partner]
  )
}
