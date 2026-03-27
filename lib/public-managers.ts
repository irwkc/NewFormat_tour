import { prisma } from '@/lib/prisma'
import { PaymentStatus, UserRole } from '@prisma/client'

export type PublicManager = {
  id: string
  full_name: string | null
  photo_url: string | null
  phone: string | null
  role_label: 'Старший менеджер' | 'Менеджер'
  guests_served: number
}

function itemSuggestsTerminal(itemName: string): boolean {
  const n = itemName.toLowerCase()
  return /эквайр|терминал|пинпад|\bpos\b|эквайринг/i.test(n)
}

/** Топ менеджеров: сначала со «старшим» статусом (есть выданный эквайринг/терминал), затем по числу обслуженных гостей (билеты по завершённым продажам). */
export async function getPublicManagersFromPrisma(limit = 24): Promise<PublicManager[]> {
  try {
    const managers = await prisma.user.findMany({
      where: { role: UserRole.manager, is_active: true },
      select: {
        id: true,
        full_name: true,
        photo_url: true,
        phone: true,
        issuedItemsReceived: {
          where: { is_returned: false },
          select: { item_name: true },
        },
      },
    })

    if (managers.length === 0) return []

    const ids = managers.map((m) => m.id)
    const sales = await prisma.sale.findMany({
      where: {
        seller_user_id: { in: ids },
        payment_status: PaymentStatus.completed,
        ticket: { isNot: null },
      },
      select: {
        seller_user_id: true,
        ticket: {
          select: {
            adult_count: true,
            child_count: true,
            concession_count: true,
          },
        },
      },
    })

    const guestsMap = new Map<string, number>()
    for (const s of sales) {
      const t = s.ticket
      if (!t) continue
      const n = t.adult_count + t.child_count + t.concession_count
      guestsMap.set(s.seller_user_id, (guestsMap.get(s.seller_user_id) || 0) + n)
    }

    const enriched: PublicManager[] = managers.map((m) => {
      const isSenior = m.issuedItemsReceived.some((it) => itemSuggestsTerminal(it.item_name))
      return {
        id: m.id,
        full_name: m.full_name,
        photo_url: m.photo_url,
        phone: m.phone,
        role_label: isSenior ? 'Старший менеджер' : 'Менеджер',
        guests_served: guestsMap.get(m.id) || 0,
      }
    })

    enriched.sort((a, b) => {
      const sa = a.role_label === 'Старший менеджер' ? 1 : 0
      const sb = b.role_label === 'Старший менеджер' ? 1 : 0
      if (sa !== sb) return sb - sa
      if (b.guests_served !== a.guests_served) return b.guests_served - a.guests_served
      return (a.full_name || '').localeCompare(b.full_name || '', 'ru')
    })

    return enriched.slice(0, limit)
  } catch (e) {
    console.error('getPublicManagersFromPrisma:', e)
    return []
  }
}

/**
 * Список для лендинга. По умолчанию — Prisma (тот же бэкенд, что staff.nf-travel.ru).
 * Если задан `PUBLIC_MANAGERS_FETCH_URL` (например https://staff.nf-travel.ru/api/public/managers), данные подтягиваются оттуда.
 */
export async function getPublicManagers(limit = 24): Promise<PublicManager[]> {
  const fetchUrl = process.env.PUBLIC_MANAGERS_FETCH_URL?.trim()
  if (fetchUrl) {
    try {
      const res = await fetch(fetchUrl, { next: { revalidate: 120 } })
      if (!res.ok) return []
      const json = (await res.json()) as { success?: boolean; data?: PublicManager[] }
      if (json.success && Array.isArray(json.data)) return json.data.slice(0, limit)
    } catch (e) {
      console.error('getPublicManagers fetch:', e)
    }
    return []
  }
  return getPublicManagersFromPrisma(limit)
}
