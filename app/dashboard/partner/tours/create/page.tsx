'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

type CategoryOption = {
  id: string
  name: string
}

const numOr = (fallback: number) =>
  z.preprocess((v) => {
    const n = Number(v)
    return v === '' || v === null || v === undefined || Number.isNaN(n) ? fallback : n
  }, z.number())

const numOptional = z.preprocess((v) => {
  const n = Number(v)
  return v === '' || v === null || v === undefined || Number.isNaN(n) ? undefined : n
}, z.number().optional())

const flightSchema = z.object({
  flight_number: z.string().min(1, 'Номер рейса обязателен'),
  departure_time: z.string().min(1, 'Время отправления обязательно'),
  date: z.string().date('Неверный формат даты'),
  duration_minutes: numOptional.pipe(z.union([z.number().int().positive(), z.undefined()])),
  max_places: numOr(1).pipe(z.number().int().positive('Количество мест должно быть положительным')),
  boarding_location_url: z.string().url().optional().or(z.literal('')),
})

const createTourSchema = z.object({
  category_id: z.string().min(1, 'Выберите категорию'),
  company: z.string().min(1, 'Название компании обязательно'),
  partner_min_adult_price: numOr(0).pipe(z.number().min(0.01, 'Мин. цена взрослого обязательна')),
  partner_min_child_price: numOr(0).pipe(z.number().min(0.01, 'Мин. цена детского обязательна')),
  partner_min_concession_price: numOptional.pipe(z.union([z.number().min(0), z.undefined()])),
  partner_commission_type: z.enum(['fixed', 'percentage']),
  partner_fixed_adult_price: numOptional.pipe(z.union([z.number().min(0), z.undefined()])),
  partner_fixed_child_price: numOptional.pipe(z.union([z.number().min(0), z.undefined()])),
  partner_fixed_concession_price: numOptional.pipe(z.union([z.number().min(0), z.undefined()])),
  partner_commission_percentage: numOptional.pipe(z.union([z.number().min(0).max(100), z.undefined()])),
  flights: z.array(flightSchema).min(1, 'Необходимо добавить хотя бы один рейс'),
}).refine((data) => {
  if (data.partner_commission_type === 'percentage') {
    return (data.partner_commission_percentage ?? 0) > 0
  }
  return true
}, { message: 'Укажите процент партнёра', path: ['partner_commission_percentage'] })

type CreateTourFormData = z.infer<typeof createTourSchema>

