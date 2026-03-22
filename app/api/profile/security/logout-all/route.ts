import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthRequest) => {
    try {
      await prisma.$executeRawUnsafe(
        'UPDATE "users" SET "token_version" = COALESCE("token_version", 0) + 1 WHERE "id" = $1',
        req.user!.userId
      )

      return NextResponse.json({
        success: true,
        message: 'Все сессии завершены. Пожалуйста, войдите снова.',
      })
    } catch (error) {
      console.error('Logout all sessions error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

