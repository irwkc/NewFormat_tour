import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, TicketStatus } from '@prisma/client'

// GET /api/tickets/check/qr/:qr_data - получение информации о билете по QR коду
export async function GET(
  request: NextRequest,
  { params }: { params: { qr_data: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.partner && req.user!.role !== UserRole.partner_controller) {
          return NextResponse.json(
            { success: false, error: 'Only partners can check tickets' },
            { status: 403 }
          )
        }

        const { qr_data } = params

        const ticket = await prisma.ticket.findFirst({
          where: {
            qr_code_data: qr_data,
          },
          include: {
            tour: {
              include: {
                category: true,
              },
            },
            sale: {
              include: {
                seller: {
                  select: {
                    id: true,
                    full_name: true,
                  },
                },
                promoter: {
                  select: {
                    id: true,
                    full_name: true,
                  },
                },
              },
            },
            usedBy: {
              select: {
                id: true,
                full_name: true,
              },
            },
            cancelledBy: {
              select: {
                id: true,
                full_name: true,
              },
            },
          },
        })

        if (!ticket) {
          return NextResponse.json({
            success: true,
            data: {
              is_valid: false,
              can_confirm: false,
              message: 'Ticket not found',
            },
          })
        }

        let canConfirm = false
        let message = ''

        if (ticket.ticket_status === TicketStatus.sold) {
          canConfirm = true
          message = 'Ticket is ready to confirm'
        } else if (ticket.ticket_status === TicketStatus.used) {
          canConfirm = false
          message = 'Ticket already used'
        } else if (ticket.ticket_status === TicketStatus.cancelled) {
          canConfirm = false
          message = 'Ticket cancelled'
        }

        return NextResponse.json({
          success: true,
          data: {
            ticket: {
              id: ticket.id,
              tour: {
                id: ticket.tour.id,
                company: ticket.tour.company,
                date: ticket.tour.date,
                departure_time: ticket.tour.departure_time,
                flight_number: ticket.tour.flight_number,
                category: ticket.tour.category.name,
              },
              adult_count: ticket.adult_count,
              child_count: ticket.child_count,
              concession_count: (ticket as any).concession_count || 0,
              ticket_status: ticket.ticket_status,
              ticket_number: ticket.ticket_number,
              ticket_photo_url: ticket.ticket_photo_url,
              qr_code_data: ticket.qr_code_data,
              used_at: ticket.used_at,
              used_by_user_id: ticket.used_by_user_id,
              usedBy: ticket.usedBy,
              cancelled_at: ticket.cancelled_at,
              cancelled_by_user_id: ticket.cancelled_by_user_id,
              cancelledBy: ticket.cancelledBy,
              created_at: ticket.created_at,
            },
            is_valid: true,
            can_confirm: canConfirm,
            message,
          },
        })
      } catch (error) {
        console.error('Check ticket QR error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.partner, UserRole.partner_controller]
  )
}
