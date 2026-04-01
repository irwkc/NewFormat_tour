'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { isFlightStarted } from '@/lib/moscow-time'

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
        const res = await fetch(`/api/tours/${params.id}?full_schedule=1`, {
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
      <div className="max-w-4xl mx-auto space-y-6">
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
                  <ul className="space-y-2">
                    {tour.flights.map((f) => {
                      const started = isFlightStarted(new Date(f.departure_time))
                      const { dateStr, timeStr } = formatFlightWhen(f)
                      const free = Math.max(0, f.max_places - f.current_booked_places)
                      return (
                        <li
                          key={f.id}
                          className={`rounded-xl border border-white/15 px-4 py-3 text-sm ${
                            started ? 'opacity-60' : ''
                          }`}
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-white font-medium">
                              {dateStr} · {timeStr}
                              {f.duration_minutes != null && f.duration_minutes > 0 && (
                                <span className="text-white/70 font-normal">
                                  {' '}
                                  ({f.duration_minutes} мин.)
                                </span>
                              )}
                            </span>
                            <span className="text-white/80">№ {f.flight_number}</span>
                          </div>
                          <div className="mt-1 text-white/70 flex flex-wrap gap-x-3 gap-y-1">
                            <span>
                              Свободно мест: {free} из {f.max_places}
                            </span>
                            {f.is_sale_stopped && !started && (
                              <span className="text-amber-300">Продажи остановлены</span>
                            )}
                            {started && <span className="text-white/50">Рейс завершён</span>}
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

        {!loading && tour && (
          <Link
            href={`/dashboard/manager/sales/create?tourId=${tour.id}`}
            className="btn-primary w-full block text-center py-5 text-lg md:text-xl font-bold rounded-2xl"
          >
            Продать
          </Link>
        )}
      </div>
    </DashboardLayout>
  )
}
