'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image'
import { useAuthStore } from '@/store/auth'

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

      setAuth(result.data.user, result.data.token)
      
      // Редирект в зависимости от роли
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