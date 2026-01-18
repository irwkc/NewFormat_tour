import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'

const updatePasswordSchema = z.object({
  new_password: z.string().min(6),
})

// GET /api/owner/assistant-password - проверка наличия помощника
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json(
            { success: false, error: 'Only owner can access this' },
            { status: 403 }
          )
        }

        const assistant = await prisma.user.findFirst({
          where: {
            main_owner_id: req.user!.userId,
            role: UserRole.owner_assistant,
          },
        })

        if (!assistant) {
          return NextResponse.json(
            { success: false, error: 'Assistant not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          hasAssistant: true,
        })
      } catch (error) {
        console.error('Check assistant error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}

// POST /api/owner/assistant-password - изменение пароля помощника владельца
export async function POST(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json(
            { success: false, error: 'Only owner can change assistant password' },
            { status: 403 }
          )
        }

        const body = await request.json()
        const { new_password } = updatePasswordSchema.parse(body)

        // Найти помощника владельца
        const assistant = await prisma.user.findFirst({
          where: {
            main_owner_id: req.user!.userId,
            role: UserRole.owner_assistant,
          },
        })

        if (!assistant) {
          return NextResponse.json(
            { success: false, error: 'Assistant profile not found' },
            { status: 404 }
          )
        }

        // Обновить пароль
        const passwordHash = await hashPassword(new_password)
        
        await prisma.user.update({
          where: { id: assistant.id },
          data: {
            password_hash: passwordHash,
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Assistant password updated successfully',
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { success: false, error: 'Invalid input', details: error.errors },
            { status: 400 }
          )
        }
        
        console.error('Update assistant password error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
