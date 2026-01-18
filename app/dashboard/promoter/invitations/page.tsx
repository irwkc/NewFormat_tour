'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { customAlert, customConfirm } from '@/utils/modals'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const createInvitationSchema = z.object({
  target_role: z.enum(['promoter']),
})

type CreateInvitationFormData = z.infer<typeof createInvitationSchema>

export default function PromoterInvitationsPage() {
  const { token } = useAuthStore()
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
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
    { label: 'Продажи', href: '/dashboard/promoter/sales' },
    { label: 'История баланса', href: '/dashboard/promoter/balance-history' },
    { label: 'Выданные вещи', href: '/dashboard/promoter/issued-items' },
    { label: 'Реферальная программа', href: '/dashboard/promoter/invitations' },
  ]

  return (
    <DashboardLayout title="Реферальная программа" navItems={navItems}>
      <div className="space-y-6">
        <div className="glass-card">
          <h2 className="text-xl font-bold mb-4 text-white">Пригласить промоутера</h2>
          
          <div className="bg-white/10 rounded-2xl p-4 mb-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">О реферальной программе</h3>
            <p className="text-white/90 text-sm mb-3">
              Приглашайте других промоутеров по реферальной ссылке и получайте бонусы!
            </p>
            <p className="text-white/90 text-sm">
              Каждый промоутер, зарегистрированный по вашей реферальной ссылке, принесет вам дополнительные преимущества в системе.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Роль приглашаемого
              </label>
              <div className="input-glass flex items-center px-4 py-3">
                <span className="text-white">Промоутер</span>
              </div>
              <p className="text-white/60 text-xs mt-1">Вы можете приглашать только других промоутеров</p>
            </div>

            <button
              type="submit"
              className="btn-primary"
            >
              Создать реферальное приглашение
            </button>
          </form>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">Мои реферальные приглашения</h2>
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
                  <div key={invitation.id} className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-4 mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-white">
                          Роль: Промоутер
                        </div>
                        <div className="text-sm text-white/90 mt-1">
                          Создано: {new Date(invitation.created_at).toLocaleString('ru-RU')}
                        </div>
                        <div className="text-sm text-white/90">
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
                          <span className="px-3 py-1 bg-green-500/50 text-green-100 rounded-full text-sm border border-green-400/50 font-medium">
                            Использовано
                          </span>
                        ) : new Date(invitation.expires_at) < new Date() ? (
                          <span className="px-3 py-1 bg-red-500/50 text-red-100 rounded-full text-sm border border-red-400/50 font-medium">
                            Истекло
                          </span>
                        ) : (
                          <>
                            <span className="px-3 py-1 bg-yellow-500/60 text-yellow-50 rounded-full text-sm border border-yellow-400/70 font-semibold">
                              Активно
                            </span>
                            <button
                              onClick={() => handleDelete(invitation.id)}
                              className="text-red-400 hover:text-red-300 text-sm font-semibold transition-colors"
                            >
                              Отозвать
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {!invitation.is_used && new Date(invitation.expires_at) >= new Date() && (
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <div className="text-sm font-medium mb-1 text-white">Реферальная ссылка для регистрации:</div>
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
