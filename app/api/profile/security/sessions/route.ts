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
      const logs = await prisma.userLoginLog.findMany({
        where: { user_id: req.user!.userId, success: true },
        orderBy: { created_at: 'desc' },
        take: 200,
        select: {
          ip_address: true,
          user_agent: true,
          created_at: true,
        },
      })

      const map = new Map<string, SessionSummary>()

      for (const log of logs) {
        const key = `${log.ip_address || 'unknown'}|${log.user_agent || 'unknown'}`
        const existing = map.get(key)
        const t = log.created_at.toISOString()
        if (!existing) {
          map.set(key, {
            id: key,
            ip_address: log.ip_address,
            user_agent: log.user_agent,
            last_seen_at: t,
            first_seen_at: t,
            attempts: 1,
          })
        } else {
          existing.attempts += 1
          if (log.created_at < new Date(existing.first_seen_at)) {
            existing.first_seen_at = t
          }
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

