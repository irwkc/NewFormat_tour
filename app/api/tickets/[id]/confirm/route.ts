import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, TicketStatus } from '@prisma/client'
import { updateBalanceOnTicketConfirm } from '@/utils/balance'

// POST /api/tickets/:id/confirm - подтверждение использования билета
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        // Только партнеры и контролеры могут подтверждать билеты
        if (req.user!.role !== UserRole.partner && req.user!.role !== UserRole.partner_controller) {
          return NextResponse.json(
            { success: false, error: 'Only partners can confirm tickets' },
            { status: 403 }
          )
        }

        const { id } = params

        const ticket = await prisma.ticket.findUnique({
          where: { id },
          include: {
            sale: true,
          },
        })

        if (!ticket) {
          return NextResponse.json(
            { success: false, error: 'Ticket not found' },
            { status: 404 }
          )
        }

        if (ticket.ticket_status !== TicketStatus.sold) {
          return NextResponse.json(
            { success: false, error: 'Ticket already used or cancelled' },
            { status: 400 }
          )
        }

        // Обновить статус билета
        await prisma.ticket.update({
          where: { id },
          data: {
            ticket_status: TicketStatus.used,
            used_at: new Date(),
            used_by_user_id: req.user!.userId,
          },
        })

        // Обновить балансы
        await updateBalanceOnTicketConfirm(id, req.user!.userId)

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
