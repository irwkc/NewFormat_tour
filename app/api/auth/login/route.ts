import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, generateToken, generateFaceVerifyToken } from '@/lib/auth'
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
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Проверить активность пользователя
    if (!user.is_active) {
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
    })

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
