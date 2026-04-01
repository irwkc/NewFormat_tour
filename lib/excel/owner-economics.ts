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

/** Округление денег для нарастающего сальдо (2 знака). */
function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
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

/** Строка кассовой книги: полное распределение при посадке + фактические начисления/выплаты. */
type CashbookLine = {
  at: Date
  tie: string
  period: string
  kind: 'boarding' | 'payout_partner' | 'payout_staff' | 'promoter_accrual'
  /** Кратко для колонки «Тип» */
  kindLabel: string
  operation: string
  partnerShare: number
  ownerShare: number
  promoterShare: number
  /** Исходящая выплата (наличные/перевод с позиции владельца) */
  payoutOut: number
  counterparty: string
  /**
   * Вся сумма продажи, поступившая на счёт владельца (split.total = сумма билета).
   * Для строк прихода; для выплат/начислений — 0.
   */
  grossToOwner: number
}

/** Листы для владельца: ИНФО, сводка, оборотная и зарплатная ведомости, кассовая книга — за выбранный период. */
export async function addOwnerEconomicsSheets(
  workbook: ExcelJS.Workbook,
  ownerId: string,
  period: { start: Date; end: Date }
) {
  const { start, end } = period

  const [sales, usedTickets, cashbookTickets, ownerOutgoingDebits, promoterCredits] = await Promise.all([
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
    prisma.ticket.findMany({
      where: {
        ticket_status: { not: TicketStatus.cancelled },
        sale: { payment_status: PaymentStatus.completed },
        OR: [
          { sale: { created_at: { gte: start, lte: end } } },
          {
            ticket_status: TicketStatus.used,
            used_at: { not: null, gte: start, lte: end },
          },
        ],
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
        created_at: { gte: start, lte: end },
        OR: [
          { description: { startsWith: 'Выплата партнёру' } },
          { description: { startsWith: 'Выплата промоутеру' } },
          { description: { startsWith: 'Выплата менеджеру' } },
          { description: { equals: 'Выплата владельцем, баланс обнулен' } },
        ],
      },
      include: {
        user: { select: { full_name: true, email: true, role: true } },
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
        ticket: { select: { ticket_number: true, id: true, used_at: true, ticket_status: true } },
        sale: { select: { sale_number: true, total_amount: true } },
      },
      orderBy: { created_at: 'asc' },
    }),
  ])

  const partnerPayouts = ownerOutgoingDebits.filter((d) => d.description.startsWith('Выплата партнёру'))
  const staffPayouts = ownerOutgoingDebits.filter(
    (d) =>
      d.description.startsWith('Выплата промоутеру') ||
      d.description.startsWith('Выплата менеджеру') ||
      d.description === 'Выплата владельцем, баланс обнулен'
  )

  const placesBoardedFact = usedTickets.reduce(
    (s, t) => s + t.adult_count + (t.child_count ?? 0) + (t.concession_count ?? 0),
    0
  )

  const ticketsSoldNotBoarded = await prisma.ticket.findMany({
    where: {
      ticket_status: TicketStatus.sold,
      sale: {
        payment_status: PaymentStatus.completed,
        created_at: { gte: start, lte: end },
      },
    },
    include: { sale: { select: { total_amount: true } } },
  })
  const revenueSoldNotBoarded = ticketsSoldNotBoarded.reduce((s, t) => s + Number(t.sale.total_amount), 0)

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
  const sumPartnerPayouts = partnerPayouts.reduce((s, p) => s + Number(p.amount), 0)
  const sumStaffPayouts = staffPayouts.reduce((s, p) => s + Number(p.amount), 0)

  const boardingInPeriod = (t: { ticket_status: TicketStatus; used_at: Date | null } | null | undefined) => {
    if (!t || t.ticket_status !== TicketStatus.used || !t.used_at) return false
    const u = new Date(t.used_at)
    return u >= start && u <= end
  }

  let sumOwnerBoarded = 0
  let sumPartnerBoarded = 0
  for (const t of usedTickets) {
    const tour = t.tour as unknown as TourWithRules
    const split = splitForSale(t.sale, tour)
    sumOwnerBoarded += split.owner
    sumPartnerBoarded += split.partner
  }

  const ownerNetProfit = roundMoney(sumOwnerBoarded + revenueSoldNotBoarded)

  const sumPromoterAccrualBoarded = promoterCredits
    .filter((c) => boardingInPeriod(c.ticket))
    .reduce((s, r) => s + Number(r.amount), 0)

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
  put(
    'Поступление денег',
    'Все оплаты по продажам билетов в системе зачисляются на счёт или в кассу владельца. Колонки «партнёр / промоутер / владелец» в отчётах — это распределение этой выручки по правилам тура (доли и обязательства), а не отдельные входящие платежи на разные счета.'
  )
  ir++
  info.getRow(ir).getCell(1).value = 'Назначение листов'
  info.getRow(ir).getCell(1).font = { bold: true }
  ir++
  put(
    'Сводка за период',
    'Ключевые показатели по оплаченным продажам за период (дата продажи в интервале отчёта). Блок «по посадке» — билеты, у которых дата посадки попадает в период. «Приход от несевших» — оплаты за билеты без отметки о поездке на конец логики отчёта по этим продажам.'
  )
  put(
    'Оборотная ведомость',
    'Структура выручки по способам оплаты и распределение по модели комиссий (владелец / партнёр / промоутер).'
  )
  put(
    'Зарплатная ведомость',
    'Блок 1: начисления в системе на баланс сотрудника за билеты. Блок 2: фактические выплаты владельца с баланса сотрудника.'
  )
  put(
    'Кассовая книга',
    'Столбец «Поступило на счёт владельца» — вся сумма билета; далее доли (партнёр / владелец / промоутер) — распределение этой суммы. Сальдо — накопительно: сумма поступлений на счёт владельца по строкам прихода минус выплаты; начисление на баланс промоутеру новых денег не добавляет и сальдо не меняет.'
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
  put('Выручка (оборот)', 'Сумма оплаченных продаж за период по дате продажи.')
  put(
    'Модель комиссий',
    'Как из суммы, поступившей на счёт владельца, распределяются доли партнёра, промоутера и остаток владельца по правилам тура.'
  )
  put(
    'Приход в кассовой книге',
    'На счёт владельца зачисляется полная сумма продажи (столбец «всего»). Сальдо в отчёте накапливает эти полные поступления и вычитает выплаты; доли партнёра/промоутера/владельца — только справочно, как делится сумма, а не второе поступление.'
  )
  put(
    'Выплата промоутеру/менеджеру',
    'В интерфейсе владелец вводит сумму (как выплата партнёру в расчётах). В истории: «Выплата промоутеру» / «Выплата менеджеру».'
  )
  put(
    'Почему сальдо в кассовой книге бывает отрицательным',
    'Сальдо считается с нуля на начало периода (без остатка на счёте): сумма полных поступлений по приходам минус сумма выплат. Минус значит: за выбранный период сумма выплат партнёрам и сотрудникам больше, чем сумма поступлений по билетам в отчёте — часто выплаты относятся к выручке прошлых периодов.'
  )

  // ——— 2. Сводка ———
  const summary = workbook.addWorksheet('Сводка за период', { views: [{ state: 'frozen', ySplit: 2 }] })
  summary.mergeCells(1, 1, 1, 3)
  const t1 = summary.getCell(1, 1)
  t1.value = `Сводка за период: ${formatPeriodRu(start, end)}`
  t1.font = { bold: true, size: 13 }
  t1.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
  summary.getRow(1).height = 24
  summary.getRow(2).values = ['Показатель', 'Значение', 'Пояснение для экономиста']
  styleHeaderRow(summary.getRow(2))
  summary.columns = [{ width: 52 }, { width: 20 }, { width: 58 }]

  type SummaryEntry =
    | { kind: 'blank' }
    | { kind: 'row'; label: string; value: number | string; note: string }

  const summaryRows: SummaryEntry[] = [
    {
      kind: 'row',
      label: 'Мест (по продажам), шт.',
      value: places,
      note: 'Суммарно проданные места (взрослые, детские и льготные) по этим продажам.',
    },
    {
      kind: 'row',
      label: 'Мест фактически (посадка в периоде отчёта), шт.',
      value: placesBoardedFact,
      note: 'Места по билетам, у которых в периоде отчёта зафиксирована посадка (оказание услуги).',
    },
    { kind: 'blank' },
    {
      kind: 'row',
      label: 'Выручка по оплаченным продажам за период, ₽',
      value: sumRevenue,
      note: 'Полная сумма по оплаченным продажам за период по дате продажи.',
    },
    {
      kind: 'row',
      label: 'Доля владельца, совокупная, ₽',
      value: sumOwnerModel,
      note: 'Расчётная часть выручки по правилам тура за все оплаченные в периоде продажи — остаётся у оператора.',
    },
    {
      kind: 'row',
      label: 'Доля партнёра, совокупная, ₽',
      value: sumPartnerModel,
      note: 'Расчётная часть выручки по правилам тура за все оплаченные в периоде продажи — причитается партнёру.',
    },
    {
      kind: 'row',
      label: 'Доля промоутера и менеджеров, совокупная, ₽',
      value: sumPromoterModel,
      note: 'Расчётная часть выручки по правилам тура за все оплаченные в периоде продажи — причитается промоутерам и менеджерам.',
    },
    { kind: 'blank' },
    {
      kind: 'row',
      label: 'Совокупный приход от несевших (оплачено в периоде, поездка ещё не состоялась), ₽',
      value: revenueSoldNotBoarded,
      note: 'Деньги за билеты, оплаченные в периоде, по которым поездка ещё не отмечена как состоявшаяся.',
    },
    {
      kind: 'row',
      label: 'Доля владельца (по билетам с посадкой в периоде), ₽',
      value: roundMoney(sumOwnerBoarded),
      note: 'Расчётная доля владельца только по продажам, у которых в периоде отчёта зафиксирована посадка.',
    },
    {
      kind: 'row',
      label: 'Чистая прибыль владельца, ₽',
      value: ownerNetProfit,
      note: 'Сумма строки «доля владельца по посадке» и «совокупный приход от несевших»; показатель для сопоставления с дашбордом при том же периоде.',
    },
    {
      kind: 'row',
      label: 'Начислено промоутерам и менеджерам (по билетам с посадкой в периоде), ₽',
      value: sumPromoterAccrualBoarded,
      note: 'Начисления на баланс сотрудников за период, относящиеся к билетам с посадкой в этом периоде.',
    },
    {
      kind: 'row',
      label: 'Выплачено промоутерам и менеджерам за период отчёта, ₽',
      value: sumStaffPayouts,
      note: 'Все выплаты владельца промоутерам и менеджерам с баланса за выбранный период (по дате проводки). В учёте выплата не привязана к билету, поэтому сумма не делится по посадке.',
    },
    {
      kind: 'row',
      label: 'Начислено партнёрам (по билетам с посадкой в периоде), ₽',
      value: roundMoney(sumPartnerBoarded),
      note: 'Расчётная доля партнёра по правилам тура по продажам, у которых в периоде отчёта зафиксирована посадка.',
    },
    {
      kind: 'row',
      label: 'Выплачено партнёрам за период отчёта, ₽',
      value: sumPartnerPayouts,
      note: 'Все выплаты партнёрам за выбранный период (по дате проводки). В учёте выплата не привязана к билету.',
    },
    { kind: 'blank' },
    {
      kind: 'row',
      label: 'Выручка наличными, ₽',
      value: byPayment.cash,
      note: 'Часть выручки за период, оплаченная наличными.',
    },
    {
      kind: 'row',
      label: 'Выручка эквайринг, ₽',
      value: byPayment.acquiring,
      note: 'Часть выручки за период через банковский эквайринг (безнал по терминалу).',
    },
    {
      kind: 'row',
      label: 'Выручка онлайн, ₽',
      value: byPayment.online_yookassa,
      note: 'Часть выручки за период через онлайн-оплату.',
    },
  ]

  let sr = 3
  for (const entry of summaryRows) {
    if (entry.kind === 'blank') {
      sr++
      continue
    }
    const { label, value, note } = entry
    const row = summary.getRow(sr)
    row.getCell(1).value = label
    row.getCell(3).value = note
    row.getCell(3).alignment = { vertical: 'top', wrapText: true }
    if (typeof value === 'number') {
      const cell = row.getCell(2)
      cell.value = value
      if (label.includes('шт.') || label.includes('штук')) {
        cell.numFmt = '#,##0'
      } else {
        applyMoney(cell, value)
      }
    } else {
      row.getCell(2).value = value
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
  addLine('Итого оборот по модели комиссий', sumTurnoverModel, 'контроль: согласование с суммой выручки по продажам')
  addLine('Доля владельца', sumOwnerModel)
  addLine('Доля партнёра', sumPartnerModel)
  addLine('Доля промоутера (начисляемая в модели)', sumPromoterModel)

  addSection('3. Исходящие платежи и начисления (факт)')
  addLine('Выплаты партнёрам (учёт владельца)', sumPartnerPayouts)
  addLine('Выплаты промоутерам и менеджерам с баланса (владелец)', sumStaffPayouts)
  addLine('Начисления промоутерам и менеджерам (система)', sumPromoterFact)

  // ——— 4. Зарплатная ведомость ———
  const payrollHeaders = [
    '№',
    'Дата и время',
    'ФИО',
    'Роль',
    'Сумма, ₽',
    'Основание',
    '№ билета',
    '№ продажи',
  ]
  const payroll = workbook.addWorksheet('Зарплатная ведомость', { views: [{ state: 'frozen', ySplit: 3 }] })
  payroll.mergeCells(1, 1, 1, 8)
  payroll.getCell(1, 1).value =
    'Зарплатная ведомость: (А) начисления системы за билеты; (Б) фактические выплаты владельца с баланса сотрудника. Период — по дате записи в учёте.'
  payroll.getCell(1, 1).font = { bold: true, size: 11 }
  payroll.getCell(1, 1).alignment = { wrapText: true }
  payroll.getRow(1).height = 40
  payroll.mergeCells(2, 1, 2, 8)
  payroll.getCell(2, 1).value = 'А) Начисления системы — за подтверждённые билеты'
  payroll.getCell(2, 1).font = { bold: true }
  payroll.getCell(2, 1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8E8E8' },
  }
  payroll.getRow(3).values = payrollHeaders
  styleHeaderRow(payroll.getRow(3))
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

  let pr = 4
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
      'За выбранный период нет начислений по шаблону «Пополнение от продажи билета».'
    payroll.getCell(pr, 1).alignment = { wrapText: true }
    pr++
  } else {
    const totalRow = payroll.getRow(pr)
    totalRow.getCell(4).value = 'Итого (начисления)'
    totalRow.getCell(4).font = { bold: true }
    applyMoney(totalRow.getCell(5), sumPromoterFact)
    totalRow.getCell(5).font = { bold: true }
    pr++
  }

  pr++
  payroll.mergeCells(pr, 1, pr, 8)
  payroll.getCell(pr, 1).value =
    'Б) Выплаты с баланса — владелец отразил выплату промоутеру или менеджеру (по учёту аналогично выплате партнёру)'
  payroll.getCell(pr, 1).font = { bold: true }
  payroll.getCell(pr, 1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8E8E8' },
  }
  pr++
  payroll.getRow(pr).values = payrollHeaders
  styleHeaderRow(payroll.getRow(pr))
  pr++

  let idxB = 1
  for (const row of staffPayouts) {
    const r = payroll.getRow(pr)
    const at = new Date(row.created_at)
    const roleLabel =
      row.user.role === UserRole.promoter ? 'Промоутер' : row.user.role === UserRole.manager ? 'Менеджер' : row.user.role
    r.getCell(1).value = idxB
    r.getCell(2).value = `${formatPeriod(at)} ${at.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    r.getCell(3).value = row.user.full_name || row.user.email || row.user_id
    r.getCell(4).value = roleLabel
    applyMoney(r.getCell(5), Number(row.amount))
    r.getCell(6).value = row.description
    r.getCell(7).value = '—'
    r.getCell(8).value = '—'
    idxB++
    pr++
  }
  if (staffPayouts.length === 0) {
    payroll.mergeCells(pr, 1, pr, 8)
    payroll.getCell(pr, 1).value =
      'За период нет выплат с баланса (записи «Выплата промоутеру» / «Выплата менеджеру» / устаревшее полное обнуление).'
    payroll.getCell(pr, 1).alignment = { wrapText: true }
    pr++
  } else {
    const totalRowB = payroll.getRow(pr)
    totalRowB.getCell(4).value = 'Итого (выплаты)'
    totalRowB.getCell(4).font = { bold: true }
    applyMoney(totalRowB.getCell(5), sumStaffPayouts)
    totalRowB.getCell(5).font = { bold: true }
  }

  // ——— 5. Кассовая книга (полная: доли при посадке, начисления на баланс, выплаты) ———
  const cashLines: CashbookLine[] = []

  for (const ticket of cashbookTickets) {
    const sale = ticket.sale
    const tour = ticket.tour as unknown as TourWithRules
    const saleAt = new Date(sale.created_at)
    const saleInPeriod = saleAt.getTime() >= start.getTime() && saleAt.getTime() <= end.getTime()
    const usedAt = ticket.used_at ? new Date(ticket.used_at) : null
    const usedInPeriod =
      ticket.ticket_status === TicketStatus.used &&
      usedAt != null &&
      usedAt.getTime() >= start.getTime() &&
      usedAt.getTime() <= end.getTime()

    let at: Date
    let kindLabel: string
    if (saleInPeriod) {
      at = saleAt
      kindLabel = 'Приход по оплате'
    } else if (usedInPeriod && usedAt) {
      at = usedAt
      kindLabel = 'Посадка'
    } else {
      continue
    }

    const split = splitForSale(sale, tour)
    const pm = PAYMENT_LABELS[sale.payment_method] || sale.payment_method
    const partnerName = tour.createdBy?.full_name || 'Партнёр'
    const statusLabel =
      ticket.ticket_status === TicketStatus.used
        ? 'посадка состоялась'
        : ticket.ticket_status === TicketStatus.sold
          ? 'ожидает поездки'
          : String(ticket.ticket_status)

    cashLines.push({
      at,
      tie: `t:${ticket.id}`,
      period: formatPeriod(at),
      kind: 'boarding',
      kindLabel,
      operation: `${kindLabel} · ${tour.company} · ${pm} · продажа №${sale.sale_number || '—'} · билет #${ticket.ticket_number || ticket.id.slice(0, 8)} · статус: ${statusLabel}`,
      partnerShare: split.partner,
      ownerShare: split.owner,
      promoterShare: split.promoter,
      payoutOut: 0,
      counterparty: partnerName,
      grossToOwner: split.total,
    })
  }

  for (const row of promoterCredits) {
    const at = new Date(row.created_at)
    const who = row.user.full_name || row.user.email || row.user_id
    cashLines.push({
      at,
      tie: `c:${row.id}`,
      period: formatPeriod(at),
      kind: 'promoter_accrual',
      kindLabel: 'Начисление на баланс',
      operation: row.description,
      partnerShare: 0,
      ownerShare: 0,
      promoterShare: Number(row.amount),
      payoutOut: 0,
      counterparty: who,
      grossToOwner: 0,
    })
  }

  for (const p of partnerPayouts) {
    const at = new Date(p.created_at)
    const amt = Number(p.amount)
    const partnerLabel = p.user?.full_name || p.user?.email || 'Партнёр'
    cashLines.push({
      at,
      tie: `p:${p.id}`,
      period: formatPeriod(at),
      kind: 'payout_partner',
      kindLabel: 'Выплата партнёру',
      operation: p.description,
      partnerShare: 0,
      ownerShare: 0,
      promoterShare: 0,
      payoutOut: amt,
      counterparty: partnerLabel,
      grossToOwner: 0,
    })
  }

  for (const p of staffPayouts) {
    const at = new Date(p.created_at)
    const amt = Number(p.amount)
    const who = p.user?.full_name || p.user?.email || 'Сотрудник'
    const roleTag =
      p.user?.role === UserRole.promoter ? 'промоутер' : p.user?.role === UserRole.manager ? 'менеджер' : 'сотрудник'
    cashLines.push({
      at,
      tie: `s:${p.id}`,
      period: formatPeriod(at),
      kind: 'payout_staff',
      kindLabel: 'Выплата сотруднику',
      operation: p.description,
      partnerShare: 0,
      ownerShare: 0,
      promoterShare: 0,
      payoutOut: amt,
      counterparty: `${roleTag}: ${who}`,
      grossToOwner: 0,
    })
  }

  const kindOrder: Record<CashbookLine['kind'], number> = {
    boarding: 0,
    promoter_accrual: 1,
    payout_partner: 2,
    payout_staff: 3,
  }
  cashLines.sort((a, b) => {
    const ta = a.at.getTime()
    const tb = b.at.getTime()
    if (ta !== tb) return ta - tb
    const oa = kindOrder[a.kind]
    const ob = kindOrder[b.kind]
    if (oa !== ob) return oa - ob
    return a.tie.localeCompare(b.tie)
  })

  /** Нарастающий остаток: полные поступления на счёт владельца минус выплаты (как движение денег). */
  let cashSaldoRunning = 0
  const withCashSaldo: (CashbookLine & { cashSaldo: number })[] = []
  for (const L of cashLines) {
    if (L.kind === 'boarding') cashSaldoRunning = roundMoney(cashSaldoRunning + L.grossToOwner)
    else if (L.kind === 'payout_partner' || L.kind === 'payout_staff')
      cashSaldoRunning = roundMoney(cashSaldoRunning - L.payoutOut)
    withCashSaldo.push({ ...L, cashSaldo: cashSaldoRunning })
  }

  const cash = workbook.addWorksheet('Кассовая книга', {
    views: [{ state: 'frozen', ySplit: 3 }],
  })
  cash.mergeCells(1, 1, 1, 11)
  cash.getCell(1, 1).value = `Кассовая книга за период ${formatPeriodRu(start, end)} · на счёт владельца поступает полная сумма продажи; колонки долей — как она делится. Сальдо: накопительно полные поступления минус выплаты (с нуля на начало периода). См. итоги внизу листа.`
  cash.getCell(1, 1).font = { bold: true, size: 11 }
  cash.getCell(1, 1).alignment = { wrapText: true }
  cash.getRow(1).height = 48
  cash.getRow(2).values = [
    'Период',
    'Тип',
    'Операция / основание',
    'Поступило на счёт владельца, всего ₽',
    'Партнёр (доля) ₽',
    'Владелец (доля) ₽',
    'Промоутер (доля) ₽',
    'Расход (выплата) ₽',
    'Сальдо (поступило − выплаты, за период) ₽',
    'Контрагент',
    'Примечание',
  ]
  styleHeaderRow(cash.getRow(2))
  cash.columns = [
    { width: 11 },
    { width: 18 },
    { width: 44 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 16 },
    { width: 22 },
    { width: 34 },
  ]

  let cr = 3
  if (withCashSaldo.length === 0) {
    cash.mergeCells(cr, 1, cr, 11)
    cash.getCell(cr, 1).value =
      'За выбранный период нет движений: нет оплаченных билетов (по дате продажи или посадки), начислений на баланс и нет выплат от вашего имени.'
    cash.getCell(cr, 1).alignment = { wrapText: true }
  } else {
    for (let i = 0; i < withCashSaldo.length; i++) {
      const row = withCashSaldo[i]
      const excelRow = cash.getRow(cr)
      excelRow.getCell(1).value = row.period
      excelRow.getCell(2).value = row.kindLabel
      excelRow.getCell(3).value = row.operation
      applyMoneyOptional(excelRow.getCell(4), row.grossToOwner)
      applyMoneyOptional(excelRow.getCell(5), row.partnerShare)
      applyMoneyOptional(excelRow.getCell(6), row.ownerShare)
      applyMoneyOptional(excelRow.getCell(7), row.promoterShare)
      applyMoneyOptional(excelRow.getCell(8), row.payoutOut)
      applySaldo(excelRow.getCell(9), row.cashSaldo)
      excelRow.getCell(10).value = row.counterparty
      excelRow.getCell(11).value =
        row.kind === 'boarding'
          ? row.kindLabel === 'Приход по оплате'
            ? 'Вся сумма — на счёт владельца; далее доли из неё. Дата по оплате; билет оплачен или уже с посадкой'
            : 'Вся сумма — на счёт владельца; доли на дату посадки; оплата была вне периода'
          : row.kind === 'promoter_accrual'
            ? 'Начисление промоутеру; на счёт владельца новых денег нет; сальдо владельца не меняется'
            : row.kind === 'payout_partner'
              ? 'Выплата с денег владельца партнёру'
              : 'Выплата с денег владельца сотруднику'
      if (i % 2 === 1) {
        for (let c = 1; c <= 11; c++) {
          excelRow.getCell(c).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' },
          }
        }
      }
      cr++
    }

    let sumPayoutPeriod = 0
    let sumGrossPeriod = 0
    for (const L of cashLines) {
      if (L.kind === 'boarding') {
        sumGrossPeriod = roundMoney(sumGrossPeriod + L.grossToOwner)
      } else if (L.kind === 'payout_partner' || L.kind === 'payout_staff') {
        sumPayoutPeriod = roundMoney(sumPayoutPeriod + L.payoutOut)
      }
    }
    const netCashPeriod = roundMoney(sumGrossPeriod - sumPayoutPeriod)
    const lastSaldo = withCashSaldo.length ? withCashSaldo[withCashSaldo.length - 1].cashSaldo : 0

    cr++
    cash.mergeCells(cr, 1, cr, 11)
    const foot = cash.getCell(cr, 1)
    foot.value = [
      'Итого за период (без остатка на начало периода на счёте):',
      `Σ поступило на счёт владельца (полные суммы продаж): ${sumGrossPeriod.toFixed(2)} ₽`,
      `Σ выплаты партнёрам и сотрудникам: ${sumPayoutPeriod.toFixed(2)} ₽`,
      `Остаток по движению (= последнее сальдо): ${netCashPeriod.toFixed(2)} ₽${Math.abs(netCashPeriod - lastSaldo) > 0.02 ? ' — проверить округление' : ''}`,
      '',
      'Отрицательное сальдо: за период выплатили больше, чем сумма поступлений по строкам прихода в этом же отчёте; выплаты могут относиться к выручке, учтённой в других периодах.',
    ].join('\n')
    foot.alignment = { wrapText: true, vertical: 'top' }
    foot.font = { size: 10 }
    cash.getRow(cr).height = 110
  }
}
