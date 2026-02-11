import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import {
  validateTicketRange,
  numbersInRange,
  isTicketInRange,
} from '@/utils/ticket-range'

const TICKET_REGEX = /^[A-Z]{2}\d{8}$/

// GET /api/manager-ticket-ranges — список передач (владелец/помощник)
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      if (
        req.user!.role !== UserRole.owner &&
        req.user!.role !== UserRole.owner_assistant
      ) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        )
      }
      try {
        const { searchParams } = new URL(request.url)
        const managerId = searchParams.get('manager_id') ?? undefined

        const where: { created_by_user_id?: string | { in: string[] }; manager_user_id?: string } =
          {}
        const me = await prisma.user.findUnique({
          where: { id: req.user!.userId },
          select: { main_owner_id: true, id: true },
        })
        if (me?.main_owner_id) {
          where.created_by_user_id = { in: [me.main_owner_id, me.id] }
        } else {
          where.created_by_user_id = req.user!.userId
        }
        if (managerId) where.manager_user_id = managerId

        const ranges = await prisma.managerTicketRange.findMany({
          where,
          orderBy: { created_at: 'desc' },
          include: {
            manager: {
              select: {
                id: true,
                email: true,
                full_name: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                email: true,
                full_name: true,
              },
            },
          },
        })

        return NextResponse.json({ success: true, data: ranges })
      } catch (e) {
        console.error('GET manager-ticket-ranges:', e)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner, UserRole.owner_assistant]
  )
}

// POST /api/manager-ticket-ranges — создать передачу (владелец/помощник)
export async function POST(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      if (
        req.user!.role !== UserRole.owner &&
        req.user!.role !== UserRole.owner_assistant
      ) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        )
      }
      try {
        const body = await request.json()
        const {
          manager_email,
          ticket_number_start,
          ticket_number_end,
        } = body as {
          manager_email?: string
          ticket_number_start?: string
          ticket_number_end?: string
        }

        if (!manager_email?.trim()) {
          return NextResponse.json(
            { success: false, error: 'Укажите email менеджера' },
            { status: 400 }
          )
        }

        const start = String(ticket_number_start ?? '').trim().toUpperCase()
        const end = String(ticket_number_end ?? '').trim().toUpperCase()

        const validation = validateTicketRange(start, end)
        if (!validation.ok) {
          return NextResponse.json(
            { success: false, error: validation.error },
            { status: 400 }
          )
        }

        const manager = await prisma.user.findFirst({
          where: {
            email: manager_email.trim().toLowerCase(),
            role: UserRole.manager,
            is_active: true,
          },
        })
        if (!manager) {
          return NextResponse.json(
            { success: false, error: 'Менеджер с таким email не найден или не активен' },
            { status: 400 }
          )
        }

        // Проверка: ни один номер из диапазона не занят в Ticket
        for (const num of numbersInRange(start, end)) {
          const existing = await prisma.ticket.findUnique({
            where: { ticket_number: num },
          })
          if (existing) {
            return NextResponse.json(
              {
                success: false,
                error: `Номер ${num} уже используется в системе. Выберите другой диапазон.`,
              },
              { status: 400 }
            )
          }
        }

        // Проверка: ни один номер из диапазона ещё не был передан (ни одному менеджеру)
        const allRanges = await prisma.managerTicketRange.findMany({
          select: {
            ticket_number_start: true,
            ticket_number_end: true,
            manager: { select: { email: true } },
          },
        })
        for (const num of numbersInRange(start, end)) {
          for (const r of allRanges) {
            if (isTicketInRange(num, r.ticket_number_start, r.ticket_number_end)) {
              return NextResponse.json(
                {
                  success: false,
                  error: `Номер ${num} уже был передан (менеджер ${r.manager?.email ?? '—'}). Переданный билет нельзя передать повторно. Выберите другой диапазон.`,
                },
                { status: 400 }
              )
            }
          }
        }

        const created = await prisma.managerTicketRange.create({
          data: {
            created_by_user_id: req.user!.userId,
            manager_user_id: manager.id,
            ticket_number_start: start,
            ticket_number_end: end,
          },
          include: {
            manager: {
              select: {
                id: true,
                email: true,
                full_name: true,
              },
            },
          },
        })

        return NextResponse.json({ success: true, data: created })
      } catch (e) {
        console.error('POST manager-ticket-ranges:', e)
        return NextResponse.json(
          { success: false, error: 'Ошибка при создании передачи' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner, UserRole.owner_assistant]
  )
}
