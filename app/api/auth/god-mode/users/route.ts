import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyGodToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
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

    const users = await prisma.user.findMany({
      where: { is_active: true },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        email: true,
        promoter_id: true,
        full_name: true,
        role: true,
      },
    })

    return NextResponse.json({
      success: true,
      users: users.map((u) => ({
        id: u.id,
        email: u.email ?? '',
        promoter_id: u.promoter_id,
        full_name: u.full_name ?? '',
        role: u.role,
      })),
    })
  } catch (e: any) {
    if (e?.name === 'TokenExpiredError' || e?.message === 'Invalid token purpose') {
      return NextResponse.json(
        { success: false, error: 'Сессия истекла. Введите ключ снова.' },
        { status: 401 }
      )
    }
    console.error('god-mode users error:', e)
    return NextResponse.json(
      { success: false, error: 'Ошибка' },
      { status: 500 }
    )
  }
}
