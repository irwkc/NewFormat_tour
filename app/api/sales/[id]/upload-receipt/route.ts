import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, PaymentMethod } from '@prisma/client'
import sharp from 'sharp'
import { mkdir } from 'fs/promises'
import path from 'path'

// POST /api/sales/:id/upload-receipt - загрузка фото чека (эквайринг)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.manager) {
          return NextResponse.json(
            { success: false, error: 'Only managers can upload receipts' },
            { status: 403 }
          )
        }

        const { id } = params

        const sale = await prisma.sale.findUnique({
          where: { id },
        })

        if (!sale) {
          return NextResponse.json(
            { success: false, error: 'Sale not found' },
            { status: 404 }
          )
        }

        if (sale.seller_user_id !== req.user!.userId) {
          return NextResponse.json(
            { success: false, error: 'You can only upload receipts for your own sales' },
            { status: 403 }
          )
        }

        if (sale.payment_method !== PaymentMethod.acquiring) {
          return NextResponse.json(
            { success: false, error: 'This endpoint is only for acquiring payments' },
            { status: 400 }
          )
        }

        const formData = await request.formData()
        const photo = formData.get('photo') as File | null

        if (!photo) {
          return NextResponse.json(
            { success: false, error: 'Photo is required' },
            { status: 400 }
          )
        }

        // Конвертировать File в Buffer
        const bytes = await photo.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Сохранить фото
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'receipts')
        await mkdir(uploadDir, { recursive: true })
        
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
        const filepath = path.join(uploadDir, filename)

        // Сжать и сохранить
        await sharp(buffer)
          .resize(1600, 1600, { fit: 'cover' })
          .jpeg({ quality: 85 })
          .toFile(filepath)

        const photoUrl = `/uploads/receipts/${filename}`

        // Обновить продажу
        const updatedSale = await prisma.sale.update({
          where: { id },
          data: {
            receipt_photo_url: photoUrl,
          },
        })

        return NextResponse.json({
          success: true,
          data: updatedSale,
        })
      } catch (error) {
        console.error('Upload receipt error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.manager]
  )
}
