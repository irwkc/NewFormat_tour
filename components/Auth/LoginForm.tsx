'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
  const [isPromoter, setIsPromoter] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { setAuth } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/30 rounded-full blur-3xl"></div>
      </div>
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="glass-card shadow-glass-lg">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gradient mb-2">
              Вход в систему
            </h2>
            <p className="text-gray-600 text-sm">Добро пожаловать обратно</p>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-6">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isPromoter}
                  onChange={(e) => setIsPromoter(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 cursor-pointer"
                />
                <span className="text-gray-700 text-sm group-hover:text-purple-700 transition-colors">Я промоутер (вход по ID)</span>
              </label>
            </div>

            <div className="space-y-4">
              {!isPromoter ? (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    className="input-glass"
                    placeholder="your@email.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>
                  )}
                </div>
              ) : (
                <div>
                  <label htmlFor="promoter_id" className="block text-sm font-medium text-gray-700 mb-2">
                    ID промоутера
                  </label>
                  <input
                    {...register('promoter_id', { valueAsNumber: true })}
                    type="number"
                    className="input-glass"
                    placeholder="12345"
                  />
                  {errors.promoter_id && (
                    <p className="text-red-500 text-xs mt-1.5">{errors.promoter_id.message}</p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Пароль
                </label>
                <input
                  {...register('password')}
                  type="password"
                  autoComplete="current-password"
                  className="input-glass"
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50/80 backdrop-blur-sm border border-red-200/50 p-4">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
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
