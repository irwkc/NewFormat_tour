import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// GET /api/users - список всех пользователей (для владельца)
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json(
            { success: false, error: 'Only owner can view all users' },
            { status: 403 }
          )
        }

        const { searchParams } = new URL(request.url)
        const role = searchParams.get('role') as UserRole | null

        const where: any = {
          role: {
            notIn: [UserRole.owner, UserRole.owner_assistant],
          },
        }

        if (role) {
          where.role = role
        }

        const users = await prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            promoter_id: true,
            full_name: true,
            phone: true,
            role: true,
            photo_url: true,
            balance: true,
            debt_to_company: true,
            is_active: true,
            email_confirmed: true,
            created_at: true,
            createdBy: {
              select: {
                id: true,
                full_name: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
        })

        return NextResponse.json({
          success: true,
          data: users,
        })
      } catch (error) {
        console.error('Get users error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
