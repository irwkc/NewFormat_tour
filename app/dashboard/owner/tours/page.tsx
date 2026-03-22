'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'
import { customConfirm, customAlert } from '@/utils/modals'
import { getNavForRole } from '@/lib/dashboard-nav'

type OwnerFlightRow = {
  id: string
  flight_number: string
  date: string
  departure_time: string
  max_places: number
  current_booked_places: number
  is_sale_stopped: boolean
}

type OwnerTourRow = {
  id: string
  company: string
  moderation_status: 'approved' | 'pending' | 'rejected'
  category?: { name: string }
  createdBy?: { full_name?: string | null }
  flights?: OwnerFlightRow[]
}

export default function OwnerToursPage() {
  const { token, user } = useAuthStore()
  const [tours, setTours] = useState<OwnerTourRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTourId, setExpandedTourId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('approved')

  useEffect(() => {
    if (token) {
      fetchTours()
    }
  }, [token, filterStatus])

  const fetchTours = async () => {
    try {
      const url = filterStatus === 'all'
        ? '/api/tours'
        : `/api/tours?moderation_status=${filterStatus}`
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
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
    const confirmed = await customConfirm('Остановить продажи на эту экскурсию?')
    if (!confirmed) return

    try {
      const response = await fetch(`/api/tours/${tourId}/stop-sales`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (result.success) {
        fetchTours()
      } else {
        await customAlert(result.error || 'Ошибка остановки продаж')
      }
    } catch {
      await customAlert('Ошибка остановки продаж')
    }
  }

  const navItems = getNavForRole(user?.role || 'owner')

  return (
    <DashboardLayout title="Экскурсии" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Экскурсии</h2>
            <p className="text-white/70 text-sm mt-1">Управление экскурсиями</p>
          </div>
          <div className="flex gap-2">
            {(['approved', 'pending', 'rejected', 'all'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === s ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {s === 'approved' ? 'Одобренные' : s === 'pending' ? 'На модерации' : s === 'rejected' ? 'Отклонённые' : 'Все'}
              </button>
            ))}
          </div>
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
                    <th></th>
                    <th>Компания / Рейс</th>
                    <th>Дата / Время</th>
                    <th>Места</th>
                    <th>Статус</th>
                    <th>Продажи</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {tours.map((tour) => {
                    const totalMaxPlaces = tour.flights?.reduce((s, f) => s + f.max_places, 0) || 0
                    const totalBookedPlaces = tour.flights?.reduce((s, f) => s + f.current_booked_places, 0) || 0
                    const hasStoppedFlights = tour.flights?.some((f) => f.is_sale_stopped) || false
                    const allFlightsStopped = tour.flights?.every((f) => f.is_sale_stopped) || false

                    return (
                      <>
                        <tr key={tour.id}>
                          <td>
                            <button
                              type="button"
                              onClick={() => setExpandedTourId(expandedTourId === tour.id ? null : tour.id)}
                              className="text-white/70 hover:text-white text-lg"
                            >
                              {expandedTourId === tour.id ? '−' : '+'}
                            </button>
                          </td>
                          <td>
                            <div className="text-sm font-medium text-white">{tour.company}</div>
                            <div className="text-sm text-white/70">
                              {tour.category?.name ?? '—'} · Рейсов: {tour.flights?.length || 0}
                            </div>
                            {tour.createdBy?.full_name && (
                              <div className="text-xs text-white/60 mt-0.5">
                                Партнёр: {tour.createdBy.full_name}
                              </div>
                            )}
                          </td>
                          <td>
                            {tour.flights?.[0] && (
                              <>
                                <div className="text-sm text-white">
                                  {new Date(tour.flights[0].date).toLocaleDateString('ru-RU')}
                                </div>
                                <div className="text-sm text-white/70">
                                  {new Date(tour.flights[0].departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </>
                            )}
                          </td>
                          <td className="text-sm text-white/70 whitespace-nowrap">
                            {totalBookedPlaces} / {totalMaxPlaces}
                          </td>
                          <td className="whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs rounded-full border ${
                                tour.moderation_status === 'approved'
                                  ? 'bg-green-300/30 text-green-200 border-green-400/30'
                                  : tour.moderation_status === 'pending'
                                    ? 'bg-yellow-300/30 text-yellow-200 border-yellow-400/30'
                                    : 'bg-red-300/30 text-red-200 border-red-400/30'
                              }`}
                            >
                              {tour.moderation_status === 'approved' ? 'Одобрена' : tour.moderation_status === 'pending' ? 'На модерации' : 'Отклонена'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs rounded-full border ${
                                allFlightsStopped
                                  ? 'bg-red-300/30 text-red-200 border-red-400/30'
                                  : hasStoppedFlights
                                    ? 'bg-yellow-300/30 text-yellow-200 border-yellow-400/30'
                                    : 'bg-green-300/30 text-green-200 border-green-400/30'
                              }`}
                            >
                              {allFlightsStopped ? 'Остановлены' : hasStoppedFlights ? 'Частично' : 'Активны'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap text-sm space-x-2">
                            {tour.moderation_status === 'approved' && (
                              <Link
                                href={`/dashboard/owner/tours/${tour.id}`}
                                className="btn-primary text-xs px-3 py-1 inline-block"
                              >
                                Редактировать
                              </Link>
                            )}
                            {tour.moderation_status === 'pending' && (
                              <Link
                                href={`/dashboard/owner/moderation/${tour.id}`}
                                className="btn-secondary text-xs px-3 py-1 inline-block"
                              >
                                Модерация
                              </Link>
                            )}
                            {tour.moderation_status === 'approved' && !allFlightsStopped && (
                              <button
                                type="button"
                                onClick={() => handleStopSales(tour.id)}
                                className="btn-warning text-xs px-3 py-1"
                              >
                                Стоп продаж
                              </button>
                            )}
                          </td>
                        </tr>
                        {expandedTourId === tour.id && tour.flights && tour.flights.length > 0 && (
                          <tr key={`${tour.id}-flights`}>
                            <td colSpan={7} className="bg-white/5 p-4">
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-white">Рейсы</h4>
                                {tour.flights.map((flight) => (
                                  <div
                                    key={flight.id}
                                    className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-white/5 text-sm text-white/90"
                                  >
                                    <span>
                                      {flight.flight_number} · {new Date(flight.date).toLocaleDateString('ru-RU')} ·{' '}
                                      {new Date(flight.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-white/70">
                                      мест: {flight.max_places}, забронировано: {flight.current_booked_places}
                                    </span>
                                    {flight.is_sale_stopped && (
                                      <span className="px-2 py-0.5 bg-red-500/30 text-red-200 rounded text-xs">
                                        Продажи остановлены
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
