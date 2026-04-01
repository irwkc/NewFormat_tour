'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Минимум 2 символа'),
  phone: z
    .string()
    .regex(/^\+7\d{10}$/, 'Телефон должен быть в формате +7XXXXXXXXXX'),
})

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Введите текущий пароль'),
  new_password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
})

const changeEmailSchema = z.object({
  new_email: z.string().email('Некорректный email'),
  current_password: z.string().min(1, 'Введите текущий пароль'),
})

type ProfileFormData = z.infer<typeof profileSchema>
type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
type ChangeEmailFormData = z.infer<typeof changeEmailSchema>

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

export default function PromoterSettingsPage() {
  const { user, token, updateUser } = useAuthStore()
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [logins, setLogins] = useState<LoginLog[]>([])
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [securityLoading, setSecurityLoading] = useState(false)
  const [logoutAllMessage, setLogoutAllMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      phone: user?.phone || '',
    },
  })

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: passwordSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    reset: resetEmail,
    formState: { errors: emailErrors, isSubmitting: emailSubmitting },
  } = useForm<ChangeEmailFormData>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: {
      new_email: user?.email || '',
    },
  })

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

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const onSubmitProfile = async (data: ProfileFormData) => {
    if (!token) return
    try {
      setProfileMessage(null)

      let photoBase64: string | undefined
      if (avatarFile) {
        photoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(avatarFile)
        })
      }

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: data.full_name,
          phone: data.phone,
          photo: photoBase64,
        }),
      })

      const result = await response.json()
      if (result.success) {
        setProfileMessage({ type: 'success', text: 'Профиль обновлен' })
        updateUser(result.data)
        setAvatarFile(null)
      } else {
        setProfileMessage({
          type: 'error',
          text: result.error || 'Ошибка обновления профиля',
        })
      }
    } catch {
      setProfileMessage({
        type: 'error',
        text: 'Ошибка обновления профиля',
      })
    }
  }

  const onSubmitPassword = async (data: ChangePasswordFormData) => {
    if (!token) return
    try {
      setPasswordMessage(null)

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (result.success) {
        setPasswordMessage({ type: 'success', text: 'Пароль успешно изменен' })
        resetPassword()
      } else {
        setPasswordMessage({
          type: 'error',
          text: result.error || 'Ошибка изменения пароля',
        })
      }
    } catch {
      setPasswordMessage({
        type: 'error',
        text: 'Ошибка изменения пароля',
      })
    }
  }

  const onSubmitEmail = async (data: ChangeEmailFormData) => {
    if (!token) return
    try {
      setEmailMessage(null)

      const response = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (result.success) {
        setEmailMessage({
          type: 'success',
          text: 'Email обновлен. Проверьте новую почту для подтверждения.',
        })
        resetEmail({ new_email: data.new_email, current_password: '' })
      } else {
        setEmailMessage({
          type: 'error',
          text: result.error || 'Ошибка изменения email',
        })
      }
    } catch {
      setEmailMessage({
        type: 'error',
        text: 'Ошибка изменения email',
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

  const navItems = [
    { label: 'Продажи', href: '/dashboard/promoter/sales' },
    { label: 'История баланса', href: '/dashboard/promoter/balance-history' },
    { label: 'Выданные вещи', href: '/dashboard/promoter/issued-items' },
    { label: 'Реферальная программа', href: '/dashboard/promoter/invitations' },
    { label: 'Настройки', href: '/dashboard/promoter/settings' },
  ]

  return (
    <DashboardLayout title="Настройки" navItems={navItems}>
      <div className="px-4 py-6 sm:px-0 space-y-6 max-w-3xl">
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold mb-4 text-white">Профиль</h2>
          <p className="text-sm text-white/70 mb-4">
            Обновите имя, телефон и фото профиля.
          </p>

          <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10 flex items-center justify-center text-white/60 text-sm">
                {avatarPreview || user?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview || (user?.photo_url as string)}
                    alt="Аватар"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{user?.full_name?.charAt(0) || '?'}</span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-white">
                  Фото профиля
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="text-sm text-white/80"
                />
                <p className="text-xs text-white/50 mt-1">
                  JPG/PNG, до 5 МБ. Фото будет использоваться как аватар в системе.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                ФИО
              </label>
              <input
                {...registerProfile('full_name')}
                type="text"
                className="input-glass w-full"
                placeholder="Введите ваше ФИО"
              />
              {profileErrors.full_name && (
                <p className="text-red-300 text-xs mt-1">
                  {profileErrors.full_name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                Телефон
              </label>
              <input
                {...registerProfile('phone')}
                type="tel"
                className="input-glass w-full"
                placeholder="+7XXXXXXXXXX"
              />
              {profileErrors.phone && (
                <p className="text-red-300 text-xs mt-1">
                  {profileErrors.phone.message}
                </p>
              )}
            </div>

            {profileMessage && (
              <div
                className={
                  profileMessage.type === 'success' ? 'alert-success' : 'alert-error'
                }
              >
                <p className="text-sm font-medium">{profileMessage.text}</p>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={profileSubmitting}
            >
              {profileSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </form>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold mb-4 text-white">Смена пароля</h2>
          <p className="text-sm text-white/70 mb-4">
            Пароль используется для входа в систему вместе с вашим email.
          </p>

          <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                Текущий пароль
              </label>
              <input
                {...registerPassword('current_password')}
                type="password"
                className="input-glass w-full"
                placeholder="Введите текущий пароль"
              />
              {passwordErrors.current_password && (
                <p className="text-red-300 text-xs mt-1">
                  {passwordErrors.current_password.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                Новый пароль
              </label>
              <input
                {...registerPassword('new_password')}
                type="password"
                className="input-glass w-full"
                placeholder="Введите новый пароль"
              />
              {passwordErrors.new_password && (
                <p className="text-red-300 text-xs mt-1">
                  {passwordErrors.new_password.message}
                </p>
              )}
            </div>

            {passwordMessage && (
              <div
                className={
                  passwordMessage.type === 'success' ? 'alert-success' : 'alert-error'
                }
              >
                <p className="text-sm font-medium">{passwordMessage.text}</p>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={passwordSubmitting}
            >
              {passwordSubmitting ? 'Сохранение...' : 'Изменить пароль'}
            </button>
          </form>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold mb-4 text-white">Изменение email</h2>
          <p className="text-sm text-white/70 mb-4">
            Новый адрес нужно будет подтвердить по ссылке из письма.
          </p>

          <form onSubmit={handleSubmitEmail(onSubmitEmail)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                Новый email
              </label>
              <input
                {...registerEmail('new_email')}
                type="email"
                className="input-glass w-full"
                placeholder="Введите новый email"
              />
              {emailErrors.new_email && (
                <p className="text-red-300 text-xs mt-1">
                  {emailErrors.new_email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                Текущий пароль
              </label>
              <input
                {...registerEmail('current_password')}
                type="password"
                className="input-glass w-full"
                placeholder="Введите текущий пароль"
              />
              {emailErrors.current_password && (
                <p className="text-red-300 text-xs mt-1">
                  {emailErrors.current_password.message}
                </p>
              )}
            </div>

            {emailMessage && (
              <div
                className={
                  emailMessage.type === 'success' ? 'alert-success' : 'alert-error'
                }
              >
                <p className="text-sm font-medium">{emailMessage.text}</p>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={emailSubmitting}
            >
              {emailSubmitting ? 'Сохранение...' : 'Изменить email'}
            </button>
          </form>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold mb-4 text-white">Безопасность и устройства</h2>
          <p className="text-sm text-white/70 mb-4">
            Управляйте активными сессиями и смотрите историю входов в систему.
          </p>

          <button
            type="button"
            className="btn-secondary mb-4"
            onClick={onLogoutAll}
            disabled={securityLoading}
          >
            Выйти на всех устройствах
          </button>

          {logoutAllMessage && (
            <div
              className={
                logoutAllMessage.type === 'success' ? 'alert-success' : 'alert-error'
              }
            >
              <p className="text-sm font-medium">{logoutAllMessage.text}</p>
            </div>
          )}

          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">
                Активные устройства (последние входы)
              </h3>
              {securityLoading ? (
                <p className="text-sm text-white/60">Загрузка...</p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-white/60">
                  Пока нет данных о сеансах входа.
                </p>
              ) : (
                <ul className="space-y-2 text-sm text-white/80">
                  {sessions.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <div className="font-medium">
                        {s.user_agent || 'Неизвестное устройство'}
                      </div>
                      <div className="text-xs text-white/60">
                        IP: {s.ip_address || '—'} · Последний вход:{' '}
                        {new Date(s.last_seen_at).toLocaleString('ru-RU')}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-2">
                История входов
              </h3>
              {securityLoading ? (
                <p className="text-sm text-white/60">Загрузка...</p>
              ) : logins.length === 0 ? (
                <p className="text-sm text-white/60">
                  История входов пока пуста.
                </p>
              ) : (
                <ul className="space-y-1 text-xs text-white/70 max-h-64 overflow-y-auto pr-1">
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
    </DashboardLayout>
  )
}

