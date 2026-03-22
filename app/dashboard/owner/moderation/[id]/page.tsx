'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { calcIncomeSplit, getPreviewScenarios, type TourParams } from '@/lib/domain/commission-calc'

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
  partner_commission_type?: string | null
  partner_fixed_adult_price?: number | string | null
  partner_fixed_child_price?: number | string | null
  partner_fixed_concession_price?: number | string | null
  partner_commission_percentage?: number | string | null
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

function EarningsPreviewTable({ tour, formValues }: { tour: ModerateTour; formValues: Record<string, unknown> }) {
  const data = formValues || {}
  const ownerMinAdult = Number(data.owner_min_adult_price) || Number(tour.owner_min_adult_price) || Number(tour.partner_min_adult_price) || 0
  const ownerMinChild = Number(data.owner_min_child_price) || Number(tour.owner_min_child_price) || Number(tour.partner_min_child_price) || 0
  const ownerMinConcession = Number(data.owner_min_concession_price) || Number(tour.owner_min_concession_price) || Number(tour.partner_min_concession_price) || 0
  const commissionType = (data.commission_type as string) || tour.commission_type || 'percentage'
  const commissionPercent = data.commission_percentage != null ? Number(data.commission_percentage) : Number(tour.commission_percentage) || 0
  const commissionFixed = data.commission_fixed_amount != null ? Number(data.commission_fixed_amount) : Number(tour.commission_fixed_amount) || 0
  const rulesRaw = (data.commission_rules as Array<{ threshold_amount: number; commission_type: string; commission_percentage?: number; commission_fixed_amount?: number }>) || []
  const rules = rulesRaw.filter(r => r && r.threshold_amount > 0).map(r => ({
    threshold_amount: r.threshold_amount,
    commission_type: r.commission_type as 'percentage' | 'fixed',
    commission_percentage: r.commission_percentage,
    commission_fixed_amount: r.commission_fixed_amount,
  }))

  const tourParams: TourParams = {
    partner_min_adult_price: Number(tour.partner_min_adult_price),
    partner_min_child_price: Number(tour.partner_min_child_price),
    partner_min_concession_price: tour.partner_min_concession_price != null ? Number(tour.partner_min_concession_price) : 0,
    partner_commission_type: (tour.partner_commission_type as 'fixed' | 'percentage') ?? (tour.partner_commission_percentage != null ? 'percentage' : 'fixed'),
    partner_fixed_adult_price: tour.partner_fixed_adult_price != null ? Number(tour.partner_fixed_adult_price) : null,
    partner_fixed_child_price: tour.partner_fixed_child_price != null ? Number(tour.partner_fixed_child_price) : null,
    partner_fixed_concession_price: tour.partner_fixed_concession_price != null ? Number(tour.partner_fixed_concession_price) : null,
    partner_commission_percentage: tour.partner_commission_percentage != null ? Number(tour.partner_commission_percentage) : null,
    owner_min_adult_price: ownerMinAdult,
    owner_min_child_price: ownerMinChild,
    owner_min_concession_price: ownerMinConcession,
    commission_type: commissionType as 'percentage' | 'fixed',
    commission_percentage: commissionType === 'percentage' ? commissionPercent : undefined,
    commission_fixed_amount: commissionType === 'fixed' ? commissionFixed : undefined,
    commission_rules: rules.length ? rules : undefined,
  }

  const scenarios = getPreviewScenarios(tourParams)
  const rows = scenarios.map(s => {
    const split = calcIncomeSplit(s, tourParams)
    return { sale: s, split }
  })

  const hasNegativeOwner = rows.some(r => r.split.owner <= 0)

  return (
    <div className="p-4 glass rounded-xl border border-white/10">
      <h3 className="font-semibold mb-2 text-white">Превью: при таких параметрах кто сколько зарабатывает</h3>
      <p className="text-sm text-white/60 mb-3">Примеры типовых продаж по мин. ценам и выше.</p>
      {hasNegativeOwner && (
        <div className="mb-3 p-3 bg-red-500/20 border border-red-400/50 rounded-lg text-red-200 text-sm">
          ⚠️ При некоторых сценариях владелец не зарабатывает (доход ≤ 0). Одобрение будет заблокировано.
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/80 border-b border-white/20">
              <th className="py-2 pr-4">Продажа</th>
              <th className="py-2 pr-4">Сумма</th>
              <th className="py-2 pr-4">Партнёр</th>
              <th className="py-2 pr-4">Промоутер</th>
              <th className="py-2 pr-4">Владелец</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={row.split.owner <= 0 ? 'text-red-300' : 'text-white/80'}>
                <td className="py-2 pr-4">
                  {row.sale.adult_count} взр.{row.sale.child_count ? ` + ${row.sale.child_count} дет.` : ''}
                </td>
                <td className="py-2 pr-4">{row.sale.total_amount.toFixed(0)}₽</td>
                <td className="py-2 pr-4">{row.split.partner.toFixed(0)}₽</td>
                <td className="py-2 pr-4">{row.split.promoter.toFixed(0)}₽</td>
                <td className="py-2 pr-4 font-medium">{row.split.owner.toFixed(0)}₽</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function buildTourParams(data: ModerateFormData, tour?: ModerateTour | null): TourParams {
  const ownerMinAdult = Number(data.owner_min_adult_price)
  const ownerMinChild = Number(data.owner_min_child_price)
  const ownerMinConcession = Number(data.owner_min_concession_price) || 0
  const partnerMinAdult = tour ? Number(tour.partner_min_adult_price) : ownerMinAdult
  const partnerMinChild = tour ? Number(tour.partner_min_child_price) : ownerMinChild
  const partnerMinConcession = tour && tour.partner_min_concession_price ? Number(tour.partner_min_concession_price) : 0
  const rules = (data.commission_rules || []).filter(r => r.threshold_amount > 0 && (r.commission_percentage != null || r.commission_fixed_amount != null))
  return {
    partner_min_adult_price: partnerMinAdult,
    partner_min_child_price: partnerMinChild,
    partner_min_concession_price: partnerMinConcession,
    partner_commission_type: (tour?.partner_commission_type as 'fixed' | 'percentage') ?? (tour?.partner_commission_percentage != null ? 'percentage' : 'fixed'),
    partner_fixed_adult_price: tour?.partner_fixed_adult_price != null ? Number(tour.partner_fixed_adult_price) : null,
    partner_fixed_child_price: tour?.partner_fixed_child_price != null ? Number(tour.partner_fixed_child_price) : null,
    partner_fixed_concession_price: tour?.partner_fixed_concession_price != null ? Number(tour.partner_fixed_concession_price) : null,
    partner_commission_percentage: tour?.partner_commission_percentage != null ? Number(tour.partner_commission_percentage) : null,
    owner_min_adult_price: ownerMinAdult,
    owner_min_child_price: ownerMinChild,
    owner_min_concession_price: ownerMinConcession,
    commission_type: data.commission_type,
    commission_percentage: data.commission_percentage,
    commission_fixed_amount: data.commission_fixed_amount,
    commission_rules: rules.length ? rules.map(r => ({
      threshold_amount: r.threshold_amount,
      commission_type: r.commission_type,
      commission_percentage: r.commission_percentage,
      commission_fixed_amount: r.commission_fixed_amount,
    })) : undefined,
  }
}

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
  const formValues = watch()

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

      if (data.moderation_status === 'approved' && tour) {
        const tourParams = buildTourParams(data, tour)
        const scenarios = getPreviewScenarios(tourParams)
        const badScenario = scenarios.find(s => {
          const split = calcIncomeSplit(s, tourParams)
          return split.owner <= 0
        })
        if (badScenario) {
          setError('Нельзя одобрить: при этих параметрах владелец не зарабатывает (доход ≤ 0). Уменьшите комиссию промоутера или увеличьте минимальные цены.')
          return
        }
      }

      const response = await fetch(`/api/tours/${tourId}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
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
          rules: (data.commission_rules || []).map((r, i) => ({
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

      router.push('/dashboard/owner')
    } catch (err) {
      setError('Ошибка при модерации экскурсии')
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Модерация экскурсии">
        <div className="px-4 py-6 sm:px-0">
          <p>Загрузка...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!tour) {
    return (
      <DashboardLayout title="Модерация экскурсии">
        <div className="px-4 py-6 sm:px-0">
          <p>Экскурсия не найдена</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Модерация экскурсии">
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-6 text-white">Модерация экскурсии</h2>

          <div className="mb-6 p-4 glass rounded-xl">
            <h3 className="font-semibold mb-2 text-white">Информация об экскурсии</h3>
            <div className="space-y-1 text-sm text-white/70">
              <p><strong className="text-white/90">Компания:</strong> {tour.company}</p>
              <p><strong className="text-white/90">Категория:</strong> {tour.category?.name}</p>
              <p><strong className="text-white/90">Модель партнёра:</strong>{' '}
                {tour.partner_commission_type === 'percentage' && tour.partner_commission_percentage != null && Number(tour.partner_commission_percentage) > 0
                  ? `${Number(tour.partner_commission_percentage)}% от суммы продаж`
                  : `Фикс с билета: взр. ${Number(tour.partner_fixed_adult_price ?? tour.partner_min_adult_price).toFixed(0)}₽, дет. ${Number(tour.partner_fixed_child_price ?? tour.partner_min_child_price).toFixed(0)}₽${(tour.partner_fixed_concession_price ?? tour.partner_min_concession_price) ? `, льг. ${Number(tour.partner_fixed_concession_price ?? tour.partner_min_concession_price).toFixed(0)}₽` : ''}`}
                . Мин. цены: взр. {Number(tour.partner_min_adult_price).toFixed(0)}₽, дет. {Number(tour.partner_min_child_price).toFixed(0)}₽{tour.partner_min_concession_price ? `, льг. ${Number(tour.partner_min_concession_price).toFixed(0)}₽` : ''}
              </p>
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
              <h3 className="font-semibold mb-2 text-white">Комиссия промоутера/менеджера</h3>
              <p className="text-sm text-white/60 mb-4">Укажите, сколько получает промоутер или менеджер с каждой продажи. Остаток остаётся вам.</p>
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

            <EarningsPreviewTable tour={tour} formValues={formValues} />

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
