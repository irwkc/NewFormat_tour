'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

const acquiringReceiptSchema = z.object({
  receipt_photo: z.any(),
  customer_email: z.string().optional(),
})

type AcquiringReceiptFormData = z.infer<typeof acquiringReceiptSchema>

function AcquiringReceiptPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { token } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [sale, setSale] = useState<{ sale_number?: string | null; total_amount?: number | string } | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  const saleId = searchParams.get('sale_id')
  const [saleLoading, setSaleLoading] = useState(true)

  useEffect(() => {
    if (!saleId || !token) {
      setSaleLoading(false)
      return
    }
    setSaleLoading(true)
    fetch(`/api/sales/${saleId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setSale({
            sale_number: d.data.sale_number ?? null,
            total_amount: d.data.total_amount ?? 0,
          })
        } else {
          setSale(null)
        }
      })
      .catch(() => setSale(null))
      .finally(() => setSaleLoading(false))
  }, [saleId, token])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AcquiringReceiptFormData>({
    resolver: zodResolver(acquiringReceiptSchema),
  })

  const receiptPhoto = watch('receipt_photo')

  useEffect(() => {
    if (receiptPhoto && receiptPhoto.length > 0) {
      const file = receiptPhoto[0]
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPhotoPreview(null)
    }
  }, [receiptPhoto])

  const onSubmit = async (data: AcquiringReceiptFormData) => {
    if (!saleId) {
      setError('ID продажи не найден')
      return
    }

    try {
      setError(null)
      setLoading(true)

      const file = data.receipt_photo[0]
      const formData = new FormData()
      formData.append('photo', file)

      const uploadResponse = await fetch(`/api/sales/${saleId}/upload-receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      const uploadResult = await uploadResponse.json()
      if (!uploadResult.success) {
        setError(uploadResult.error || 'Ошибка загрузки чека')
        setLoading(false)
        return
      }

      const ticketResponse = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sale_id: saleId,
          customer_email: data.customer_email?.trim() || undefined,
        }),
      })

      const ticketResult = await ticketResponse.json()

      if (ticketResult.success) {
        router.push('/dashboard/promoter/sales')
      } else {
        setError(ticketResult.error || 'Ошибка создания билета')
      }
    } catch (err) {
      setError('Ошибка при создании билета')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!saleId || !token) {
      router.push('/dashboard/promoter/sales')
      return
    }
    try {
      setCancelLoading(true)
      await fetch(`/api/sales/${saleId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // ignore
    } finally {
      setCancelLoading(false)
      router.push('/dashboard/promoter/sales')
    }
  }

  const navItems = [
    { label: 'Продажи', href: '/dashboard/promoter/sales' },
    { label: 'История баланса', href: '/dashboard/promoter/balance-history' },
    { label: 'Выданные вещи', href: '/dashboard/promoter/issued-items' },
    { label: 'Реферальная программа', href: '/dashboard/promoter/invitations' },
  ]

  return (
    <DashboardLayout title="Ввод чека эквайринга" navItems={navItems}>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-6 text-white">Фото чека эквайринга</h2>

          <div className="mb-6 p-4 rounded-xl bg-white/10 border border-white/20 space-y-2">
            {saleLoading ? (
              <p className="text-white/70">Загрузка данных заказа...</p>
            ) : sale ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-white/60 text-sm">Код заказа (6 цифр с чека):</span>
                    <div className="text-2xl font-bold text-white tracking-widest mt-1">{sale.sale_number || '—'}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-white/60 text-sm">Сумма к оплате:</span>
                    <div className="text-2xl font-bold text-white mt-1">{Number(sale.total_amount ?? 0).toLocaleString('ru-RU')} ₽</div>
                  </div>
                </div>
                <p className="text-white/50 text-xs mt-2">Укажите этот код при проверке билета на посадке</p>
              </>
            ) : (
              <p className="text-white/70">Заказ не найден. Проверьте ссылку.</p>
            )}
          </div>

          <p className="text-white/70 text-sm mb-4">
            Билеты безномерные. Загрузите фото чека и завершите продажу. «Отмена» удалит незавершённую продажу (пока
            билет не создан).
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Email клиента (для отправки билета)
              </label>
              <input
                {...register('customer_email')}
                type="email"
                className="input-glass"
                placeholder="client@example.com"
              />
              {errors.customer_email && (
                <p className="text-red-300 text-xs mt-1">{errors.customer_email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Фото чека эквайринга *
              </label>
              <input
                {...register('receipt_photo')}
                type="file"
                accept="image/*"
                className="input-glass"
              />
              {photoPreview && (
                <img src={photoPreview} alt="Preview" className="mt-2 max-w-xs rounded-2xl" />
              )}
              {errors.receipt_photo && (
                <p className="text-red-300 text-xs mt-1">
                  {typeof errors.receipt_photo === 'object' && 'message' in errors.receipt_photo 
                    ? String(errors.receipt_photo.message) 
                    : 'Ошибка загрузки фото'}
                </p>
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
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? 'Создание...' : 'Создать билет'}
              </button>
              <button
                type="button"
                disabled={cancelLoading}
                onClick={() => void handleCancel()}
                className="btn-secondary flex-1"
              >
                {cancelLoading ? 'Отмена…' : 'Отмена'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function PromoterAcquiringReceiptPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AcquiringReceiptPageContent />
    </Suspense>
  )
}
