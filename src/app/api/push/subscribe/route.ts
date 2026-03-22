import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AUTH_COOKIE_NAME, verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value
    if (!cookieToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    let userId: string
    try {
      const payload = verifyToken(cookieToken)
      userId = payload.userId
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const subscription = body?.subscription
    if (
      !subscription ||
      typeof subscription.endpoint !== 'string' ||
      !subscription.keys ||
      typeof subscription.keys.auth !== 'string' ||
      typeof subscription.keys.p256dh !== 'string'
    ) {
      return NextResponse.json({ success: false, error: 'Invalid subscription' }, { status: 400 })
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        user_id: userId,
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
      },
      create: {
        user_id: userId,
        endpoint: subscription.endpoint,
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('push subscribe error:', e)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}

