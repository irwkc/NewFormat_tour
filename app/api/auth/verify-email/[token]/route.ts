import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'
import { sendPromoterIdEmail } from '@/lib/email'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    const user = await prisma.user.findFirst({
      where: { email_confirmation_token: token },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 400 }
      )
    }

    if (user.email_confirmed) {
      return NextResponse.json(
        { success: false, error: 'Email already confirmed' },
        { status: 400 }
      )
    }

    // Подтвердить email
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email_confirmed: true,
        email_confirmation_token: null,
      },
    })

    // Если это промоутер, отправить promoter_id на email
    if (user.role === 'promoter' && user.promoter_id && user.email) {
      await sendPromoterIdEmail(user.email, user.promoter_id)
    }

    // Сгенерировать токен для автоматического входа
    const authToken = generateToken({
      userId: user.id,
      role: user.role,
      email: user.email,
      promoterId: user.promoter_id,
    })

    return NextResponse.json({
      success: true,
      message: 'Email confirmed successfully',
      data: { token: authToken },
    })
  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
