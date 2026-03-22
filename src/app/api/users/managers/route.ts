import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// GET /api/users/managers - список менеджеров с балансами (для владельца)
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json(
            { success: false, error: 'Only owner can view managers list' },
            { status: 403 }
          )
        }

        const managers = await prisma.user.findMany({
          where: {
            role: UserRole.manager,
          },
          select: {
            id: true,
            email: true,
            full_name: true,
            phone: true,
            photo_url: true,
            balance: true,
            debt_to_company: true,
            is_active: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
        })

        return NextResponse.json({
          success: true,
          data: managers,
        })
      } catch (error) {
        console.error('Get managers error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
