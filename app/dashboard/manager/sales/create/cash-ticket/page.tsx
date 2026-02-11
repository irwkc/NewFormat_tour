'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

const cashTicketSchema = z.object({
  ticket_number: z.string().min(1, 'Выберите номер билета из переданных вам'),
  ticket_photo: z.any(),
})

type CashTicketFormData = z.infer<typeof cashTicketSchema>

function CashTicketPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { token } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [availableNumbers, setAvailableNumbers] = useState<string[]>([])
  const [availableLoading, setAvailableLoading] = useState(true)

  const saleId = searchParams?.get('sale_id')

  useEffect(() => {
    if (!token) return
    fetch('/api/manager-ticket-ranges/my-available', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) setAvailableNumbers(data.data)
      })
      .finally(() => setAvailableLoading(false))
  }, [token])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CashTicketFormData>({
    resolver: zodResolver(cashTicketSchema),
  })

  const ticketPhoto = watch('ticket_photo')

  // Обновление превью фото
  useEffect(() => {
    if (ticketPhoto && ticketPhoto.length > 0) {
      const file = ticketPhoto[0]
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPhotoPreview(null)
    }
  }, [ticketPhoto])

  const onSubmit = async (data: CashTicketFormData) => {
    if (!saleId) {
      setError('ID продажи не найден')
      return
    }

    try {
      setError(null)
      setLoading(true)

      // Конвертировать фото в base64
      const file = data.ticket_photo[0]
      const photoBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sale_id: saleId,
          ticket_number: data.ticket_number.toUpperCase(),
          photo: photoBase64,
        }),
      })

      const result = await response.json()

      if (result.success) {
        router.push('/dashboard/manager/sales')
      } else {
        setError(result.error || 'Ошибка создания билета')
      }
    } catch (err) {
      setError('Ошибка при создании билета')
    } finally {
      setLoading(false)
    }
  }

  const navItems = [
    { label: 'Продажи', href: '/dashboard/manager/sales' },
    { label: 'История баланса', href: '/dashboard/manager/balance-history' },
    { label: 'Выданные вещи', href: '/dashboard/manager/issued-items' },
  ]

  const noNumbers = !availableLoading && availableNumbers.length === 0

  return (
    <DashboardLayout title="Ввод билета (наличные)" navItems={navItems}>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-6 text-white">Ввод номера билета и фото</h2>

          {noNumbers && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-sm">
              Нет переданных вам билетов. Обратитесь к владельцу или его помощнику для передачи пронумерованных билетов.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Номер билета (из переданных вам) *
              </label>
              {availableLoading ? (
                <p className="text-white/60">Загрузка списка...</p>
              ) : (
                <select
                  {...register('ticket_number')}
                  className="input-glass w-full uppercase"
                  disabled={availableNumbers.length === 0}
                >
                  <option value="">— Выберите номер —</option>
                  {availableNumbers.map((num) => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              )}
              {errors.ticket_number && (
                <p className="text-red-300 text-xs mt-1">{errors.ticket_number.message}</p>
              )}
              <p className="text-xs text-white/60 mt-1">Доступны только номера, переданные вам владельцем</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Фото билета *
              </label>
              <input
                {...register('ticket_photo')}
                type="file"
                accept="image/*"
                className="input-glass"
              />
              {photoPreview && (
                <img src={photoPreview} alt="Preview" className="mt-2 max-w-xs rounded-2xl" />
              )}
              {errors.ticket_photo && (
                <p className="text-red-300 text-xs mt-1">
                  {typeof errors.ticket_photo === 'object' && 'message' in errors.ticket_photo 
                    ? String(errors.ticket_photo.message) 
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
                disabled={loading || noNumbers}
                className="btn-primary flex-1"
              >
                {loading ? 'Создание...' : 'Создать билет'}
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

export default function CashTicketPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CashTicketPageContent />
    </Suspense>
  )
}
