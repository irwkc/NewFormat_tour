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

const createControllerSchema = z.object({
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
})

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
type CreateControllerFormData = z.infer<typeof createControllerSchema>

export default function PartnerSettingsPage() {
  const { token } = useAuthStore()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasController, setHasController] = useState<boolean | null>(null)

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
  } = useForm<CreateControllerFormData>({
    resolver: zodResolver(createControllerSchema),
  })

  // Проверяем наличие контролера
  useEffect(() => {
    const checkController = async () => {
      try {
        const response = await fetch('/api/partner/controller-password', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        setHasController(response.status !== 404)
      } catch (error) {
        setHasController(false)
      }
    }
    if (token) checkController()
  }, [token])

  const onCreateController = async (data: CreateControllerFormData) => {
    try {
      setMessage(null)

      const response = await fetch('/api/partner/create-controller', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (result.success) {
        setMessage({ type: 'success', text: 'Контролер успешно создан' })
        setHasController(true)
        resetCreate()
      } else {
        setMessage({ type: 'error', text: result.error || 'Ошибка создания контролера' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка создания контролера' })
    }
  }

  const onSubmit = async (data: ChangePasswordFormData) => {
    try {
      setMessage(null)

      const response = await fetch('/api/partner/controller-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (result.success) {
        setMessage({ type: 'success', text: 'Пароль контролера успешно изменен' })
        resetPassword()
      } else {
        setMessage({ type: 'error', text: result.error || 'Ошибка изменения пароля' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка изменения пароля' })
    }
  }

  const navItems = [
    { label: 'Мои экскурсии', href: '/dashboard/partner/tours' },
    { label: 'Проверка билетов', href: '/dashboard/partner/tickets/check' },
    { label: 'Статистика', href: '/dashboard/partner/statistics' },
    { label: 'Настройки', href: '/dashboard/partner/settings' },
  ]

  return (
    <DashboardLayout title="Настройки" navItems={navItems}>
      <div className="px-4 py-6 sm:px-0">
        <div className="space-y-6 max-w-2xl">
          {/* Создание контролера */}
          {hasController === false && (
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold mb-6 text-gradient">Создание контролера</h2>

              <form onSubmit={handleSubmitCreate(onCreateController)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Пароль контролера *
                  </label>
                  <input
                    {...registerCreate('password')}
                    type="password"
                    className="input-glass w-full"
                    placeholder="Введите пароль для контролера"
                  />
                  {createErrors.password && (
                    <p className="text-red-500 text-xs mt-1">{createErrors.password.message}</p>
                  )}
                </div>

                {message && (
                  <div className={`rounded-md p-4 ${
                    message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    <p className="text-sm">{message.text}</p>
                  </div>
                )}

                <button type="submit" className="btn-primary">
                  Создать контролера
                </button>
              </form>
            </div>
          )}

          {/* Изменение пароля контролера */}
          {hasController === true && (
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold mb-6 text-gradient">Изменение пароля контролера</h2>

              <form onSubmit={handleSubmitPassword(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Новый пароль контролера *
                  </label>
                  <input
                    {...registerPassword('new_password')}
                    type="password"
                    className="input-glass w-full"
                    placeholder="Введите новый пароль"
                  />
                  {passwordErrors.new_password && (
                    <p className="text-red-500 text-xs mt-1">{passwordErrors.new_password.message}</p>
                  )}
                </div>

                {message && (
                  <div className={`rounded-md p-4 ${
                    message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    <p className="text-sm">{message.text}</p>
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
