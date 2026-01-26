import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, TicketStatus } from '@prisma/client'
import { updateDebtOnTicketCancel } from '@/utils/balance'

// POST /api/tickets/:id/cancel - отмена билета (только владелец)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json(
            { success: false, error: 'Only owner can cancel tickets' },
            { status: 403 }
          )
        }

        const { id } = params

        const ticket = await prisma.ticket.findUnique({
          where: { id },
          include: {
            sale: {
              include: {
                tour: true,
                flight: true,
              },
            },
          },
        })

        if (!ticket) {
          return NextResponse.json(
            { success: false, error: 'Ticket not found' },
            { status: 404 }
          )
        }

        if (ticket.ticket_status === TicketStatus.cancelled) {
          return NextResponse.json(
            { success: false, error: 'Ticket already cancelled' },
            { status: 400 }
          )
        }

        const oldStatus = ticket.ticket_status

        // Обновить статус билета
        await prisma.ticket.update({
          where: { id },
          data: {
            ticket_status: TicketStatus.cancelled,
            cancelled_at: new Date(),
            cancelled_by_user_id: req.user!.userId,
          },
        })

        // Если билет был в статусе sold, освободить места на рейсе
        if (oldStatus === TicketStatus.sold) {
          const placesToFree = ticket.adult_count + ticket.child_count + ((ticket as any).concession_count || 0)
          
          const updatedFlight = await prisma.flight.update({
            where: { id: ticket.sale.flight_id },
            data: {
              current_booked_places: {
                decrement: placesToFree,
              },
            },
          })

          // Проверить, нужно ли возобновить продажи
          if (updatedFlight.is_sale_stopped && updatedFlight.current_booked_places < updatedFlight.max_places) {
            await prisma.flight.update({
              where: { id: ticket.sale.flight_id },
              data: {
                is_sale_stopped: false,
              },
            })
          }
        }

        // Обновить баланс "Должен компании" если это наличка/эквайринг
        await updateDebtOnTicketCancel(id, req.user!.userId)

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
    },
    [UserRole.owner]
  )
}
