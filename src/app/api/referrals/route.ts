import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// GET /api/referrals - список реферальных промоутеров (для владельца)
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json(
            { success: false, error: 'Only owner can view referrals' },
            { status: 403 }
          )
        }

        // Найти всех промоутеров, которые были зарегистрированы по приглашениям от других промоутеров
        // Сначала находим все использованные приглашения для промоутеров
        const promoterInvitations = await prisma.invitationToken.findMany({
          where: {
            target_role: 'promoter',
            is_used: true,
            used_by_user_id: {
              not: null,
            },
          },
          include: {
            invitedBy: {
              select: {
                id: true,
                full_name: true,
                promoter_id: true,
                email: true,
                role: true,
              },
            },
            usedBy: {
              select: {
                id: true,
                full_name: true,
                promoter_id: true,
                email: true,
                balance: true,
                created_at: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
        })

        // Фильтруем только те, где приглашающий был промоутером
        const referralsWithPromoterInviter = promoterInvitations
          .filter((invitation) => invitation.invitedBy?.role === UserRole.promoter)
          .map((invitation) => ({
            ...invitation.usedBy,
            invitedBy: invitation.invitedBy,
            invitation_id: invitation.id,
            invitation_created_at: invitation.created_at,
          }))

        return NextResponse.json({
          success: true,
          data: referralsWithPromoterInviter,
        })
      } catch (error) {
        console.error('Get referrals error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
}
