import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// GET /api/promoters/check/:promoter_id/user-id - получение user_id по promoter_id (для менеджера)
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
            { success: false, error: 'Only managers can get promoter user_id' },
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
          return NextResponse.json(
            { success: false, error: 'Promoter not found' },
            { status: 404 }
          )
        }

        if (!promoter.is_active) {
          return NextResponse.json(
            { success: false, error: 'Promoter is inactive' },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            user_id: promoter.id,
            promoter_id: promoter.promoter_id,
            full_name: promoter.full_name,
          },
        })
      } catch (error) {
        console.error('Get promoter user_id error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.manager]
  )
}
