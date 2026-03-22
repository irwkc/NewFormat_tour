'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { useForm } from 'react-hook-form'
import FaceRegisterBlock from '@/components/Auth/FaceRegisterBlock'
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

type NotificationSettings = {
  notify_new_sale_email: boolean
  notify_refund_email: boolean
  notify_flight_change_email: boolean
  notify_account_block_email: boolean
  notify_promoter_report_email: boolean
}

type LoginLog = {
  id: string
  ip_address: string | null
  user_agent: string | null
  success: boolean
  created_at: string
}

type SessionSummary = {
  id: string
  ip_address: string | null
  user_agent: string | null
  last_seen_at: string
  first_seen_at: string
  attempts: number
}

export default function OwnerSettingsPage() {
  const { token, user } = useAuthStore()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [ownerPasswordMessage, setOwnerPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [ownerEmailMessage, setOwnerEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasAssistant, setHasAssistant] = useState<boolean | null>(null)
  const [faceStatus, setFaceStatus] = useState<{ registered: boolean; count: number } | null>(null)
  const [faceDeleteMessage, setFaceDeleteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [faceDeleteLoading, setFaceDeleteLoading] = useState(false)
  const [notifications, setNotifications] = useState<NotificationSettings | null>(null)
  const [notificationsMessage, setNotificationsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [logins, setLogins] = useState<LoginLog[]>([])
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [securityLoading, setSecurityLoading] = useState(false)
  const [logoutAllMessage, setLogoutAllMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

  useEffect(() => {
    const checkFace = async () => {
      try {
        const res = await fetch('/api/auth/face-status', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.success) setFaceStatus({ registered: data.registered, count: data.count ?? 0 })
      } catch {
        setFaceStatus(null)
      }
    }
    if (token) checkFace()
  }, [token])

  useEffect(() => {
    if (!token) return

    const fetchProfileExtras = async () => {
      try {
        setSecurityLoading(true)
        const [profileRes, loginsRes, sessionsRes] = await Promise.all([
          fetch('/api/profile', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/profile/security/logins', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/profile/security/sessions', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        const profileJson = await profileRes.json()
        const loginsJson = await loginsRes.json()
        const sessionsJson = await sessionsRes.json()

        if (profileJson.success) {
          setNotifications({
            notify_new_sale_email: !!profileJson.data.notify_new_sale_email,
            notify_refund_email: !!profileJson.data.notify_refund_email,
            notify_flight_change_email: !!profileJson.data.notify_flight_change_email,
            notify_account_block_email: !!profileJson.data.notify_account_block_email,
            notify_promoter_report_email: !!profileJson.data.notify_promoter_report_email,
          })
        }

        if (loginsJson.success) {
          setLogins(loginsJson.data)
        }

        if (sessionsJson.success) {
          setSessions(sessionsJson.data)
        }
      } catch {
        // ignore
      } finally {
        setSecurityLoading(false)
      }
    }

    fetchProfileExtras()
  }, [token])

  const refreshFaceStatus = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/auth/face-status', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setFaceStatus({ registered: data.registered, count: data.count ?? 0 })
    } catch {
      setFaceStatus(null)
    }
  }, [token])

  const onFaceDelete = async () => {
    if (!token) return
    setFaceDeleteMessage(null)
    setFaceDeleteLoading(true)
    try {
      const res = await fetch('/api/auth/face-delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setFaceDeleteMessage({ type: 'success', text: 'Данные лица удалены. Вход по лицу отключён.' })
        await refreshFaceStatus()
      } else {
        setFaceDeleteMessage({ type: 'error', text: data.error || 'Ошибка удаления' })
      }
    } catch {
      setFaceDeleteMessage({ type: 'error', text: 'Ошибка удаления данных лица' })
    } finally {
      setFaceDeleteLoading(false)
    }
  }

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

  const onSaveNotifications = async () => {
    if (!token || !notifications) return
    try {
      setNotificationsMessage(null)
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(notifications),
      })
      const result = await response.json()
      if (result.success) {
        setNotificationsMessage({
          type: 'success',
          text: 'Настройки уведомлений сохранены',
        })
      } else {
        setNotificationsMessage({
          type: 'error',
          text: result.error || 'Ошибка сохранения уведомлений',
        })
      }
    } catch {
      setNotificationsMessage({
        type: 'error',
        text: 'Ошибка сохранения уведомлений',
      })
    }
  }

  const onLogoutAll = async () => {
    if (!token) return
    try {
      setLogoutAllMessage(null)
      const response = await fetch('/api/profile/security/logout-all', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const result = await response.json()
      if (result.success) {
        setLogoutAllMessage({
          type: 'success',
          text: 'Все сессии завершены. При следующем действии может потребоваться повторный вход.',
        })
      } else {
        setLogoutAllMessage({
          type: 'error',
          text: result.error || 'Не удалось завершить сессии',
        })
      }
    } catch {
      setLogoutAllMessage({
        type: 'error',
        text: 'Не удалось завершить сессии',
      })
    }
  }

  return (
    <DashboardLayout title="Настройки">
      <div className="space-y-6">
        <div className="space-y-6 max-w-2xl">
          {/* Вход по лицу (2FA) — только для владельца */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold mb-2 text-white">Вход по лицу (2FA)</h2>
            <p className="text-white/70 text-sm mb-4">
              После регистрации лица при входе под вашим аккаунтом потребуется дополнительная проверка по камере. Пароль и логин по-прежнему обязательны.
            </p>
            {faceStatus && (
              <p className="text-white/80 text-sm mb-4">
                {faceStatus.registered
                  ? `Лицо зарегистрировано (снимков: ${faceStatus.count}). При следующем входе будет запрошена проверка.`
                  : 'Лицо не зарегистрировано. Вход только по паролю.'}
              </p>
            )}
            {faceStatus?.registered && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onFaceDelete}
                  disabled={faceDeleteLoading}
                  className="btn-secondary text-sm"
                >
                  {faceDeleteLoading ? 'Удаление…' : 'Удалить данные лица'}
                </button>
              </div>
            )}
            {faceDeleteMessage && (
              <div className={faceDeleteMessage.type === 'success' ? 'alert-success' : 'alert-error'} style={{ marginBottom: '1rem' }}>
                <p className="text-sm font-medium">{faceDeleteMessage.text}</p>
              </div>
            )}
            <FaceRegisterBlock
              token={token!}
              onRegistered={() => { refreshFaceStatus(); setFaceDeleteMessage(null) }}
            />
          </div>

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

          {/* Уведомления и безопасность владельца */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold mb-4 text-white">Уведомления и безопасность</h2>
            <p className="text-white/70 text-sm mb-4">
              Управляйте письмами по ключевым событиям и просматривайте историю входов владельца.
            </p>

            {notifications ? (
              <div className="space-y-4 mb-6">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={notifications.notify_new_sale_email}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        notify_new_sale_email: e.target.checked,
                      })
                    }
                  />
                  <div>
                    <div className="text-sm font-medium text-white">
                      Новые продажи по всем турам
                    </div>
                    <div className="text-xs text-white/60">
                      Письма при новых продажах по экскурсиям партнёров.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={notifications.notify_refund_email}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        notify_refund_email: e.target.checked,
                      })
                    }
                  />
                  <div>
                    <div className="text-sm font-medium text-white">
                      Возвраты
                    </div>
                    <div className="text-xs text-white/60">
                      Уведомления о возвратах и отменах билетов.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={notifications.notify_flight_change_email}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        notify_flight_change_email: e.target.checked,
                      })
                    }
                  />
                  <div>
                    <div className="text-sm font-medium text-white">
                      Изменения рейсов
                    </div>
                    <div className="text-xs text-white/60">
                      Письма об изменениях рейсов по системе.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={notifications.notify_account_block_email}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        notify_account_block_email: e.target.checked,
                      })
                    }
                  />
                  <div>
                    <div className="text-sm font-medium text-white">
                      Блокировки аккаунтов
                    </div>
                    <div className="text-xs text-white/60">
                      Письма о блокировках/разблокировках аккаунтов менеджеров, промоутеров и партнёров.
                    </div>
                  </div>
                </label>

                {notificationsMessage && (
                  <div
                    className={
                      notificationsMessage.type === 'success'
                        ? 'alert-success'
                        : 'alert-error'
                    }
                  >
                    <p className="text-sm font-medium">{notificationsMessage.text}</p>
                  </div>
                )}

                <button type="button" className="btn-primary" onClick={onSaveNotifications}>
                  Сохранить настройки уведомлений
                </button>
              </div>
            ) : (
              <p className="text-white/60 text-sm mb-6">Загрузка настроек уведомлений…</p>
            )}

            <div className="border-t border-white/10 pt-4 mt-2 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">
                    Управление сессиями
                  </div>
                  <div className="text-xs text-white/60">
                    Завершите все активные сессии владельца на других устройствах.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onLogoutAll}
                  disabled={securityLoading}
                >
                  Выйти на всех устройствах
                </button>
              </div>

              {logoutAllMessage && (
                <div
                  className={
                    logoutAllMessage.type === 'success'
                      ? 'alert-success'
                      : 'alert-error'
                  }
                >
                  <p className="text-sm font-medium">{logoutAllMessage.text}</p>
                </div>
              )}

              <div className="mt-3 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    Активные устройства
                  </h3>
                  {securityLoading ? (
                    <p className="text-xs text-white/60">Загрузка...</p>
                  ) : sessions.length === 0 ? (
                    <p className="text-xs text-white/60">
                      Данных о сеансах входа пока нет.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-xs text-white/80">
                      {sessions.map((s) => (
                        <li key={s.id} className="flex flex-col">
                          <span>{s.user_agent || 'Неизвестное устройство'}</span>
                          <span className="text-white/60">
                            IP: {s.ip_address || '—'} · Последний вход:{' '}
                            {new Date(s.last_seen_at).toLocaleString('ru-RU')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    История входов владельца
                  </h3>
                  {securityLoading ? (
                    <p className="text-xs text-white/60">Загрузка...</p>
                  ) : logins.length === 0 ? (
                    <p className="text-xs text-white/60">
                      История входов пока пуста.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-[11px] text-white/70 max-h-40 overflow-y-auto pr-1">
                      {logins.map((l) => (
                        <li key={l.id} className="flex justify-between gap-3">
                          <span>
                            {new Date(l.created_at).toLocaleString('ru-RU')} ·{' '}
                            {l.success ? 'успешный вход' : 'ошибка входа'}
                          </span>
                          <span className="text-right">
                            {l.ip_address || 'IP: —'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