export default function CreateTourPage() {
  const router = useRouter()
  const { token } = useAuthStore()
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateTourFormData>({
    mode: 'onTouched',
    resolver: zodResolver(createTourSchema),
    defaultValues: {
      partner_commission_type: 'fixed',
      partner_min_adult_price: 0,
      partner_min_child_price: 0,
      partner_fixed_adult_price: undefined,
      partner_fixed_child_price: undefined,
      partner_fixed_concession_price: undefined,
      partner_commission_percentage: undefined,
      flights: [
        {
          flight_number: '',
          departure_time: '',
          date: '',
          duration_minutes: undefined,
          max_places: 1,
          boarding_location_url: '',
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'flights',
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

      // Форматировать даты и время для каждого рейса
      const formattedFlights = data.flights.map(flight => ({
        ...flight,
        departure_time: new Date(`${flight.date}T${flight.departure_time}`).toISOString(),
        duration_minutes: flight.duration_minutes || undefined,
      }))

      const response = await fetch('/api/tours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_id: data.category_id,
          company: data.company,
          partner_min_adult_price: data.partner_min_adult_price,
          partner_min_child_price: data.partner_min_child_price,
          partner_min_concession_price: data.partner_min_concession_price ?? null,
          partner_commission_type: data.partner_commission_type,
          partner_fixed_adult_price: data.partner_commission_type === 'fixed' ? (data.partner_fixed_adult_price ?? data.partner_min_adult_price) : null,
          partner_fixed_child_price: data.partner_commission_type === 'fixed' ? (data.partner_fixed_child_price ?? data.partner_min_child_price) : null,
          partner_fixed_concession_price: data.partner_commission_type === 'fixed' ? data.partner_fixed_concession_price ?? null : null,
          partner_commission_percentage: data.partner_commission_type === 'percentage' ? data.partner_commission_percentage ?? null : null,
          flights: formattedFlights,
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

  const addFlight = () => {
    append({
      flight_number: '',
      departure_time: '',
      date: '',
      duration_minutes: undefined,
      max_places: 1,
      boarding_location_url: '',
    })
  }

  const navItems = [
    { label: 'Мои экскурсии', href: '/dashboard/partner/tours' },
    { label: 'Проверка билетов', href: '/dashboard/partner/tickets/check' },
    { label: 'Статистика', href: '/dashboard/partner/statistics' },
    { label: 'Настройки', href: '/dashboard/partner/settings' },
  ]

  return (
    <DashboardLayout title="Создание экскурсии" navItems={navItems}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-6 text-white">Создать экскурсию</h2>

          <form
            onSubmit={handleSubmit(
              onSubmit,
              (err) => {
                const collect = (obj: object): string[] => {
                  const out: string[] = []
                  for (const v of Object.values(obj)) {
                    if (v && typeof v === 'object' && 'message' in v) out.push(String((v as { message: string }).message))
                    else if (v && typeof v === 'object') out.push(...collect(v as Record<string, unknown>))
                  }
                  return out
                }
                const msgs = collect(err as object)
                setError(msgs.length ? msgs.join('. ') : 'Заполните обязательные поля')
                setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
              }
            )}
            className="space-y-6"
          >
            {error && (
              <div ref={errorRef} className="alert-error">
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
            {/* Основная информация об экскурсии */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white/90">Основная информация</h3>
              
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
                  Минимальные цены билетов *
                </label>
                <p className="text-sm text-white/60 mb-3">Партнёр всегда указывает мин. цену каждого типа билета.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Мин. цена взрослого (₽) *</label>
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
                    <label className="block text-sm font-medium text-white/70 mb-2">Мин. цена детского (₽) *</label>
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
                    <label className="block text-sm font-medium text-white/70 mb-2">Мин. цена льготного (₽)</label>
                    <input
                      {...register('partner_min_concession_price', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-glass"
                    />
                  </div>
                </div>

                <label className="block text-sm font-medium text-white/90 mb-2">
                  Доля партнёра с каждого билета *
                </label>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      {...register('partner_commission_type')}
                      value="fixed"
                      className="rounded"
                    />
                    <span className="text-white/90">Фиксированная сумма с билета каждого типа</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      {...register('partner_commission_type')}
                      value="percentage"
                      className="rounded"
                    />
                    <span className="text-white/90">Процент от суммы продажи</span>
                  </label>
                </div>

                {watch('partner_commission_type') === 'fixed' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Фикс. с взрослого (₽)</label>
                      <input
                        {...register('partner_fixed_adult_price', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        className="input-glass"
                        placeholder="= мин. цене"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Фикс. с детского (₽)</label>
                      <input
                        {...register('partner_fixed_child_price', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        className="input-glass"
                        placeholder="= мин. цене"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Фикс. с льготного (₽)</label>
                      <input
                        {...register('partner_fixed_concession_price', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        className="input-glass"
                        placeholder="= мин. цене"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="max-w-xs">
                    <label className="block text-sm font-medium text-white/70 mb-2">Процент партнёра (%) *</label>
                    <input
                      {...register('partner_commission_percentage', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="input-glass"
                      placeholder="60"
                    />
                    {errors.partner_commission_percentage && (
                      <p className="text-red-300 text-xs mt-1">{errors.partner_commission_percentage.message}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Рейсы */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white/90">Рейсы *</h3>
                <button
                  type="button"
                  onClick={addFlight}
                  className="btn-secondary text-sm"
                >
                  + Добавить рейс
                </button>
              </div>

              {errors.flights && (
                <p className="text-red-300 text-xs">{errors.flights.message}</p>
              )}

              {fields.map((field, index) => (
                <div key={field.id} className="glass p-4 rounded-xl space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-md font-medium text-white/90">Рейс {index + 1}</h4>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Удалить
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Номер рейса *
                      </label>
                      <input
                        {...register(`flights.${index}.flight_number`)}
                        type="text"
                        className="input-glass"
                        placeholder="Номер рейса"
                      />
                      {errors.flights?.[index]?.flight_number && (
                        <p className="text-red-300 text-xs mt-1">
                          {errors.flights[index]?.flight_number?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Максимальное количество мест *
                      </label>
                      <input
                        {...register(`flights.${index}.max_places`, { valueAsNumber: true })}
                        type="number"
                        min="1"
                        className="input-glass"
                      />
                      {errors.flights?.[index]?.max_places && (
                        <p className="text-red-300 text-xs mt-1">
                          {errors.flights[index]?.max_places?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Дата *
                      </label>
                      <input
                        {...register(`flights.${index}.date`)}
                        type="date"
                        className="input-glass"
                      />
                      {errors.flights?.[index]?.date && (
                        <p className="text-red-300 text-xs mt-1">
                          {errors.flights[index]?.date?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Время отправления *
                      </label>
                      <input
                        {...register(`flights.${index}.departure_time`)}
                        type="time"
                        className="input-glass"
                      />
                      {errors.flights?.[index]?.departure_time && (
                        <p className="text-red-300 text-xs mt-1">
                          {errors.flights[index]?.departure_time?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Длительность (мин)
                      </label>
                      <input
                        {...register(`flights.${index}.duration_minutes`, { valueAsNumber: true })}
                        type="number"
                        min="1"
                        className="input-glass"
                        placeholder="90"
                      />
                      {errors.flights?.[index]?.duration_minutes && (
                        <p className="text-red-300 text-xs mt-1">
                          {errors.flights[index]?.duration_minutes?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Ссылка на Яндекс.Карты (точка посадки)
                    </label>
                    <input
                      {...register(`flights.${index}.boarding_location_url`)}
                      type="url"
                      className="input-glass"
                      placeholder="https://yandex.ru/maps/..."
                    />
                    {errors.flights?.[index]?.boarding_location_url && (
                      <p className="text-red-300 text-xs mt-1">
                        {errors.flights[index]?.boarding_location_url?.message}
                      </p>
                    )}
                    <p className="text-xs text-white/60 mt-1">
                      Укажите ссылку на Яндекс.Карты с точкой посадки для этого рейса
                    </p>
                  </div>
                </div>
              ))}
            </div>

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
