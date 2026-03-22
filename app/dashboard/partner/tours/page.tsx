'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'
import { customConfirm, customAlert } from '@/utils/modals'

type PartnerFlightRow = {
  id: string
  flight_number: string
  date: string
  departure_time: string
  max_places: number
  current_booked_places: number
  reserved_for_partner: number
  is_sale_stopped: boolean
}

type PartnerTourRow = {
  id: string
  company: string
  moderation_status: 'approved' | 'pending' | 'rejected'
  flights?: PartnerFlightRow[]
}

export default function PartnerToursPage() {
  const { token } = useAuthStore()
  const [tours, setTours] = useState<PartnerTourRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTourId, setExpandedTourId] = useState<string | null>(null)
  const [reservedInputs, setReservedInputs] = useState<Record<string, number>>({})

  // Синхронизировать reservedInputs при развороте тура (сброс при смене тура)
  useEffect(() => {
    if (!expandedTourId || !tours.length) return
    const tour = tours.find(t => t.id === expandedTourId)
    if (!tour?.flights) return
    const next: Record<string, number> = {}
    for (const f of tour.flights) {
      next[f.id] = f.reserved_for_partner ?? 0
    }
    setReservedInputs(next)
  }, [expandedTourId, tours])

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
    const confirmed = await customConfirm('Остановить продажи на эту экскурсию?')
    if (!confirmed) return

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
        await customAlert(result.error || 'Ошибка остановки продаж')
      }
    } catch (error) {
      await customAlert('Ошибка остановки продаж')
    }
  }

  const handleSetReserved = async (flightId: string, reserved: number) => {
    try {
      const response = await fetch(`/api/flights/${flightId}/reserved`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reserved }),
      })
      const result = await response.json()
      if (result.success) {
        fetchTours()
      } else {
        await customAlert(result.error || 'Ошибка')
      }
    } catch {
      await customAlert('Ошибка при обновлении резерва')
    }
  }

  const handleDelete = async (tourId: string) => {
    const confirmed = await customConfirm('Удалить экскурсию? Это действие нельзя отменить.')
    if (!confirmed) return

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
        await customAlert(result.error || 'Ошибка удаления экскурсии')
      }
    } catch (error) {
      await customAlert('Ошибка удаления экскурсии')
    }
  }

  const navItems = [
    { label: 'Мои экскурсии', href: '/dashboard/partner/tours' },
    { label: 'Проверка билетов', href: '/dashboard/partner/tickets/check' },
    { label: 'Статистика', href: '/dashboard/partner/statistics' },
    { label: 'Настройки', href: '/dashboard/partner/settings' },
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
                    <th></th>
                    <th>Компания / Рейс</th>
                    <th>Дата / Время</th>
                    <th>Места</th>
                    <th>Статус модерации</th>
                    <th>Продажи</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {tours.map((tour) => {
                    const totalMaxPlaces =
                      tour.flights?.reduce((sum, flight) => sum + flight.max_places, 0) || 0
                    const totalBookedPlaces =
                      tour.flights?.reduce((sum, flight) => sum + flight.current_booked_places, 0) || 0
                    const hasStoppedFlights =
                      tour.flights?.some((flight) => flight.is_sale_stopped) || false
                    const allFlightsStopped =
                      tour.flights?.every((flight) => flight.is_sale_stopped) || false
                    
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
                          <div className="text-sm font-medium text-white">
                            {tour.company}
                          </div>
                          <div className="text-sm text-white/70">
                            Рейсов: {tour.flights?.length || 0}
                          </div>
                        </td>
                        <td>
                          <div className="text-sm text-white">
                            {tour.flights && tour.flights.length > 0 && (
                              <>
                                {new Date(tour.flights[0].date).toLocaleDateString('ru-RU')}
                                <div className="text-sm text-white/70">
                                  {new Date(tour.flights[0].departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="text-sm text-white/70 whitespace-nowrap">
                          {totalBookedPlaces} / {totalMaxPlaces}
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
                            allFlightsStopped ? 'bg-red-300/30 text-red-200 border-red-400/30' : 
                            hasStoppedFlights ? 'bg-yellow-300/30 text-yellow-200 border-yellow-400/30' :
                            'bg-green-300/30 text-green-200 border-green-400/30'
                          }`}>
                            {allFlightsStopped ? 'Остановлены' : 
                             hasStoppedFlights ? 'Частично' :
                             'Активны'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap text-sm space-x-2">
                          {!allFlightsStopped && (
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
                      {expandedTourId === tour.id && tour.flights && tour.flights.length > 0 && (
                        <tr key={`${tour.id}-flights`}>
                          <td colSpan={7} className="bg-white/5 p-4">
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-white">Рейсы — зарезервировать на свои продажи</h4>
                              {tour.flights.map((flight: PartnerFlightRow) => {
                                const availableForReserve = flight.max_places - flight.current_booked_places
                                const currentReserved = reservedInputs[flight.id] ?? flight.reserved_for_partner ?? 0
                                return (
                                  <div key={flight.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-white/5">
                                    <span className="text-white/90 text-sm">
                                      {flight.flight_number} · {new Date(flight.date).toLocaleDateString('ru-RU')} · мест: {flight.max_places}, забронировано: {flight.current_booked_places}
                                    </span>
                                    <input
                                      type="number"
                                      min={0}
                                      max={availableForReserve}
                                      value={currentReserved}
                                      onChange={(e) => setReservedInputs((s) => ({ ...s, [flight.id]: Number(e.target.value) || 0 }))}
                                      className="input-glass w-20 text-sm"
                                    />
                                    <span className="text-white/60 text-xs">зарезервировано</span>
                                    <button
                                      type="button"
                                      onClick={() => handleSetReserved(flight.id, currentReserved)}
                                      className="btn-primary text-xs px-3 py-1"
                                    >
                                      Сохранить
                                    </button>
                                    {currentReserved > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReservedInputs((s) => ({ ...s, [flight.id]: 0 }))
                                          handleSetReserved(flight.id, 0)
                                        }}
                                        className="text-blue-400 hover:text-blue-300 text-xs"
                                      >
                                        Вернуть в оборот
                                      </button>
                                    )}
                                  </div>
                                )
                              })}
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
