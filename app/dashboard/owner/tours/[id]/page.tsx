'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import {
  calcIncomeSplit,
  getPreviewScenarios,
  getPreviewScenariosForRule,
  type TourParams,
} from '@/lib/domain/commission-calc'
import { getNavForRole } from '@/lib/dashboard-nav'

type EditFlight = {
  id: string
  flight_number: string
  date: string
  departure_time: string
  max_places: number
  current_booked_places: number
  is_sale_stopped: boolean
  is_moderated?: boolean
}

type EditTour = {
  id: string
  company: string
  moderation_status?: 'approved' | 'pending' | 'rejected'
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
  flights?: EditFlight[]
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

const editSchema = z
  .object({
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
  })
  .refine(
    (data) => {
      if (data.commission_type === 'percentage') {
        return data.commission_percentage !== undefined
      }
      return (
        (data.commission_fixed_adult ??
          data.commission_fixed_child ??
          data.commission_fixed_concession ??
          data.commission_fixed_amount) !== undefined
      )
    },
    { message: 'Укажите процент или фикс. суммы по типам билетов' }
  )

type EditFormData = z.infer<typeof editSchema>

function EarningsPreviewTable({
  tour,
  formValues,
}: {
  tour: EditTour
  formValues: Record<string, unknown>
}) {
  const data = formValues || {}
  const ownerMinAdult =
    Number(data.owner_min_adult_price) ||
    Number(tour.owner_min_adult_price) ||
    Number(tour.partner_min_adult_price) ||
    0
  const ownerMinChild =
    Number(data.owner_min_child_price) ||
    Number(tour.owner_min_child_price) ||
    Number(tour.partner_min_child_price) ||
    0
  const ownerMinConcession =
    Number(data.owner_min_concession_price) ||
    Number(tour.owner_min_concession_price) ||
    Number(tour.partner_min_concession_price) ||
    0
  const commissionType =
    (data.commission_type as string) || tour.commission_type || 'percentage'
  const commissionPercent =
    data.commission_percentage != null
      ? Number(data.commission_percentage)
      : Number(tour.commission_percentage) || 0
  const commissionFixed =
    data.commission_fixed_amount != null
      ? Number(data.commission_fixed_amount)
      : Number(tour.commission_fixed_amount) || 0
  const commissionFixedAdult =
    data.commission_fixed_adult != null
      ? Number(data.commission_fixed_adult)
      : tour.commission_fixed_adult != null
        ? Number(tour.commission_fixed_adult)
        : null
  const commissionFixedChild =
    data.commission_fixed_child != null
      ? Number(data.commission_fixed_child)
      : tour.commission_fixed_child != null
        ? Number(tour.commission_fixed_child)
        : null
  const commissionFixedConcession =
    data.commission_fixed_concession != null
      ? Number(data.commission_fixed_concession)
      : tour.commission_fixed_concession != null
        ? Number(tour.commission_fixed_concession)
        : null
  const rulesRaw =
    (data.commission_rules as Array<{
      threshold_adult: number
      threshold_child: number
      threshold_concession: number
      commission_percentage: number
    }>) || []
  const rules = rulesRaw
    .filter((r) => r && (r.commission_percentage ?? 0) >= 0)
    .map((r) => ({
      threshold_adult: Number(r.threshold_adult ?? 0),
      threshold_child: Number(r.threshold_child ?? 0),
      threshold_concession: Number(r.threshold_concession ?? 0),
      commission_percentage: Number(r.commission_percentage ?? 0),
    }))

  const tourParams: TourParams = {
    partner_min_adult_price: Number(tour.partner_min_adult_price),
    partner_min_child_price: Number(tour.partner_min_child_price),
    partner_min_concession_price:
      tour.partner_min_concession_price != null
        ? Number(tour.partner_min_concession_price)
        : 0,
    partner_commission_type:
      (tour.partner_commission_type as 'fixed' | 'percentage') ??
      (tour.partner_commission_percentage != null ? 'percentage' : 'fixed'),
    partner_fixed_adult_price:
      tour.partner_fixed_adult_price != null
        ? Number(tour.partner_fixed_adult_price)
        : null,
    partner_fixed_child_price:
      tour.partner_fixed_child_price != null
        ? Number(tour.partner_fixed_child_price)
        : null,
    partner_fixed_concession_price:
      tour.partner_fixed_concession_price != null
        ? Number(tour.partner_fixed_concession_price)
        : null,
    partner_commission_percentage:
      tour.partner_commission_percentage != null
        ? Number(tour.partner_commission_percentage)
        : null,
    owner_min_adult_price: ownerMinAdult,
    owner_min_child_price: ownerMinChild,
    owner_min_concession_price: ownerMinConcession,
    commission_type: commissionType as 'percentage' | 'fixed',
    commission_percentage:
      commissionType === 'percentage' ? commissionPercent : undefined,
    commission_fixed_amount:
      commissionType === 'fixed' &&
      !commissionFixedAdult &&
      !commissionFixedChild &&
      !commissionFixedConcession
        ? commissionFixed
        : undefined,
    commission_fixed_adult:
      commissionType === 'fixed' ? commissionFixedAdult : undefined,
    commission_fixed_child:
      commissionType === 'fixed' ? commissionFixedChild : undefined,
    commission_fixed_concession:
      commissionType === 'fixed' ? commissionFixedConcession : undefined,
    commission_rules: rules.length ? rules : undefined,
  }

  const rowLabels = ['1 взрослый', '1 детский', '1 льготный']

  const renderTable = (
    rows: { sale: { total_amount: number }; split: { promoter: number; owner: number } }[]
  ) => (
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
          <tr
            key={i}
            className={row.split.owner <= 0 ? 'text-red-300' : 'text-white/80'}
          >
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
      const rows = scenarios.map((s) => ({
        sale: s,
        split: calcIncomeSplit(s, { ...tourParams, commission_rules: [rule] }),
      }))
      if (rows.some((r) => r.split.owner <= 0)) hasNegativeOwner = true
    }
  } else {
    const scenarios = getPreviewScenarios(tourParams)
    const rows = scenarios.map((s) => ({
      sale: s,
      split: calcIncomeSplit(s, tourParams),
    }))
    hasNegativeOwner = rows.some((r) => r.split.owner <= 0)
  }

  return (
    <div className="p-4 glass rounded-xl border border-white/10">
      <h3 className="font-semibold mb-3 text-white">Расчёт</h3>
      {hasNegativeOwner && (
        <div className="mb-3 p-3 bg-red-500/20 border border-red-400/50 rounded-lg text-red-200 text-sm">
          ⚠️ При некоторых сценариях владелец не зарабатывает (доход ≤ 0).
        </div>
      )}
      <div className="space-y-6">
        <div>
          <p className="text-sm text-white/70 mb-2">По мин. ценам</p>
          <div className="overflow-x-auto">
            {renderTable(
              getPreviewScenarios(tourParams).map((s) => ({
                sale: s,
                split: calcIncomeSplit(s, tourParams),
              }))
            )}
          </div>
        </div>
        {rules.length > 0 &&
          rules.map((rule, ruleIdx) => {
            const scenarios = getPreviewScenariosForRule(tourParams, rule)
            const paramsForRule = { ...tourParams, commission_rules: [rule] }
            const rows = scenarios.map((s) => ({
              sale: s,
              split: calcIncomeSplit(s, paramsForRule),
            }))
            return (
              <div
                key={ruleIdx}
                className="border border-white/10 rounded-lg p-3 bg-white/5"
              >
                <p className="text-sm text-white/90 mb-2">
                  Порог: взр. {Number(rule.threshold_adult).toFixed(0)}₽, дет.{' '}
                  {Number(rule.threshold_child).toFixed(0)}₽, льг.{' '}
                  {Number(rule.threshold_concession).toFixed(0)}₽ →{' '}
                  {Number(rule.commission_percentage).toFixed(0)}%
                </p>
                <div className="overflow-x-auto">{renderTable(rows)}</div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export default function OwnerTourEditPage() {
  const params = useParams()
  const router = useRouter()
  const { token, user } = useAuthStore()
  const tourId = params.id as string

  const [tour, setTour] = useState<EditTour | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>('percentage')
  const [weekDates, setWeekDates] = useState<{ dateStr: string; dayName: string; dayOfMonth: number }[]>([])
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      commission_type: 'percentage',
      commission_rules: [] as {
        threshold_adult: number
        threshold_child: number
        threshold_concession: number
        commission_percentage: number
      }[],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'commission_rules' as const,
  })

  const commission_type = watch('commission_type')
  const formValues = watch()

  useEffect(() => {
    if (commission_type) setCommissionType(commission_type)
  }, [commission_type])

  useEffect(() => {
    if (token) fetchTour()
  }, [token, tourId])

  useEffect(() => {
    fetch('/api/moscow-week', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => d.success && setWeekDates(d.data))
  }, [])

  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev)
      if (next.has(dateStr)) next.delete(dateStr)
      else next.add(dateStr)
      return next
    })
  }

  const getFlightsForDate = (dateStr: string) =>
    (tour?.flights || []).filter((f) => {
      const d = typeof f.date === 'string' ? f.date.split('T')[0] : new Date(f.date).toISOString().split('T')[0]
      return d === dateStr
    })

  const fetchTour = async () => {
    try {
      const response = await fetch(`/api/tours/${tourId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setTour(data.data)
      }
      const rulesRes = await fetch(`/api/tours/${tourId}/commission-rules`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const rulesData = await rulesRes.json()
      if (
        rulesData.success &&
        Array.isArray(rulesData.data) &&
        rulesData.data.length > 0
      ) {
        setValue(
          'commission_rules',
          rulesData.data.map((r: { threshold_adult?: number; threshold_child?: number; threshold_concession?: number; threshold_amount?: number; commission_percentage?: number }) => ({
            threshold_adult: Number(r.threshold_adult ?? r.threshold_amount ?? 0),
            threshold_child: Number(r.threshold_child ?? r.threshold_amount ?? 0),
            threshold_concession: Number(r.threshold_concession ?? r.threshold_amount ?? 0),
            commission_percentage: Number(r.commission_percentage ?? 0),
          }))
        )
      }
    } catch (err) {
      console.error('Error fetching tour:', err)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: EditFormData) => {
    if (!tour) return
    if (selectedDates.size === 0 && (tour.flights?.length ?? 0) > 0) {
      setError('Выберите дни для применения изменений')
      return
    }
    setError(null)
    setSaving(true)

    const rulesRaw = (data.commission_rules || []).filter(
      (r) =>
        r &&
        Number.isFinite(Number(r.commission_percentage ?? 0)) &&
        (r.commission_percentage ?? 0) >= 0
    )
    const rules = rulesRaw.map((r) => ({
      threshold_adult: Number(r.threshold_adult ?? 0) || 0,
      threshold_child: Number(r.threshold_child ?? 0) || 0,
      threshold_concession: Number(r.threshold_concession ?? 0) || 0,
      commission_percentage: Number(r.commission_percentage ?? 0) || 0,
    }))

    const tourParams: TourParams = {
      partner_min_adult_price: Number(tour.partner_min_adult_price),
      partner_min_child_price: Number(tour.partner_min_child_price),
      partner_min_concession_price:
        tour.partner_min_concession_price != null
          ? Number(tour.partner_min_concession_price)
          : 0,
      partner_commission_type:
        (tour.partner_commission_type as 'fixed' | 'percentage') ??
        (tour.partner_commission_percentage != null ? 'percentage' : 'fixed'),
      partner_fixed_adult_price: tour.partner_fixed_adult_price != null ? Number(tour.partner_fixed_adult_price) : null,
      partner_fixed_child_price: tour.partner_fixed_child_price != null ? Number(tour.partner_fixed_child_price) : null,
      partner_fixed_concession_price: tour.partner_fixed_concession_price != null ? Number(tour.partner_fixed_concession_price) : null,
      partner_commission_percentage: tour.partner_commission_percentage != null ? Number(tour.partner_commission_percentage) : null,
      owner_min_adult_price: Number(data.owner_min_adult_price),
      owner_min_child_price: Number(data.owner_min_child_price),
      owner_min_concession_price: Number(data.owner_min_concession_price) || 0,
      commission_type: data.commission_type,
      commission_percentage: data.commission_percentage,
      commission_fixed_amount: data.commission_fixed_amount,
      commission_fixed_adult: data.commission_fixed_adult,
      commission_fixed_child: data.commission_fixed_child,
      commission_fixed_concession: data.commission_fixed_concession,
      commission_rules: rules.length > 0 ? rules : undefined,
    }

    const checkScenario = (s: { total_amount: number; adult_count: number; child_count: number; concession_count: number; adult_price: number; child_price: number; concession_price: number }, params: TourParams) => {
      const split = calcIncomeSplit(s, params)
      return split.owner <= 0
    }

    const minScenarios = getPreviewScenarios(tourParams)
    const badMin = minScenarios.find((s) => checkScenario(s, tourParams))
    if (badMin) {
      setError(
        'Нельзя сохранить: при этих параметрах владелец не зарабатывает (доход ≤ 0). Уменьшите процент промоутера или увеличьте минимальные цены.'
      )
      setSaving(false)
      return
    }

    for (const rule of rules) {
      const ruleParams: TourParams = { ...tourParams, commission_rules: [rule] }
      const ruleScenarios = getPreviewScenariosForRule(tourParams, rule)
      const badRule = ruleScenarios.find((s) => checkScenario(s, ruleParams))
      if (badRule) {
        setError(
          `Нельзя сохранить: при пороге взр. ${rule.threshold_adult}₽, дет. ${rule.threshold_child}₽, льг. ${rule.threshold_concession}₽ (${rule.commission_percentage}%) владелец не зарабатывает. Уменьшите процент или измените пороги.`
        )
        setSaving(false)
        return
      }
    }

    try {
      const dates = (tour.flights?.length ?? 0) > 0 ? Array.from(selectedDates) : undefined
      const [minRes, commissionRes, rulesRes] = await Promise.all([
        fetch(`/api/tours/${tourId}/min-prices`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            owner_min_adult_price: data.owner_min_adult_price,
            owner_min_child_price: data.owner_min_child_price,
            owner_min_concession_price: data.owner_min_concession_price ?? undefined,
            dates,
          }),
        }),
        fetch(`/api/tours/${tourId}/commission`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            commission_type: data.commission_type,
            commission_percentage: data.commission_percentage,
            commission_fixed_amount: data.commission_fixed_amount,
            commission_fixed_adult: data.commission_fixed_adult,
            commission_fixed_child: data.commission_fixed_child,
            commission_fixed_concession: data.commission_fixed_concession,
          }),
        }),
        fetch(`/api/tours/${tourId}/commission-rules`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
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
        }),
      ])

      const minJson = await minRes.json()
      const commissionJson = await commissionRes.json()
      const rulesJson = await rulesRes.json()

      if (!minJson.success) {
        setError(minJson.error || 'Ошибка сохранения минимальных цен')
        return
      }
      if (!commissionJson.success) {
        setError(commissionJson.error || 'Ошибка сохранения модели оплаты')
        return
      }
      if (!rulesJson.success) {
        setError(rulesJson.error || 'Ошибка сохранения порогов')
        return
      }

      router.push('/dashboard/owner/tours')
    } catch (err) {
      setError('Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout
        title="Редактирование экскурсии"
        navItems={getNavForRole(user?.role || 'owner')}
      >
        <div className="px-4 py-6 sm:px-0">
          <p className="text-white/70">Загрузка...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!tour) {
    return (
      <DashboardLayout
        title="Редактирование экскурсии"
        navItems={getNavForRole(user?.role || 'owner')}
      >
        <div className="px-4 py-6 sm:px-0">
          <p className="text-white/70">Экскурсия не найдена</p>
          <Link href="/dashboard/owner/tours" className="text-blue-400 hover:underline mt-2 inline-block">
            ← К списку экскурсий
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  if (tour.moderation_status !== 'approved') {
    return (
      <DashboardLayout
        title="Редактирование экскурсии"
        navItems={getNavForRole(user?.role || 'owner')}
      >
        <div className="px-4 py-6 sm:px-0">
          <p className="text-white/70">
            Редактировать можно только одобренные экскурсии. Используйте модерацию для заявок на модерации.
          </p>
          <Link href="/dashboard/owner/tours" className="text-blue-400 hover:underline mt-2 inline-block">
            ← К списку экскурсий
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Редактирование экскурсии"
      navItems={getNavForRole(user?.role || 'owner')}
    >
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/dashboard/owner/tours"
            className="text-white/70 hover:text-white text-sm"
          >
            ← К списку экскурсий
          </Link>
        </div>

        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-6 text-white">Редактирование экскурсии</h2>

          <div className="mb-6 p-5 glass rounded-2xl border border-white/10">
            <h3 className="font-semibold text-lg text-white mb-4">Информация об экскурсии</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5">
                <span className="text-xs font-medium uppercase tracking-wider text-white/50">Компания</span>
                <span className="text-white font-medium">{tour.company}</span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5">
                <span className="text-xs font-medium uppercase tracking-wider text-white/50">Категория</span>
                <span className="text-white font-medium">{tour.category?.name ?? '—'}</span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wider text-white/50">Партнёр</span>
                <span className="text-white font-medium">{tour.createdBy?.full_name ?? '—'}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Минимальная цена взрослого (₽) *</label>
                <input
                  {...register('owner_min_adult_price', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={
                    Number(tour.owner_min_adult_price) || Number(tour.partner_min_adult_price)
                  }
                  className="input-glass"
                />
                {errors.owner_min_adult_price && (
                  <p className="text-red-300 text-xs mt-1">{errors.owner_min_adult_price.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Минимальная цена детского (₽) *</label>
                <input
                  {...register('owner_min_child_price', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={
                    Number(tour.owner_min_child_price) || Number(tour.partner_min_child_price)
                  }
                  className="input-glass"
                />
                {errors.owner_min_child_price && (
                  <p className="text-red-300 text-xs mt-1">{errors.owner_min_child_price.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Минимальная цена льготного (₽)</label>
                <input
                  {...register('owner_min_concession_price', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={
                    Number(tour.owner_min_concession_price) ||
                    Number(tour.partner_min_concession_price) ||
                    ''
                  }
                  className="input-glass"
                />
                {errors.owner_min_concession_price && (
                  <p className="text-red-300 text-xs mt-1">{errors.owner_min_concession_price.message}</p>
                )}
              </div>
            </div>

            <div className="p-4 glass rounded-xl border border-white/10">
              <h3 className="font-semibold mb-2 text-white">Модель оплаты промоутеру</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Тип *</label>
                  <select {...register('commission_type')} className="input-glass">
                    <option value="percentage">Процент от суммы продажи</option>
                    <option value="fixed">Фикс. сумма за билет каждого типа</option>
                  </select>
                </div>
                {commissionType === 'percentage' ? (
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Процент промоутера (%) *</label>
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
                        defaultValue={
                          Number(tour.commission_fixed_adult ?? tour.commission_fixed_amount) || 0
                        }
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
                        defaultValue={
                          Number(tour.commission_fixed_child ?? tour.commission_fixed_amount) || 0
                        }
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
                        defaultValue={
                          Number(tour.commission_fixed_concession ?? tour.commission_fixed_amount) ?? ''
                        }
                        className="input-glass"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 glass rounded-xl border border-white/10">
              <h3 className="font-semibold mb-2 text-white">Пороговые условия процента промоутера</h3>
              <p className="text-sm text-white/60 mb-4">
                Пороги по цене за билет. Если цена ≥ порога, применяется процент.
              </p>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex flex-wrap gap-2 items-end mb-3 p-3 bg-white/5 rounded-lg"
                >
                  <div className="min-w-[90px]">
                    <label className="block text-xs text-white/70 mb-1">Порог взр. (₽)</label>
                    <input
                      {...register(`commission_rules.${index}.threshold_adult`, {
                        valueAsNumber: true,
                      })}
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
                      {...register(`commission_rules.${index}.threshold_child`, {
                        valueAsNumber: true,
                      })}
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
                      {...register(`commission_rules.${index}.threshold_concession`, {
                        valueAsNumber: true,
                      })}
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
                      {...register(`commission_rules.${index}.commission_percentage`, {
                        valueAsNumber: true,
                      })}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="input-glass text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Удалить
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  append({
                    threshold_adult: 0,
                    threshold_child: 0,
                    threshold_concession: 0,
                    commission_percentage: 0,
                  })
                }
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                + Добавить условие
              </button>
            </div>

            {tour.flights && tour.flights.length > 0 && (
              <div className="p-4 glass rounded-xl border border-white/10">
                <h3 className="font-semibold mb-2 text-white">Применить к дням</h3>
                <p className="text-sm text-white/60 mb-4">Выберите дни текущей недели. Изменения применятся к рейсам на выбранные даты.</p>
                <div className="grid grid-cols-7 gap-2">
                  {weekDates.map(({ dateStr, dayName, dayOfMonth }) => {
                    const isSelected = selectedDates.has(dateStr)
                    const dayFlightsCount = getFlightsForDate(dateStr).length
                    return (
                      <div
                        key={dateStr}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleDate(dateStr)}
                        onKeyDown={(e) => e.key === 'Enter' && toggleDate(dateStr)}
                        className={`p-3 rounded-lg border text-center cursor-pointer transition ${
                          isSelected ? 'bg-purple-500/30 border-purple-400' : 'bg-white/5 border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-white/70 text-xs">{dayName}</div>
                        <div className="text-white font-semibold">{dayOfMonth}</div>
                        {dayFlightsCount > 0 && (
                          <div className="text-xs text-white/70 mt-1">{dayFlightsCount} рейс.</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <EarningsPreviewTable tour={tour} formValues={formValues} />

            {error && (
              <div className="alert-error">
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="flex space-x-4">
              <button type="submit" className="btn-primary flex-1" disabled={saving || ((tour.flights?.length ?? 0) > 0 && selectedDates.size === 0)}>
                {saving ? 'Сохранение...' : (tour.flights?.length ?? 0) > 0 ? `Применить к ${selectedDates.size} дн.` : 'Сохранить'}
              </button>
              <Link href="/dashboard/owner/tours" className="btn-secondary flex-1 text-center">
                Отмена
              </Link>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
