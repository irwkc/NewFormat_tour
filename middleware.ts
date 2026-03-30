import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/auth'

function requestHostname(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  return host.split(':')[0].toLowerCase()
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const hostname = requestHostname(request)
  const staffHost = (process.env.STAFF_HOST || 'staff.nf-travel.ru').trim().toLowerCase()

  // Поддомен staff — витрина для гостей на nf-travel.ru; корень ведёт в ЛК.
  if (hostname === staffHost && pathname === '/') {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  if (!token || token.trim() === '') {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard', '/dashboard/:path*'],
}
