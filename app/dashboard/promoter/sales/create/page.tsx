'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import QRCode from 'qrcode'
import { customAlert } from '@/utils/modals'

type CreateSaleFlight = {
  id: string
  flight_number: string
  date: string
  departure_time: string
  max_places: number
  current_booked_places: number
  is_sale_stopped: boolean
  boarding_location_url?: string | null
  partner_min_adult_price?: number | string | null
  partner_min_child_price?: number | string | null
  partner_min_concession_price?: number | string | null
}

type CreateSaleTour = {
  id: string
  company: string
  category?: { name: string }
  flights?: CreateSaleFlight[]
  owner_min_adult_price?: number | string | null
  owner_min_child_price?: number | string | null
  owner_min_concession_price?: number | string | null
  partner_min_adult_price?: number | string | null
  partner_min_child_price?: number | string | null
  partner_min_concession_price?: number | string | null
}

const optionalNumber = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return undefined
  if (typeof v === 'number' && Number.isNaN(v)) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}, z.number().positive().optional())

const nonNegativeNumber = z.preprocess((v) => Number(v), z.number().min(0))

const createSaleSchema = z.object({
  tour_id: z.string().uuid(),
  flight_id: z.string().uuid(),
  adult_count: z.number().int().min(0),
  child_count: z.number().int().min(0).default(0),
  concession_count: z.number().int().min(0).default(0),
  adult_price: nonNegativeNumber,
  child_price: optionalNumber,
  concession_price: optionalNumber,
  payment_method: z.enum(['online_yookassa', 'acquiring']),
}).refine((data) => {
  if (data.child_count > 0) return data.child_price !== undefined
  return true
}, {
  message: 'Укажите цену детского билета',
  path: ['child_price'],
}).refine((data) => {
  if (data.concession_count > 0) return data.concession_price !== undefined
  return true
}, {
  message: 'Укажите цену льготного билета',
  path: ['concession_price'],
}).refine(
  (data) =>
    data.adult_count + data.child_count + (data.concession_count || 0) >= 1,
  {
    message: 'Укажите хотя бы один билет (взрослый, детский или льготный)',
    path: ['adult_count'],
  }
).refine((data) => data.adult_count === 0 || data.adult_price > 0, {
  message: 'Укажите цену взрослого билета',
  path: ['adult_price'],
})

type CreateSaleFormData = z.infer<typeof createSaleSchema>

