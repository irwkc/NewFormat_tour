import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, generateToken, generateFaceVerifyToken } from '@/lib/auth'
import { sendNewLoginFromIpEmail } from '@/lib/email'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email().optional(),
  promoter_id: z.number().optional(),
  password: z.string().min(6),
}).refine((data) => data.email || data.promoter_id, {
  message: "Either email or promoter_id is required",
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, promoter_id, password } = loginSchema.parse(body)

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null
    const userAgent = request.headers.get('user-agent') || null

    // Найти пользователей по email или promoter_id
    // Если email - может быть несколько пользователей (owner и owner_assistant с одним email)
    let users: any[] = []
    
    if (email) {
      users = await prisma.user.findMany({
        where: { email },
      })
    } else if (promoter_id) {
      users = await prisma.user.findMany({
        where: { promoter_id },
      })
    }

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Проверить пароль для всех найденных пользователей
    let user = null
    for (const u of users) {
      const isValidPassword = await comparePassword(password, u.password_hash)
      if (isValidPassword) {
        user = u
        break
      }
    }

    if (!user) {
      // Логируем неуспешную попытку для первого найденного пользователя (если есть)
      try {
        await prisma.$executeRawUnsafe(
          'INSERT INTO "user_login_logs" ("user_id","ip_address","user_agent","success","created_at") VALUES ($1,$2,$3,$4,NOW())',
          users[0].id,
          ip,
          userAgent,
          false
        )
      } catch {
        // не блокируем вход при ошибке логирования
      }

      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Проверить активность пользователя
    if (!user.is_active) {
      try {
        await prisma.$executeRawUnsafe(
          'INSERT INTO "user_login_logs" ("user_id","ip_address","user_agent","success","created_at") VALUES ($1,$2,$3,$4,NOW())',
          user.id,
          ip,
          userAgent,
          false
        )
      } catch {
        // ignore logging errors
      }

      return NextResponse.json(
        { success: false, error: 'User is inactive' },
        { status: 403 }
      )
    }

    const { password_hash, face_descriptors: _fd, ...userWithoutPassword } = user

    // Для владельца: если зарегистрировано лицо — требуем проверку по лицу (2FA)
    const faceDescriptors = user.face_descriptors as number[][] | null
    const hasFaceRegistered = Array.isArray(faceDescriptors) && faceDescriptors.length > 0

    if (user.role === 'owner' && hasFaceRegistered) {
      const tempToken = generateFaceVerifyToken(user.id)
      return NextResponse.json({
        success: true,
        requiresFaceAuth: true,
        data: {
          user: userWithoutPassword,
          tempToken,
        },
      })
    }

    const token = generateToken({
      userId: user.id,
      role: user.role,
      email: user.email,
      promoterId: user.promoter_id,
      tokenVersion: (user as any).token_version ?? 0,
    })

    let isNewIp = false
    if (ip) {
      try {
        const rows = await prisma.$queryRawUnsafe<{ count: string }[]>(
          'SELECT COUNT(*)::text as count FROM "user_login_logs" WHERE user_id = $1 AND ip_address = $2 AND success = true',
          user.id,
          ip
        )
        const count = rows?.[0]?.count ? parseInt(rows[0].count, 10) : 0
        isNewIp = count === 0
      } catch {
        isNewIp = false
      }
    }

    try {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "user_login_logs" ("user_id","ip_address","user_agent","success","created_at") VALUES ($1,$2,$3,$4,NOW())',
        user.id,
        ip,
        userAgent,
        true
      )
    } catch {
      // ignore logging errors
    }

    if (isNewIp && ip && user.email) {
      try {
        await sendNewLoginFromIpEmail(user.email, ip, userAgent)
      } catch {
        // не блокируем логин, если письмо не отправилось
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
      },
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Login error:', error)
    
    // Проверка ошибки подключения к базе данных
    if (error?.code === 'P1001' || error?.message?.includes("Can't reach database server")) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'База данных не доступна. Пожалуйста, убедитесь, что PostgreSQL запущен и DATABASE_URL настроен правильно в файле .env' 
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
