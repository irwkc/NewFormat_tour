import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

type SessionSummary = {
  id: string
  ip_address: string | null
  user_agent: string | null
  last_seen_at: string
  first_seen_at: string
  attempts: number
}

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
        'SELECT id, user_id, ip_address, user_agent, success, created_at FROM "user_login_logs" WHERE user_id = $1 AND success = true ORDER BY created_at DESC LIMIT 100',
        req.user!.userId
      )

      const map = new Map<string, SessionSummary>()

      for (const log of logs) {
        const key = `${log.ip_address || 'unknown'}|${log.user_agent || 'unknown'}`
        const existing = map.get(key)
        if (!existing) {
          map.set(key, {
            id: key,
            ip_address: log.ip_address,
            user_agent: log.user_agent,
            last_seen_at: log.created_at.toISOString(),
            first_seen_at: log.created_at.toISOString(),
            attempts: 1,
          })
        } else {
          existing.attempts += 1
          existing.first_seen_at = log.created_at.toISOString()
        }
      }

      return NextResponse.json({
        success: true,
        data: Array.from(map.values()),
      })
    } catch (error) {
      console.error('Get sessions error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

