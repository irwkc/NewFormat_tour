'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const changePasswordSchema = z.object({
  new_password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
})

const createAssistantSchema = z.object({
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
})

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
type CreateAssistantFormData = z.infer<typeof createAssistantSchema>

export default function OwnerSettingsPage() {
  const { token } = useAuthStore()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasAssistant, setHasAssistant] = useState<boolean | null>(null)

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<CreateAssistantFormData>({
    resolver: zodResolver(createAssistantSchema),
  })

  // Проверяем наличие помощника
  useEffect(() => {
    const checkAssistant = async () => {
      try {
        const response = await fetch('/api/owner/assistant-password', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        setHasAssistant(response.status !== 404)
      } catch (error) {
        setHasAssistant(false)
      }
    }
    if (token) checkAssistant()
  }, [token])

  const onCreateAssistant = async (data: CreateAssistantFormData) => {
    try {
      setMessage(null)

      const response = await fetch('/api/owner/create-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (result.success) {
        setMessage({ type: 'success', text: 'Помощник успешно создан' })
        setHasAssistant(true)
        resetCreate()
      } else {
        setMessage({ type: 'error', text: result.error || 'Ошибка создания помощника' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка создания помощника' })
    }
  }

  const onSubmit = async (data: ChangePasswordFormData) => {
    try {
      setMessage(null)

      const response = await fetch('/api/owner/assistant-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (result.success) {
        setMessage({ type: 'success', text: 'Пароль помощника успешно изменен' })
        resetPassword()
      } else {
        setMessage({ type: 'error', text: result.error || 'Ошибка изменения пароля' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка изменения пароля' })
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
    <DashboardLayout title="Настройки" navItems={navItems}>
      <div className="px-4 py-6 sm:px-0">
        <div className="space-y-6 max-w-2xl">
          {/* Создание помощника */}
          {hasAssistant === false && (
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold mb-6 text-gradient">Создание помощника владельца</h2>

              <form onSubmit={handleSubmitCreate(onCreateAssistant)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Пароль помощника *
                  </label>
                  <input
                    {...registerCreate('password')}
                    type="password"
                    className="input-glass w-full"
                    placeholder="Введите пароль для помощника"
                  />
                  {createErrors.password && (
                    <p className="text-red-300 text-xs mt-1">{createErrors.password.message}</p>
                  )}
                </div>

                {message && (
                  <div className={message.type === 'success' ? 'alert-success' : 'alert-error'}>
                    <p className="text-sm font-medium">{message.text}</p>
                  </div>
                )}

                <button type="submit" className="btn-primary">
                  Создать помощника
                </button>
              </form>
            </div>
          )}

          {/* Изменение пароля помощника */}
          {hasAssistant === true && (
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold mb-6 text-gradient">Изменение пароля помощника владельца</h2>

              <form onSubmit={handleSubmitPassword(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Новый пароль помощника *
                  </label>
                  <input
                    {...registerPassword('new_password')}
                    type="password"
                    className="input-glass w-full"
                    placeholder="Введите новый пароль"
                  />
                  {passwordErrors.new_password && (
                    <p className="text-red-300 text-xs mt-1">{passwordErrors.new_password.message}</p>
                  )}
                </div>

                {message && (
                  <div className={message.type === 'success' ? 'alert-success' : 'alert-error'}>
                    <p className="text-sm font-medium">{message.text}</p>
                  </div>
                )}

                <button type="submit" className="btn-primary">
                  Изменить пароль
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
