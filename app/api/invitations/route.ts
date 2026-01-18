import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { generateRandomToken } from '@/lib/auth'

const createInvitationSchema = z.object({
  target_role: z.enum(['manager', 'promoter', 'partner']),
})

// POST /api/invitations - создание пригласительной ссылки
export async function POST(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        const body = await request.json()
        const { target_role } = createInvitationSchema.parse(body)

        // Проверка прав
        if (req.user!.role === UserRole.manager && target_role !== 'promoter') {
          return NextResponse.json(
            { success: false, error: 'Managers can only invite promoters' },
            { status: 403 }
          )
        }

        if (req.user!.role !== UserRole.owner && target_role === 'partner') {
          return NextResponse.json(
            { success: false, error: 'Only owner can invite partners' },
            { status: 403 }
          )
        }

        if (req.user!.role !== UserRole.owner && target_role === 'manager') {
          return NextResponse.json(
            { success: false, error: 'Only owner can invite managers' },
            { status: 403 }
          )
        }

        // Генерировать токен
        const token = generateRandomToken()
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24) // 24 часа

        // Создать приглашение
        const invitation = await prisma.invitationToken.create({
          data: {
            token,
            invited_by_user_id: req.user!.userId,
            target_role,
            expires_at: expiresAt,
          },
          include: {
            invitedBy: {
              select: {
                id: true,
                full_name: true,
              },
            },
          },
        })

        const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/register/${token}`

        return NextResponse.json({
          success: true,
          data: {
            invitation_link: invitationLink,
            token: invitation.token,
            expires_at: invitation.expires_at,
          },
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { success: false, error: 'Invalid input', details: error.errors },
            { status: 400 }
          )
        }
        
        console.error('Create invitation error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner, UserRole.manager]
  )
}

// GET /api/invitations - список приглашений
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        const invitations = await prisma.invitationToken.findMany({
          where: {
            invited_by_user_id: req.user!.userId,
          },
          include: {
            usedBy: {
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
        })

        return NextResponse.json({
          success: true,
          data: invitations,
        })
      } catch (error) {
        console.error('Get invitations error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
}
