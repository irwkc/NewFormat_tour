import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/auth'

export function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  if (!token || token.trim() === '') {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*'],
}