export default function CreateSalePage() {
  const router = useRouter()
  const { token } = useAuthStore()
  const [tours, setTours] = useState<CreateSaleTour[]>([])
  const [selectedTour, setSelectedTour] = useState<CreateSaleTour | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [paymentLink, setPaymentLink] = useState<string | null>(null)
  const [toursLoaded, setToursLoaded] = useState(false)
  const [tourIdFromUrl, setTourIdFromUrl] = useState<string | null>(null)
  const [flightIdFromUrl, setFlightIdFromUrl] = useState<string | null>(null)
  const prevTourIdFromFormRef = useRef<string | undefined>(undefined)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateSaleFormData>({
    resolver: zodResolver(createSaleSchema),
    defaultValues: {
      adult_count: 1,
      child_count: 0,
      concession_count: 0,
      payment_method: 'acquiring',
    },
  })

  const selectedTourId = watch('tour_id')
  const selectedFlightId = watch('flight_id')
  const adultCount = watch('adult_count')
  const childCount = watch('child_count')
  const concessionCount = watch('concession_count')
  const paymentMethod = watch('payment_method')

  const selectedFlight = useMemo(() => {
    if (!selectedTour || !selectedFlightId) return null
    return selectedTour.flights?.find((f) => f.id === selectedFlightId) || null
  }, [selectedTour, selectedFlightId])

  useEffect(() => {
    fetchTours()
  }, [token])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const q = new URLSearchParams(window.location.search)
    const tid = q.get('tourId')
    const fid = q.get('flightId')
    setTourIdFromUrl(tid && /^[0-9a-f-]{36}$/i.test(tid) ? tid : null)
    setFlightIdFromUrl(fid && /^[0-9a-f-]{36}$/i.test(fid) ? fid : null)
  }, [])

  useEffect(() => {
    if (!tourIdFromUrl || !tours.length) return
    const t = tours.find((x) => x.id === tourIdFromUrl)
    if (!t) return
    setValue('tour_id', tourIdFromUrl, { shouldValidate: true })
    if (flightIdFromUrl && t.flights?.some((f) => f.id === flightIdFromUrl)) {
      setValue('flight_id', flightIdFromUrl, { shouldValidate: true })
    }
  }, [tours, tourIdFromUrl, flightIdFromUrl, setValue])

  useEffect(() => {
    if (selectedTourId) {
      const tour = tours.find((t) => t.id === selectedTourId)
      setSelectedTour(tour || null)
      if (
        prevTourIdFromFormRef.current !== undefined &&
        prevTourIdFromFormRef.current !== selectedTourId
      ) {
        setValue('flight_id', '' as any, { shouldValidate: false })
      }
      prevTourIdFromFormRef.current = selectedTourId
    } else {
      setSelectedTour(null)
      const waitingFromUrl = Boolean(tourIdFromUrl && flightIdFromUrl)
      if (!waitingFromUrl) {
        setValue('flight_id', '' as any, { shouldValidate: false })
      }
      prevTourIdFromFormRef.current = undefined
    }
  }, [selectedTourId, tours, setValue, tourIdFromUrl, flightIdFromUrl])

  useEffect(() => {
    if (!adultCount) setValue('adult_price', 0, { shouldValidate: true })
  }, [adultCount, setValue])

  useEffect(() => {
    if (!childCount) {
      setValue('child_price', undefined, { shouldValidate: true })
    }
  }, [childCount, setValue])

  useEffect(() => {
    if (!concessionCount) {
      setValue('concession_price', undefined, { shouldValidate: true })
    }
  }, [concessionCount, setValue])

  const fetchTours = async () => {
    try {
      const response = await fetch('/api/tours?moderation_status=approved', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      let list: CreateSaleTour[] = data.success ? data.data : []

      // Список /api/tours для промоутера/менеджера режет рейсы (напр. только is_moderated).
      // Страница экскурсии берёт /api/tours/:id — без этого фильтра. Подмешиваем деталь,
      // иначе выбранный рейс не попадает в flights и форма не открывается.
      if (typeof window !== 'undefined') {
        const q = new URLSearchParams(window.location.search)
        const tid = q.get('tourId')
        const fid = q.get('flightId')
        const tidOk = tid && /^[0-9a-f-]{36}$/i.test(tid)
        const fidOk = fid && /^[0-9a-f-]{36}$/i.test(fid)
        if (tidOk && token) {
          const existing = list.find((t) => t.id === tid)
          const flightMissing =
            fidOk && existing && !existing.flights?.some((f) => f.id === fid)
          const needDetail = !existing || flightMissing
          if (needDetail) {
            const detailRes = await fetch(`/api/tours/${tid}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            const detailJson = await detailRes.json()
            if (detailJson.success && detailJson.data) {
              const d = detailJson.data as CreateSaleTour
              const idx = list.findIndex((t) => t.id === d.id)
              if (idx >= 0) {
                list = [...list]
                list[idx] = d
              } else {
                list = [...list, d]
              }
            }
          }
        }
      }

      setTours(list)
    } catch (error) {
      console.error('Error fetching tours:', error)
    } finally {
      setToursLoaded(true)
    }
  }

  const onSubmit = async (data: CreateSaleFormData) => {
    try {
      setError(null)
      setLoading(true)

      const payload = {
        ...data,
        adult_price: data.adult_count > 0 ? data.adult_price : 0,
        child_price: data.child_count > 0 ? data.child_price : undefined,
        concession_price: data.concession_count > 0 ? data.concession_price : undefined,
      }

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...payload,
          payment_method: data.payment_method,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Ошибка создания продажи')
        setLoading(false)
        return
      }

      if (data.payment_method === 'acquiring') {
        router.push(`/dashboard/promoter/sales/create/acquiring-receipt?sale_id=${result.data.id}`)
        setLoading(false)
        return
      }

      const paymentResponse = await fetch(`/api/sales/${result.data.id}/create-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const paymentResult = await paymentResponse.json()
      if (paymentResult.success) {
        setQrCode(paymentResult.data.qr_code)
        setPaymentLink(paymentResult.data.payment_link_url)
      } else {
        setError(paymentResult.error || 'Ошибка создания платежа')
      }
    } catch (err) {
      setError('Ошибка при создании продажи')
    } finally {
      setLoading(false)
    }
  }

  const navItems = [
    { label: 'Продажи', href: '/dashboard/promoter/sales' },
    { label: 'История баланса', href: '/dashboard/promoter/balance-history' },
    { label: 'Выданные вещи', href: '/dashboard/promoter/issued-items' },
    { label: 'Реферальная программа', href: '/dashboard/promoter/invitations' },
  ]

  const minPrices = useMemo(() => {
    if (!selectedTour) return null
    const flightAdult = selectedFlight?.partner_min_adult_price != null ? Number(selectedFlight.partner_min_adult_price) : null
    const flightChild = selectedFlight?.partner_min_child_price != null ? Number(selectedFlight.partner_min_child_price) : null
    const flightConcession = selectedFlight?.partner_min_concession_price != null ? Number(selectedFlight.partner_min_concession_price) : null
    const minAdult = Number(selectedTour.owner_min_adult_price ?? flightAdult ?? selectedTour.partner_min_adult_price ?? 0)
    const minChild = Number(selectedTour.owner_min_child_price ?? flightChild ?? selectedTour.partner_min_child_price ?? 0)
    const minConcession = Number(selectedTour.owner_min_concession_price ?? flightConcession ?? selectedTour.partner_min_concession_price ?? 0)
    return { minAdult, minChild, minConcession }
  }, [selectedTour, selectedFlight])

  const flightNotInTour =
    toursLoaded &&
    Boolean(tourIdFromUrl && flightIdFromUrl && selectedTour) &&
    !selectedTour?.flights?.some((f) => f.id === flightIdFromUrl)

  return (
    <DashboardLayout title="Создание продажи" navItems={navItems}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-6 text-white">Создать продажу</h2>

          {!qrCode ? (
            <>
              {!toursLoaded ? (
                <div className="text-white/70 py-8 text-center">Загрузка...</div>
              ) : tourIdFromUrl && !flightIdFromUrl ? (
                <div className="text-white/80 space-y-4">
                  <p>Выберите рейс на странице экскурсии.</p>
                  <Link href={`/dashboard/promoter/tours/${tourIdFromUrl}`} className="btn-primary inline-block">
                    К экскурсии
                  </Link>
                </div>
              ) : flightNotInTour ? (
                <div className="text-white/80 space-y-4">
                  <p>Выбранный рейс недоступен или ссылка устарела.</p>
                  <Link href="/dashboard/promoter" className="btn-primary inline-block">
                    На главную
                  </Link>
                </div>
              ) : !selectedTour || !selectedFlight ? (
                <div className="text-white/80 space-y-4">
                  <p>Откройте экскурсию на главной и нажмите «Выбрать» у нужного рейса.</p>
                  <Link href="/dashboard/promoter" className="btn-primary inline-block">
                    На главную
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="rounded-xl border border-white/15 p-4 space-y-2 text-sm mb-2">
                    <div className="text-lg font-semibold text-white">{selectedTour.company}</div>
                    {selectedTour.category?.name && (
                      <p className="text-white/60 text-sm">{selectedTour.category.name}</p>
                    )}
                    <div className="pt-2 border-t border-white/10">
                      <div className="text-white font-medium">
                        {new Date(selectedFlight.date).toLocaleDateString('ru-RU', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                        {' · '}
                        {new Date(selectedFlight.departure_time).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="mt-1 text-white/80">№ {selectedFlight.flight_number}</div>
                      <div className="mt-1 text-white/70">
                        Свободно мест:{' '}
                        {Math.max(0, selectedFlight.max_places - selectedFlight.current_booked_places)} из{' '}
                        {selectedFlight.max_places}
                        {selectedFlight.is_sale_stopped && (
                          <span className="text-amber-300 ml-2">Продажи остановлены</span>
                        )}
                      </div>
                    </div>
                    {selectedFlight.boarding_location_url && (
                      <a
                        className="inline-block text-sm text-blue-300 hover:text-blue-200 underline"
                        href={selectedFlight.boarding_location_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Точка посадки на карте
                      </a>
                    )}
                  </div>
                  <input type="hidden" {...register('tour_id')} />
                  <input type="hidden" {...register('flight_id')} />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Количество взрослых
                  </label>
                  <input
                    {...register('adult_count', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="input-glass"
                  />
                  {errors.adult_count && (
                    <p className="text-red-300 text-xs mt-1">{errors.adult_count.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Количество детских
                  </label>
                  <input
                    {...register('child_count', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="input-glass"
                  />
                  {errors.child_count && (
                    <p className="text-red-300 text-xs mt-1">{errors.child_count.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Количество льготных
                  </label>
                  <input
                    {...register('concession_count', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="input-glass"
                  />
                  {errors.concession_count && (
                    <p className="text-red-300 text-xs mt-1">{errors.concession_count.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Цена взрослого билета (₽){adultCount > 0 ? ' *' : ''}
                  </label>
                  <input
                    {...register('adult_price', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-glass"
                    disabled={!adultCount}
                    placeholder={minPrices ? `мин. ${minPrices.minAdult.toFixed(2)}` : undefined}
                  />
                  {errors.adult_price && (
                    <p className="text-red-300 text-xs mt-1">{errors.adult_price.message}</p>
                  )}
                </div>

                {childCount > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Цена детского билета (₽) *
                    </label>
                    <input
                      {...register('child_price', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-glass"
                      placeholder={minPrices ? `мин. ${minPrices.minChild.toFixed(2)}` : undefined}
                    />
                    {errors.child_price && (
                      <p className="text-red-300 text-xs mt-1">{errors.child_price.message}</p>
                    )}
                  </div>
                ) : (
                  <div className="opacity-60">
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Цена детского билета (₽)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-glass"
                      disabled
                      value=""
                      placeholder="0 детских"
                      readOnly
                    />
                  </div>
                )}

                {concessionCount > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Цена льготного билета (₽) *
                    </label>
                    <input
                      {...register('concession_price', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-glass"
                      placeholder={minPrices?.minConcession ? `мин. ${minPrices.minConcession.toFixed(2)}` : undefined}
                    />
                    {errors.concession_price && (
                      <p className="text-red-300 text-xs mt-1">{errors.concession_price.message}</p>
                    )}
                  </div>
                ) : (
                  <div className="opacity-60">
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Цена льготного билета (₽)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-glass"
                      disabled
                      value=""
                      placeholder="0 льготных"
                      readOnly
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Способ оплаты *
                </label>
                <select
                  {...register('payment_method')}
                  className="input-glass"
                >
                  <option value="online_yookassa" disabled>QR (временно недоступно)</option>
                  <option value="acquiring">Эквайринг</option>
                </select>
                {errors.payment_method && (
                  <p className="text-red-300 text-xs mt-1">{errors.payment_method.message}</p>
                )}
                <p className="text-xs text-white/60 mt-2">
                  На данный момент продажа через QR недоступна.
                </p>
              </div>

              {error && (
                <div className="alert-error">
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Создание...' : 'Создать продажу'}
              </button>
                </form>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-4 text-white">Продажа создана!</h3>
                <p className="mb-4 text-white/70">Покажите клиенту QR код или отправьте ссылку:</p>
                <div className="mb-4">
                  <img src={qrCode} alt="QR Code" className="mx-auto max-w-xs rounded-2xl" />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Ссылка для оплаты:
                  </label>
                  <input
                    type="text"
                    value={paymentLink || ''}
                    readOnly
                    className="input-glass"
                  />
                  <button
                    onClick={async () => {
                      navigator.clipboard.writeText(paymentLink || '')
                      await customAlert('Ссылка скопирована!')
                    }}
                    className="mt-2 text-sm text-white/80 hover:text-white transition-colors"
                  >
                    Копировать ссылку
                  </button>
                </div>
                <button
                  onClick={() => router.push('/dashboard/promoter/sales')}
                  className="btn-primary w-full"
                >
                  Вернуться к продажам
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}