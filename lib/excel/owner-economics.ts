import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'
import { BalanceType, PaymentStatus, TicketStatus, TransactionType, UserRole } from '@prisma/client'
import { calcIncomeSplit } from '@/lib/domain/commission-calc'
import { formatPeriodRu } from '@/lib/excel/parse-export-period'

const PAYMENT_LABELS: Record<string, string> = {
  online_yookassa: 'Онлайн (ЮKassa)',
  cash: 'Наличные',
  acquiring: 'Эквайринг',
}

function formatPeriod(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true }
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9D9D9' },
  }
  row.alignment = { vertical: 'middle', wrapText: true }
}

function applyMoneyOptional(cell: ExcelJS.Cell, n: number) {
  if (n === 0) {
    cell.value = ''
    return
  }
  cell.value = n
  cell.numFmt = '#,##0.00'
}

function applyMoney(cell: ExcelJS.Cell, n: number) {
  cell.value = n
  cell.numFmt = '#,##0.00'
}

function applySaldo(cell: ExcelJS.Cell, n: number) {
  cell.value = n
  cell.numFmt = '#,##0.00'
}

type TourWithRules = {
  company: string
  createdBy?: { full_name?: string | null } | null
  partner_min_adult_price: unknown
  partner_min_child_price: unknown
  partner_min_concession_price: unknown | null
  partner_commission_type: string | null
  partner_fixed_adult_price: unknown | null
  partner_fixed_child_price: unknown | null
  partner_fixed_concession_price: unknown | null
  partner_commission_percentage: unknown | null
  owner_min_adult_price: unknown | null
  owner_min_child_price: unknown | null
  owner_min_concession_price: unknown | null
  commission_type: string | null
  commission_percentage: unknown | null
  commission_fixed_amount: unknown | null
  commission_fixed_adult: unknown | null
  commission_fixed_child: unknown | null
  commission_fixed_concession: unknown | null
  commissionRules: Array<{
    threshold_adult?: unknown
    threshold_child?: unknown
    threshold_concession?: unknown
    threshold_amount?: unknown
    commission_percentage: unknown
  }>
}

function splitForSale(
  sale: {
    adult_count: number
    child_count: number | null
    concession_count: number | null
    adult_price: unknown
    child_price: unknown | null
    concession_price: unknown | null
    total_amount: unknown
  },
  tour: TourWithRules
) {
  const saleChildPrice = sale.child_price != null ? Number(sale.child_price) : 0
  const saleConcessionPrice = sale.concession_price != null ? Number(sale.concession_price) : 0

  const rules = (tour.commissionRules || []).map((r) => ({
    threshold_adult: Number((r as { threshold_adult?: unknown }).threshold_adult ?? (r as { threshold_amount?: unknown }).threshold_amount ?? 0),
    threshold_child: Number((r as { threshold_child?: unknown }).threshold_child ?? (r as { threshold_amount?: unknown }).threshold_amount ?? 0),
    threshold_concession: Number((r as { threshold_concession?: unknown }).threshold_concession ?? (r as { threshold_amount?: unknown }).threshold_amount ?? 0),
    commission_percentage: Number(r.commission_percentage ?? 0),
  }))

  return calcIncomeSplit(
    {
      adult_count: sale.adult_count,
      child_count: sale.child_count ?? 0,
      concession_count: sale.concession_count ?? 0,
      adult_price: Number(sale.adult_price),
      child_price: saleChildPrice,
      concession_price: saleConcessionPrice,
      total_amount: Number(sale.total_amount),
    },
    {
      partner_min_adult_price: Number(tour.partner_min_adult_price),
      partner_min_child_price: Number(tour.partner_min_child_price),
      partner_min_concession_price: tour.partner_min_concession_price != null ? Number(tour.partner_min_concession_price) : 0,
      partner_commission_type: (tour.partner_commission_type as 'fixed' | 'percentage') ?? undefined,
      partner_fixed_adult_price: tour.partner_fixed_adult_price != null ? Number(tour.partner_fixed_adult_price) : null,
      partner_fixed_child_price: tour.partner_fixed_child_price != null ? Number(tour.partner_fixed_child_price) : null,
      partner_fixed_concession_price:
        tour.partner_fixed_concession_price != null ? Number(tour.partner_fixed_concession_price) : null,
      partner_commission_percentage: tour.partner_commission_percentage != null ? Number(tour.partner_commission_percentage) : null,
      owner_min_adult_price: tour.owner_min_adult_price != null ? Number(tour.owner_min_adult_price) : Number(tour.partner_min_adult_price),
      owner_min_child_price: tour.owner_min_child_price != null ? Number(tour.owner_min_child_price) : Number(tour.partner_min_child_price),
      owner_min_concession_price:
        tour.owner_min_concession_price != null ? Number(tour.owner_min_concession_price) : Number(tour.partner_min_concession_price ?? 0),
      commission_type: (tour.commission_type ?? 'percentage') as 'percentage' | 'fixed',
      commission_percentage: tour.commission_percentage != null ? Number(tour.commission_percentage) : undefined,
      commission_fixed_amount: tour.commission_fixed_amount != null ? Number(tour.commission_fixed_amount) : undefined,
      commission_fixed_adult: tour.commission_fixed_adult != null ? Number(tour.commission_fixed_adult) : null,
      commission_fixed_child: tour.commission_fixed_child != null ? Number(tour.commission_fixed_child) : null,
      commission_fixed_concession: tour.commission_fixed_concession != null ? Number(tour.commission_fixed_concession) : null,
      commission_rules: rules,
    }
  )
}

