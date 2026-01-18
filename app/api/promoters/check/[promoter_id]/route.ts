import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// GET /api/promoters/check/:promoter_id - проверка промоутера по ID (для менеджера)
export async function GET(
  request: NextRequest,
  { params }: { params: { promoter_id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.manager) {
          return NextResponse.json(
            { success: false, error: 'Only managers can check promoters' },
            { status: 403 }
          )
        }

        const { promoter_id } = params
        const promoterId = parseInt(promoter_id)

        if (isNaN(promoterId)) {
          return NextResponse.json(
            { success: false, error: 'Invalid promoter ID' },
            { status: 400 }
          )
        }

        const promoter = await prisma.user.findUnique({
          where: { promoter_id: promoterId },
          select: {
            id: true,
            promoter_id: true,
            full_name: true,
            is_active: true,
            role: true,
          },
        })

        if (!promoter || promoter.role !== 'promoter') {
          return NextResponse.json({
            success: true,
            data: { exists: false },
          })
        }

        if (!promoter.is_active) {
          return NextResponse.json({
            success: true,
            data: { exists: false },
          })
        }

        return NextResponse.json({
          success: true,
          data: {
            exists: true,
            full_name: promoter.full_name,
            user_id: promoter.id,
          },
        })
      } catch (error) {
        console.error('Check promoter error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.manager]
  )
}
