import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      if (req.user!.role !== UserRole.owner) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        )
      }
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { face_descriptors: true },
      })
      const descriptors = (user?.face_descriptors as number[][] | null) ?? []
      const registered = Array.isArray(descriptors) && descriptors.length > 0
      return NextResponse.json({
        success: true,
        registered,
        count: descriptors.length,
      })
    },
    [UserRole.owner]
  )
}
