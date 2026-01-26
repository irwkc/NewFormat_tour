'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

const flightSchema = z.object({
  flight_number: z.string().min(1, 'Номер рейса обязателен'),
  departure_time: z.string().min(1, 'Время отправления обязательно'),
  date: z.string().date('Неверный формат даты'),
  max_places: z.number().int().positive('Количество мест должно быть положительным'),
  boarding_location_url: z.string().url().optional().or(z.literal('')),
})

const createTourSchema = z.object({
  category_id: z.string().uuid('Выберите категорию'),
  company: z.string().min(1, 'Название компании обязательно'),
  partner_min_adult_price: z.number().positive('Цена должна быть положительной'),
  partner_min_child_price: z.number().positive('Цена должна быть положительной'),
  partner_min_concession_price: z.number().positive().optional(),
  flights: z.array(flightSchema).min(1, 'Необходимо добавить хотя бы один рейс'),
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
    control,
    formState: { errors },
  } = useForm<CreateTourFormData>({
    resolver: zodResolver(createTourSchema),
    defaultValues: {
      flights: [
        {
          flight_number: '',
          departure_time: '',
          date: '',
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
          partner_min_concession_price: data.partner_min_concession_price,
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
      max_places: 1,
      boarding_location_url: '',
    })
  }

  const navItems = [
    { label: 'Мои экскурсии', href: '/dashboard/partner/tours' },
    { label: 'Проверка билетов', href: '/dashboard/partner/tickets/check' },
    { label: 'Статистика', href: '/dashboard/partner/statistics' },
  ]

  return (
    <DashboardLayout title="Создание экскурсии" navItems={navItems}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-6 text-white">Создать экскурсию</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
