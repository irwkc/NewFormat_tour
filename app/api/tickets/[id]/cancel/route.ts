import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { UserRole } from '@prisma/client'
import { cancelTicketDomain } from '@/lib/domain/tickets'
import { canCancelTicket } from '@/lib/permissions'

// POST /api/tickets/:id/cancel - отмена билета (только владелец)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (!canCancelTicket({ id: req.user!.userId, role: req.user!.role as UserRole })) {
          return NextResponse.json(
            { success: false, error: 'Only owner can cancel tickets' },
            { status: 403 }
          )
        }

        const { id } = params

        const result = await cancelTicketDomain(id, req.user!.userId)

        if (result.status === 'not_found') {
          return NextResponse.json(
            { success: false, error: 'Ticket not found' },
            { status: 404 }
          )
        }

        if (result.status === 'already_cancelled') {
          return NextResponse.json(
            { success: false, error: 'Ticket already cancelled' },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Ticket cancelled successfully',
        })
      } catch (error) {
        console.error('Cancel ticket error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
}
