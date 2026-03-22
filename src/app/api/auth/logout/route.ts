import { NextResponse } from 'next/server'
import { getAuthCookieClearHeader } from '@/lib/auth'

// POST /api/auth/logout - выход из системы (очистка cookie)
export async function POST() {
  const res = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  })
  res.headers.set('Set-Cookie', getAuthCookieClearHeader())
  return res
}
