'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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

const requiredNumber = z.preprocess((v) => Number(v), z.number().positive())

const createSaleSchema = z.object({
  tour_id: z.string().uuid(),
  flight_id: z.string().uuid(),
  adult_count: z.number().int().positive(),
  child_count: z.number().int().min(0).default(0),
  concession_count: z.number().int().min(0).default(0),
  adult_price: requiredNumber,
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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateSaleFormData>({
    resolver: zodResolver(createSaleSchema),
    defaultValues: {
      child_count: 0,
      concession_count: 0,
      payment_method: 'online_yookassa',
    },
  })

  const selectedTourId = watch('tour_id')
  const selectedFlightId = watch('flight_id')
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
    if (selectedTourId) {
      const tour = tours.find(t => t.id === selectedTourId)
      setSelectedTour(tour || null)
      setValue('flight_id', '' as any, { shouldValidate: false })
    } else {
      setSelectedTour(null)
      setValue('flight_id', '' as any, { shouldValidate: false })
    }
  }, [selectedTourId, tours])

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
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        setTours(data.data)
      }
    } catch (error) {
      console.error('Error fetching tours:', error)
    }
  }

  const onSubmit = async (data: CreateSaleFormData) => {
    try {
      setError(null)
      setLoading(true)

      const payload = {
        ...data,
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
    const minAdult = Number(selectedTour.owner_min_adult_price ?? selectedTour.partner_min_adult_price ?? 0)
    const minChild = Number(selectedTour.owner_min_child_price ?? selectedTour.partner_min_child_price ?? 0)
    const minConcession = Number(selectedTour.owner_min_concession_price ?? selectedTour.partner_min_concession_price ?? 0)
    return { minAdult, minChild, minConcession }
  }, [selectedTour])

  return (
    <DashboardLayout title="Создание продажи" navItems={navItems}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-6 text-white">Создать продажу</h2>

          {!qrCode ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-white/90">
                    Экскурсия *
                  </label>
                  {errors.tour_id && (
                    <p className="text-red-300 text-xs">{errors.tour_id.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tours.map((tour) => {
                    const isSelected = selectedTourId === tour.id
                    const firstFlight = tour.flights?.[0]
                    const flightsCount = tour.flights?.length || 0
                    return (
                      <button
                        key={tour.id}
                        type="button"
                        onClick={() => setValue('tour_id', tour.id, { shouldValidate: true })}
                        className={`text-left glass rounded-2xl p-4 border transition-all ${
                          isSelected ? 'border-white/60 bg-white/10' : 'border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex gap-3">
                          <img
                            src="/logo.png"
                            alt="tour"
                            className="w-12 h-12 rounded-xl bg-white/10 object-contain p-2"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-white font-semibold truncate">{tour.company}</div>
                            <div className="text-xs text-white/70 truncate">{tour.category?.name || ''}</div>
                            <div className="text-xs text-white/70 mt-1">
                              Рейсов: {flightsCount}
                              {firstFlight && (
                                <> · Ближайший: {new Date(firstFlight.date).toLocaleDateString('ru-RU')} {new Date(firstFlight.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* скрытое поле для react-hook-form */}
                <input type="hidden" {...register('tour_id')} />
              </div>

              {selectedTour && selectedTour.flights && selectedTour.flights.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-white/90">
                      Рейс (время посадки) *
                    </label>
                    {errors.flight_id && (
                      <p className="text-red-300 text-xs">{errors.flight_id.message}</p>
                    )}
                  </div>

                  <select
                    {...register('flight_id')}
                    className="input-glass"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Выберите рейс
                    </option>
                    {selectedTour.flights
                      .filter((flight: any) => {
                        const reserved = flight.reserved_for_partner ?? 0
                        const available = flight.max_places - flight.current_booked_places - reserved
                        return !flight.is_sale_stopped && available > 0
                      })
                      .map((flight: any) => {
                        const reserved = flight.reserved_for_partner ?? 0
                        const availablePlaces = flight.max_places - flight.current_booked_places - reserved
                        const dateStr = new Date(flight.date).toLocaleDateString('ru-RU')
                        const timeStr = new Date(flight.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                        return (
                          <option key={flight.id} value={flight.id}>
                            {flight.flight_number} · {dateStr} {timeStr} · свободно {availablePlaces}
                          </option>
                        )
                      })}
                  </select>

                  {selectedFlight?.boarding_location_url && (
                    <a
                      className="inline-block mt-2 text-sm text-blue-300 hover:text-blue-200 underline"
                      href={selectedFlight.boarding_location_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Точка посадки на карте
                    </a>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Количество взрослых *
                  </label>
                  <input
                    {...register('adult_count', { valueAsNumber: true })}
                    type="number"
                    min="1"
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
                    Цена взрослого билета (₽) *
                  </label>
                  <input
                    {...register('adult_price', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-glass"
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
                  <option value="online_yookassa">Онлайн (ЮКасса)</option>
                  <option value="acquiring">Эквайринг</option>
                </select>
                {errors.payment_method && (
                  <p className="text-red-300 text-xs mt-1">{errors.payment_method.message}</p>
                )}
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