import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/middleware'
import { UserRole } from '@prisma/client'

export async function POST(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        const { email, password } = await request.json()

        if (!email || !email.includes('@')) {
          return NextResponse.json({ success: false, error: 'Некорректный email' }, { status: 400 })
        }

        if (!password || password.length < 6) {
          return NextResponse.json(
            { success: false, error: 'Пароль должен содержать минимум 6 символов' },
            { status: 400 }
          )
        }

        const existingAssistant = await prisma.user.findFirst({
          where: {
            main_owner_id: req.user!.userId,
            role: UserRole.owner_assistant,
          },
        })
        if (existingAssistant) {
          return NextResponse.json({ success: false, error: 'Помощник уже создан' }, { status: 400 })
        }

        const emailExists = await prisma.user.findUnique({
          where: { email },
        })
        if (emailExists) {
          return NextResponse.json({ success: false, error: 'Email уже используется' }, { status: 400 })
        }

        const bcrypt = require('bcryptjs')
        const password_hash = await bcrypt.hash(password, 10)

        const assistant = await prisma.user.create({
          data: {
            email,
            password_hash,
            role: UserRole.owner_assistant,
            main_owner_id: req.user!.userId,
            email_confirmed: true,
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Помощник успешно создан',
          assistant: {
            id: assistant.id,
            email: assistant.email,
          },
        })
      } catch (error) {
        console.error('Error creating assistant:', error)
        return NextResponse.json(
          { success: false, error: 'Ошибка при создании помощника' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
