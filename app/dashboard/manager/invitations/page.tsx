'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const createInvitationSchema = z.object({
  target_role: z.enum(['promoter']),
})

type CreateInvitationFormData = z.infer<typeof createInvitationSchema>

export default function InvitationsPage() {
  const { token } = useAuthStore()
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateInvitationFormData>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: {
      target_role: 'promoter',
    },
  })

  useEffect(() => {
    if (token) {
      fetchInvitations()
    }
  }, [token])

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/invitations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setInvitations(data.data)
      }
    } catch (error) {
      console.error('Error fetching invitations:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: CreateInvitationFormData) => {
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (result.success) {
        reset()
        fetchInvitations()
      } else {
        alert(result.error || 'Ошибка создания приглашения')
      }
    } catch (error) {
      alert('Ошибка создания приглашения')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Отозвать приглашение?')) return

    try {
      const response = await fetch(`/api/invitations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        fetchInvitations()
      } else {
        alert(result.error || 'Ошибка отзыва приглашения')
      }
    } catch (error) {
      alert('Ошибка отзыва приглашения')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Ссылка скопирована в буфер обмена')
  }

  const navItems = [
    { label: 'Продажи', href: '/dashboard/manager/sales' },
    { label: 'Баланс', href: '/dashboard/manager/balance-history' },
    { label: 'Выданные вещи', href: '/dashboard/manager/issued-items' },
    { label: 'Приглашения', href: '/dashboard/manager/invitations' },
  ]

  return (
    <DashboardLayout title="Приглашения" navItems={navItems}>
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Создать приглашение для промоутера</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input
              type="hidden"
              {...register('target_role')}
              value="promoter"
            />

            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Создать приглашение
            </button>
          </form>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">Список приглашений</h2>
          </div>
          {loading ? (
            <div className="p-6 text-center">Загрузка...</div>
          ) : invitations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Нет приглашений</div>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">Промоутер</div>
                        <div className="text-sm text-gray-600">
                          Создано: {new Date(invitation.created_at).toLocaleString('ru-RU')}
                        </div>
                        <div className="text-sm text-gray-600">
                          Действительно до: {new Date(invitation.expires_at).toLocaleString('ru-RU')}
                        </div>
                        {invitation.is_used && invitation.usedBy && (
                          <div className="text-sm text-green-600 mt-1">
                            Использовано: {invitation.usedBy.full_name} ({invitation.usedBy.email})
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {invitation.is_used ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                            Использовано
                          </span>
                        ) : new Date(invitation.expires_at) < new Date() ? (
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                            Истекло
                          </span>
                        ) : (
                          <>
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                              Активно
                            </span>
                            <button
                              onClick={() => handleDelete(invitation.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Отозвать
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {!invitation.is_used && new Date(invitation.expires_at) >= new Date() && (
                      <div className="mt-3">
                        <div className="text-sm font-medium mb-1">Ссылка для регистрации:</div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            readOnly
                            value={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/register/${invitation.token}`}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                          />
                          <button
                            onClick={() => copyToClipboard(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/register/${invitation.token}`)}
                            className="bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300 text-sm"
                          >
                            Копировать
                          </button>
                        </div>
                      </div>
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
