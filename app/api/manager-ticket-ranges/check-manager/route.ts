import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// GET /api/manager-ticket-ranges/check-manager?email=... — поиск менеджера по email (владелец/помощник)
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
      const email = request.nextUrl.searchParams.get('email')?.trim()
      if (!email) {
        return NextResponse.json(
          { success: false, error: 'Укажите email' },
          { status: 400 }
        )
      }

      const manager = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          role: UserRole.manager,
        },
        select: {
          id: true,
          email: true,
          full_name: true,
          is_active: true,
        },
      })

      if (!manager) {
        return NextResponse.json({
          success: true,
          found: false,
          manager: null,
        })
      }
      return NextResponse.json({
        success: true,
        found: true,
        manager: {
          id: manager.id,
          email: manager.email,
          full_name: manager.full_name,
          is_active: manager.is_active,
        },
      })
    },
    [UserRole.owner, UserRole.owner_assistant]
  )
}
