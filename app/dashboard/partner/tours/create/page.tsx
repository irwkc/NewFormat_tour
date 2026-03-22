'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { getNavForRole } from '@/lib/dashboard-nav'
import { customConfirm } from '@/utils/modals'

type CategoryOption = {
  id: string
  name: string
}

const createTourSchema = z.object({
  category_id: z.string().min(1, 'Выберите категорию'),
  company: z.string().min(1, 'Название компании обязательно'),
  description: z.string().optional(),
})

type CreateTourFormData = z.infer<typeof createTourSchema>

export default function CreateTourPage() {
  const router = useRouter()
  const { token, user } = useAuthStore()
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [photos, setPhotos] = useState<string[]>([])
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
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => d.success && setCategories(d.data))
  }, [])

  const addPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setPhotos((p) => [...p, base64])
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removePhoto = (index: number) => {
    setPhotos((p) => p.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: CreateTourFormData) => {
    try {
      setError(null)
      setLoading(true)

      const response = await fetch('/api/tours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_id: data.category_id,
          company: data.company,
          description: data.description || null,
          photos,
        }),
      })

      const result = await response.json()

      if (result.success) {
        const goEdit = await customConfirm(
          'Экскурсия создана. Перейти к настройке расписания и цен?'
        )
        if (goEdit) {
          router.push(`/dashboard/partner/tours/${result.data.id}/edit`)
        } else {
          router.push('/dashboard/partner')
        }
      } else {
        setError(result.error || 'Ошибка создания экскурсии')
      }
    } catch {
      setError('Ошибка при создании экскурсии')
    } finally {
      setLoading(false)
    }
  }

  const navItems = getNavForRole(user?.role || 'partner')

  return (
    <DashboardLayout title="Создать экскурсию" navItems={navItems}>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-6 text-white">Создать экскурсию</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white/90">Основная информация</h3>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Категория *</label>
                <select {...register('category_id')} className="input-glass">
                  <option value="">Выберите категорию</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.category_id && (
                  <p className="text-red-300 text-xs mt-1">{errors.category_id.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Компания *</label>
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
                <label className="block text-sm font-medium text-white/90 mb-2">Описание</label>
                <textarea
                  {...register('description')}
                  className="input-glass min-h-[100px]"
                  placeholder="Описание экскурсии"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Фото</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={addPhoto}
                  className="hidden"
                  id="tour-photo"
                />
                <label
                  htmlFor="tour-photo"
                  className="inline-block btn-secondary cursor-pointer"
                >
                  + Добавить фото
                </label>
                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {photos.map((src, i) => (
                      <div key={i} className="relative">
                        <img
                          src={src}
                          alt=""
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="alert-error">
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="flex gap-4">
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Создание...' : 'Создать'}
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
