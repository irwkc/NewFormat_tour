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

        // Лист 2: Продажи (расширенный)
        const salesSheet = workbook.addWorksheet('Продажи')
        salesSheet.columns = [
          { header: 'Номер продажи', key: 'sale_number', width: 15 },
          { header: 'ID', key: 'id', width: 40 },
          { header: 'Экскурсия', key: 'tour', width: 30 },
          { header: 'Партнёр', key: 'partner', width: 25 },
          { header: 'Номер рейса', key: 'flight_number', width: 15 },
          { header: 'Дата рейса', key: 'flight_date', width: 15 },
          { header: 'Время начала', key: 'departure_time', width: 15 },
          { header: 'Время окончания', key: 'end_time', width: 15 },
          { header: 'Длительность (мин)', key: 'duration_minutes', width: 15 },
          { header: 'Продавец', key: 'seller', width: 25 },
          { header: 'Промоутер', key: 'promoter', width: 25 },
          { header: 'Взрослых', key: 'adults', width: 10 },
          { header: 'Детских', key: 'children', width: 10 },
          { header: 'Льготных', key: 'concessions', width: 10 },
          { header: 'Сумма', key: 'amount', width: 15 },
          { header: 'Способ оплаты', key: 'method', width: 15 },
          { header: 'Email клиента', key: 'customer_email', width: 30 },
          { header: 'Точка посадки', key: 'boarding_location', width: 40 },
          { header: 'Дата продажи', key: 'date', width: 20 },
        ]

        const sales = await prisma.sale.findMany({
          where: { payment_status: PaymentStatus.completed },
          include: {
            seller: { select: { full_name: true } },
            promoter: { select: { full_name: true } },
            tour: {
              select: {
                company: true,
                createdBy: { select: { full_name: true } },
              },
            },
            flight: {
              select: {
                flight_number: true,
                date: true,
                departure_time: true,
                duration_minutes: true,
                boarding_location_url: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
        })

        salesSheet.addRows(
          sales.map((sale) => {
            const flight = sale.flight
            let endTime = ''
            if (flight?.departure_time && flight?.duration_minutes) {
              const end = new Date(flight.departure_time)
              end.setMinutes(end.getMinutes() + flight.duration_minutes)
              endTime = end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
            }
            return {
              sale_number: (sale as any).sale_number || '',
              id: sale.id,
              tour: sale.tour.company,
              partner: sale.tour.createdBy?.full_name || sale.tour.company,
              flight_number: flight?.flight_number || '',
              flight_date: flight?.date ? new Date(flight.date).toLocaleDateString('ru-RU') : '',
              departure_time: flight?.departure_time
                ? new Date(flight.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                : '',
              end_time: endTime,
              duration_minutes: flight?.duration_minutes ?? '',
              seller: sale.seller.full_name || '',
              promoter: sale.promoter?.full_name || '',
              adults: sale.adult_count,
              children: sale.child_count,
              concessions: (sale as any).concession_count || 0,
              amount: Number(sale.total_amount),
              method: sale.payment_method,
              customer_email: sale.customer_email || '',
              boarding_location: flight?.boarding_location_url || '',
              date: sale.created_at.toISOString(),
            }
          })
        )

        // Лист 3: Билеты
        const ticketsSheet = workbook.addWorksheet('Билеты')
        ticketsSheet.columns = [
          { header: 'ID', key: 'id', width: 40 },
          { header: 'Номер билета', key: 'number', width: 15 },
          { header: 'Экскурсия', key: 'tour', width: 30 },
          { header: 'Взрослых', key: 'adults', width: 10 },
          { header: 'Детских', key: 'children', width: 10 },
          { header: 'Льготных', key: 'concessions', width: 10 },
          { header: 'Статус', key: 'status', width: 15 },
          { header: 'Дата создания', key: 'created', width: 20 },
        ]

        const tickets = await prisma.ticket.findMany({
          include: {
            tour: { select: { company: true } },
            sale: {
              include: {
                flight: { select: { flight_number: true } },
              },
            },
          },
          orderBy: { created_at: 'desc' },
        })

        ticketsSheet.addRows(
          tickets.map((ticket) => ({
            id: ticket.id,
            number: ticket.ticket_number || '',
            tour: `${ticket.tour.company}${ticket.sale?.flight ? ` - ${ticket.sale.flight.flight_number}` : ''}`,
            adults: ticket.adult_count,
            children: ticket.child_count,
            concessions: (ticket as any).concession_count || 0,
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