type LedgerLine = {
  at: Date
  tie: string
  period: string
  operation: string
  purpose: string
  debit: number
  credit: number
}

/** Листы для владельца: ИНФО, сводка, оборотная и зарплатная ведомости, кассовая книга — за выбранный период. */
export async function addOwnerEconomicsSheets(
  workbook: ExcelJS.Workbook,
  ownerId: string,
  period: { start: Date; end: Date }
) {
  const { start, end } = period

  const [sales, usedTickets, payouts, promoterCredits] = await Promise.all([
    prisma.sale.findMany({
      where: {
        payment_status: PaymentStatus.completed,
        created_at: { gte: start, lte: end },
      },
      include: {
        tour: {
          include: {
            createdBy: { select: { full_name: true } },
            commissionRules: { orderBy: { order: 'asc' } },
          },
        },
      },
      orderBy: { created_at: 'asc' },
    }),
    prisma.ticket.findMany({
      where: {
        ticket_status: TicketStatus.used,
        used_at: { not: null, gte: start, lte: end },
      },
      include: {
        sale: true,
        tour: {
          include: {
            createdBy: { select: { full_name: true } },
            commissionRules: { orderBy: { order: 'asc' } },
          },
        },
      },
    }),
    prisma.balanceHistory.findMany({
      where: {
        performed_by_user_id: ownerId,
        balance_type: BalanceType.balance,
        transaction_type: TransactionType.debit,
        description: { startsWith: 'Выплата партнёру' },
        created_at: { gte: start, lte: end },
      },
      include: {
        user: { select: { full_name: true, email: true } },
      },
      orderBy: { created_at: 'asc' },
    }),
    prisma.balanceHistory.findMany({
      where: {
        balance_type: BalanceType.balance,
        transaction_type: TransactionType.credit,
        created_at: { gte: start, lte: end },
        description: { contains: 'Пополнение от продажи билета' },
        user: { role: { in: [UserRole.promoter, UserRole.manager] } },
      },
      include: {
        user: { select: { full_name: true, email: true, role: true } },
        ticket: { select: { ticket_number: true, id: true } },
        sale: { select: { sale_number: true, total_amount: true } },
      },
      orderBy: { created_at: 'asc' },
    }),
  ])

  let sumRevenue = 0
  let sumOwnerModel = 0
  let sumPartnerModel = 0
  let sumPromoterModel = 0
  let sumTurnoverModel = 0
  let places = 0
  const byPayment: Record<string, number> = {
    cash: 0,
    acquiring: 0,
    online_yookassa: 0,
  }

  for (const sale of sales) {
    const tour = sale.tour as unknown as TourWithRules
    const split = splitForSale(sale, tour)
    sumRevenue += Number(sale.total_amount)
    sumOwnerModel += split.owner
    sumPartnerModel += split.partner
    sumPromoterModel += split.promoter
    sumTurnoverModel += split.total
    places += sale.adult_count + (sale.child_count ?? 0) + (sale.concession_count ?? 0)
    const pm = sale.payment_method as string
    if (pm in byPayment) byPayment[pm] += Number(sale.total_amount)
  }

  const sumPromoterFact = promoterCredits.reduce((s, r) => s + Number(r.amount), 0)
  const sumPartnerPayouts = payouts.reduce((s, p) => s + Number(p.amount), 0)

  const generatedAt = new Date()

  // ——— 1. ИНФО ———
  const info = workbook.addWorksheet('ИНФО', { views: [{ state: 'frozen', ySplit: 1 }] })
  info.columns = [{ width: 14 }, { width: 72 }]
  let ir = 1
  const put = (a: string, b: string) => {
    info.getRow(ir).getCell(1).value = a
    info.getRow(ir).getCell(2).value = b
    ir++
  }
  put('Документ', 'Экономический отчёт NF Travel (выгрузка для бухгалтерии и анализа)')
  put('Период', formatPeriodRu(start, end))
  put('Сформировано', `${formatPeriod(generatedAt)} ${generatedAt.toLocaleTimeString('ru-RU')}`)
  put('Валюта', 'RUB (₽)')
  ir++
  info.getRow(ir).getCell(1).value = 'Назначение листов'
  info.getRow(ir).getCell(1).font = { bold: true }
  ir++
  put('Сводка за период', 'Ключевые показатели по оплаченным продажам за период (дата оплаты = дата продажи в системе).')
  put(
    'Оборотная ведомость',
    'Структура выручки по способам оплаты и распределение по модели комиссий (владелец / партнёр / промоутер).'
  )
  put(
    'Зарплатная ведомость',
    'Фактические начисления на баланс промоутеров и менеджеров за подтверждённые билеты (записи balance_history, кредит balance).'
  )
  put(
    'Кассовая книга',
    'Движение по доходам владельца после посадки (билет used) и выплаты партнёрам, отражённые от имени владельца за период.'
  )
  put('Продажи / Билеты', 'Детальные реестры за тот же период (создание записи в периоде).')
  ir++
  info.getRow(ir).getCell(1).value = 'Согласованность с экраном «Статистика»'
  info.getRow(ir).getCell(1).font = { bold: true }
  ir++
  put(
    'Оборот / чистая прибыль владельца',
    'Совпадают с метриками «Оборот» и «Чистая прибыль» при группировке «Общий» и фильтре оплаты «Все», если выбран тот же период.'
  )
  put(
    'Метрика «Зп» на дашборде',
    'В интерфейсе это доля партнёра по модели комиссий, а не зарплатная ведомость. Для ФОТ используйте лист «Зарплатная ведомость».'
  )
  ir++
  info.getRow(ir).getCell(1).value = 'Термины'
  info.getRow(ir).getCell(1).font = { bold: true }
  ir++
  put('Выручка (оборот)', 'Сумма полей оплаченных продаж total_amount за период.')
  put('Модель комиссий', 'Расчёт calcIncomeSplit: как делится сумма продажи между владельцем, партнёром и промоутером по правилам тура.')
  put('После посадки', 'В кассовой книге доход владельца начисляется в дату used (посадка), а не в дату продажи.')

  // ——— 2. Сводка ———
  const summary = workbook.addWorksheet('Сводка за период', { views: [{ state: 'frozen', ySplit: 2 }] })
  summary.mergeCells(1, 1, 1, 2)
  const t1 = summary.getCell(1, 1)
  t1.value = `Сводка за период: ${formatPeriodRu(start, end)}`
  t1.font = { bold: true, size: 13 }
  t1.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
  summary.getRow(1).height = 24
  summary.getRow(2).values = ['Показатель', 'Значение']
  styleHeaderRow(summary.getRow(2))
  summary.columns = [{ width: 48 }, { width: 22 }]

  const summaryRows: [string, string | number][] = [
    ['Количество оплаченных продаж, шт.', sales.length],
    ['Мест (по продажам), шт.', places],
    ['Выручка (сумма total_amount), ₽', sumRevenue],
    ['Оборот по модели (Σ split.total), ₽', sumTurnoverModel],
    ['Доля владельца по модели, ₽', sumOwnerModel],
    ['Доля партнёра по модели, ₽', sumPartnerModel],
    ['Доля промоутера по модели, ₽', sumPromoterModel],
    ['Начислено промоутерам/менеджерам (факт по балансу), ₽', sumPromoterFact],
    ['Выплачено партнёрам (учёт владельца), ₽', sumPartnerPayouts],
    ['в т.ч. выручка наличными, ₽', byPayment.cash],
    ['в т.ч. выручка эквайринг, ₽', byPayment.acquiring],
    ['в т.ч. выручка онлайн, ₽', byPayment.online_yookassa],
    ['Посадок (билетов used) в периоде, шт.', usedTickets.length],
  ]
  let sr = 3
  for (const [label, val] of summaryRows) {
    const row = summary.getRow(sr)
    row.getCell(1).value = label
    if (typeof val === 'number') {
      applyMoney(row.getCell(2), val)
    } else {
      row.getCell(2).value = val
    }
    sr++
  }

  // ——— 3. Оборотная ведомость ———
  const turnover = workbook.addWorksheet('Оборотная ведомость', { views: [{ state: 'frozen', ySplit: 3 }] })
  turnover.mergeCells(1, 1, 1, 2)
  turnover.getCell(1, 1).value = 'Оборотная ведомость (структура выручки и распределение по модели комиссий)'
  turnover.getCell(1, 1).font = { bold: true, size: 12 }
  turnover.getRow(2).values = ['Статья', 'Сумма, ₽']
  styleHeaderRow(turnover.getRow(2))
  turnover.columns = [{ width: 56 }, { width: 18 }]
  let tr = 3
  const addSection = (title: string) => {
    const r = turnover.getRow(tr)
    r.getCell(1).value = title
    r.getCell(1).font = { bold: true }
    r.getCell(2).value = ''
    tr++
  }
  const addLine = (label: string, amount: number, note?: string) => {
    const r = turnover.getRow(tr)
    r.getCell(1).value = note ? `${label} (${note})` : label
    applyMoney(r.getCell(2), amount)
    tr++
  }

  addSection('1. Денежные поступления (оплаченные продажи за период)')
  addLine('Всего выручка (по продажам)', sumRevenue)
  addLine('Наличные', byPayment.cash)
  addLine('Эквайринг', byPayment.acquiring)
  addLine('Онлайн (ЮKassa)', byPayment.online_yookassa)

  addSection('2. Распределение по модели комиссий (по тем же продажам)')
  addLine('Итого оборот по модели (split.total)', sumTurnoverModel, 'контроль к сумме продаж')
  addLine('Доля владельца', sumOwnerModel)
  addLine('Доля партнёра', sumPartnerModel)
  addLine('Доля промоутера (начисляемая в модели)', sumPromoterModel)

  addSection('3. Исходящие платежи и начисления (факт)')
  addLine('Выплаты партнёрам (дебет balance, владелец)', sumPartnerPayouts)
  addLine('Начисления на баланс промоутерам/менеджерам', sumPromoterFact)

  // ——— 4. Зарплатная ведомость ———
  const payroll = workbook.addWorksheet('Зарплатная ведомость', { views: [{ state: 'frozen', ySplit: 3 }] })
  payroll.mergeCells(1, 1, 1, 8)
  payroll.getCell(1, 1).value =
    'Зарплатная ведомость: начисления на баланс (промоутеры / менеджеры) за подтверждение продажи билета. Период — по дате записи в истории баланса.'
  payroll.getCell(1, 1).font = { bold: true, size: 11 }
  payroll.getCell(1, 1).alignment = { wrapText: true }
  payroll.getRow(1).height = 36
  payroll.getRow(2).values = [
    '№',
    'Дата и время',
    'ФИО',
    'Роль',
    'Сумма, ₽',
    'Основание',
    '№ билета',
    '№ продажи',
  ]
  styleHeaderRow(payroll.getRow(2))
  payroll.columns = [
    { width: 5 },
    { width: 18 },
    { width: 24 },
    { width: 12 },
    { width: 14 },
    { width: 52 },
    { width: 14 },
    { width: 14 },
  ]

  let pr = 3
  let idx = 1
  for (const row of promoterCredits) {
    const r = payroll.getRow(pr)
    const at = new Date(row.created_at)
    const roleLabel =
      row.user.role === UserRole.promoter ? 'Промоутер' : row.user.role === UserRole.manager ? 'Менеджер' : row.user.role
    r.getCell(1).value = idx
    r.getCell(2).value = `${formatPeriod(at)} ${at.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    r.getCell(3).value = row.user.full_name || row.user.email || row.user_id
    r.getCell(4).value = roleLabel
    applyMoney(r.getCell(5), Number(row.amount))
    r.getCell(6).value = row.description
    r.getCell(7).value = row.ticket?.ticket_number || ''
    r.getCell(8).value = row.sale?.sale_number ?? ''
    idx++
    pr++
  }
  if (promoterCredits.length === 0) {
    payroll.mergeCells(pr, 1, pr, 8)
    payroll.getCell(pr, 1).value =
      'За выбранный период нет записей о начислениях на баланс по шаблону «Пополнение от продажи билета».'
    payroll.getCell(pr, 1).alignment = { wrapText: true }
  } else {
    const totalRow = payroll.getRow(pr)
    totalRow.getCell(4).value = 'Итого'
    totalRow.getCell(4).font = { bold: true }
    applyMoney(totalRow.getCell(5), sumPromoterFact)
    totalRow.getCell(5).font = { bold: true }
  }

  // ——— 5. Кассовая книга ———
  const lines: LedgerLine[] = []

  for (const ticket of usedTickets) {
    const sale = ticket.sale
    const tour = ticket.tour as unknown as TourWithRules
    const usedAt = ticket.used_at ? new Date(ticket.used_at) : new Date(ticket.updated_at)

    const split = splitForSale(sale, tour)
    const ownerShare = split.owner
    if (ownerShare <= 0) continue

    const pm = PAYMENT_LABELS[sale.payment_method] || sale.payment_method
    const partnerName = tour.createdBy?.full_name || 'Партнёр'
    lines.push({
      at: usedAt,
      tie: `t:${ticket.id}`,
      period: formatPeriod(usedAt),
      operation: `Доход после посадки · ${tour.company} · ${pm} · продажа №${sale.sale_number || '—'} · партнёр: ${partnerName}`,
      purpose: 'Доход владельца (после used)',
      debit: 0,
      credit: ownerShare,
    })
  }

  for (const p of payouts) {
    const at = new Date(p.created_at)
    const amt = Number(p.amount)
    const partnerLabel = p.user?.full_name || p.user?.email || 'Партнёр'
    lines.push({
      at,
      tie: `p:${p.id}`,
      period: formatPeriod(at),
      operation: p.description,
      purpose: `Выплата: ${partnerLabel}`,
      debit: amt,
      credit: 0,
    })
  }

  lines.sort((a, b) => {
    const ta = a.at.getTime()
    const tb = b.at.getTime()
    if (ta !== tb) return ta - tb
    return a.tie.localeCompare(b.tie)
  })

  let running = 0
  const withSaldo: (LedgerLine & { saldo: number })[] = []
  for (const L of lines) {
    running += L.credit - L.debit
    withSaldo.push({ ...L, saldo: running })
  }

  const cash = workbook.addWorksheet('Кассовая книга', {
    views: [{ state: 'frozen', ySplit: 3 }],
  })
  cash.mergeCells(1, 1, 1, 6)
  cash.getCell(1, 1).value = `Кассовая книга владельца за период ${formatPeriodRu(start, end)} · доход после посадки (used) и выплаты партнёрам`
  cash.getCell(1, 1).font = { bold: true, size: 12 }
  cash.getCell(1, 1).alignment = { wrapText: true }
  cash.getRow(1).height = 30
  cash.getRow(2).values = ['Период', 'Операция', 'Назначение / контрагент', 'Списания', 'Поступления', 'Текущее сальдо в периоде']
  styleHeaderRow(cash.getRow(2))
  cash.columns = [{ width: 12 }, { width: 56 }, { width: 28 }, { width: 14 }, { width: 14 }, { width: 18 }]

  let cr = 3
  if (withSaldo.length === 0) {
    cash.mergeCells(cr, 1, cr, 6)
    cash.getCell(cr, 1).value =
      'За выбранный период нет строк: нет посадок (used) с доходом владельца и нет выплат партнёрам от вашего имени.'
    cash.getCell(cr, 1).alignment = { wrapText: true }
  } else {
    for (let i = 0; i < withSaldo.length; i++) {
      const row = withSaldo[i]
      const excelRow = cash.getRow(cr)
      excelRow.getCell(1).value = row.period
      excelRow.getCell(2).value = row.operation
      excelRow.getCell(3).value = row.purpose
      applyMoneyOptional(excelRow.getCell(4), row.debit)
      applyMoneyOptional(excelRow.getCell(5), row.credit)
      applySaldo(excelRow.getCell(6), row.saldo)
      if (i % 2 === 1) {
        for (let c = 1; c <= 6; c++) {
          excelRow.getCell(c).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' },
          }
        }
      }
      cr++
    }
  }
}
