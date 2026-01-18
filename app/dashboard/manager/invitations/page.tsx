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
      <div className="space-y-6">
        <div className="glass-card">
          <h2 className="text-xl font-bold mb-4 text-white">Создать приглашение для промоутера</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input
              type="hidden"
              {...register('target_role')}
              value="promoter"
            />

            <button
              type="submit"
              className="btn-primary"
            >
              Создать приглашение
            </button>
          </form>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">Список приглашений</h2>
          </div>
          {loading ? (
            <div className="p-6 text-center text-white/70">Загрузка...</div>
          ) : invitations.length === 0 ? (
            <div className="p-6 text-center text-white/70">Нет приглашений</div>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="glass rounded-2xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-white">Промоутер</div>
                        <div className="text-sm text-white/70">
                          Создано: {new Date(invitation.created_at).toLocaleString('ru-RU')}
                        </div>
                        <div className="text-sm text-white/70">
                          Действительно до: {new Date(invitation.expires_at).toLocaleString('ru-RU')}
                        </div>
                        {invitation.is_used && invitation.usedBy && (
                          <div className="text-sm text-green-300 mt-1">
                            Использовано: {invitation.usedBy.full_name} ({invitation.usedBy.email})
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {invitation.is_used ? (
                          <span className="px-3 py-1 bg-green-300/30 text-green-200 rounded-full text-sm">
                            Использовано
                          </span>
                        ) : new Date(invitation.expires_at) < new Date() ? (
                          <span className="px-3 py-1 bg-red-300/30 text-red-200 rounded-full text-sm">
                            Истекло
                          </span>
                        ) : (
                          <>
                            <span className="px-3 py-1 bg-yellow-300/30 text-yellow-200 rounded-full text-sm">
                              Активно
                            </span>
                            <button
                              onClick={() => handleDelete(invitation.id)}
                              className="text-red-300 hover:text-red-200 text-sm transition-colors"
                            >
                              Отозвать
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {!invitation.is_used && new Date(invitation.expires_at) >= new Date() && (
                      <div className="mt-3">
                        <div className="text-sm font-medium mb-1 text-white/90">Ссылка для регистрации:</div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            readOnly
                            value={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/register/${invitation.token}`}
                            className="flex-1 input-glass text-sm"
                          />
                          <button
                            onClick={() => copyToClipboard(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/register/${invitation.token}`)}
                            className="btn-secondary text-sm px-3 py-2"
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
