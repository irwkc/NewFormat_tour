import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/auth/register/:token/invitation - получение информации о приглашении для страницы регистрации
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    const invitation = await prisma.invitationToken.findUnique({
      where: { token },
      include: {
        invitedBy: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invalid invitation token' },
        { status: 404 }
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

    return NextResponse.json({
      success: true,
      data: {
        invitation: {
          id: invitation.id,
          target_role: invitation.target_role,
          expires_at: invitation.expires_at,
          invited_by: invitation.invitedBy,
        },
      },
    })
  } catch (error) {
    console.error('Get invitation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
