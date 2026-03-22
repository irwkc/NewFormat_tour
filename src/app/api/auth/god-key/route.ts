import { NextRequest, NextResponse } from 'next/server'
import { generateGodToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const secret = typeof body?.secret === 'string' ? body.secret.trim() : ''
    const expected = process.env.GOD_KEY_SECRET || ''

    if (!expected) {
      return NextResponse.json(
        { success: false, error: 'God key not configured' },
        { status: 503 }
      )
    }

    if (secret !== expected) {
      return NextResponse.json(
        { success: false, error: 'Неверный ключ' },
        { status: 403 }
      )
    }

    const godToken = generateGodToken()
    return NextResponse.json({
      success: true,
      godToken,
    })
  } catch (e) {
    console.error('god-key error:', e)
    return NextResponse.json(
      { success: false, error: 'Ошибка проверки ключа' },
      { status: 500 }
    )
  }
}
