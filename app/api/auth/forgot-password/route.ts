import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import { generateRandomToken } from '@/lib/auth'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Не раскрываем, существует ли пользователь
      return NextResponse.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      })
    }

    // Генерировать токен сброса пароля
    const resetToken = generateRandomToken()
    const resetExpires = new Date()
    resetExpires.setHours(resetExpires.getHours() + 24) // 24 часа

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_reset_token: resetToken,
        password_reset_expires: resetExpires,
      },
    })

    // Отправить email с токеном
    await sendPasswordResetEmail(user.email!, resetToken)

    return NextResponse.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
