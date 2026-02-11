import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// GET /api/manager-ticket-ranges/my — мои переданные диапазоны (менеджер)
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      if (req.user!.role !== UserRole.manager) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        )
      }
      const ranges = await prisma.managerTicketRange.findMany({
        where: { manager_user_id: req.user!.userId },
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          ticket_number_start: true,
          ticket_number_end: true,
          created_at: true,
        },
      })
      return NextResponse.json({ success: true, data: ranges })
    },
    [UserRole.manager]
  )
}
