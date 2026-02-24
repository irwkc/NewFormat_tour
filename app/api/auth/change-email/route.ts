import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { comparePassword, generateRandomToken } from '@/lib/auth'
import { sendConfirmationEmail } from '@/lib/email'

const changeEmailSchema = z.object({
  new_email: z.string().email('Некорректный email'),
  current_password: z.string().min(1, 'Текущий пароль обязателен'),
})

export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthRequest) => {
    try {
      const body = await request.json()
      const { new_email, current_password } = changeEmailSchema.parse(body)

      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { id: true, email: true, password_hash: true, role: true },
      })

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }

      const isValid = await comparePassword(current_password, user.password_hash)
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Неверный текущий пароль' },
          { status: 400 }
        )
      }

      // Проверяем, не занят ли email
      const emailExists = await prisma.user.findUnique({
        where: { email: new_email },
      })

      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'Email уже используется' },
          { status: 400 }
        )
      }

      const emailConfirmationToken = generateRandomToken()

      await prisma.user.update({
        where: { id: user.id },
        data: {
          email: new_email,
          email_confirmed: false,
          email_confirmation_token: emailConfirmationToken,
        },
      })

      try {
        await sendConfirmationEmail(new_email, emailConfirmationToken)
      } catch (e) {
        console.error('Error sending confirmation email:', e)
      }

      return NextResponse.json({
        success: true,
        message: 'Email успешно изменен. Проверьте новую почту для подтверждения.',
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Неверные данные', details: error.errors },
          { status: 400 }
        )
      }

      console.error('Change email error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

