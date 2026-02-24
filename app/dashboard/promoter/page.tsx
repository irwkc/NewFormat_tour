'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'

type DashboardFlight = {
  id: string
}

type DashboardTour = {
  id: string
  company: string
  flights?: DashboardFlight[]
}

type DashboardSale = {
  id: string
  tour?: {
    company?: string
  }
  adult_count: number
  child_count: number
  concession_count: number
  total_amount: number | string
}

export default function PromoterDashboard() {
  const { token, user } = useAuthStore()
  const [tours, setTours] = useState<DashboardTour[]>([])
  const [sales, setSales] = useState<DashboardSale[]>([])
  const [balanceHistory, setBalanceHistory] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [token])

  const fetchData = async () => {
    try {
      const [toursRes, salesRes, historyRes] = await Promise.all([
        fetch('/api/tours?moderation_status=approved', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch('/api/sales', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch('/api/users/me/balance-history', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
      ])

      const toursData = await toursRes.json()
      const salesData = await salesRes.json()
      const historyData = await historyRes.json()

      if (toursData.success) setTours(toursData.data)
      if (salesData.success) setSales(salesData.data)
      if (historyData.success) setBalanceHistory(historyData.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const navItems = [
    { label: 'Продажи', href: '/dashboard/promoter/sales' },
    { label: 'История баланса', href: '/dashboard/promoter/balance-history' },
    { label: 'Выданные вещи', href: '/dashboard/promoter/issued-items' },
    { label: 'Реферальная программа', href: '/dashboard/promoter/invitations' },
  ]

  return (
    <DashboardLayout title="Панель промоутера" navItems={navItems}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card">
            <h2 className="text-sm font-medium text-white/80 mb-1">Доходы</h2>
            <div className="text-3xl sm:text-4xl font-bold text-green-300 mb-1">
              {Number(user?.balance || 0).toFixed(2)}₽
            </div>
            <p className="text-xs text-white/60">
              Сумма, которую вы заработали за подтверждённые билеты.
            </p>
          </div>
          <div className="glass-card">
            <h2 className="text-sm font-medium text-white/80 mb-1">Ваш промо‑ID</h2>
            <div className="text-2xl font-bold text-white mb-1">
              {user?.promoter_id ?? '—'}
            </div>
            <p className="text-xs text-white/60">
              Показывайте этот ID менеджеру при продаже за вас.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card">
            <h3 className="text-lg font-semibold mb-4 text-white">Доступные экскурсии</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : tours.length === 0 ? (
              <p className="text-white/60 text-center py-4">Нет доступных экскурсий</p>
            ) : (
              <div className="space-y-2">
                {tours.slice(0, 5).map((tour) => (
                  <Link
                    key={tour.id}
                    href={`/dashboard/promoter/sales/create?tourId=${tour.id}`}
                    className="block p-3 rounded-xl border border-white/20 hover:bg-white/10 transition-all duration-200"
                  >
                    <div className="font-semibold text-white">{tour.company}</div>
                    <div className="text-sm text-white/70">
                      Рейсов: {tour.flights?.length || 0}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card">
            <h3 className="text-lg font-semibold mb-4 text-white">Последние продажи</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : sales.length === 0 ? (
              <p className="text-white/60 text-center py-4">Нет продаж</p>
            ) : (
              <div className="space-y-2">
                {sales.slice(0, 5).map((sale) => (
                  <div key={sale.id} className="p-3 rounded-xl border border-white/20">
                    <div className="font-semibold text-white">{sale.tour?.company || 'Экскурсия'}</div>
                    <div className="text-sm text-white/70">
                      {sale.adult_count} взр. {sale.child_count > 0 && `${sale.child_count} дет.`} {sale.concession_count > 0 && `${sale.concession_count} льг.`} - {Number(sale.total_amount).toFixed(2)}₽
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}