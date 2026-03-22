'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  token: z.string(),
  new_password: z.string().min(6),
  confirm_password: z.string().min(6),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    if (token) {
      setValue('token', token)
    }
  }, [token, setValue])

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setError(null)
      setSuccess(false)

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: data.token,
          new_password: data.new_password,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
      } else {
        setError(result.error || 'Ошибка сброса пароля')
      }
    } catch (err) {
      setError('Ошибка при сбросе пароля')
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="max-w-md w-full glass-card text-center">
          <p className="text-red-300">Недействительная ссылка для сброса пароля</p>
          <a href="/auth/login" className="text-white/80 hover:text-white mt-4 inline-block transition-colors">
            Вернуться на страницу входа
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="glass-card">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-white">
              Сброс пароля
            </h2>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <input type="hidden" {...register('token')} />

            <div>
              <label htmlFor="new_password" className="block text-sm font-medium text-white/90 mb-2">
                Новый пароль
              </label>
              <input
                {...register('new_password')}
                type="password"
                className="input-glass"
              />
              {errors.new_password && (
                <p className="text-red-300 text-xs mt-1">{errors.new_password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-white/90 mb-2">
                Подтвердите пароль
              </label>
              <input
                {...register('confirm_password')}
                type="password"
                className="input-glass"
              />
              {errors.confirm_password && (
                <p className="text-red-300 text-xs mt-1">{errors.confirm_password.message}</p>
              )}
            </div>

            {success && (
              <div className="alert-success">
                <p className="text-sm font-medium">
                  Пароль успешно изменен! Перенаправление на страницу входа...
                </p>
              </div>
            )}

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
                {isSubmitting ? 'Сброс...' : 'Сбросить пароль'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
