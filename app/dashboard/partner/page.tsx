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
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <Link
            href="/dashboard/partner/tours/create"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Создать экскурсию
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Мои экскурсии</h2>
          {loading ? (
            <p>Загрузка...</p>
          ) : (
            <div className="space-y-2">
              {tours.map((tour) => (
                <Link
                  key={tour.id}
                  href={`/dashboard/partner/tours/${tour.id}`}
                  className="block p-4 border rounded hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{tour.company} - {tour.flight_number}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(tour.date).toLocaleDateString('ru-RU')} {new Date(tour.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-sm">
                        Статус модерации: 
                        <span className={`ml-2 px-2 py-1 rounded ${
                          tour.moderation_status === 'approved' ? 'bg-green-100 text-green-800' :
                          tour.moderation_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
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
