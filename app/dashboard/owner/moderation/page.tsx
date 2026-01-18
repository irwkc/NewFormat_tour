'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'

export default function ModerationPage() {
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
      const response = await fetch('/api/tours?moderation_status=pending', {
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
    { label: 'Экскурсии на модерации', href: '/dashboard/owner/moderation' },
    { label: 'Категории', href: '/dashboard/owner/categories' },
    { label: 'Промоутеры', href: '/dashboard/owner/promoters' },
    { label: 'Менеджеры', href: '/dashboard/owner/managers' },
    { label: 'Выдача вещей', href: '/dashboard/owner/issued-items' },
    { label: 'Статистика', href: '/dashboard/owner/statistics' },
    { label: 'Приглашения', href: '/dashboard/owner/invitations' },
    { label: 'Настройки', href: '/dashboard/owner/settings' },
  ]

  return (
    <DashboardLayout title="Модерация экскурсий" navItems={navItems}>
      <div className="space-y-6">
        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-6 text-white">Экскурсии на модерации</h2>

          {loading ? (
            <p className="text-white/70">Загрузка...</p>
          ) : tours.length === 0 ? (
            <p className="text-white/70">Нет экскурсий на модерации</p>
          ) : (
            <div className="space-y-4">
              {tours.map((tour) => (
                <Link
                  key={tour.id}
                  href={`/dashboard/owner/moderation/${tour.id}`}
                  className="block glass rounded-2xl p-4 hover:bg-white/10 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-lg text-white">{tour.company} - {tour.flight_number}</div>
                      <div className="text-sm text-white/70 mt-1">
                        Категория: {tour.category.name}
                      </div>
                      <div className="text-sm text-white/70">
                        Дата: {new Date(tour.date).toLocaleDateString('ru-RU')} в {new Date(tour.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-sm text-white/70">
                        Мест: {tour.max_places}
                      </div>
                      <div className="text-sm mt-2 text-white/70">
                        <span className="font-medium text-white">Цены партнера:</span> Взрослый: {Number(tour.partner_min_adult_price).toFixed(2)}₽, Детский: {Number(tour.partner_min_child_price).toFixed(2)}₽
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-yellow-300/30 text-yellow-200 rounded-full text-sm border border-yellow-400/30">
                      На модерации
                    </span>
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
