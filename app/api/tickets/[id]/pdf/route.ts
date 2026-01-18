import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

// GET /api/tickets/:id/pdf - генерация и скачивание PDF билета с QR
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        sale: {
          include: {
            tour: {
              include: {
                category: true,
              },
            },
          },
        },
        tour: {
          include: {
            category: true,
          },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Если PDF уже существует, вернуть его
    if (ticket.ticket_pdf_url) {
      const pdfPath = path.join(process.cwd(), 'public', ticket.ticket_pdf_url)
      if (fs.existsSync(pdfPath)) {
        const fileBuffer = fs.readFileSync(pdfPath)
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="ticket-${ticket.id}.pdf"`,
          },
        })
      }
    }

    // Если PDF не существует, вернуть ошибку (PDF должен создаваться через webhook)
    return NextResponse.json(
      { success: false, error: 'PDF not available' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Get ticket PDF error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
