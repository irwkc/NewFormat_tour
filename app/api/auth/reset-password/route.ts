import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  token: z.string(),
  new_password: z.string().min(6),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, new_password } = resetPasswordSchema.parse(body)

    const user = await prisma.user.findFirst({
      where: {
        password_reset_token: token,
        password_reset_expires: {
          gt: new Date(),
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    // Обновить пароль
    const passwordHash = await hashPassword(new_password)
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_expires: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Reset password error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
