'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

const cashTicketSchema = z.object({
  ticket_number: z.string().regex(/^[A-Z]{2}\d{8}$/, 'Формат: AA00000000 (2 заглавные буквы + 8 цифр)'),
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

  const saleId = searchParams?.get('sale_id')

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

  return (
    <DashboardLayout title="Ввод билета (наличные)" navItems={navItems}>
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow-md rounded-lg p-6 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Ввод номера билета и фото</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Номер билета (формат: AA00000000) *
              </label>
              <input
                {...register('ticket_number')}
                type="text"
                pattern="[A-Z]{2}\d{8}"
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                placeholder="AB12345678"
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase()
                }}
              />
              {errors.ticket_number && (
                <p className="text-red-500 text-xs mt-1">{errors.ticket_number.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Формат: 2 заглавные английские буквы + 8 цифр</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Фото билета *
              </label>
              <input
                {...register('ticket_photo')}
                type="file"
                accept="image/*"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              {photoPreview && (
                <img src={photoPreview} alt="Preview" className="mt-2 max-w-xs rounded" />
              )}
              {errors.ticket_photo && (
                <p className="text-red-500 text-xs mt-1">
                  {typeof errors.ticket_photo === 'object' && 'message' in errors.ticket_photo 
                    ? String(errors.ticket_photo.message) 
                    : 'Ошибка загрузки фото'}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Создание...' : 'Создать билет'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
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
