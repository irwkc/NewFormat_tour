import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

/** Next.js 15: params в route может быть Promise — иначе promoter_id теряется. */
async function routeParams(
  params: { promoter_id: string } | Promise<{ promoter_id: string }>
): Promise<{ promoter_id: string }> {
  return Promise.resolve(params)
}

// GET /api/promoters/check/:promoter_id - проверка промоутера по ID (для менеджера)
export async function GET(
  request: NextRequest,
  segment: { params: { promoter_id: string } | Promise<{ promoter_id: string }> }
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

        const { promoter_id: promoterIdRaw } = await routeParams(segment.params)
        const promoterId = parseInt(String(promoterIdRaw ?? '').trim(), 10)

        if (isNaN(promoterId) || promoterId < 1) {
          return NextResponse.json(
            { success: false, error: 'Invalid promoter ID' },
            { status: 400 }
          )
        }

        const row = await prisma.user.findUnique({
          where: { promoter_id: promoterId },
          select: {
            id: true,
            promoter_id: true,
            full_name: true,
            photo_url: true,
            is_active: true,
            role: true,
          },
        })

        if (!row) {
          return NextResponse.json({
            success: true,
            data: { exists: false, reason: 'not_found' as const },
          })
        }

        if (row.role !== UserRole.promoter) {
          return NextResponse.json({
            success: true,
            data: { exists: false, reason: 'not_promoter' as const },
          })
        }

        if (!row.is_active) {
          return NextResponse.json({
            success: true,
            data: {
              exists: true,
              is_active: false,
              reason: 'inactive' as const,
              full_name: row.full_name,
              user_id: row.id,
              photo_url: row.photo_url,
            },
          })
        }

        return NextResponse.json({
          success: true,
          data: {
            exists: true,
            is_active: true,
            full_name: row.full_name,
            user_id: row.id,
            photo_url: row.photo_url,
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
