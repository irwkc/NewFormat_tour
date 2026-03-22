import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { comparePassword, hashPassword } from '@/lib/auth'

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(6),
})

export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthRequest) => {
    try {
      const body = await request.json()
      const { current_password, new_password } = changePasswordSchema.parse(body)

      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { id: true, password_hash: true },
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

      const newHash = await hashPassword(new_password)
      await prisma.user.update({
        where: { id: user.id },
        data: { password_hash: newHash },
      })

      return NextResponse.json({
        success: true,
        message: 'Пароль успешно изменен',
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Неверные данные', details: error.errors },
          { status: 400 }
        )
      }

      console.error('Change password error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

