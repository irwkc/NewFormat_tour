'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

type TourFlight = {
  id: string
  flight_number: string
  date: string
  departure_time: string
  duration_minutes?: number | null
  max_places: number
  current_booked_places: number
  is_sale_stopped: boolean
}

type TourDetails = {
  id: string
  company: string
  description?: string | null
  photo_urls?: unknown
  category?: { name?: string } | null
  flights?: TourFlight[]
}

function formatFlightWhen(f: TourFlight) {
  const dep = new Date(f.departure_time)
  const dateStr = new Date(f.date).toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const timeStr = dep.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return { dateStr, timeStr }
}

export default function ManagerTourDetailsPage() {
  const params = useParams<{ id: string }>()
  const { token } = useAuthStore()
  const [tour, setTour] = useState<TourDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token || !params?.id) return
    const run = async () => {
      try {
        const res = await fetch(`/api/tours/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.success) setTour(data.data)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [token, params?.id])

  return (
    <DashboardLayout title="Экскурсия">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card space-y-4">
          {loading ? (
            <div className="text-white/70">Загрузка...</div>
          ) : !tour ? (
            <div className="text-white/70">Экскурсия не найдена</div>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-bold text-white">{tour.company}</h1>
                {tour.category?.name && (
                  <p className="text-sm text-white/60 mt-1">{tour.category.name}</p>
                )}
              </div>
              {Array.isArray(tour.photo_urls) && tour.photo_urls.length > 0 && (
                <div className="space-y-3">
                  {tour.photo_urls.map((raw, idx) => {
                    const src = typeof raw === 'string' ? raw : ''
                    if (!src) return null
                    return (
                      <img
                        key={`${tour.id}-${idx}`}
                        src={src}
                        alt={`${tour.company} ${idx + 1}`}
                        className="w-full rounded-2xl border border-white/20 object-cover max-h-[420px]"
                      />
                    )
                  })}
                </div>
              )}
              {tour.description && (
                <p className="text-white/85 whitespace-pre-wrap">{tour.description}</p>
              )}

              <div className="pt-2 border-t border-white/10">
                <h2 className="text-lg font-semibold text-white mb-3">Расписание рейсов</h2>
                {!tour.flights?.length ? (
                  <p className="text-white/60 text-sm">Нет рейсов в расписании.</p>
                ) : (
                  <ul className="space-y-2 list-none p-0 m-0">
                    {tour.flights.map((f) => {
                      const { dateStr, timeStr } = formatFlightWhen(f)
                      const free = Math.max(0, f.max_places - f.current_booked_places)
                      return (
                        <li key={f.id}>
                          <div className="flex items-center gap-3 rounded-xl border border-white/15 px-4 py-3 text-sm">
                            <div className="min-w-0 flex-1">
                              <div className="text-white font-medium">
                                {dateStr} · {timeStr}
                                {f.duration_minutes != null && f.duration_minutes > 0 && (
                                  <span className="text-white/70 font-normal">
                                    {' '}
                                    ({f.duration_minutes} мин.)
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-white/80">№ {f.flight_number}</div>
                              <div className="mt-1 text-white/70 flex flex-wrap gap-x-3 gap-y-1">
                                <span>
                                  Свободно мест: {free} из {f.max_places}
                                </span>
                                {f.is_sale_stopped && (
                                  <span className="text-amber-300">Продажи остановлены</span>
                                )}
                              </div>
                            </div>
                            <Link
                              href={`/dashboard/manager/sales/create?tourId=${tour.id}&flightId=${f.id}`}
                              className="btn-primary shrink-0 px-4 py-2.5 text-sm font-semibold rounded-xl whitespace-nowrap text-center"
                            >
                              Выбрать
                            </Link>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
