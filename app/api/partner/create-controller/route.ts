import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/middleware'
import { UserRole } from '@prisma/client'

function buildControllerEmail(partnerEmail: string, partnerId: string) {
  const [localPart, domainPart] = partnerEmail.split('@')
  if (!localPart || !domainPart) {
    return `${partnerId.slice(0, 8)}.controller@newformat.local`
  }
  return `${localPart}+controller.${partnerId.slice(0, 8)}@${domainPart}`
}

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

        // У контролера должен быть отдельный уникальный email (email партнера занят им самим).
        const controllerEmail = buildControllerEmail(partner.email, payload.userId)
        const existsControllerEmail = await prisma.user.findUnique({ where: { email: controllerEmail } })
        if (existsControllerEmail) {
          return NextResponse.json(
            { success: false, error: 'Контролер уже создан' },
            { status: 400 }
          )
        }

        const controller = await prisma.user.create({
          data: {
            email: controllerEmail,
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
          { success: false, error: 'Ошибка при создании контролера' },
          { status: 500 }
        )
      }
    },
    [UserRole.partner]
  )
}
