import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  return withAuth(request, async (req: AuthRequest) => {
    try {
      const logs = await prisma.userLoginLog.findMany({
        where: { user_id: req.user!.userId },
        orderBy: { created_at: 'desc' },
        take: 50,
        select: {
          id: true,
          user_id: true,
          ip_address: true,
          user_agent: true,
          success: true,
          created_at: true,
        },
      })

      return NextResponse.json({
        success: true,
        data: logs,
      })
    } catch (error) {
      console.error('Get login history error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

