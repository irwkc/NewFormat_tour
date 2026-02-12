import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

const MAX_DESCRIPTORS = 5

export async function POST(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      if (req.user!.role !== UserRole.owner) {
        return NextResponse.json(
          { success: false, error: 'Только владелец может регистрировать лицо' },
          { status: 403 }
        )
      }
      try {
        const body = await request.json()
        const descriptor = body.descriptor as number[] | undefined
        const descriptors = body.descriptors as number[][] | undefined

        const list: number[][] = Array.isArray(descriptors)
          ? descriptors.filter((d) => Array.isArray(d) && d.length === 128)
          : Array.isArray(descriptor) && descriptor.length === 128
            ? [descriptor]
            : []

        if (list.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Требуется дескриптор (массив 128 чисел) или descriptors (массив таких дескрипторов)' },
            { status: 400 }
          )
        }

        const user = await prisma.user.findUnique({
          where: { id: req.user!.userId },
          select: { face_descriptors: true },
        })
        if (!user) {
          return NextResponse.json(
            { success: false, error: 'Пользователь не найден' },
            { status: 404 }
          )
        }

        const current = (user.face_descriptors as number[][] | null) ?? []
        const next =
          list.length > 1
            ? list.slice(0, MAX_DESCRIPTORS)
            : [...current, list[0]].slice(-MAX_DESCRIPTORS)

        await prisma.user.update({
          where: { id: req.user!.userId },
          data: { face_descriptors: next },
        })

        return NextResponse.json({
          success: true,
          message: 'Лицо успешно зарегистрировано',
          count: next.length,
        })
      } catch (e) {
        console.error('face-register error:', e)
        return NextResponse.json(
          { success: false, error: 'Ошибка регистрации лица' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
