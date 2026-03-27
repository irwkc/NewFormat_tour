/**
 * Централизованное меню для всех ролей дашборда.
 * Одинаковый список на всех страницах — пункты не пропадают при переходе.
 */

export type NavItem = { label: string; href: string }

export const DASHBOARD_NAV: Record<string, NavItem[]> = {
  owner: [
    { label: 'Категории', href: '/dashboard/owner/categories' },
    { label: 'Экскурсии', href: '/dashboard/owner/tours' },
    { label: 'Расчёт', href: '/dashboard/owner/settlement' },
    { label: 'Промоутеры и менеджеры', href: '/dashboard/owner/team' },
    { label: 'Выдача вещей', href: '/dashboard/owner/issued-items' },
    { label: 'Статистика', href: '/dashboard/owner/statistics' },
    { label: 'Приглашения и рефералы', href: '/dashboard/owner/invitations' },
    { label: 'Настройки', href: '/dashboard/owner/settings' },
  ],
  owner_assistant: [
    { label: 'Выдача вещей', href: '/dashboard/owner-assistant' },
  ],
  partner: [
    { label: 'Мои экскурсии', href: '/dashboard/partner' },
    { label: 'Статистика', href: '/dashboard/partner/statistics' },
    { label: 'Проверка билетов', href: '/dashboard/partner/tickets/check' },
    { label: 'Настройки', href: '/dashboard/partner/settings' },
  ],
  partner_controller: [
    { label: 'Проверка билетов', href: '/dashboard/partner-controller/tickets/check' },
  ],
  manager: [
    { label: 'Продажи', href: '/dashboard/manager/sales' },
    { label: 'История баланса', href: '/dashboard/manager/balance-history' },
    { label: 'Выданные вещи', href: '/dashboard/manager/issued-items' },
    { label: 'Приглашения', href: '/dashboard/manager/invitations' },
    { label: 'Настройки', href: '/dashboard/manager/settings' },
  ],
  promoter: [
    { label: 'Продажи', href: '/dashboard/promoter/sales' },
    { label: 'История баланса', href: '/dashboard/promoter/balance-history' },
    { label: 'Выданные вещи', href: '/dashboard/promoter/issued-items' },
    { label: 'Реферальная программа', href: '/dashboard/promoter/invitations' },
    { label: 'Настройки', href: '/dashboard/promoter/settings' },
  ],
}

export function getNavForRole(role: string): NavItem[] {
  return DASHBOARD_NAV[role] || []
}
