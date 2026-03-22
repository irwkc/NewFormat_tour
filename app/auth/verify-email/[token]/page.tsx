'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

export default function VerifyEmailPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const { setAuth } = useAuthStore()
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    verifyEmail()
  }, [token])

  const verifyEmail = async () => {
    try {
      const response = await fetch(`/api/auth/verify-email/${token}`)
      const result = await response.json()

      if (result.success) {
        setStatus('success')
        setMessage('Email успешно подтвержден!')
        
        // Автоматически войти, если есть токен
        if (result.data?.token) {
          setAuth(result.data.user, result.data.token)
        }
      } else {
        setStatus('error')
        setMessage(result.error || 'Ошибка подтверждения email')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Ошибка при подтверждении email')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full space-y-8 relative z-10">
        {status === 'loading' && (
          <div className="glass-card text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-white/90">Подтверждение email...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="glass-card text-center">
            <div className="text-green-400 text-6xl mb-6">✓</div>
            <h2 className="text-2xl font-bold text-white mb-4">Успешно!</h2>
            <p className="text-white/90 mb-6">{message}</p>
            <button
              onClick={() => router.push('/auth/login')}
              className="btn-primary w-full"
            >
              Перейти ко входу
            </button>
          </div>
        )}
        
        {status === 'error' && (
          <div className="glass-card text-center">
            <div className="text-red-400 text-6xl mb-6">✗</div>
            <h2 className="text-2xl font-bold text-white mb-4">Ошибка</h2>
            <p className="text-white/90 mb-6">{message}</p>
            <button
              onClick={() => router.push('/auth/login')}
              className="btn-primary w-full"
            >
              Перейти ко входу
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
