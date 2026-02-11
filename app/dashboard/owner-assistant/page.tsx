'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { useForm } from 'react-hook-form'
import { customConfirm, customAlert } from '@/utils/modals'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const issueItemSchema = z.object({
  user_identifier: z.string().min(1, 'ID обязателен'),
  item_name: z.string().min(1, 'Название обязательно'),
  item_description: z.string().optional(),
  photo: z.any(),
})

type IssueItemFormData = z.infer<typeof issueItemSchema>

export default function OwnerAssistantDashboard() {
  const { token } = useAuthStore()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [userType, setUserType] = useState<'promoter' | 'manager'>('promoter')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IssueItemFormData>({
    resolver: zodResolver(issueItemSchema),
  })

  useEffect(() => {
    if (token) {
      fetchItems()
    }
  }, [token])

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/issued-items', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setItems(data.data)
      }
    } catch (error) {
      console.error('Error fetching issued items:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: IssueItemFormData) => {
    try {
      const file = (data.photo as FileList)[0]
      if (!file) {
        await customAlert('Фото обязательно')
        return
      }

      const photoBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const response = await fetch('/api/issued-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_identifier: data.user_identifier,
          item_name: data.item_name,
          item_description: data.item_description,
          photo: photoBase64,
        }),
      })

      const result = await response.json()
      if (result.success) {
        setShowForm(false)
        reset()
        fetchItems()
      } else {
        await customAlert(result.error || 'Ошибка выдачи вещи')
      }
    } catch (error) {
      await customAlert('Ошибка выдачи вещи')
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await customConfirm('Вернуть вещь?')
    if (!confirmed) return

    try {
      const response = await fetch(`/api/issued-items/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        fetchItems()
      } else {
        await customAlert(result.error || 'Ошибка возврата вещи')
      }
    } catch (error) {
      await customAlert('Ошибка возврата вещи')
    }
  }

  const navItems = [
    { label: 'Выдача вещей', href: '/dashboard/owner-assistant' },
    { label: 'Передача билетов', href: '/dashboard/owner/ticket-transfers' },
  ]

  return (
    <DashboardLayout title="Панель помощника владельца" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Выдача вещей</h2>
            <p className="text-white/70 text-sm mt-1">Управление выданными вещами</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? 'Отмена' : '+ Выдать вещь'}
          </button>
        </div>

        {showForm && (
          <div className="glass-card">
            <h3 className="text-lg font-semibold mb-4 text-white">Выдать вещь</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Тип пользователя
                </label>
                <div className="flex space-x-4 mb-4">
                  <button
                    type="button"
                    onClick={() => setUserType('promoter')}
                    className={`px-4 py-2 rounded-xl transition-all ${
                      userType === 'promoter'
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }`}
                  >
                    Промоутер
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType('manager')}
                    className={`px-4 py-2 rounded-xl transition-all ${
                      userType === 'manager'
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }`}
                  >
                    Менеджер
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {userType === 'promoter' ? 'ID промоутера' : 'Email менеджера'}
                </label>
                <input
                  {...register('user_identifier')}
                  type={userType === 'promoter' ? 'number' : 'email'}
                  className="input-glass"
                  placeholder={userType === 'promoter' ? '12345' : 'manager@example.com'}
                />
                {errors.user_identifier && (
                  <p className="text-red-300 text-xs mt-1">{errors.user_identifier.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Название вещи *
                </label>
                <input
                  {...register('item_name')}
                  type="text"
                  className="input-glass"
                  placeholder="Например: кофта, эквайринг"
                />
                {errors.item_name && (
                  <p className="text-red-300 text-xs mt-1">{errors.item_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Описание (опционально)
                </label>
                <textarea
                  {...register('item_description')}
                  rows={3}
                  className="input-glass"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Фото вещи *
                </label>
                <input
                  {...register('photo')}
                  type="file"
                  accept="image/*"
                  className="input-glass"
                />
                {errors.photo && (
                  <p className="text-red-300 text-xs mt-1">
                    {typeof errors.photo === 'object' && 'message' in errors.photo 
                      ? String(errors.photo.message) 
                      : 'Ошибка загрузки фото'}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary"
              >
                Выдать вещь
              </button>
            </form>
          </div>
        )}

        <div className="glass-card">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">История выданных вещей</h2>
          </div>
          {loading ? (
            <div className="p-6 text-center text-white/70">Загрузка...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-white/70">Нет выданных вещей</div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <div key={item.id} className="glass rounded-2xl p-4 border border-white/20">
                    {item.item_photo_url && (
                      <img
                        src={item.item_photo_url}
                        alt={item.item_name}
                        className="w-full h-48 object-cover rounded-xl mb-4"
                      />
                    )}
                    <h3 className="text-lg font-semibold mb-2 text-white">{item.item_name}</h3>
                    {item.item_description && (
                      <p className="text-sm text-white/70 mb-2">{item.item_description}</p>
                    )}
                    <p className="text-sm text-white/70 mb-2">
                      Выдано: {item.issuedTo.full_name} ({item.issuedTo.promoter_id ? `ID: ${item.issuedTo.promoter_id}` : item.issuedTo.email})
                    </p>
                    <p className="text-xs text-white/60 mb-2">
                      Дата: {new Date(item.created_at).toLocaleDateString('ru-RU')}
                    </p>
                    {item.is_returned ? (
                      <p className="text-xs text-red-300">
                        Возвращено: {new Date(item.returned_at!).toLocaleDateString('ru-RU')}
                      </p>
                    ) : (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="btn-danger text-xs px-3 py-1"
                      >
                        Вернуть вещь
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
