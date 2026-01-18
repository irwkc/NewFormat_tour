'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const moderateSchema = z.object({
  moderation_status: z.enum(['approved', 'rejected']),
  owner_min_adult_price: z.number().positive(),
  owner_min_child_price: z.number().positive(),
  commission_type: z.enum(['percentage', 'fixed']),
  commission_percentage: z.number().positive().optional(),
  commission_fixed_amount: z.number().positive().optional(),
}).refine((data) => {
  if (data.commission_type === 'percentage') {
    return data.commission_percentage !== undefined
  } else {
    return data.commission_fixed_amount !== undefined
  }
}, {
  message: "commission_percentage or commission_fixed_amount is required",
})

type ModerateFormData = z.infer<typeof moderateSchema>

export default function ModerateTourPage() {
  const params = useParams()
  const router = useRouter()
  const { token } = useAuthStore()
  const tourId = params.id as string
  
  const [tour, setTour] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>('percentage')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ModerateFormData>({
    resolver: zodResolver(moderateSchema),
    defaultValues: {
      commission_type: 'percentage',
    },
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
        // Установить значения по умолчанию
        if (data.data.owner_min_adult_price) {
          // Значения уже установлены
        }
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

      const response = await fetch(`/api/tours/${tourId}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        router.push('/dashboard/owner/moderation')
      } else {
        setError(result.error || 'Ошибка модерации')
      }
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
              <p><strong className="text-white/90">Рейс:</strong> {tour.flight_number}</p>
              <p><strong className="text-white/90">Категория:</strong> {tour.category?.name}</p>
              <p><strong className="text-white/90">Дата:</strong> {new Date(tour.date).toLocaleDateString('ru-RU')}</p>
              <p><strong className="text-white/90">Время отправления:</strong> {new Date(tour.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
              <p><strong className="text-white/90">Мест:</strong> {tour.max_places}</p>
              <p><strong className="text-white/90">Цены партнера:</strong> Взрослый: {Number(tour.partner_min_adult_price).toFixed(2)}₽, Детский: {Number(tour.partner_min_child_price).toFixed(2)}₽</p>
              <p><strong className="text-white/90">Партнер:</strong> {tour.createdBy?.full_name}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Тип комиссии *
              </label>
              <select
                {...register('commission_type')}
                className="input-glass"
              >
                <option value="percentage">Процент</option>
                <option value="fixed">Фиксированная сумма</option>
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
                  Фиксированная сумма комиссии (₽) *
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
