'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'
import { RoleOnboardingOverlay } from '@/components/Onboarding/RoleOnboardingOverlay'

type DashboardFlight = {
  id: string
  date: string
  departure_time: string
  duration_minutes?: number | null
}

type DashboardTour = {
  id: string
  company: string
  category?: { name?: string } | null
  description?: string | null
  photo_urls?: unknown
  flights?: DashboardFlight[]
}

export default function PromoterDashboard() {
  const { token, user } = useAuthStore()
  const [tours, setTours] = useState<DashboardTour[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [token])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.localStorage.getItem('nf_onboarding_promoter_seen')) setShowOnboarding(true)
  }, [])

  const finishOnboarding = () => {
    if (typeof window !== 'undefined') window.localStorage.setItem('nf_onboarding_promoter_seen', '1')
    setShowOnboarding(false)
  }

  const fetchData = async () => {
    try {
      const toursRes = await fetch('/api/tours?moderation_status=approved', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const toursData = await toursRes.json()

      if (toursData.success) setTours(toursData.data)
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
    { label: 'Настройки', href: '/dashboard/promoter/settings' },
  ]
  const categories = Array.from(new Set(tours.map((t) => t.category?.name).filter((name): name is string => Boolean(name))))
  const filteredTours =
    selectedCategory === 'all' ? tours : tours.filter((tour) => (tour.category?.name || '') === selectedCategory)

  return (
    <DashboardLayout title="Панель промоутера" navItems={navItems}>
      {showOnboarding && (
        <RoleOnboardingOverlay role="promoter" onFinish={finishOnboarding} />
      )}
      <div className="space-y-6">
        <div className="glass-card">
          <h2 className="text-sm font-medium text-white/80 mb-1">Баланс</h2>
          <div className="text-3xl sm:text-4xl font-bold text-green-300 mb-1">
            {Number(user?.balance || 0).toFixed(2)}₽
          </div>
        </div>
        <Link
          href="/dashboard/promoter/sales/create"
          className="btn-primary w-full block text-center py-5 text-lg md:text-xl font-bold rounded-2xl"
        >
          Продать
        </Link>

        <div className="grid grid-cols-1 gap-6">
          <details className="glass-card open:shadow-xl sm:open:block" open>
            <summary className="sm:hidden cursor-pointer list-none mb-2 text-sm font-semibold text-white">
              Доступные экскурсии
            </summary>
            <div className="hidden sm:block">
              <h3 className="text-lg font-semibold mb-4 text-white">Доступные экскурсии</h3>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : tours.length === 0 ? (
              <p className="text-white/60 text-center py-4">Нет доступных экскурсий</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-white/80">Тип рейса:</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="input-glass max-w-xs py-2"
                  >
                    <option value="all">Все</option>
                    {categories.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                {filteredTours.length === 0 && (
                  <p className="text-white/60 text-center py-4">Нет экскурсий в выбранной категории</p>
                )}
                {filteredTours.slice(0, 5).map((tour) => (
                  <Link
                    key={tour.id}
                    href={`/dashboard/promoter/tours/${tour.id}`}
                    className="block rounded-xl border border-white/20 p-3 hover:bg-white/10 transition-all duration-200"
                  >
                    <div className="font-semibold text-white mb-2">{tour.company}</div>
                    {tour.flights?.[0] ? (
                      <div className="text-sm text-white/70">
                        <div>
                          Ближайший рейс:{' '}
                          {new Date(tour.flights[0].departure_time).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div>Длительность: {tour.flights[0].duration_minutes ?? 0} мин.</div>
                      </div>
                    ) : (
                      <div className="text-sm text-white/70">Нет доступных рейсов</div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </details>
        </div>
      </div>
    </DashboardLayout>
  )
}