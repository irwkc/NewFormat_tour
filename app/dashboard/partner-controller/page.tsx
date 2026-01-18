'use client'

import DashboardLayout from '@/components/Layout/DashboardLayout'
import TicketCheck from '@/components/Tickets/TicketCheck'

export default function PartnerControllerDashboard() {
  const navItems = [
    { label: 'Проверка билетов', href: '/dashboard/partner-controller/tickets/check' },
  ]

  return (
    <DashboardLayout title="Панель контролера" navItems={navItems}>
      <div className="px-4 py-6 sm:px-0">
        <TicketCheck />
      </div>
    </DashboardLayout>
  )
}
