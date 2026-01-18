import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { sendConfirmationEmail, sendPromoterIdEmail } from '@/lib/email'
import { generateRandomToken } from '@/lib/auth'
import { z } from 'zod'
import sharp from 'sharp'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const registerSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email(),
  password: z.string().min(6),
  photo: z.string().optional(), // base64 encoded image
  controller_password: z.string().min(6).optional(), // пароль для альтернативного профиля контролера (для партнеров)
})

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const body = await request.json()
    const { full_name, phone, email, password, photo, controller_password } = registerSchema.parse(body)

    // Проверить токен приглашения
    const invitation = await prisma.invitationToken.findUnique({
      where: { token },
    })

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invalid invitation token' },
        { status: 400 }
      )
    }

    if (invitation.is_used) {
      return NextResponse.json(
        { success: false, error: 'Invitation token already used' },
        { status: 400 }
      )
    }

    if (invitation.expires_at < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Invitation token expired' },
        { status: 400 }
      )
    }

    // Проверить, что email не занят
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Определить роль
    const role = invitation.target_role as 'manager' | 'promoter' | 'partner'
    
    // Обработать фото (для промоутеров и менеджеров обязательно)
    let photoUrl: string | null = null
    
    if (role === 'manager' || role === 'promoter') {
      if (!photo) {
        return NextResponse.json(
          { success: false, error: 'Photo is required for managers and promoters' },
          { status: 400 }
        )
      }

      // Сохранить фото
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'photos')
      await mkdir(uploadDir, { recursive: true })
      
      const buffer = Buffer.from(photo, 'base64')
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
      const filepath = path.join(uploadDir, filename)

      // Сжать и сохранить
      await sharp(buffer)
        .resize(800, 800, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toFile(filepath)

      photoUrl = `/uploads/photos/${filename}`
    }

    // Хэшировать пароль
    const passwordHash = await hashPassword(password)

    // Определить роль
    let userRole: 'manager' | 'promoter' | 'partner' = 'manager'
    if (invitation.target_role === 'promoter') userRole = 'promoter'
    if (invitation.target_role === 'partner') userRole = 'partner'

    // Генерация promoter_id для промоутеров
    let promoterId: number | null = null
    if (userRole === 'promoter') {
      // Найти максимальный promoter_id
      const maxPromoter = await prisma.user.findFirst({
        where: { promoter_id: { not: null } },
        orderBy: { promoter_id: 'desc' },
        select: { promoter_id: true },
      })
      promoterId = maxPromoter?.promoter_id ? maxPromoter.promoter_id + 1 : 1
    }

    // Создать пользователя
    const user = await prisma.user.create({
      data: {
        email,
        promoter_id: promoterId,
        full_name,
        phone,
        password_hash: passwordHash,
        role: userRole,
        created_by_user_id: invitation.invited_by_user_id,
        photo_url: photoUrl,
        email_confirmation_token: generateRandomToken(),
      },
    })

    // Если это партнер, создать альтернативный профиль контролера
    if (userRole === 'partner') {
      // Пароль для контролера - из формы или сгенерированный
      const controllerPassword = controller_password || generateRandomToken().substring(0, 12)
      await prisma.user.create({
        data: {
          email,
          full_name: `${full_name} (Контролер)`,
          phone,
          password_hash: await hashPassword(controllerPassword),
          role: 'partner_controller',
          main_partner_id: user.id,
        },
      })
    }

    // Отметить токен как использованный
    await prisma.invitationToken.update({
      where: { id: invitation.id },
      data: {
        is_used: true,
        used_by_user_id: user.id,
        used_at: new Date(),
      },
    })

    // Отправить email с подтверждением
    if (user.email_confirmation_token) {
      await sendConfirmationEmail(email, user.email_confirmation_token)
    }

    // Отправить promoter_id на email для промоутеров
    if (userRole === 'promoter' && promoterId) {
      await sendPromoterIdEmail(email, promoterId)
    }

    // Сгенерировать токен
    const authToken = generateToken({
      userId: user.id,
      role: user.role,
      email: user.email,
      promoterId: user.promoter_id,
    })

    const { password_hash, ...userWithoutPassword } = user

    return NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token: authToken,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
