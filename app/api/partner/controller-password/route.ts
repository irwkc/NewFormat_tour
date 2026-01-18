import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'

const updatePasswordSchema = z.object({
  new_password: z.string().min(6),
})

// POST /api/partner/controller-password - изменение пароля альтернативного профиля контролера
export async function POST(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.partner) {
          return NextResponse.json(
            { success: false, error: 'Only partners can change controller password' },
            { status: 403 }
          )
        }

        const body = await request.json()
        const { new_password } = updatePasswordSchema.parse(body)

        // Найти альтернативный профиль контролера
        const controller = await prisma.user.findFirst({
          where: {
            main_partner_id: req.user!.userId,
            role: UserRole.partner_controller,
          },
        })

        if (!controller) {
          return NextResponse.json(
            { success: false, error: 'Controller profile not found' },
            { status: 404 }
          )
        }

        // Обновить пароль
        const passwordHash = await hashPassword(new_password)
        
        await prisma.user.update({
          where: { id: controller.id },
          data: {
            password_hash: passwordHash,
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Controller password updated successfully',
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { success: false, error: 'Invalid input', details: error.errors },
            { status: 400 }
          )
        }
        
        console.error('Update controller password error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.partner]
  )
}
