'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'
import { customConfirm, customAlert } from '@/utils/modals'
import { RoleOnboardingOverlay } from '@/components/Onboarding/RoleOnboardingOverlay'
import { getNavForRole } from '@/lib/dashboard-nav'

type PartnerFlightRow = {
  id: string
  flight_number: string
  date: string
  departure_time: string
  max_places: number
  current_booked_places: number
  is_sale_stopped: boolean
}

type PartnerTourRow = {
  id: string
  company: string
  moderation_status: 'approved' | 'pending' | 'rejected'
  flights?: PartnerFlightRow[]
}

type PartnerStats = {
  sales?: { total: number; revenue: number }
  tickets?: { total: number; used: number }
}

export default function PartnerDashboard() {
  const { token, user } = useAuthStore()
  const [tours, setTours] = useState<PartnerTourRow[]>([])
  const [stats, setStats] = useState<PartnerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [expandedTourId, setExpandedTourId] = useState<string | null>(null)
  const [addPlacesInputs, setAddPlacesInputs] = useState<Record<string, number>>({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.localStorage.getItem('nf_onboarding_partner_seen')) setShowOnboarding(true)
  }, [])

  useEffect(() => {
    if (token && user) {
      Promise.all([
        fetch('/api/tours', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch(`/api/statistics/by-partner/${user.id}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      ]).then(([toursRes, statsRes]) => {
        if (toursRes.success) setTours(toursRes.data)
        if (statsRes.success) setStats(statsRes.data)
      }).catch(console.error).finally(() => setLoading(false))
    }
  }, [token, user])

  const finishOnboarding = () => {
    if (typeof window !== 'undefined') window.localStorage.setItem('nf_onboarding_partner_seen', '1')
    setShowOnboarding(false)
  }

  const fetchTours = () => {
    if (!token) return
    fetch('/api/tours', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.success && setTours(d.data))
  }

  const handleFlightStopSales = async (flightId: string, stop: boolean) => {
    try {
      const r = await fetch(`/api/flights/${flightId}/stop-sales`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_sale_stopped: stop }),
      })
      const d = await r.json()
      if (d.success) fetchTours()
      else await customAlert(d.error || 'Ошибка')
    } catch {
      await customAlert('Ошибка')
    }
  }

  const handleAddPlaces = async (flightId: string, addPlaces: number) => {
    if (addPlaces < 1) {
      await customAlert('Укажите количество мест для добавления')
      return
    }
    try {
      const r = await fetch(`/api/flights/${flightId}/places`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ add_places: addPlaces }),
      })
      const d = await r.json()
      if (d.success) {
        setAddPlacesInputs((s) => ({ ...s, [flightId]: 0 }))
        fetchTours()
      } else {
        await customAlert(d.error || 'Ошибка')
      }
    } catch {
      await customAlert('Ошибка при добавлении мест')
    }
  }

  const handleDelete = async (tourId: string) => {
    const confirmed = await customConfirm('Удалить экскурсию? Это действие нельзя отменить.')
    if (!confirmed) return
    try {
      const r = await fetch(`/api/tours/${tourId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await r.json()
      if (d.success) fetchTours()
      else await customAlert(d.error || 'Ошибка удаления экскурсии')
    } catch {
      await customAlert('Ошибка удаления экскурсии')
    }
  }

  const handleExport = async () => {
    try {
      const r = await fetch('/api/statistics/export', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.ok) {
        const blob = await r.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `statistics-partner-${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const d = await r.json()
        await customAlert(d.error || 'Ошибка экспорта')
      }
    } catch {
      await customAlert('Ошибка экспорта статистики')
    }
  }

  const navItems = getNavForRole(user?.role || 'partner')

  return (
    <DashboardLayout title="Панель партнёра" navItems={navItems}>
      {showOnboarding && (
        <RoleOnboardingOverlay role="partner" onFinish={finishOnboarding} />
      )}
      <div className="space-y-6">
        {/* Статистика */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-w-0">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-1 text-white/70">Всего продаж</h3>
            <div className="text-2xl font-bold text-purple-300">
              {stats?.sales?.total ?? (loading ? '—' : 0)}
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-1 text-white/70">Общая сумма</h3>
            <div className="text-2xl font-bold text-green-300">
              {stats ? Number(stats.sales?.revenue || 0).toFixed(2) : loading ? '—' : '0.00'}₽
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-1 text-white/70">Всего мест</h3>
            <div className="text-2xl font-bold text-blue-300">
              {stats?.tickets?.total ?? (loading ? '—' : 0)}
            </div>
          </div>
          </div>
          <button onClick={handleExport} className="btn-success shrink-0">
            Экспорт в Excel
          </button>
        </div>

        {/* Экскурсии */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Мои экскурсии</h2>
            <p className="text-white/70 text-sm mt-1">Управление экскурсиями</p>
          </div>
          <Link href="/dashboard/partner/tours/create" className="btn-primary">
            + Создать экскурсию
          </Link>
        </div>

        <div className="table-container">
          {loading && tours.length === 0 ? (
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
                            <div className="text-sm text-white/70">Рейсов: {tour.flights?.length || 0}</div>
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
                          <td>
                            <span
                              className={`px-2 py-1 text-xs rounded-full border ${
                                !tour.flights?.length
                                  ? 'bg-white/20 text-white/80 border-white/30'
                                  : tour.moderation_status === 'approved'
                                    ? 'bg-green-300/30 text-green-200 border-green-400/30'
                                    : tour.moderation_status === 'pending'
                                      ? 'bg-yellow-300/30 text-yellow-200 border-yellow-400/30'
                                      : 'bg-red-300/30 text-red-200 border-red-400/30'
                              }`}
                            >
                              {!tour.flights?.length
                                ? 'Нет рейсов'
                                : tour.moderation_status === 'approved'
                                  ? 'Одобрена'
                                  : tour.moderation_status === 'pending'
                                    ? 'На модерации'
                                    : 'Отклонена'}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`px-2 py-1 text-xs rounded-full border ${
                                !tour.flights?.length
                                  ? 'bg-white/10 text-white/50 border-white/20'
                                  : allFlightsStopped
                                    ? 'bg-red-300/30 text-red-200 border-red-400/30'
                                    : hasStoppedFlights
                                      ? 'bg-yellow-300/30 text-yellow-200 border-yellow-400/30'
                                      : 'bg-green-300/30 text-green-200 border-green-400/30'
                              }`}
                            >
                              {!tour.flights?.length ? '—' : allFlightsStopped ? 'Остановлены' : hasStoppedFlights ? 'Частично' : 'Активны'}
                            </span>
                          </td>
                          <td className="text-sm space-x-2">
                            <Link
                              href={`/dashboard/partner/tours/${tour.id}/edit`}
                              className="btn-secondary text-xs px-3 py-1 inline-block"
                            >
                              Редактировать
                            </Link>
                            <button
                              type="button"
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
                                <h4 className="text-sm font-semibold text-white">Рейсы — добавить места</h4>
                                {tour.flights.map((flight) => {
                                  const addPlaces = addPlacesInputs[flight.id] ?? 0
                                  return (
                                    <div key={flight.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-white/5">
                                      <span className="text-white/90 text-sm flex-1 min-w-[200px]">
                                        {flight.flight_number} · {new Date(flight.date).toLocaleDateString('ru-RU')} · мест: {flight.max_places}, забронировано: {flight.current_booked_places}
                                      </span>
                                      <input
                                        type="number"
                                        min={1}
                                        placeholder="+ мест"
                                        value={addPlaces || ''}
                                        onChange={(e) => setAddPlacesInputs((s) => ({
                                          ...s,
                                          [flight.id]: Math.max(0, Number(e.target.value) || 0),
                                        }))}
                                        className="input-glass w-28 min-w-[7rem] text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleAddPlaces(flight.id, addPlaces)}
                                        className="btn-primary text-xs px-3 py-1"
                                        disabled={addPlaces < 1}
                                      >
                                        Добавить
                                      </button>
                                      {flight.is_sale_stopped ? (
                                        <button
                                          type="button"
                                          onClick={() => handleFlightStopSales(flight.id, false)}
                                          className="btn-secondary text-xs px-3 py-1"
                                        >
                                          Возобновить
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleFlightStopSales(flight.id, true)}
                                          className="btn-warning text-xs px-3 py-1"
                                        >
                                          Остановить рейс
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
