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
  duration_minutes?: number | null
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

type PromoterInfo = {
  exists: boolean
  full_name?: string
  user_id?: string
}

const optionalNumber = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return undefined
  if (typeof v === 'number' && Number.isNaN(v)) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}, z.number().positive().optional())

const requiredNumber = z.preprocess((v) => Number(v), z.number().positive())

const optionalPositiveInt = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return undefined
  if (typeof v === 'number' && Number.isNaN(v)) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}, z.number().int().positive().optional())

const optionalManagerPct = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}, z.number().min(0).max(100).optional())

const createSaleSchema = z.object({
  tour_id: z.string().uuid(),
  flight_id: z.string().uuid(),
  adult_count: z.number().int().positive(),
  child_count: z.number().int().min(0).default(0),
  concession_count: z.number().int().min(0).default(0),
  adult_price: requiredNumber,
  child_price: optionalNumber,
  concession_price: optionalNumber,
  payment_method: z.enum(['online_yookassa', 'cash', 'acquiring']),
  promoter_user_id: z.string().uuid().optional(),
  manager_commission_percent_of_ticket: optionalManagerPct,
  promoter_id: optionalPositiveInt,
  ticket_number: z.string().regex(/^[A-Z]{2}\d{8}$/).optional(),
  ticket_photo: z.any().optional(),
  receipt_photo: z.any().optional(),
}).refine((data) => {
  if (data.child_count > 0) return data.child_price !== undefined
  return true
}, { message: 'Укажите цену детского билета', path: ['child_price'] })
  .refine((data) => {
    if (data.concession_count > 0) return data.concession_price !== undefined
    return true
  }, { message: 'Укажите цену льготного билета', path: ['concession_price'] })
  .refine(
    (data) => {
      const needs =
        Boolean(data.promoter_user_id) &&
        (data.payment_method === 'cash' || data.payment_method === 'acquiring')
      if (!needs) return true
      return (
        data.manager_commission_percent_of_ticket !== undefined &&
        data.manager_commission_percent_of_ticket !== null
      )
    },
    {
      message: 'Укажите процент менеджера от суммы билетов',
      path: ['manager_commission_percent_of_ticket'],
    }
  )

type CreateSaleFormData = z.infer<typeof createSaleSchema>

