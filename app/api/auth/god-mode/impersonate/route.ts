import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyGodToken, generateToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '')
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Требуется ключ' },
        { status: 401 }
      )
    }
    verifyGodToken(token)

    const body = await request.json()
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Укажите пользователя' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })
    if (!user || !user.is_active) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      )
    }

    const { password_hash, face_descriptors, ...userWithoutSensitive } = user
    const authToken = generateToken({
      userId: user.id,
      role: user.role,
      email: user.email,
      promoterId: user.promoter_id,
    })

    return NextResponse.json({
      success: true,
      data: {
        user: userWithoutSensitive,
        token: authToken,
      },
    })
  } catch (e: any) {
    if (e?.name === 'TokenExpiredError' || e?.message === 'Invalid token purpose') {
      return NextResponse.json(
        { success: false, error: 'Сессия истекла. Введите ключ снова.' },
        { status: 401 }
      )
    }
    console.error('god-mode impersonate error:', e)
    return NextResponse.json(
      { success: false, error: 'Ошибка' },
      { status: 500 }
    )
  }
}
