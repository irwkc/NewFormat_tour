'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const registerSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email(),
  password: z.string().min(6),
  confirm_password: z.string().min(6),
  photo: z.any().optional(),
  controller_password: z.string().min(6).optional(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isPartner, setIsPartner] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const photo = watch('photo')

  useEffect(() => {
    if (photo && photo.length > 0) {
      const file = photo[0]
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPhotoPreview(null)
    }
  }, [photo])

  useEffect(() => {
    // Проверить токен приглашения
    const fetchInvitation = async () => {
      try {
        const response = await fetch(`/api/auth/register/${token}/invitation`)
        const result = await response.json()
        
        if (result.success) {
          setInvitation(result.data.invitation)
          setIsPartner(result.data.invitation.target_role === 'partner')
        } else {
          setError(result.error || 'Invalid invitation token')
        }
      } catch (err) {
        setError('Error loading invitation')
      } finally {
        setLoading(false)
      }
    }
    
    fetchInvitation()
  }, [token])

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null)

      // Конвертировать фото в base64
      let photoBase64: string | undefined
      if (data.photo && data.photo.length > 0) {
        const file = data.photo[0]
        photoBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }

      const body: any = {
        full_name: data.full_name,
        phone: data.phone,
        email: data.email,
        password: data.password,
        photo: photoBase64,
      }

      if (isPartner && data.controller_password) {
        body.controller_password = data.controller_password
      }

      const response = await fetch(`/api/auth/register/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Registration failed')
        return
      }

      // Перенаправить на страницу подтверждения email или на логин
      router.push('/auth/login?registered=true')
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Registration error:', err)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="glass-card">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-white">
              Регистрация
            </h2>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-white/90 mb-2">
                  ФИО
                </label>
                <input
                  {...register('full_name')}
                  type="text"
                  className="input-glass"
                  placeholder="Иванов Иван Иванович"
                />
                {errors.full_name && (
                  <p className="text-red-300 text-xs mt-1">{errors.full_name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-white/90 mb-2">
                  Номер телефона
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="input-glass"
                  placeholder="+7 (999) 123-45-67"
                />
                {errors.phone && (
                  <p className="text-red-300 text-xs mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="input-glass"
                  placeholder="example@mail.ru"
                />
                {errors.email && (
                  <p className="text-red-300 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
                  Пароль
                </label>
                <input
                  {...register('password')}
                  type="password"
                  className="input-glass"
                />
                {errors.password && (
                  <p className="text-red-300 text-xs mt-1">{errors.password.message}</p>
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

              {/* Фото для промоутеров и менеджеров */}
              {(invitation?.target_role === 'promoter' || invitation?.target_role === 'manager') && (
                <div>
                  <label htmlFor="photo" className="block text-sm font-medium text-white/90 mb-2">
                    Фото лица (обязательно) *
                  </label>
                  <input
                    {...register('photo')}
                    type="file"
                    accept="image/*"
                    className="input-glass"
                  />
                  {photoPreview && (
                    <img src={photoPreview} alt="Preview" className="mt-2 max-w-xs rounded-2xl" />
                  )}
                  {errors.photo && (
                    <p className="text-red-300 text-xs mt-1">
                      {typeof errors.photo === 'object' && 'message' in errors.photo 
                        ? String(errors.photo.message) 
                        : 'Ошибка загрузки фото'}
                    </p>
                  )}
                </div>
              )}

              {/* Пароль контролера для партнеров */}
              {invitation?.target_role === 'partner' && (
                <div>
                  <label htmlFor="controller_password" className="block text-sm font-medium text-white/90 mb-2">
                    Пароль для альтернативного профиля контролера
                  </label>
                  <input
                    {...register('controller_password')}
                    type="password"
                    className="input-glass"
                  />
                  {errors.controller_password && (
                    <p className="text-red-300 text-xs mt-1">{errors.controller_password.message}</p>
                  )}
                </div>
              )}
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
                {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
