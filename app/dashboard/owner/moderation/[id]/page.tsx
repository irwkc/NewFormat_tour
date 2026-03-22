'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

type ModerateFlight = {
  id: string
  flight_number: string
  date: string
  departure_time: string
  max_places: number
  current_booked_places: number
  boarding_location_url?: string | null
}

type ModerateTour = {
  id: string
  company: string
  category?: { name: string }
  partner_min_adult_price: number | string
  partner_min_child_price: number | string
  partner_min_concession_price?: number | string | null
  owner_min_adult_price?: number | string | null
  owner_min_child_price?: number | string | null
  owner_min_concession_price?: number | string | null
   commission_type?: 'percentage' | 'fixed' | null
   commission_percentage?: number | string | null
   commission_fixed_amount?: number | string | null
  createdBy?: { full_name?: string | null }
  flights?: ModerateFlight[]
}

const optionalNumber = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}, z.number().min(0).optional())

const requiredPrice = z.preprocess((v) => Number(v), z.number().min(0.01))

const ruleSchema = z.object({
  threshold_amount: z.number().min(0),
  commission_type: z.enum(['percentage', 'fixed']),
  commission_percentage: optionalNumber,
  commission_fixed_amount: optionalNumber,
})

const moderateSchema = z.object({
  moderation_status: z.enum(['approved', 'rejected']),
  owner_min_adult_price: requiredPrice,
  owner_min_child_price: requiredPrice,
  owner_min_concession_price: optionalNumber,
  commission_type: z.enum(['percentage', 'fixed']),
  commission_percentage: optionalNumber,
  commission_fixed_amount: optionalNumber,
  commission_rules: z.array(ruleSchema).optional(),
}).refine((data) => {
  if (data.commission_type === 'percentage') {
    return data.commission_percentage !== undefined
  }
  return data.commission_fixed_amount !== undefined
}, {
  message: "commission_percentage or commission_fixed_amount is required",
})

type ModerateFormData = z.infer<typeof moderateSchema>

