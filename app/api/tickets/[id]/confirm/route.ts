import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { UserRole } from '@prisma/client'
import { confirmTicketDomain } from '@/lib/domain/tickets'
import { canConfirmTicket } from '@/lib/permissions'

// POST /api/tickets/:id/confirm - подтверждение использования билета
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (!canConfirmTicket({ id: req.user!.userId, role: req.user!.role as UserRole })) {
          return NextResponse.json(
            { success: false, error: 'Only partners can confirm tickets' },
            { status: 403 }
          )
        }

        const { id } = params

        const result = await confirmTicketDomain(id, req.user!.userId)

        if (result.status === 'not_found') {
          return NextResponse.json(
            { success: false, error: 'Ticket not found' },
            { status: 404 }
          )
        }

        if (result.status === 'invalid_status') {
          return NextResponse.json(
            { success: false, error: 'Ticket already used or cancelled' },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Ticket confirmed successfully',
        })
      } catch (error) {
        console.error('Confirm ticket error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.partner, UserRole.partner_controller]
  )
}
