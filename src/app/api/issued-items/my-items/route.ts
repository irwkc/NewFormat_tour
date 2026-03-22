import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

// GET /api/issued-items/my-items - список вещей текущего пользователя
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        const items = await prisma.issuedItem.findMany({
          where: {
            issued_to_user_id: req.user!.userId,
            is_returned: false,
          },
          include: {
            issuedBy: {
              select: {
                id: true,
                full_name: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
        })

        return NextResponse.json({
          success: true,
          data: items,
        })
      } catch (error) {
        console.error('Get my items error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
}
