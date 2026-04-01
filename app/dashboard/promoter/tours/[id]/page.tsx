'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

type TourDetails = {
  id: string
  company: string
  description?: string | null
  photo_urls?: unknown
}

export default function PromoterTourDetailsPage() {
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
              <h1 className="text-2xl font-bold text-white">{tour.company}</h1>
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
              <div className="pt-2">
                <Link href={`/dashboard/promoter/sales/create?tourId=${tour.id}`} className="btn-primary w-full text-center">
                  Создать продажу
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
