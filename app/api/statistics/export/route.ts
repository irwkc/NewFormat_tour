import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, PaymentStatus } from '@prisma/client'
import ExcelJS from 'exceljs'

// GET /api/statistics/export - экспорт статистики в Excel (для владельца)
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner) {
          return NextResponse.json(
            { success: false, error: 'Only owner can export statistics' },
            { status: 403 }
          )
        }

        const workbook = new ExcelJS.Workbook()
        
        // Лист 1: Общая статистика
        const overviewSheet = workbook.addWorksheet('Общая статистика')
        overviewSheet.columns = [
          { header: 'Показатель', key: 'indicator', width: 30 },
          { header: 'Значение', key: 'value', width: 20 },
        ]

        const totalSales = await prisma.sale.count({
          where: { payment_status: PaymentStatus.completed },
        })
        const totalRevenue = await prisma.sale.aggregate({
          where: { payment_status: PaymentStatus.completed },
          _sum: { total_amount: true },
        })
        const totalTickets = await prisma.ticket.count()
        const usedTickets = await prisma.ticket.count({
          where: { ticket_status: 'used' },
        })

        overviewSheet.addRows([
          { indicator: 'Всего продаж', value: totalSales },
          { indicator: 'Общая выручка', value: totalRevenue._sum.total_amount || 0 },
          { indicator: 'Всего билетов', value: totalTickets },
          { indicator: 'Использовано билетов', value: usedTickets },
        ])

        // Лист 2: Продажи
        const salesSheet = workbook.addWorksheet('Продажи')
        salesSheet.columns = [
          { header: 'ID', key: 'id', width: 40 },
          { header: 'Экскурсия', key: 'tour', width: 30 },
          { header: 'Продавец', key: 'seller', width: 25 },
          { header: 'Промоутер', key: 'promoter', width: 25 },
          { header: 'Взрослых', key: 'adults', width: 10 },
          { header: 'Детских', key: 'children', width: 10 },
          { header: 'Сумма', key: 'amount', width: 15 },
          { header: 'Способ оплаты', key: 'method', width: 15 },
          { header: 'Дата', key: 'date', width: 20 },
        ]

        const sales = await prisma.sale.findMany({
          where: { payment_status: PaymentStatus.completed },
          include: {
            seller: { select: { full_name: true } },
            promoter: { select: { full_name: true } },
            tour: { select: { company: true, flight_number: true } },
          },
          orderBy: { created_at: 'desc' },
        })

        salesSheet.addRows(
          sales.map((sale) => ({
            id: sale.id,
            tour: `${sale.tour.company} - ${sale.tour.flight_number}`,
            seller: sale.seller.full_name || '',
            promoter: sale.promoter?.full_name || '',
            adults: sale.adult_count,
            children: sale.child_count,
            amount: Number(sale.total_amount),
            method: sale.payment_method,
            date: sale.created_at.toISOString(),
          }))
        )

        // Лист 3: Билеты
        const ticketsSheet = workbook.addWorksheet('Билеты')
        ticketsSheet.columns = [
          { header: 'ID', key: 'id', width: 40 },
          { header: 'Номер билета', key: 'number', width: 15 },
          { header: 'Экскурсия', key: 'tour', width: 30 },
          { header: 'Взрослых', key: 'adults', width: 10 },
          { header: 'Детских', key: 'children', width: 10 },
          { header: 'Статус', key: 'status', width: 15 },
          { header: 'Дата создания', key: 'created', width: 20 },
        ]

        const tickets = await prisma.ticket.findMany({
          include: {
            tour: { select: { company: true, flight_number: true } },
          },
          orderBy: { created_at: 'desc' },
        })

        ticketsSheet.addRows(
          tickets.map((ticket) => ({
            id: ticket.id,
            number: ticket.ticket_number || '',
            tour: `${ticket.tour.company} - ${ticket.tour.flight_number}`,
            adults: ticket.adult_count,
            children: ticket.child_count,
            status: ticket.ticket_status,
            created: ticket.created_at.toISOString(),
          }))
        )

        // Генерация файла
        const buffer = await workbook.xlsx.writeBuffer()

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="statistics-${Date.now()}.xlsx"`,
          },
        })
      } catch (error) {
        console.error('Export statistics error:', error)
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    [UserRole.owner]
  )
}
