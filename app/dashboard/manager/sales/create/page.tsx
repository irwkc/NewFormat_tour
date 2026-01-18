'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import QRCode from 'qrcode'

const createSaleSchema = z.object({
  tour_id: z.string().uuid(),
  adult_count: z.number().int().positive(),
  child_count: z.number().int().min(0).default(0),
  adult_price: z.number().positive(),
  child_price: z.number().positive().optional(),
  payment_method: z.enum(['online_yookassa', 'cash', 'acquiring']),
  promoter_user_id: z.string().uuid().optional(),
  promoter_id: z.number().optional(),
  ticket_number: z.string().regex(/^[A-Z]{2}\d{8}$/).optional(),
  ticket_photo: z.any().optional(),
  receipt_photo: z.any().optional(),
})

type CreateSaleFormData = z.infer<typeof createSaleSchema>

export default function CreateSalePage() {
  const router = useRouter()
  const { token } = useAuthStore()
  const [tours, setTours] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [promoterInfo, setPromoterInfo] = useState<any>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [paymentLink, setPaymentLink] = useState<string | null>(null)
  const [saleId, setSaleId] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'cash-ticket' | 'acquiring-receipt' | 'cash-ticket-number' | 'success'>('form')

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
      payment_method: 'online_yookassa',
    },
  })

  const paymentMethod = watch('payment_method')
  const promoterId = watch('promoter_id')

  useEffect(() => {
    fetchTours()
  }, [token])

  useEffect(() => {
    if (promoterId && paymentMethod === 'cash' || paymentMethod === 'acquiring') {
      checkPromoter()
    } else {
      setPromoterInfo(null)
    }
  }, [promoterId, paymentMethod])

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

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          promoter_user_id: promoterUserId,
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
        setStep('acquiring-receipt')
      } else if (data.payment_method === 'cash') {
        setStep('cash-ticket')
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
  ]

  return (
    <DashboardLayout title="Создание продажи" navItems={navItems}>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-6 text-white">Создать продажу</h2>

          {step === 'form' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Экскурсия *
                </label>
                <select
                  {...register('tour_id')}
                  className="input-glass"
                >
                  <option value="">Выберите экскурсию</option>
                  {tours.map((tour) => (
                    <option key={tour.id} value={tour.id}>
                      {tour.company} - {tour.flight_number} ({new Date(tour.date).toLocaleDateString('ru-RU')})
                    </option>
                  ))}
                </select>
                {errors.tour_id && (
                  <p className="text-red-300 text-xs mt-1">{errors.tour_id.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  />
                  {errors.adult_price && (
                    <p className="text-red-300 text-xs mt-1">{errors.adult_price.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Цена детского билета (₽)
                  </label>
                  <input
                    {...register('child_price', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-glass"
                  />
                  {errors.child_price && (
                    <p className="text-red-300 text-xs mt-1">{errors.child_price.message}</p>
                  )}
                </div>
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
                  <option value="cash">Наличные</option>
                  <option value="acquiring">Эквайринг</option>
                </select>
                {errors.payment_method && (
                  <p className="text-red-300 text-xs mt-1">{errors.payment_method.message}</p>
                )}
              </div>

              {/* ID промоутера только для налички и эквайринга */}
              {(paymentMethod === 'cash' || paymentMethod === 'acquiring') && (
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    ID промоутера (опционально)
                  </label>
                  <input
                    {...register('promoter_id', { valueAsNumber: true })}
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
                    onClick={() => {
                      navigator.clipboard.writeText(paymentLink)
                      alert('Ссылка скопирована!')
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