export default function ModerateTourPage() {
  const params = useParams()
  const router = useRouter()
  const { token } = useAuthStore()
  const tourId = params.id as string
  
  const [tour, setTour] = useState<ModerateTour | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>('percentage')

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<ModerateFormData>({
    resolver: zodResolver(moderateSchema),
    defaultValues: {
      commission_type: 'percentage',
      commission_rules: [] as { threshold_amount: number; commission_type: 'percentage' | 'fixed'; commission_percentage?: number; commission_fixed_amount?: number }[],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'commission_rules' as const,
  })

  const commission_type = watch('commission_type')

  useEffect(() => {
    if (commission_type) {
      setCommissionType(commission_type)
    }
  }, [commission_type])

  useEffect(() => {
    if (token) {
      fetchTour()
    }
  }, [token, tourId])

  const fetchTour = async () => {
    try {
      const response = await fetch(`/api/tours/${tourId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setTour(data.data)
      }
      const rulesRes = await fetch(`/api/tours/${tourId}/commission-rules`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const rulesData = await rulesRes.json()
      if (rulesData.success && Array.isArray(rulesData.data) && rulesData.data.length > 0) {
        setValue('commission_rules', rulesData.data.map((r: any) => ({
          threshold_amount: Number(r.threshold_amount),
          commission_type: r.commission_type,
          commission_percentage: r.commission_percentage != null ? Number(r.commission_percentage) : undefined,
          commission_fixed_amount: r.commission_fixed_amount != null ? Number(r.commission_fixed_amount) : undefined,
        })))
      }
    } catch (error) {
      console.error('Error fetching tour:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ModerateFormData) => {
    try {
      setError(null)

      const { commission_rules, ...moderateData } = data
      const response = await fetch(`/api/tours/${tourId}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(moderateData),
      })

      const result = await response.json()
      if (!result.success) {
        setError(result.error || 'Ошибка модерации')
        return
      }

      const rulesResponse = await fetch(`/api/tours/${tourId}/commission-rules`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          rules: (commission_rules || []).map((r, i) => ({
            threshold_amount: r.threshold_amount,
            commission_type: r.commission_type,
            commission_percentage: r.commission_type === 'percentage' ? r.commission_percentage : undefined,
            commission_fixed_amount: r.commission_type === 'fixed' ? r.commission_fixed_amount : undefined,
            order: i,
          })),
        }),
      })
      const rulesResult = await rulesResponse.json()
      if (!rulesResult.success) {
        setError(rulesResult.error || 'Экскурсия обновлена, но не удалось сохранить правила комиссии')
        return
      }

      router.push('/dashboard/owner/moderation')
    } catch (err) {
      setError('Ошибка при модерации экскурсии')
    }
  }

  const navItems = [
    { label: 'Экскурсии на модерации', href: '/dashboard/owner/moderation' },
    { label: 'Категории', href: '/dashboard/owner/categories' },
    { label: 'Промоутеры', href: '/dashboard/owner/promoters' },
    { label: 'Менеджеры', href: '/dashboard/owner/managers' },
    { label: 'Выдача вещей', href: '/dashboard/owner/issued-items' },
    { label: 'Статистика', href: '/dashboard/owner/statistics' },
    { label: 'Приглашения', href: '/dashboard/owner/invitations' },
    { label: 'Рефералы', href: '/dashboard/owner/referrals' },
    { label: 'Настройки', href: '/dashboard/owner/settings' },
  ]

  if (loading) {
    return (
      <DashboardLayout title="Модерация экскурсии" navItems={navItems}>
        <div className="px-4 py-6 sm:px-0">
          <p>Загрузка...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!tour) {
    return (
      <DashboardLayout title="Модерация экскурсии" navItems={navItems}>
        <div className="px-4 py-6 sm:px-0">
          <p>Экскурсия не найдена</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Модерация экскурсии" navItems={navItems}>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-6 text-white">Модерация экскурсии</h2>

          <div className="mb-6 p-4 glass rounded-xl">
            <h3 className="font-semibold mb-2 text-white">Информация об экскурсии</h3>
            <div className="space-y-1 text-sm text-white/70">
              <p><strong className="text-white/90">Компания:</strong> {tour.company}</p>
              <p><strong className="text-white/90">Категория:</strong> {tour.category?.name}</p>
              <p><strong className="text-white/90">Цены партнера:</strong> Взрослый: {Number(tour.partner_min_adult_price).toFixed(2)}₽, Детский: {Number(tour.partner_min_child_price).toFixed(2)}₽{tour.partner_min_concession_price && `, Льготный: ${Number(tour.partner_min_concession_price).toFixed(2)}₽`}</p>
              <p><strong className="text-white/90">Партнер:</strong> {tour.createdBy?.full_name}</p>
            </div>
          </div>

          {tour.flights && tour.flights.length > 0 && (
            <div className="mb-6 p-4 glass rounded-xl">
              <h3 className="font-semibold mb-3 text-white">Рейсы</h3>
              <div className="space-y-3">
                {tour.flights.map((flight: any) => (
                  <div key={flight.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="space-y-1 text-sm text-white/70">
                      <p><strong className="text-white/90">Рейс:</strong> {flight.flight_number}</p>
                      <p><strong className="text-white/90">Дата:</strong> {new Date(flight.date).toLocaleDateString('ru-RU')}</p>
                      <p><strong className="text-white/90">Время отправления:</strong> {new Date(flight.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                      <p><strong className="text-white/90">Мест:</strong> {flight.max_places} (забронировано: {flight.current_booked_places})</p>
                      {flight.boarding_location_url && (
                        <p>
                          <strong className="text-white/90">Точка посадки:</strong>{' '}
                          <a 
                            href={flight.boarding_location_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline"
                          >
                            Открыть на Яндекс.Картах
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Минимальная цена взрослого билета (₽) *
                </label>
                <input
                  {...register('owner_min_adult_price', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={Number(tour.owner_min_adult_price) || Number(tour.partner_min_adult_price)}
                  className="input-glass"
                />
                {errors.owner_min_adult_price && (
                  <p className="text-red-300 text-xs mt-1">{errors.owner_min_adult_price.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Минимальная цена детского билета (₽) *
                </label>
                <input
                  {...register('owner_min_child_price', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={Number(tour.owner_min_child_price) || Number(tour.partner_min_child_price)}
                  className="input-glass"
                />
                {errors.owner_min_child_price && (
                  <p className="text-red-300 text-xs mt-1">{errors.owner_min_child_price.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Минимальная цена льготного билета (₽)
                </label>
                <input
                  {...register('owner_min_concession_price', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={Number(tour.owner_min_concession_price) || Number(tour.partner_min_concession_price) || ''}
                  className="input-glass"
                />
                {errors.owner_min_concession_price && (
                  <p className="text-red-300 text-xs mt-1">{errors.owner_min_concession_price.message}</p>
                )}
              </div>
            </div>

            <div className="p-4 glass rounded-xl border border-white/10">
              <h3 className="font-semibold mb-2 text-white">Комиссия владельца с партнёра</h3>
              <p className="text-sm text-white/60 mb-4">Укажите, какую долю от продажи вы получаете с партнёра.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Тип комиссии *
                  </label>
                  <select
                    {...register('commission_type')}
                    className="input-glass"
                  >
                    <option value="percentage">Процент от суммы продажи</option>
                    <option value="fixed">Фиксированная сумма (₽) с продажи</option>
                  </select>
                  {errors.commission_type && (
                    <p className="text-red-300 text-xs mt-1">{errors.commission_type.message}</p>
                  )}
                </div>

                {commissionType === 'percentage' ? (
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Процент комиссии (%) *
                    </label>
                <input
                  {...register('commission_percentage', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  defaultValue={Number(tour.commission_percentage) || 0}
                  className="input-glass"
                />
                    {errors.commission_percentage && (
                      <p className="text-red-300 text-xs mt-1">{errors.commission_percentage.message}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Фиксированная сумма (₽) с каждой продажи *
                    </label>
                <input
                  {...register('commission_fixed_amount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={Number(tour.commission_fixed_amount) || 0}
                  className="input-glass"
                />
                    {errors.commission_fixed_amount && (
                      <p className="text-red-300 text-xs mt-1">{errors.commission_fixed_amount.message}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 glass rounded-xl border border-white/10">
              <h3 className="font-semibold mb-2 text-white">Дополнительные условия комиссии</h3>
              <p className="text-sm text-white/60 mb-4">Если сумма продажи больше порога, применяется правило (порог, тип, значение).</p>
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-wrap gap-2 items-end mb-3 p-3 bg-white/5 rounded-lg">
                  <div className="flex-1 min-w-[100px]">
                    <label className="block text-xs text-white/70 mb-1">Порог (₽)</label>
                    <input
                      {...register(`commission_rules.${index}.threshold_amount`, { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-glass text-sm"
                    />
                  </div>
                  <div className="min-w-[120px]">
                    <label className="block text-xs text-white/70 mb-1">Тип</label>
                    <select {...register(`commission_rules.${index}.commission_type`)} className="input-glass text-sm">
                      <option value="percentage">%</option>
                      <option value="fixed">₽</option>
                    </select>
                  </div>
                  {watch(`commission_rules.${index}.commission_type`) === 'percentage' ? (
                    <div className="min-w-[80px]">
                      <label className="block text-xs text-white/70 mb-1">%</label>
                      <input
                        {...register(`commission_rules.${index}.commission_percentage`, { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="input-glass text-sm"
                      />
                    </div>
                  ) : (
                    <div className="min-w-[100px]">
                      <label className="block text-xs text-white/70 mb-1">₽</label>
                      <input
                        {...register(`commission_rules.${index}.commission_fixed_amount`, { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        className="input-glass text-sm"
                      />
                    </div>
                  )}
                  <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-300 text-sm">
                    Удалить
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => append({ threshold_amount: 0, commission_type: 'percentage' as const, commission_percentage: 0 })}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                + Добавить условие
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Решение *
              </label>
              <select
                {...register('moderation_status')}
                className="input-glass"
              >
                <option value="approved">Одобрить</option>
                <option value="rejected">Отклонить</option>
              </select>
              {errors.moderation_status && (
                <p className="text-red-300 text-xs mt-1">{errors.moderation_status.message}</p>
              )}
            </div>

            {error && (
              <div className="alert-error">
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                className="btn-primary flex-1"
              >
                Сохранить решение
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-secondary flex-1"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
