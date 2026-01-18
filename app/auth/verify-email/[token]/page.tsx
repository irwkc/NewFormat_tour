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
          
          // Редирект в зависимости от роли
          setTimeout(() => {
            const role = result.data.user.role
            if (role === 'owner') {
              router.push('/dashboard/owner')
            } else if (role === 'partner') {
              router.push('/dashboard/partner')
            } else if (role === 'manager') {
              router.push('/dashboard/manager')
            } else if (role === 'promoter') {
              router.push('/dashboard/promoter')
            } else {
              router.push('/dashboard')
            }
          }, 2000)
        } else {
          setTimeout(() => {
            router.push('/auth/login')
          }, 2000)
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Подтверждение email...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold mb-2">Успешно!</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-4">Перенаправление...</p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <h2 className="text-2xl font-bold mb-2">Ошибка</h2>
            <p className="text-gray-600">{message}</p>
            <button
              onClick={() => router.push('/auth/login')}
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Перейти на страницу входа
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
