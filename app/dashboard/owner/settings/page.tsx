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
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
})

const changeOwnerPasswordSchema = z.object({
  current_password: z.string().min(1, 'Текущий пароль обязателен'),
  new_password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
})

const changeOwnerEmailSchema = z.object({
  new_email: z.string().email('Некорректный email'),
})

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
type CreateAssistantFormData = z.infer<typeof createAssistantSchema>
type ChangeOwnerPasswordFormData = z.infer<typeof changeOwnerPasswordSchema>
type ChangeOwnerEmailFormData = z.infer<typeof changeOwnerEmailSchema>

export default function OwnerSettingsPage() {
  const { token, user } = useAuthStore()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [ownerPasswordMessage, setOwnerPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [ownerEmailMessage, setOwnerEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
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

  const {
    register: registerOwnerPassword,
    handleSubmit: handleSubmitOwnerPassword,
    reset: resetOwnerPassword,
    formState: { errors: ownerPasswordErrors },
  } = useForm<ChangeOwnerPasswordFormData>({
    resolver: zodResolver(changeOwnerPasswordSchema),
  })

  const {
    register: registerOwnerEmail,
    handleSubmit: handleSubmitOwnerEmail,
    reset: resetOwnerEmail,
    formState: { errors: ownerEmailErrors },
  } = useForm<ChangeOwnerEmailFormData>({
    resolver: zodResolver(changeOwnerEmailSchema),
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

  const onOwnerPasswordChange = async (data: ChangeOwnerPasswordFormData) => {
    try {
      setOwnerPasswordMessage(null)

      const response = await fetch('/api/owner/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (result.success) {
        setOwnerPasswordMessage({ type: 'success', text: 'Пароль успешно изменен' })
        resetOwnerPassword()
      } else {
        setOwnerPasswordMessage({ type: 'error', text: result.error || 'Ошибка изменения пароля' })
      }
    } catch (error) {
      setOwnerPasswordMessage({ type: 'error', text: 'Ошибка изменения пароля' })
    }
  }

  const onOwnerEmailChange = async (data: ChangeOwnerEmailFormData) => {
    try {
      setOwnerEmailMessage(null)

      const response = await fetch('/api/owner/change-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (result.success) {
        setOwnerEmailMessage({ type: 'success', text: 'Email успешно изменен. Проверьте новую почту для подтверждения.' })
        resetOwnerEmail()
      } else {
        setOwnerEmailMessage({ type: 'error', text: result.error || 'Ошибка изменения email' })
      }
    } catch (error) {
      setOwnerEmailMessage({ type: 'error', text: 'Ошибка изменения email' })
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
    { label: 'Рефералы', href: '/dashboard/owner/referrals' },
    { label: 'Настройки', href: '/dashboard/owner/settings' },
  ]

  return (
    <DashboardLayout title="Настройки" navItems={navItems}>
      <div className="space-y-6">
        <div className="space-y-6 max-w-2xl">
          {/* Смена пароля владельца */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold mb-6 text-white">Смена пароля</h2>

            <form onSubmit={handleSubmitOwnerPassword(onOwnerPasswordChange)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white/90">
                  Текущий пароль *
                </label>
                <input
                  {...registerOwnerPassword('current_password')}
                  type="password"
                  className="input-glass w-full"
                  placeholder="Введите текущий пароль"
                />
                {ownerPasswordErrors.current_password && (
                  <p className="text-red-300 text-xs mt-1">{ownerPasswordErrors.current_password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white/90">
                  Новый пароль *
                </label>
                <input
                  {...registerOwnerPassword('new_password')}
                  type="password"
                  className="input-glass w-full"
                  placeholder="Введите новый пароль"
                />
                {ownerPasswordErrors.new_password && (
                  <p className="text-red-300 text-xs mt-1">{ownerPasswordErrors.new_password.message}</p>
                )}
              </div>

              {ownerPasswordMessage && (
                <div className={ownerPasswordMessage.type === 'success' ? 'alert-success' : 'alert-error'}>
                  <p className="text-sm font-medium">{ownerPasswordMessage.text}</p>
                </div>
              )}

              <button type="submit" className="btn-primary">
                Изменить пароль
              </button>
            </form>
          </div>

          {/* Смена email владельца */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold mb-6 text-white">Смена email</h2>
            <p className="text-white/70 text-sm mb-4">Текущий email: <span className="font-medium text-white">{user?.email || 'Не указан'}</span></p>

            <form onSubmit={handleSubmitOwnerEmail(onOwnerEmailChange)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white/90">
                  Новый email *
                </label>
                <input
                  {...registerOwnerEmail('new_email')}
                  type="email"
                  className="input-glass w-full"
                  placeholder="Введите новый email"
                />
                {ownerEmailErrors.new_email && (
                  <p className="text-red-300 text-xs mt-1">{ownerEmailErrors.new_email.message}</p>
                )}
              </div>

              {ownerEmailMessage && (
                <div className={ownerEmailMessage.type === 'success' ? 'alert-success' : 'alert-error'}>
                  <p className="text-sm font-medium">{ownerEmailMessage.text}</p>
                </div>
              )}

              <button type="submit" className="btn-primary">
                Изменить email
              </button>
            </form>
          </div>

          {/* Создание помощника */}
          {hasAssistant === false && (
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold mb-6 text-white">Создание помощника владельца</h2>

              <form onSubmit={handleSubmitCreate(onCreateAssistant)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white/90">
                    Email помощника *
                  </label>
                  <input
                    {...registerCreate('email')}
                    type="email"
                    className="input-glass w-full"
                    placeholder="assistant@example.com"
                  />
                  {createErrors.email && (
                    <p className="text-red-300 text-xs mt-1">{createErrors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-white/90">
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
              <h2 className="text-2xl font-bold mb-6 text-white">Изменение пароля помощника владельца</h2>

              <form onSubmit={handleSubmitPassword(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white/90">
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
