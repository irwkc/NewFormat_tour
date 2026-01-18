'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'

export default function PartnerDashboard() {
  const { token } = useAuthStore()
  const [tours, setTours] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchTours()
    }
  }, [token])

  const fetchTours = async () => {
    try {
      const response = await fetch('/api/tours', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setTours(data.data)
      }
    } catch (error) {
      console.error('Error fetching tours:', error)
    } finally {
      setLoading(false)
    }
  }

  const navItems = [
    { label: 'Мои экскурсии', href: '/dashboard/partner/tours' },
    { label: 'Проверка билетов', href: '/dashboard/partner/tickets/check' },
    { label: 'Статистика', href: '/dashboard/partner/statistics' },
    { label: 'Настройки', href: '/dashboard/partner/settings' },
  ]

  return (
    <DashboardLayout title="Панель партнера" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Мои экскурсии</h2>
            <p className="text-white/70 text-sm mt-1">Обзор ваших экскурсий</p>
          </div>
          <Link
            href="/dashboard/partner/tours/create"
            className="btn-primary"
          >
            + Создать экскурсию
          </Link>
        </div>

        <div className="glass-card">
          {loading ? (
            <p className="text-white/70 text-center py-4">Загрузка...</p>
          ) : tours.length === 0 ? (
            <p className="text-white/70 text-center py-4">Нет экскурсий</p>
          ) : (
            <div className="space-y-4">
              {tours.map((tour) => (
                <Link
                  key={tour.id}
                  href={`/dashboard/partner/tours/${tour.id}`}
                  className="block glass rounded-2xl p-4 hover:bg-white/10 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-white">{tour.company} - {tour.flight_number}</div>
                      <div className="text-sm text-white/70">
                        {new Date(tour.date).toLocaleDateString('ru-RU')} {new Date(tour.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-sm mt-2 text-white/70">
                        Статус модерации: 
                        <span className={`ml-2 px-2 py-1 rounded border ${
                          tour.moderation_status === 'approved' ? 'bg-green-300/30 text-green-200 border-green-400/30' :
                          tour.moderation_status === 'pending' ? 'bg-yellow-300/30 text-yellow-200 border-yellow-400/30' :
                          'bg-red-300/30 text-red-200 border-red-400/30'
                        }`}>
                          {tour.moderation_status === 'approved' ? 'Одобрена' :
                           tour.moderation_status === 'pending' ? 'На модерации' :
                           'Отклонена'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
