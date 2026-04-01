import { prisma } from '@/lib/prisma'
import { PaymentStatus } from '@prisma/client'

/** По умолчанию удаляем незавершённые (pending, без билета) продажи старше этого возраста (минуты). */
export const DEFAULT_STALE_PENDING_SALE_MINUTES = 10

/** Удаление продажи и связанных записей (без билета — вызывающий проверяет). */
export async function deleteSaleCascadeById(saleId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.balanceHistory.deleteMany({ where: { sale_id: saleId } })
    await tx.yookassaPayment.deleteMany({ where: { sale_id: saleId } })
    await tx.sale.delete({ where: { id: saleId } })
  })
}

/**
 * Любая продажа в pending без билета старше cutoff — удаляем (наличные, эквайринг, онлайн и т.д.).
 * Места на рейс не трогаем — они учитываются только после создания билета.
 */
export async function deleteStalePendingSalesWithoutTicket(
  maxAgeMinutes: number
): Promise<{ count: number; ids: string[] }> {
  const ms = Math.max(1, maxAgeMinutes) * 60 * 1000
  const cutoff = new Date(Date.now() - ms)

  const stale = await prisma.sale.findMany({
    where: {
      payment_status: PaymentStatus.pending,
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
