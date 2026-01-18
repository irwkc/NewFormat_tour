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
  ]

  return (
    <DashboardLayout title="Модерация экскурсий" navItems={navItems}>
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Экскурсии на модерации</h2>

          {loading ? (
            <p>Загрузка...</p>
          ) : tours.length === 0 ? (
            <p className="text-gray-600">Нет экскурсий на модерации</p>
          ) : (
            <div className="space-y-4">
              {tours.map((tour) => (
                <Link
                  key={tour.id}
                  href={`/dashboard/owner/moderation/${tour.id}`}
                  className="block p-4 border rounded hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-lg">{tour.company} - {tour.flight_number}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Категория: {tour.category.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        Дата: {new Date(tour.date).toLocaleDateString('ru-RU')} в {new Date(tour.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-sm text-gray-600">
                        Мест: {tour.max_places}
                      </div>
                      <div className="text-sm mt-2">
                        <span className="font-medium">Цены партнера:</span> Взрослый: {Number(tour.partner_min_adult_price).toFixed(2)}₽, Детский: {Number(tour.partner_min_child_price).toFixed(2)}₽
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
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
