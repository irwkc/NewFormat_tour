import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

const createCategorySchema = z.object({
  name: z.string().min(1),
})

// GET /api/categories - список всех категорий (доступно всем)
export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: categories,
    })
  } catch (error) {
    console.error('Get categories error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/categories - создание категории (только владелец)
export async function POST(request: NextRequest) {
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

        const body = await request.json()
        const { name } = createCategorySchema.parse(body)

        // Проверить, что категория не существует
        const existing = await prisma.category.findUnique({
          where: { name },
        })

        if (existing) {
          return NextResponse.json(
            { success: false, error: 'Category already exists' },
            { status: 400 }
          )
        }

        const category = await prisma.category.create({
          data: {
            name,
            created_by_user_id: req.user!.userId,
          },
          include: {
            createdBy: {
              select: {
                id: true,
                full_name: true,
              },
            },
          },
        })

        return NextResponse.json({
          success: true,
          data: category,
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { success: false, error: 'Invalid input', details: error.errors },
            { status: 400 }
          )
        }
        
        console.error('Create category error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
