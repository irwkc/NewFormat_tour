import { prisma } from '@/lib/prisma'
import { PaymentMethod, PaymentStatus } from '@prisma/client'

/** По умолчанию удаляем «зависшие» продажи старше этого возраста (минуты). */
export const DEFAULT_STALE_PENDING_SALE_MINUTES = 30

/** Удаление продажи и связанных записей (без билета — вызывающий проверяет). */
export async function deleteSaleCascadeById(saleId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.balanceHistory.deleteMany({ where: { sale_id: saleId } })
    await tx.yookassaPayment.deleteMany({ where: { sale_id: saleId } })
    await tx.sale.delete({ where: { id: saleId } })
  })
}

/**
 * Неоплаченные наличные/эквайринг без билета старше cutoff — удаляем (как ручная «Отмена»).
 * Места на рейс не трогаем — они учитываются только после создания билета.
 */
export async function deleteStalePendingCashAcquiringSalesWithoutTicket(
  maxAgeMinutes: number
): Promise<{ count: number; ids: string[] }> {
  const ms = Math.max(5, maxAgeMinutes) * 60 * 1000
  const cutoff = new Date(Date.now() - ms)

  const stale = await prisma.sale.findMany({
    where: {
      payment_status: PaymentStatus.pending,
      payment_method: { in: [PaymentMethod.cash, PaymentMethod.acquiring] },
      created_at: { lt: cutoff },
      ticket: { is: null },
    },
    select: { id: true },
  })

  const ids: string[] = []
  for (const row of stale) {
    await deleteSaleCascadeById(row.id)
    ids.push(row.id)
  }

  return { count: ids.length, ids }
}
