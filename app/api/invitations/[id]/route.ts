import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

// DELETE /api/invitations/:id - отозвать неиспользованное приглашение
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        const { id } = params

        const invitation = await prisma.invitationToken.findUnique({
          where: { id },
        })

        if (!invitation) {
          return NextResponse.json(
            { success: false, error: 'Invitation not found' },
            { status: 404 }
          )
        }

        if (invitation.invited_by_user_id !== req.user!.userId) {
          return NextResponse.json(
            { success: false, error: 'You can only revoke your own invitations' },
            { status: 403 }
          )
        }

        if (invitation.is_used) {
          return NextResponse.json(
            { success: false, error: 'Cannot revoke used invitation' },
            { status: 400 }
          )
        }

        await prisma.invitationToken.delete({
          where: { id },
        })

        return NextResponse.json({
          success: true,
          message: 'Invitation revoked successfully',
        })
      } catch (error) {
        console.error('Revoke invitation error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
}
