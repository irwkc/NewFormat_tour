'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { calcIncomeSplit, getPreviewScenarios, getPreviewScenariosForRule, type TourParams } from '@/lib/domain/commission-calc'

type ModerateFlight = {
  id: string
  flight_number: string
  date: string
  departure_time: string
  max_places: number
  current_booked_places: number
  is_moderated?: boolean
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
  commission_fixed_adult?: number | string | null
  commission_fixed_child?: number | string | null
  commission_fixed_concession?: number | string | null
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
  threshold_adult: z.number().min(0),
  threshold_child: z.number().min(0),
  threshold_concession: z.number().min(0),
  commission_percentage: z.number().min(0).max(100),
})

const moderateSchema = z.object({
  moderation_status: z.enum(['approved', 'rejected']),
  owner_min_adult_price: requiredPrice,
  owner_min_child_price: requiredPrice,
  owner_min_concession_price: optionalNumber,
  commission_type: z.enum(['percentage', 'fixed']),
  commission_percentage: optionalNumber,
  commission_fixed_amount: optionalNumber,
  commission_fixed_adult: optionalNumber,
  commission_fixed_child: optionalNumber,
  commission_fixed_concession: optionalNumber,
  commission_rules: z.array(ruleSchema).optional(),
}).refine((data) => {
  if (data.commission_type === 'percentage') {
    return data.commission_percentage !== undefined
  }
  return (data.commission_fixed_adult ?? data.commission_fixed_child ?? data.commission_fixed_concession ?? data.commission_fixed_amount) !== undefined
}, {
  message: "Укажите процент или фикс. суммы по типам билетов",
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
  const commissionFixedAdult = data.commission_fixed_adult != null ? Number(data.commission_fixed_adult) : tour.commission_fixed_adult != null ? Number(tour.commission_fixed_adult) : null
  const commissionFixedChild = data.commission_fixed_child != null ? Number(data.commission_fixed_child) : tour.commission_fixed_child != null ? Number(tour.commission_fixed_child) : null
  const commissionFixedConcession = data.commission_fixed_concession != null ? Number(data.commission_fixed_concession) : tour.commission_fixed_concession != null ? Number(tour.commission_fixed_concession) : null
  const rulesRaw = (data.commission_rules as Array<{ threshold_adult: number; threshold_child: number; threshold_concession: number; commission_percentage: number }>) || []
  const rules = rulesRaw.filter(r => r && (r.commission_percentage ?? 0) >= 0).map(r => ({
    threshold_adult: Number(r.threshold_adult ?? 0),
    threshold_child: Number(r.threshold_child ?? 0),
    threshold_concession: Number(r.threshold_concession ?? 0),
    commission_percentage: Number(r.commission_percentage ?? 0),
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
    commission_fixed_amount: commissionType === 'fixed' && !commissionFixedAdult && !commissionFixedChild && !commissionFixedConcession ? commissionFixed : undefined,
    commission_fixed_adult: commissionType === 'fixed' ? commissionFixedAdult : undefined,
    commission_fixed_child: commissionType === 'fixed' ? commissionFixedChild : undefined,
    commission_fixed_concession: commissionType === 'fixed' ? commissionFixedConcession : undefined,
    commission_rules: rules.length ? rules : undefined,
  }

  const rowLabels = ['1 взрослый', '1 детский', '1 льготный']

  const renderTable = (rows: { sale: { total_amount: number }; split: { promoter: number; owner: number } }[]) => (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-white/80 border-b border-white/20">
          <th className="py-2 pr-4">Продажа</th>
          <th className="py-2 pr-4">Сумма</th>
          <th className="py-2 pr-4">Промоутер</th>
          <th className="py-2 pr-4">Владелец</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={row.split.owner <= 0 ? 'text-red-300' : 'text-white/80'}>
            <td className="py-2 pr-4">{rowLabels[i]}</td>
            <td className="py-2 pr-4">{row.sale.total_amount.toFixed(0)}₽</td>
            <td className="py-2 pr-4">{row.split.promoter.toFixed(0)}₽</td>
            <td className="py-2 pr-4 font-medium">{row.split.owner.toFixed(0)}₽</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  let hasNegativeOwner = false
  if (rules.length > 0) {
    for (const rule of rules) {
      const scenarios = getPreviewScenariosForRule(tourParams, rule)
      const rows = scenarios.map(s => ({ sale: s, split: calcIncomeSplit(s, { ...tourParams, commission_rules: [rule] }) }))
      if (rows.some(r => r.split.owner <= 0)) hasNegativeOwner = true
    }
  } else {
    const scenarios = getPreviewScenarios(tourParams)
    const rows = scenarios.map(s => ({ sale: s, split: calcIncomeSplit(s, tourParams) }))
    hasNegativeOwner = rows.some(r => r.split.owner <= 0)
  }

  return (
    <div className="p-4 glass rounded-xl border border-white/10">
      <h3 className="font-semibold mb-3 text-white">Расчёт</h3>
      {hasNegativeOwner && (
        <div className="mb-3 p-3 bg-red-500/20 border border-red-400/50 rounded-lg text-red-200 text-sm">
          ⚠️ При некоторых сценариях владелец не зарабатывает (доход ≤ 0). Одобрение будет заблокировано.
        </div>
      )}

      <div className="space-y-6">
        <div>
          <p className="text-sm text-white/70 mb-2">По мин. ценам</p>
          <div className="overflow-x-auto">
            {renderTable(
              getPreviewScenarios(tourParams).map(s => ({ sale: s, split: calcIncomeSplit(s, tourParams) }))
            )}
          </div>
        </div>
        {rules.length > 0 && rules.map((rule, ruleIdx) => {
          const scenarios = getPreviewScenariosForRule(tourParams, rule)
          const paramsForRule = { ...tourParams, commission_rules: [rule] }
          const rows = scenarios.map(s => ({ sale: s, split: calcIncomeSplit(s, paramsForRule) }))
          return (
            <div key={ruleIdx} className="border border-white/10 rounded-lg p-3 bg-white/5">
              <p className="text-sm text-white/90 mb-2">
                Порог: взр. {Number(rule.threshold_adult).toFixed(0)}₽, дет. {Number(rule.threshold_child).toFixed(0)}₽, льг. {Number(rule.threshold_concession).toFixed(0)}₽ → {Number(rule.commission_percentage).toFixed(0)}%
              </p>
              <div className="overflow-x-auto">{renderTable(rows)}</div>
            </div>
          )
        })}
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
  const rules = (data.commission_rules || []).filter((r: { commission_percentage?: number }) => (r.commission_percentage ?? 0) >= 0)
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
    commission_fixed_adult: data.commission_fixed_adult,
    commission_fixed_child: data.commission_fixed_child,
    commission_fixed_concession: data.commission_fixed_concession,
    commission_rules: rules.length ? rules.map((r: { threshold_adult: number; threshold_child: number; threshold_concession: number; commission_percentage: number }) => ({
      threshold_adult: Number(r.threshold_adult ?? 0),
      threshold_child: Number(r.threshold_child ?? 0),
      threshold_concession: Number(r.threshold_concession ?? 0),
      commission_percentage: Number(r.commission_percentage ?? 0),
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>('percentage')
  const [weekDates, setWeekDates] = useState<{ dateStr: string; dayName: string; dayOfMonth: number }[]>([])
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [flightsExpanded, setFlightsExpanded] = useState(false)

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
      commission_rules: [] as { threshold_adult: number; threshold_child: number; threshold_concession: number; commission_percentage: number }[],
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

  useEffect(() => {
    fetch('/api/moscow-week')
      .then((r) => r.json())
      .then((d) => d.success && setWeekDates(d.data))
  }, [])

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
          threshold_adult: Number(r.threshold_adult ?? r.threshold_amount ?? 0),
          threshold_child: Number(r.threshold_child ?? r.threshold_amount ?? 0),
          threshold_concession: Number(r.threshold_concession ?? r.threshold_amount ?? 0),
          commission_percentage: Number(r.commission_percentage ?? 0),
        })))
      }
    } catch (error) {
      console.error('Error fetching tour:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev)
      if (next.has(dateStr)) next.delete(dateStr)
      else next.add(dateStr)
      return next
    })
  }

  const allFlights = tour?.flights || []
  const moderatedCount = allFlights.filter((f) => (f as ModerateFlight).is_moderated).length
  const allModerated = allFlights.length > 0 && moderatedCount === allFlights.length

  const groupFlightsByDate = (flights: ModerateFlight[]) => {
    const groups: Record<string, ModerateFlight[]> = {}
    for (const f of flights) {
      const d = typeof f.date === 'string' ? f.date.split('T')[0] : new Date(f.date).toISOString().split('T')[0]
      if (!groups[d]) groups[d] = []
      groups[d].push(f)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }


  const onSubmit = async (data: ModerateFormData) => {
    try {
      setError(null)
      setSaving(true)

      if (data.moderation_status === 'approved' && tour) {
        if (selectedDates.size === 0) {
          setError('Выберите дни для применения модерации')
          return
        }
        const tourParams = buildTourParams(data, tour)
        const scenarios = getPreviewScenarios(tourParams)
        const badScenario = scenarios.find(s => {
          const split = calcIncomeSplit(s, tourParams)
          return split.owner <= 0
        })
        if (badScenario) {
          setError('Нельзя одобрить: при этих параметрах владелец не зарабатывает (доход ≤ 0). Уменьшите процент промоутера или увеличьте минимальные цены.')
          return
        }
      }

      const datesToSend = Array.from(selectedDates)
      const response = await fetch(`/api/tours/${tourId}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, dates: datesToSend }),
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
            threshold_adult: r.threshold_adult ?? 0,
            threshold_child: r.threshold_child ?? 0,
            threshold_concession: r.threshold_concession ?? 0,
            commission_percentage: r.commission_percentage ?? 0,
            order: i,
          })),
        }),
      })
      const rulesResult = await rulesResponse.json()
      if (!rulesResult.success) {
        setError('Экскурсия обновлена, но не удалось сохранить правила процента промоутера')
        return
      }

      await fetchTour()
      setSelectedDates(new Set())
      if (data.moderation_status === 'rejected') {
        router.push('/dashboard/owner')
      }
    } catch (err) {
      setError('Ошибка при модерации экскурсии')
    } finally {
      setSaving(false)
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

          <div className="mb-6 p-5 glass rounded-2xl border border-white/10 shadow-lg shadow-black/20">
            <h3 className="font-semibold text-lg text-white mb-4 tracking-tight">Информация об экскурсии</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs font-medium uppercase tracking-wider text-white/50">Компания</span>
                <span className="text-white font-medium">{tour.company}</span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs font-medium uppercase tracking-wider text-white/50">Категория</span>
                <span className="text-white font-medium">{tour.category?.name ?? '—'}</span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wider text-white/50">Модель партнёра</span>
                <span className="text-white/90 text-sm leading-relaxed">
                  {tour.partner_commission_type === 'percentage' && tour.partner_commission_percentage != null && Number(tour.partner_commission_percentage) > 0
                    ? `${Number(tour.partner_commission_percentage)}% от суммы продаж`
                    : `Фикс с билета: взр. ${Number(tour.partner_fixed_adult_price ?? tour.partner_min_adult_price).toFixed(0)}₽, дет. ${Number(tour.partner_fixed_child_price ?? tour.partner_min_child_price).toFixed(0)}₽${(tour.partner_fixed_concession_price ?? tour.partner_min_concession_price) ? `, льг. ${Number(tour.partner_fixed_concession_price ?? tour.partner_min_concession_price).toFixed(0)}₽` : ''}`}
                  . Мин. цены: взр. {Number(tour.partner_min_adult_price).toFixed(0)}₽, дет. {Number(tour.partner_min_child_price).toFixed(0)}₽{tour.partner_min_concession_price ? `, льг. ${Number(tour.partner_min_concession_price).toFixed(0)}₽` : ''}
                </span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wider text-white/50">Партнёр</span>
                <span className="text-white font-medium">{tour.createdBy?.full_name ?? '—'}</span>
              </div>
            </div>
          </div>

          {tour.flights && tour.flights.length > 0 && (
            <div className="mb-6 p-4 glass rounded-xl">
              <button
                type="button"
                onClick={() => setFlightsExpanded(!flightsExpanded)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="font-semibold text-white">
                  Рейсы на модерации ({moderatedCount}/{allFlights.length})
                </h3>
                <span className="text-white/70 text-lg">{flightsExpanded ? '−' : '+'}</span>
              </button>
              {flightsExpanded && (
                <div className="mt-4 space-y-4">
                  {groupFlightsByDate(tour.flights as ModerateFlight[]).map(([dateStr, dayFlights]) => (
                    <div key={dateStr} className="border border-white/10 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-white/5 text-sm font-medium text-white flex items-center justify-between">
                        <span>{new Date(dateStr + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        <span className="text-white/70 text-xs">
                          взр. {Number(tour.partner_min_adult_price).toFixed(0)}₽, дет. {Number(tour.partner_min_child_price).toFixed(0)}₽
                        </span>
                      </div>
                      <div className="divide-y divide-white/5">
                        {dayFlights.map((flight: ModerateFlight) => (
                          <div key={flight.id} className={`p-3 ${flight.is_moderated ? 'bg-green-500/10' : 'bg-white/5'}`}>
                            <div className="space-y-1 text-sm text-white/70 flex flex-wrap justify-between gap-2">
                              <div>
                                <p><strong className="text-white/90">Рейс:</strong> {flight.flight_number}</p>
                                <p><strong className="text-white/90">Время:</strong> {new Date(flight.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                                <p><strong className="text-white/90">Мест:</strong> {flight.max_places} (забр.: {flight.current_booked_places})</p>
                                {flight.boarding_location_url && (
                                  <a href={flight.boarding_location_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs">
                                    Карты
                                  </a>
                                )}
                              </div>
                              {flight.is_moderated && <span className="text-green-400 text-xs shrink-0">✓ Модерация пройдена</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              <h3 className="font-semibold mb-2 text-white">Процент промоутера</h3>
              <p className="text-sm text-white/60 mb-4">Укажите, сколько получает промоутер или менеджер с каждой продажи.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Модель оплаты промоутеру *
                  </label>
                  <select
                    {...register('commission_type')}
                    className="input-glass"
                  >
                    <option value="percentage">Процент от суммы продажи</option>
                    <option value="fixed">Фикс. сумма за билет каждого типа</option>
                  </select>
                  {errors.commission_type && (
                    <p className="text-red-300 text-xs mt-1">{errors.commission_type.message}</p>
                  )}
                </div>

                {commissionType === 'percentage' ? (
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Процент промоутера (%) *
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">Взрослый (₽) *</label>
                      <input
                        {...register('commission_fixed_adult', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={Number(tour.commission_fixed_adult ?? tour.commission_fixed_amount) || 0}
                        className="input-glass"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">Детский (₽) *</label>
                      <input
                        {...register('commission_fixed_child', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={Number(tour.commission_fixed_child ?? tour.commission_fixed_amount) || 0}
                        className="input-glass"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">Льготный (₽)</label>
                      <input
                        {...register('commission_fixed_concession', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={Number(tour.commission_fixed_concession ?? tour.commission_fixed_amount) ?? ''}
                        className="input-glass"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 glass rounded-xl border border-white/10">
              <h3 className="font-semibold mb-2 text-white">Дополнительные условия процента промоутера</h3>
              <p className="text-sm text-white/60 mb-4">Пороги по цене за билет для каждого типа. Если цена ≥ порога, применяется процент. Считается с каждой позиции отдельно.</p>
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-wrap gap-2 items-end mb-3 p-3 bg-white/5 rounded-lg">
                  <div className="min-w-[90px]">
                    <label className="block text-xs text-white/70 mb-1">Порог взр. (₽)</label>
                    <input
                      {...register(`commission_rules.${index}.threshold_adult`, { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      className="input-glass text-sm"
                    />
                  </div>
                  <div className="min-w-[90px]">
                    <label className="block text-xs text-white/70 mb-1">Порог дет. (₽)</label>
                    <input
                      {...register(`commission_rules.${index}.threshold_child`, { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      className="input-glass text-sm"
                    />
                  </div>
                  <div className="min-w-[90px]">
                    <label className="block text-xs text-white/70 mb-1">Порог льг. (₽)</label>
                    <input
                      {...register(`commission_rules.${index}.threshold_concession`, { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      className="input-glass text-sm"
                    />
                  </div>
                  <div className="min-w-[70px]">
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
                  <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-300 text-sm">
                    Удалить
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => append({ threshold_adult: 0, threshold_child: 0, threshold_concession: 0, commission_percentage: 0 })}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                + Добавить условие
              </button>
            </div>

            <EarningsPreviewTable tour={tour} formValues={formValues} />

            {tour.flights && tour.flights.length > 0 && (
              <div className="glass rounded-xl border border-white/10 p-4">
                <h3 className="font-semibold mb-2 text-white">Применить модерацию к дням</h3>
                <p className="text-sm text-white/60 mb-4">Выберите дни текущей недели. Одобрение и цены применятся только к рейсам на выбранные даты.</p>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {weekDates.map(({ dateStr, dayName, dayOfMonth }) => {
                    const isSelected = selectedDates.has(dateStr)
                    const dayFlights = (tour.flights || []).filter((f: ModerateFlight) => {
                      const d = typeof f.date === 'string' ? f.date.split('T')[0] : new Date(f.date).toISOString().split('T')[0]
                      return d === dateStr
                    })
                    const dayModerated = dayFlights.every((f: ModerateFlight) => f.is_moderated)
                    const dayFlightsCount = dayFlights.length
                    return (
                      <div
                        key={dateStr}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleDate(dateStr)}
                        onKeyDown={(e) => e.key === 'Enter' && toggleDate(dateStr)}
                        className={`p-3 rounded-lg border text-center cursor-pointer transition ${
                          isSelected ? 'bg-purple-500/30 border-purple-400' : dayModerated ? 'bg-green-500/20 border-green-400/50' : 'bg-white/5 border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-white/70 text-xs">{dayName}</div>
                        <div className="text-white font-semibold">{dayOfMonth}</div>
                        {dayFlightsCount > 0 && (
                          <div className={`text-xs mt-1 ${dayModerated ? 'text-green-300' : 'text-white/70'}`}>
                            {dayFlightsCount} рейс. {dayModerated ? '✓' : ''}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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

            <div className="flex flex-wrap gap-4">
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Сохранение...' : 'Применить к выбранным дням'}
              </button>
              {allModerated ? (
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/owner')}
                  className="btn-primary"
                >
                  Готово, вернуться
                </button>
              ) : (
                <button type="button" onClick={() => router.back()} className="btn-secondary">
                  Отмена
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
