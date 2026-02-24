import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  return withAuth(request, async (req: AuthRequest) => {
    try {
      const logs = await prisma.$queryRawUnsafe<
        {
          id: string
          user_id: string
          ip_address: string | null
          user_agent: string | null
          success: boolean
          created_at: Date
        }[]
      >(
        'SELECT id, user_id, ip_address, user_agent, success, created_at FROM "user_login_logs" WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
        req.user!.userId
      )

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

