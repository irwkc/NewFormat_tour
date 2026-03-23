import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, PaymentStatus } from '@prisma/client'
import ExcelJS from 'exceljs'

const MONTH_NAMES: Record<number, string> = {
  1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель', 5: 'Май', 6: 'Июнь',
  7: 'Июль', 8: 'Август', 9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь',
}

// GET /api/statistics/export - экспорт статистики в Excel (владелец — всё, партнёр — свои туры)
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async (req) => {
      try {
        if (req.user!.role !== UserRole.owner && req.user!.role !== UserRole.partner) {
          return NextResponse.json(
            { success: false, error: 'Forbidden' },
            { status: 403 }
          )
        }

        const isPartner = req.user!.role === UserRole.partner
        const partnerId = isPartner ? req.user!.userId : null

        const workbook = new ExcelJS.Workbook()
        
        // Лист 1: Общая статистика
        const overviewSheet = workbook.addWorksheet('Общая статистика')
        overviewSheet.columns = [
          { header: 'Показатель', key: 'indicator', width: 30 },
          { header: 'Значение', key: 'value', width: 20 },
        ]

        const saleWhere = {
          payment_status: PaymentStatus.completed,
          ...(partnerId ? { tour: { created_by_user_id: partnerId } } : {}),
        }
        const ticketWhere = partnerId
          ? { tour: { created_by_user_id: partnerId } }
          : {}

        const totalSales = await prisma.sale.count({ where: saleWhere })
        const totalRevenue = await prisma.sale.aggregate({
          where: saleWhere,
          _sum: { total_amount: true },
        })
        const totalPlacesResult = partnerId
          ? await prisma.$queryRaw<[{ total: bigint | null }]>`
              SELECT COALESCE(SUM(t.adult_count + t.child_count + t.concession_count), 0)::bigint as total
              FROM tickets t
              JOIN tours tr ON t.tour_id = tr.id
              WHERE tr.created_by_user_id = ${partnerId}
            `
          : await prisma.$queryRaw<[{ total: bigint | null }]>`
              SELECT COALESCE(SUM(adult_count + child_count + concession_count), 0)::bigint as total
              FROM tickets
            `
        const totalPlaces = Number(totalPlacesResult[0]?.total ?? 0)
        const usedTickets = await prisma.ticket.count({
          where: { ticket_status: 'used', ...ticketWhere },
        })

        overviewSheet.addRows([
          { indicator: 'Всего продаж', value: totalSales },
          { indicator: 'Общая выручка', value: totalRevenue._sum.total_amount || 0 },
          { indicator: 'Всего мест', value: totalPlaces },
          { indicator: 'Использовано билетов', value: usedTickets },
        ])

        // Лист 2: Продажи — подробная таблица (каждая строка = одна продажа)
        const salesSheet = workbook.addWorksheet('Продажи')
        salesSheet.columns = [
          { header: '№ продажи', key: 'sale_number', width: 18 },
          { header: 'ID продажи', key: 'id', width: 38 },
          { header: 'Экскурсия', key: 'tour', width: 28 },
          { header: 'Партнёр', key: 'partner', width: 22 },
          { header: 'Номер рейса', key: 'flight_number', width: 14 },
          { header: 'Дата рейса', key: 'flight_date', width: 12 },
          { header: 'Время начала', key: 'departure_time', width: 12 },
          { header: 'Время окончания', key: 'end_time', width: 12 },
          { header: 'Длительность (мин)', key: 'duration_minutes', width: 14 },
          { header: 'Продавец', key: 'seller', width: 22 },
          { header: 'Промоутер', key: 'promoter', width: 22 },
          { header: 'Взрослых', key: 'adults', width: 9 },
          { header: 'Детских', key: 'children', width: 9 },
          { header: 'Льготных', key: 'concessions', width: 9 },
          { header: 'Всего мест', key: 'places', width: 10 },
          { header: 'Сумма (₽)', key: 'amount', width: 12 },
          { header: 'Способ оплаты', key: 'method', width: 14 },
          { header: 'Email клиента', key: 'customer_email', width: 28 },
          { header: 'Точка посадки (URL)', key: 'boarding_location', width: 45 },
          { header: 'Месяц', key: 'month', width: 12 },
          { header: 'Дата продажи', key: 'sale_date', width: 12 },
          { header: 'Время продажи', key: 'sale_time', width: 12 },
          { header: 'Номер билета', key: 'ticket_number', width: 18 },
        ]

        const sales = await prisma.sale.findMany({
          where: saleWhere,
          include: {
            seller: { select: { full_name: true } },
            promoter: { select: { full_name: true } },
            ticket: { select: { ticket_number: true } },
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

        const PAYMENT_LABELS: Record<string, string> = {
          online_yookassa: 'Онлайн',
          cash: 'Наличные',
          acquiring: 'Эквайринг',
        }

        salesSheet.addRows(
          sales.map((sale) => {
            const flight = sale.flight
            let endTime = ''
            if (flight?.departure_time && flight?.duration_minutes) {
              const end = new Date(flight.departure_time)
              end.setMinutes(end.getMinutes() + flight.duration_minutes)
              endTime = end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
            }
            const places = sale.adult_count + (sale.child_count || 0) + (sale.concession_count || 0)
            const created = new Date(sale.created_at)
            return {
              sale_number: sale.sale_number || '',
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
              children: sale.child_count || 0,
              concessions: sale.concession_count || 0,
              places,
              amount: Number(sale.total_amount),
              method: PAYMENT_LABELS[sale.payment_method] || sale.payment_method,
              customer_email: sale.customer_email || '',
              boarding_location: flight?.boarding_location_url || '',
              month: MONTH_NAMES[created.getMonth() + 1] || '',
              sale_date: created.toLocaleDateString('ru-RU'),
              sale_time: created.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              ticket_number: sale.ticket?.ticket_number || '',
            }
          })
        )

        // Лист 3: Билеты — подробная таблица
        const ticketsSheet = workbook.addWorksheet('Билеты')
        ticketsSheet.columns = [
          { header: 'ID билета', key: 'id', width: 38 },
          { header: 'Номер билета', key: 'number', width: 16 },
          { header: '№ продажи', key: 'sale_number', width: 16 },
          { header: 'Экскурсия', key: 'tour', width: 26 },
          { header: 'Партнёр', key: 'partner', width: 22 },
          { header: 'Рейс', key: 'flight_number', width: 14 },
          { header: 'Дата рейса', key: 'flight_date', width: 12 },
          { header: 'Взрослых', key: 'adults', width: 9 },
          { header: 'Детских', key: 'children', width: 9 },
          { header: 'Льготных', key: 'concessions', width: 9 },
          { header: 'Всего мест', key: 'places', width: 10 },
          { header: 'Статус', key: 'status', width: 12 },
          { header: 'Месяц', key: 'month', width: 12 },
          { header: 'Дата создания', key: 'created_date', width: 12 },
          { header: 'Время создания', key: 'created_time', width: 12 },
        ]

        const tickets = await prisma.ticket.findMany({
          where: ticketWhere,
          include: {
            tour: {
              select: {
                company: true,
                createdBy: { select: { full_name: true } },
              },
            },
            sale: {
              include: {
                flight: { select: { flight_number: true, date: true } },
              },
            },
          },
          orderBy: { created_at: 'desc' },
        })

        const STATUS_LABELS: Record<string, string> = {
          sold: 'Продан',
          used: 'Использован',
          cancelled: 'Отменён',
        }

        ticketsSheet.addRows(
          tickets.map((ticket) => {
            const created = new Date(ticket.created_at)
            const places = ticket.adult_count + (ticket.child_count || 0) + (ticket.concession_count || 0)
            return {
              id: ticket.id,
              number: ticket.ticket_number || '',
              sale_number: ticket.sale?.sale_number ?? '',
              tour: ticket.tour.company,
              partner: ticket.tour.createdBy?.full_name || '',
              flight_number: ticket.sale?.flight?.flight_number || '',
              flight_date: ticket.sale?.flight?.date
                ? new Date(ticket.sale.flight.date).toLocaleDateString('ru-RU')
                : '',
              adults: ticket.adult_count,
              children: ticket.child_count || 0,
              concessions: ticket.concession_count || 0,
              places,
              status: STATUS_LABELS[ticket.ticket_status] || ticket.ticket_status,
              month: MONTH_NAMES[created.getMonth() + 1] || '',
              created_date: created.toLocaleDateString('ru-RU'),
              created_time: created.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            }
          })
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
    [UserRole.owner, UserRole.partner]
  )
}
