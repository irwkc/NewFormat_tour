'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [sale, setSale] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSale()
  }, [token])

  const fetchSale = async () => {
    try {
      const response = await fetch(`/api/payment/${token}`)
      const result = await response.json()
      
      if (result.success) {
        setSale(result.data.sale)
      } else {
        setError(result.error || 'Ошибка загрузки данных')
      }
      setLoading(false)
    } catch (err) {
      setError('Ошибка загрузки данных')
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!email) {
      setError('Укажите email для отправки билета')
      return
    }

    try {
      setError(null)
      const response = await fetch(`/api/payment/${token}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()
      
      if (result.success && result.data.payment_url) {
        // Переход на страницу оплаты ЮКассы
        window.location.href = result.data.payment_url
      } else {
        setError(result.error || 'Ошибка при создании платежа')
      }
    } catch (err) {
      setError('Ошибка при создании платежа')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-50">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="text-gray-700 font-medium">Загрузка...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/30 rounded-full blur-3xl"></div>
      </div>
      
      <div className="max-w-md mx-auto relative z-10">
        <div className="glass-card shadow-glass-lg">
          <h1 className="text-2xl font-bold mb-6 text-gradient">Оплата билетов</h1>
          
          {sale && (
            <div className="space-y-6">
              <div className="glass p-4 rounded-xl border-b border-purple-100/50">
                <h2 className="text-lg font-semibold mb-3 text-gray-800">Информация об экскурсии</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Компания:</span>
                    <span className="text-gray-900 font-medium">{sale.tour.company}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Рейс:</span>
                    <span className="text-gray-900 font-medium">{sale.tour.flight_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Дата:</span>
                    <span className="text-gray-900 font-medium">{new Date(sale.tour.date).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Время отправления:</span>
                    <span className="text-gray-900 font-medium">{new Date(sale.tour.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
              
              <div className="glass p-4 rounded-xl border-b border-purple-100/50">
                <h2 className="text-lg font-semibold mb-3 text-gray-800">Детали заказа</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Взрослых билетов:</span>
                    <span className="text-gray-900 font-medium">{sale.adult_count} × {sale.adult_price}₽ = {sale.adult_count * sale.adult_price}₽</span>
                  </div>
                  {sale.child_count > 0 && sale.child_price && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Детских билетов:</span>
                      <span className="text-gray-900 font-medium">{sale.child_count} × {sale.child_price}₽ = {sale.child_count * sale.child_price}₽</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email для отправки билета
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-glass"
                  placeholder="your@email.com"
                />
              </div>

              <div className="glass p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-lg text-gray-700 font-medium">Итого:</span>
                  <span className="text-2xl font-bold text-purple-700">{sale.total_amount}₽</span>
                </div>
              </div>

              {error && (
                <div className="alert-error">
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <button
                onClick={handlePayment}
                className="btn-primary w-full text-lg py-3"
              >
                Оплатить
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
