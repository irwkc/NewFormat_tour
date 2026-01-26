'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

const createTourSchema = z.object({
  category_id: z.string().uuid(),
  company: z.string().min(1),
  departure_time: z.string(),
  date: z.string().date(),
  max_places: z.number().int().positive(),
  partner_min_adult_price: z.number().positive(),
  partner_min_child_price: z.number().positive(),
  partner_min_concession_price: z.number().positive().optional(),
  flight_number: z.string().min(1),
  boarding_location_url: z.string().url().optional().or(z.literal('')),
})

type CreateTourFormData = z.infer<typeof createTourSchema>

export default function CreateTourPage() {
  const router = useRouter()
  const { token } = useAuthStore()
  const [categories, setCategories] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTourFormData>({
    resolver: zodResolver(createTourSchema),
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const result = await response.json()
      if (result.success) {
        setCategories(result.data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const onSubmit = async (data: CreateTourFormData) => {
    try {
      setError(null)
      setLoading(true)

      // Форматировать дату и время
      const departureDateTime = new Date(`${data.date}T${data.departure_time}`)

      const response = await fetch('/api/tours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          departure_time: departureDateTime.toISOString(),
        }),
      })

      const result = await response.json()

      if (result.success) {
        router.push('/dashboard/partner/tours')
      } else {
        setError(result.error || 'Ошибка создания экскурсии')
      }
    } catch (err) {
      setError('Ошибка при создании экскурсии')
    } finally {
      setLoading(false)
    }
  }

  const navItems = [
    { label: 'Мои экскурсии', href: '/dashboard/partner/tours' },
    { label: 'Проверка билетов', href: '/dashboard/partner/tickets/check' },
    { label: 'Статистика', href: '/dashboard/partner/statistics' },
  ]

  return (
    <DashboardLayout title="Создание экскурсии" navItems={navItems}>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-6 text-white">Создать экскурсию</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Категория *
              </label>
              <select
                {...register('category_id')}
                className="input-glass"
              >
                <option value="">Выберите категорию</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p className="text-red-300 text-xs mt-1">{errors.category_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Компания *
              </label>
              <input
                {...register('company')}
                type="text"
                className="input-glass"
                placeholder="Название компании"
              />
              {errors.company && (
                <p className="text-red-300 text-xs mt-1">{errors.company.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Рейс *
              </label>
              <input
                {...register('flight_number')}
                type="text"
                className="input-glass"
                placeholder="Номер рейса"
              />
              {errors.flight_number && (
                <p className="text-red-300 text-xs mt-1">{errors.flight_number.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Ссылка на Яндекс.Карты (точка посадки)
              </label>
              <input
                {...register('boarding_location_url')}
                type="url"
                className="input-glass"
                placeholder="https://yandex.ru/maps/..."
              />
              {errors.boarding_location_url && (
                <p className="text-red-300 text-xs mt-1">{errors.boarding_location_url.message}</p>
              )}
              <p className="text-xs text-white/60 mt-1">
                Укажите ссылку на Яндекс.Карты с точкой посадки для экскурсии
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Дата *
                </label>
                <input
                  {...register('date')}
                  type="date"
                  className="input-glass"
                />
                {errors.date && (
                  <p className="text-red-300 text-xs mt-1">{errors.date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Время отправления *
                </label>
                <input
                  {...register('departure_time')}
                  type="time"
                  className="input-glass"
                />
                {errors.departure_time && (
                  <p className="text-red-300 text-xs mt-1">{errors.departure_time.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Максимальное количество мест *
              </label>
              <input
                {...register('max_places', { valueAsNumber: true })}
                type="number"
                min="1"
                className="input-glass"
              />
              {errors.max_places && (
                <p className="text-red-300 text-xs mt-1">{errors.max_places.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Минимальная цена взрослого билета (₽) *
                </label>
                <input
                  {...register('partner_min_adult_price', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-glass"
                />
                {errors.partner_min_adult_price && (
                  <p className="text-red-300 text-xs mt-1">{errors.partner_min_adult_price.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Минимальная цена детского билета (₽) *
                </label>
                <input
                  {...register('partner_min_child_price', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-glass"
                />
                {errors.partner_min_child_price && (
                  <p className="text-red-300 text-xs mt-1">{errors.partner_min_child_price.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Минимальная цена льготного билета (₽)
                </label>
                <input
                  {...register('partner_min_concession_price', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-glass"
                />
                {errors.partner_min_concession_price && (
                  <p className="text-red-300 text-xs mt-1">{errors.partner_min_concession_price.message}</p>
                )}
              </div>
            </div>

            {error && (
              <div className="alert-error">
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? 'Создание...' : 'Создать экскурсию'}
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