export default function CreateSalePage() {
  const router = useRouter()
  const { token } = useAuthStore()
  const [tours, setTours] = useState<CreateSaleTour[]>([])
  const [selectedTour, setSelectedTour] = useState<CreateSaleTour | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [promoterInfo, setPromoterInfo] = useState<PromoterInfo | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [paymentLink, setPaymentLink] = useState<string | null>(null)
  const [toursLoaded, setToursLoaded] = useState(false)
  const [tourIdFromUrl, setTourIdFromUrl] = useState<string | null>(null)
  const [flightIdFromUrl, setFlightIdFromUrl] = useState<string | null>(null)
  const prevTourIdFromFormRef = useRef<string | undefined>(undefined)
  const [saleId, setSaleId] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [ownerMaxManagerPercent, setOwnerMaxManagerPercent] = useState<number | null>(null)

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
      payment_method: 'cash',
    },
  })

  const paymentMethod = watch('payment_method')
  const promoterUserIdWatch = watch('promoter_user_id')
  const promoterId = watch('promoter_id')
  const selectedTourId = watch('tour_id')
  const selectedFlightId = watch('flight_id')
  const childCount = watch('child_count')
  const concessionCount = watch('concession_count')

  const selectedFlight = useMemo(() => {
    if (!selectedTour || !selectedFlightId) return null
    return selectedTour.flights?.find((f) => f.id === selectedFlightId) || null
  }, [selectedTour, selectedFlightId])

  useEffect(() => {
    fetchTours()
  }, [token])

  useEffect(() => {
    if (!token) return
    const load = async () => {
      try {
        const res = await fetch('/api/app-settings', {
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
        })
        const j = await res.json()
        if (j.success && j.data) {
          setOwnerMaxManagerPercent(j.data.max_manager_percent_of_ticket_for_promoter_sale)
        }
      } catch {
        setOwnerMaxManagerPercent(null)
      }
    }
    load()
  }, [token])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const q = new URLSearchParams(window.location.search)
    const tid = q.get('tourId')
    const fid = q.get('flightId')
    setTourIdFromUrl(tid && /^[0-9a-f-]{36}$/i.test(tid) ? tid : null)
    setFlightIdFromUrl(fid && /^[0-9a-f-]{36}$/i.test(fid) ? fid : null)
  }, [])

  // Подставляем тур/рейс из ?tourId=&flightId= при каждом обновлении списка (без «один раз» — иначе рейс
  // из деталки экскурсии может отсутствовать в отфильтрованном GET /api/tours до подмешивания деталки).
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
    const needsPromoter = paymentMethod === 'cash' || paymentMethod === 'acquiring'
    const hasPromoterId = typeof promoterId === 'number' && Number.isFinite(promoterId) && promoterId > 0

    if (!needsPromoter) {
      setPromoterInfo(null)
      setValue('promoter_id', undefined, { shouldValidate: false })
      setValue('promoter_user_id', undefined, { shouldValidate: false })
      setValue('manager_commission_percent_of_ticket', undefined, { shouldValidate: false })
      return
    }

    if (hasPromoterId) {
      checkPromoter()
    } else {
      setPromoterInfo(null)
      setValue('promoter_user_id', undefined, { shouldValidate: false })
      setValue('manager_commission_percent_of_ticket', undefined, { shouldValidate: false })
    }
  }, [promoterId, paymentMethod, setValue])

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
      // Пока в URL есть tourId+flightId, не обнуляем рейс в том же тике, что и загрузка туров —
      // иначе эффект успевает очистить flight_id до подстановки из другого useEffect (гонка / гидратация).
      const waitingFromUrl = Boolean(tourIdFromUrl && flightIdFromUrl)
      if (!waitingFromUrl) {
        setValue('flight_id', '' as any, { shouldValidate: false })
      }
      prevTourIdFromFormRef.current = undefined
    }
  }, [selectedTourId, tours, setValue, tourIdFromUrl, flightIdFromUrl])

  useEffect(() => {
    if (!childCount) setValue('child_price', undefined, { shouldValidate: true })
  }, [childCount, setValue])

  useEffect(() => {
    if (!concessionCount) setValue('concession_price', undefined, { shouldValidate: true })
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

  const checkPromoter = async () => {
    if (!promoterId) return
    
    try {
      const response = await fetch(`/api/promoters/check/${promoterId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const result = await response.json()
      if (result.success && result.data.exists) {
        // Получить user_id
        const userIdResponse = await fetch(`/api/promoters/check/${promoterId}/user-id`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        const userIdResult = await userIdResponse.json()
        if (userIdResult.success) {
          setPromoterInfo({ ...result.data, user_id: userIdResult.data.user_id })
          setValue('promoter_user_id', userIdResult.data.user_id)
        } else {
          setPromoterInfo(result.data)
        }
      } else {
        setPromoterInfo(null)
        setValue('promoter_user_id', undefined)
      }
    } catch (error) {
      console.error('Error checking promoter:', error)
    }
  }

  const onSubmit = async (data: CreateSaleFormData) => {
    try {
      setError(null)
      setLoading(true)

      // Если указан promoter_id, user_id уже получен в checkPromoter
      const promoterUserId = watch('promoter_user_id')
      const needsPromoterSplit =
        Boolean(promoterUserId) &&
        (data.payment_method === 'cash' || data.payment_method === 'acquiring')

      const payload = {
        tour_id: data.tour_id,
        flight_id: data.flight_id,
        adult_count: data.adult_count,
        child_count: data.child_count,
        concession_count: data.concession_count,
        adult_price: data.adult_price,
        child_price: data.child_count > 0 ? data.child_price : undefined,
        concession_price: data.concession_count > 0 ? data.concession_price : undefined,
        payment_method: data.payment_method,
        promoter_user_id: promoterUserId,
        manager_commission_percent_of_ticket: needsPromoterSplit
          ? data.manager_commission_percent_of_ticket
          : undefined,
      }

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...payload,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Ошибка создания продажи')
        setLoading(false)
        return
      }

      setSaleId(result.data.id)

      // В зависимости от способа оплаты
      if (data.payment_method === 'online_yookassa') {
        // Создать платеж и получить QR/ссылку
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
          setStep('success')
        } else {
          setError(paymentResult.error || 'Ошибка создания платежа')
        }
      } else if (data.payment_method === 'acquiring') {
        router.push(`/dashboard/manager/sales/create/acquiring-receipt?sale_id=${result.data.id}`)
      } else if (data.payment_method === 'cash') {
        router.push(`/dashboard/manager/sales/create/cash-ticket?sale_id=${result.data.id}`)
      }
    } catch (err) {
      setError('Ошибка при создании продажи')
    } finally {
      setLoading(false)
    }
  }

  const navItems = [
    { label: 'Продажи', href: '/dashboard/manager/sales' },
    { label: 'История баланса', href: '/dashboard/manager/balance-history' },
    { label: 'Выданные вещи', href: '/dashboard/manager/issued-items' },
    { label: 'Реферальная программа', href: '/dashboard/manager/invitations' },
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

          {step === 'form' && (
            <>
              {!toursLoaded ? (
                <div className="text-white/70 py-8 text-center">Загрузка...</div>
              ) : tourIdFromUrl && !flightIdFromUrl ? (
                <div className="text-white/80 space-y-4">
                  <p>Выберите рейс на странице экскурсии.</p>
                  <Link href={`/dashboard/manager/tours/${tourIdFromUrl}`} className="btn-primary inline-block">
                    К экскурсии
                  </Link>
                </div>
              ) : flightNotInTour ? (
                <div className="text-white/80 space-y-4">
                  <p>Выбранный рейс недоступен или ссылка устарела.</p>
                  <Link href="/dashboard/manager" className="btn-primary inline-block">
                    На главную
                  </Link>
                </div>
              ) : !selectedTour || !selectedFlight ? (
                <div className="text-white/80 space-y-4">
                  <p>Откройте экскурсию на главной и нажмите «Выбрать» у нужного рейса.</p>
                  <Link href="/dashboard/manager" className="btn-primary inline-block">
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
                        {selectedFlight.duration_minutes != null && selectedFlight.duration_minutes > 0 && (
                          <span className="text-white/70">
                            {' '}
                            ({selectedFlight.duration_minutes} мин.)
                          </span>
                        )}
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
                  <input type="hidden" {...register('promoter_user_id')} />

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
                  <option value="online_yookassa" disabled>QR (временно недоступно)</option>
                  <option value="cash">Наличные</option>
                  <option value="acquiring">Эквайринг</option>
                </select>
                {errors.payment_method && (
                  <p className="text-red-300 text-xs mt-1">{errors.payment_method.message}</p>
                )}
                <p className="text-xs text-white/60 mt-2">
                  На данный момент продажа через QR недоступна.
                </p>
              </div>

              {/* ID промоутера только для налички и эквайринга */}
              {(paymentMethod === 'cash' || paymentMethod === 'acquiring') && (
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    ID промоутера (опционально)
                  </label>
                  <input
                    {...register('promoter_id', {
                      setValueAs: (v) => {
                        if (v === '' || v === null || v === undefined) return undefined
                        const n = Number(v)
                        return Number.isFinite(n) && n > 0 ? n : undefined
                      },
                    })}
                    type="number"
                    className="input-glass"
                    placeholder="Введите ID промоутера"
                  />
                  {promoterInfo && (
                    <p className="text-sm text-green-300 mt-1">Промоутер: {promoterInfo.full_name}</p>
                  )}
                  {errors.promoter_id && (
                    <p className="text-red-300 text-xs mt-1">{errors.promoter_id.message}</p>
                  )}
                </div>
              )}

              {(paymentMethod === 'cash' || paymentMethod === 'acquiring') && promoterUserIdWatch && (
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Ваш процент от суммы билетов (₽ по билетам) *
                  </label>
                  <input
                    {...register('manager_commission_percent_of_ticket', {
                      setValueAs: (v) => {
                        if (v === '' || v === null || v === undefined) return undefined
                        const n = Number(v)
                        return Number.isFinite(n) ? n : undefined
                      },
                    })}
                    type="number"
                    step="0.01"
                    min={0}
                    max={ownerMaxManagerPercent ?? 100}
                    className="input-glass"
                    placeholder="Например 5"
                  />
                  <p className="text-xs text-white/60 mt-2">
                    Доля от общей суммы билетов (как процент от неё). Должна быть строго меньше доли промоутера по
                    туру и не выше лимита владельца
                    {ownerMaxManagerPercent != null ? ` (${ownerMaxManagerPercent}%)` : ''}. Остаток доли промоутера
                    получает промоутер.
                  </p>
                  {errors.manager_commission_percent_of_ticket && (
                    <p className="text-red-300 text-xs mt-1">
                      {errors.manager_commission_percent_of_ticket.message}
                    </p>
                  )}
                </div>
              )}

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
          )}

          {step === 'success' && qrCode && paymentLink && (
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
                    value={paymentLink}
                    readOnly
                    className="input-glass"
                  />
                  <button
                    onClick={async () => {
                      navigator.clipboard.writeText(paymentLink)
                      await customAlert('Ссылка скопирована!')
                    }}
                    className="mt-2 text-sm text-white/80 hover:text-white transition-colors"
                  >
                    Копировать ссылку
                  </button>
                </div>
                <button
                  onClick={() => router.push('/dashboard/manager/sales')}
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
