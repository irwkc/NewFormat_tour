'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'

export default function PartnerToursPage() {
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

  const handleStopSales = async (tourId: string) => {
    if (!confirm('Остановить продажи на эту экскурсию?')) return

    try {
      const response = await fetch(`/api/tours/${tourId}/stop-sales`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        fetchTours()
      } else {
        alert(result.error || 'Ошибка остановки продаж')
      }
    } catch (error) {
      alert('Ошибка остановки продаж')
    }
  }

  const handleDelete = async (tourId: string) => {
    if (!confirm('Удалить экскурсию? Это действие нельзя отменить.')) return

    try {
      const response = await fetch(`/api/tours/${tourId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        fetchTours()
      } else {
        alert(result.error || 'Ошибка удаления экскурсии')
      }
    } catch (error) {
      alert('Ошибка удаления экскурсии')
    }
  }

  const navItems = [
    { label: 'Мои экскурсии', href: '/dashboard/partner/tours' },
    { label: 'Проверка билетов', href: '/dashboard/partner/tickets/check' },
    { label: 'Статистика', href: '/dashboard/partner/statistics' },
  ]

  return (
    <DashboardLayout title="Мои экскурсии" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Мои экскурсии</h2>
            <p className="text-white/70 text-sm mt-1">Управление экскурсиями</p>
          </div>
          <Link
            href="/dashboard/partner/tours/create"
            className="btn-primary"
          >
            + Создать экскурсию
          </Link>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="p-6 text-center text-white/70">Загрузка...</div>
          ) : tours.length === 0 ? (
            <div className="p-6 text-center text-white/70">Нет экскурсий</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Компания / Рейс</th>
                    <th>Дата / Время</th>
                    <th>Места</th>
                    <th>Статус модерации</th>
                    <th>Продажи</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {tours.map((tour) => (
                    <tr key={tour.id}>
                      <td>
                        <div className="text-sm font-medium text-white">
                          {tour.company}
                        </div>
                        <div className="text-sm text-white/70">
                          {tour.flight_number}
                        </div>
                      </td>
                      <td>
                        <div className="text-sm text-white">
                          {new Date(tour.date).toLocaleDateString('ru-RU')}
                        </div>
                        <div className="text-sm text-white/70">
                          {new Date(tour.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="text-sm text-white/70 whitespace-nowrap">
                        {tour.current_booked_places} / {tour.max_places}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full border ${
                          tour.moderation_status === 'approved' ? 'bg-green-300/30 text-green-200 border-green-400/30' :
                          tour.moderation_status === 'pending' ? 'bg-yellow-300/30 text-yellow-200 border-yellow-400/30' :
                          'bg-red-300/30 text-red-200 border-red-400/30'
                        }`}>
                          {tour.moderation_status === 'approved' ? 'Одобрена' :
                           tour.moderation_status === 'pending' ? 'На модерации' :
                           'Отклонена'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full border ${
                          tour.is_sale_stopped ? 'bg-red-300/30 text-red-200 border-red-400/30' : 'bg-green-300/30 text-green-200 border-green-400/30'
                        }`}>
                          {tour.is_sale_stopped ? 'Остановлены' : 'Активны'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-sm space-x-2">
                        {!tour.is_sale_stopped && (
                          <button
                            onClick={() => handleStopSales(tour.id)}
                            className="btn-warning text-xs px-3 py-1"
                          >
                            Остановить
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(tour.id)}
                          className="btn-danger text-xs px-3 py-1"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
