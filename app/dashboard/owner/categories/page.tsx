'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { useForm } from 'react-hook-form'
import { customAlert, customConfirm } from '@/utils/modals'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const categorySchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
})

type CategoryFormData = z.infer<typeof categorySchema>

export default function OwnerCategoriesPage() {
  const { token } = useAuthStore()
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  })

  useEffect(() => {
    if (token) {
      fetchCategories()
    }
  }, [token])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setCategories(data.data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: CategoryFormData) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (result.success) {
        setShowForm(false)
        reset()
        fetchCategories()
      } else {
        await customAlert(result.error || 'Ошибка создания категории')
      }
    } catch (error) {
      await customAlert('Ошибка создания категории')
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await customConfirm('Удалить категорию?')
    if (!confirmed) return

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        fetchCategories()
      } else {
        await customAlert(result.error || 'Ошибка удаления категории')
      }
    } catch (error) {
      await customAlert('Ошибка удаления категории')
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
    { label: 'Настройки', href: '/dashboard/owner/settings' },
  ]

  return (
    <DashboardLayout title="Категории экскурсий" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Категории экскурсий</h2>
            <p className="text-white/70 text-sm mt-1">Управление категориями для организации экскурсий</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? 'Отмена' : '+ Создать категорию'}
          </button>
        </div>

        {showForm && (
          <div className="glass-card">
            <h3 className="text-lg font-semibold mb-4 text-white">Создать категорию</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Название категории
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="input-glass"
                  placeholder="Например: Теплоход, Катер"
                />
                {errors.name && (
                  <p className="text-red-300 text-xs mt-1.5">{errors.name.message}</p>
                )}
              </div>
              <button
                type="submit"
                className="btn-primary"
              >
                Создать
              </button>
            </form>
          </div>
        )}

        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">Список категорий</h2>
          </div>
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <span className="ml-3 text-white/70">Загрузка...</span>
              </div>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-white/60">
              <p className="text-lg mb-2">Нет категорий</p>
              <p className="text-sm">Создайте первую категорию для начала работы</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Создано</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td className="font-medium">
                        {category.name}
                      </td>
                      <td className="text-white/70">
                        {new Date(category.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="text-red-300 hover:text-red-200 font-medium hover:underline transition-colors"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}