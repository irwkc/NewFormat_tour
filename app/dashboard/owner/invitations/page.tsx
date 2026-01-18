'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { customAlert, customConfirm } from '@/utils/modals'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const createInvitationSchema = z.object({
  target_role: z.enum(['manager', 'promoter', 'partner']),
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
      target_role: 'manager',
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
        await customAlert(result.error || 'Ошибка создания приглашения')
      }
    } catch (error) {
      await customAlert('Ошибка создания приглашения')
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await customConfirm('Отозвать приглашение?')
    if (!confirmed) return

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
        await customAlert(result.error || 'Ошибка отзыва приглашения')
      }
    } catch (error) {
      await customAlert('Ошибка отзыва приглашения')
    }
  }

  const copyToClipboard = async (text: string) => {
    navigator.clipboard.writeText(text)
    await customAlert('Ссылка скопирована в буфер обмена')
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
    <DashboardLayout title="Приглашения" navItems={navItems}>
      <div className="space-y-6">
        <div className="glass-card">
          <h2 className="text-xl font-bold mb-4 text-white">Создать приглашение</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Роль приглашаемого
              </label>
              <select
                {...register('target_role')}
                className="input-glass"
              >
                <option value="manager">Менеджер</option>
                <option value="promoter">Промоутер</option>
                <option value="partner">Партнер</option>
              </select>
              {errors.target_role && (
                <p className="text-red-300 text-xs mt-1">{errors.target_role.message}</p>
              )}
            </div>

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
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <span className="ml-3 text-white/70">Загрузка...</span>
              </div>
            </div>
          ) : invitations.length === 0 ? (
            <div className="p-6 text-center text-white/60">Нет приглашений</div>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="glass-card-light border border-white/20 p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-4 mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-white">
                          Роль: {invitation.target_role === 'manager' ? 'Менеджер' : 
                                 invitation.target_role === 'promoter' ? 'Промоутер' : 
                                 'Партнер'}
                        </div>
                        <div className="text-sm text-white/70 mt-1">
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
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        {invitation.is_used ? (
                          <span className="px-3 py-1 bg-green-500/30 text-green-200 rounded-full text-sm border border-green-400/30">
                            Использовано
                          </span>
                        ) : new Date(invitation.expires_at) < new Date() ? (
                          <span className="px-3 py-1 bg-red-500/30 text-red-200 rounded-full text-sm border border-red-400/30">
                            Истекло
                          </span>
                        ) : (
                          <>
                            <span className="px-3 py-1 bg-yellow-500/30 text-yellow-200 rounded-full text-sm border border-yellow-400/30">
                              Активно
                            </span>
                            <button
                              onClick={() => handleDelete(invitation.id)}
                              className="text-red-300 hover:text-red-200 text-sm font-medium transition-colors"
                            >
                              Отозвать
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {!invitation.is_used && new Date(invitation.expires_at) >= new Date() && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="text-sm font-medium mb-1 text-white/90">Ссылка для регистрации:</div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/register/${invitation.token}`}
                            className="flex-1 input-glass text-sm"
                          />
                          <button
                            onClick={() => copyToClipboard(`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/register/${invitation.token}`)}
                            className="btn-secondary text-sm"
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