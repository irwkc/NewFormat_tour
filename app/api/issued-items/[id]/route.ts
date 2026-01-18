import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// DELETE /api/issued-items/:id - убрать вещь (вернуть)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner && req.user!.role !== UserRole.owner_assistant) {
          return NextResponse.json(
            { success: false, error: 'Only owner and assistant can return items' },
            { status: 403 }
          )
        }

        const { id } = params

        const item = await prisma.issuedItem.findUnique({
          where: { id },
        })

        if (!item) {
          return NextResponse.json(
            { success: false, error: 'Item not found' },
            { status: 404 }
          )
        }

        if (item.is_returned) {
          return NextResponse.json(
            { success: false, error: 'Item already returned' },
            { status: 400 }
          )
        }

        await prisma.issuedItem.update({
          where: { id },
          data: {
            is_returned: true,
            returned_at: new Date(),
            returned_by_user_id: req.user!.userId,
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Item returned successfully',
        })
      } catch (error) {
        console.error('Return item error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner, UserRole.owner_assistant]
  )
}
