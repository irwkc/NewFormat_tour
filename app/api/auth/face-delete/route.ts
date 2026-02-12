import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { Prisma, UserRole } from '@prisma/client'

export async function POST(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      if (req.user!.role !== UserRole.owner) {
        return NextResponse.json(
          { success: false, error: 'Только владелец может удалить данные лица' },
          { status: 403 }
        )
      }
      try {
        await prisma.user.update({
          where: { id: req.user!.userId },
          data: { face_descriptors: Prisma.DbNull },
        })
        return NextResponse.json({
          success: true,
          message: 'Данные лица удалены. Вход будет только по паролю.',
        })
      } catch (e) {
        console.error('face-delete error:', e)
        return NextResponse.json(
          { success: false, error: 'Ошибка удаления' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
