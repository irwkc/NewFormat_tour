import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { numbersInRange } from '@/utils/ticket-range'

const MAX_AVAILABLE = 2000

// GET /api/manager-ticket-ranges/my-available — свободные номера из переданных диапазонов (менеджер)
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
        select: {
          ticket_number_start: true,
          ticket_number_end: true,
        },
      })

      const usedSet = new Set<string>()
      const usedTickets = await prisma.ticket.findMany({
        where: { ticket_number: { not: null } },
        select: { ticket_number: true },
      })
      usedTickets.forEach((t) => {
        if (t.ticket_number) usedSet.add(t.ticket_number)
      })

      const available: string[] = []
      for (const r of ranges) {
        for (const num of numbersInRange(
          r.ticket_number_start,
          r.ticket_number_end
        )) {
          if (!usedSet.has(num)) {
            available.push(num)
            if (available.length >= MAX_AVAILABLE) break
          }
        }
        if (available.length >= MAX_AVAILABLE) break
      }

      return NextResponse.json({
        success: true,
        data: available,
      })
    },
    [UserRole.manager]
  )
}
