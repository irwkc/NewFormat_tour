import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from './auth'
import { prisma } from './prisma'
import { UserRole } from '@prisma/client'

export interface AuthRequest extends NextRequest {
  user?: JWTPayload
}

export async function withAuth(
  request: NextRequest,
  handler: (req: AuthRequest) => Promise<NextResponse>,
  allowedRoles?: UserRole[]
): Promise<NextResponse> {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    
    // Проверка существования пользователя
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, is_active: true }
    })

    if (!user || !user.is_active) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 401 }
      )
    }

    // Проверка роли
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const authRequest = request as AuthRequest
    authRequest.user = { ...payload, role: user.role }

    return handler(authRequest)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid token' },
      { status: 401 }
    )
  }
}
