import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFaceVerifyToken, generateToken } from '@/lib/auth'
import { computeMinDistance, FACE_MATCH_THRESHOLD } from '@/utils/face-descriptor'

const MIN_BLINKS = 2
const MIN_HEAD_MOVEMENTS = 3
const MIN_LIVENESS_DURATION_MS = 3000

function validateLiveness(livenessData: unknown): boolean {
  if (!livenessData || typeof livenessData !== 'object') return false
  const d = livenessData as { blinks?: number; headMovements?: number; startTime?: number; timestamp?: number }
  const blinks = Number(d.blinks) || 0
  const headMovements = Number(d.headMovements) || 0
  const startTime = Number(d.startTime) || 0
  const timestamp = Number(d.timestamp) || Date.now()
  const duration = timestamp - startTime
  return blinks >= MIN_BLINKS && headMovements >= MIN_HEAD_MOVEMENTS && duration >= MIN_LIVENESS_DURATION_MS
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tempToken, descriptor, livenessData } = body as {
      tempToken?: string
      descriptor?: number[]
      livenessData?: unknown
    }

    if (!tempToken || !descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return NextResponse.json(
        { success: false, error: 'Требуются tempToken и дескриптор лица (128 чисел)' },
        { status: 400 }
      )
    }

    if (!validateLiveness(livenessData)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Проверка подлинности не пройдена. Выполните: минимум 2 мигания, повороты головы (вверх/вниз/влево/вправо), не менее 3 секунд.',
        },
        { status: 403 }
      )
    }

    const payload = verifyFaceVerifyToken(tempToken)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден или не владелец' },
        { status: 403 }
      )
    }

    const stored = user.face_descriptors as number[][] | null
    if (!Array.isArray(stored) || stored.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Лицо владельца не зарегистрировано' },
        { status: 400 }
      )
    }

    const distance = computeMinDistance(descriptor, stored)
    if (distance >= FACE_MATCH_THRESHOLD) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        error: 'Лицо не совпадает. Попробуйте снова.',
      })
    }

    const token = generateToken({
      userId: user.id,
      role: user.role,
      email: user.email,
      promoterId: user.promoter_id,
    })

    const { password_hash, face_descriptors, ...userWithoutSensitive } = user

    return NextResponse.json({
      success: true,
      authenticated: true,
      data: {
        user: userWithoutSensitive,
        token,
      },
    })
  } catch (e: any) {
    if (e?.name === 'TokenExpiredError') {
      return NextResponse.json(
        { success: false, error: 'Время проверки истекло. Войдите снова (email и пароль).' },
        { status: 401 }
      )
    }
    console.error('face-verify error:', e)
    return NextResponse.json(
      { success: false, error: 'Ошибка проверки лица' },
      { status: 500 }
    )
  }
}
