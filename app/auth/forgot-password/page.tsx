'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setError(null)
      setSuccess(false)

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
      } else {
        setError(result.error || 'Ошибка отправки письма')
      }
    } catch (err) {
      setError('Ошибка при отправке запроса')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="glass-card">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-white">
              Восстановление пароля
            </h2>
            <p className="mt-2 text-sm text-white/70">
              Введите ваш email, и мы отправим ссылку для восстановления пароля
            </p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="input-glass"
                placeholder="example@mail.ru"
              />
              {errors.email && (
                <p className="text-red-300 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {success && (
              <div className="alert-success">
                <p className="text-sm font-medium">
                  Если такой email существует, на него отправлено письмо с инструкциями по восстановлению пароля.
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
                {isSubmitting ? 'Отправка...' : 'Отправить'}
              </button>
            </div>

            <div className="text-center">
              <a
                href="/auth/login"
                className="font-medium text-white/80 hover:text-white transition-colors"
              >
                Вернуться на страницу входа
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
