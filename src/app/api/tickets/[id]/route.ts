import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

// GET /api/tickets/:id - детали билета
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        const { id } = params

        const ticket = await prisma.ticket.findUnique({
          where: { id },
          include: {
            sale: {
              include: {
                seller: {
                  select: {
                    id: true,
                    full_name: true,
                    email: true,
                    promoter_id: true,
                  },
                },
                promoter: {
                  select: {
                    id: true,
                    full_name: true,
                    email: true,
                    promoter_id: true,
                  },
                },
                tour: {
                  include: {
                    category: true,
                  },
                },
              },
            },
            tour: {
              include: {
                category: true,
              },
            },
            usedBy: {
              select: {
                id: true,
                full_name: true,
                role: true,
              },
            },
            cancelledBy: {
              select: {
                id: true,
                full_name: true,
                role: true,
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

        return NextResponse.json({
          success: true,
          data: ticket,
        })
      } catch (error) {
        console.error('Get ticket error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
}
