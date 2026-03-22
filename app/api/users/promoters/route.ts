import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// GET /api/users/promoters - список промоутеров с балансами (для владельца)
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json(
            { success: false, error: 'Only owner can view promoters list' },
            { status: 403 }
          )
        }

        const promoters = await prisma.user.findMany({
          where: {
            role: UserRole.promoter,
          },
          select: {
            id: true,
            promoter_id: true,
            full_name: true,
            email: true,
            phone: true,
            photo_url: true,
            balance: true,
            is_active: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
        })

        return NextResponse.json({
          success: true,
          data: promoters,
        })
      } catch (error) {
        console.error('Get promoters error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
