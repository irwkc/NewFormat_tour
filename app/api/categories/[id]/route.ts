import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// DELETE /api/categories/:id - удаление категории (только владелец, если нет экскурсий)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json(
            { success: false, error: 'Forbidden' },
            { status: 403 }
          )
        }

        const { id } = params

        // Проверить, есть ли экскурсии в этой категории
        const toursCount = await prisma.tour.count({
          where: { category_id: id },
        })

        if (toursCount > 0) {
          return NextResponse.json(
            { success: false, error: 'Cannot delete category with tours' },
            { status: 400 }
          )
        }

        await prisma.category.delete({
          where: { id },
        })

        return NextResponse.json({
          success: true,
          message: 'Category deleted successfully',
        })
      } catch (error) {
        console.error('Delete category error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
