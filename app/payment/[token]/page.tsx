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
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="text-white font-medium">Загрузка...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-md mx-auto relative z-10">
        <div className="glass-card">
          <h1 className="text-2xl font-bold mb-6 text-white">Оплата билетов</h1>
          
          {sale && (
            <div className="space-y-6">
              <div className="glass p-4 rounded-xl">
                <h2 className="text-lg font-semibold mb-3 text-white">Информация об экскурсии</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">Компания:</span>
                    <span className="text-white font-medium">{sale.tour.company}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Рейс:</span>
                    <span className="text-white font-medium">{sale.tour.flight_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Дата:</span>
                    <span className="text-white font-medium">{new Date(sale.tour.date).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Время отправления:</span>
                    <span className="text-white font-medium">{new Date(sale.tour.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
              
              <div className="glass p-4 rounded-xl">
                <h2 className="text-lg font-semibold mb-3 text-white">Детали заказа</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">Взрослых билетов:</span>
                    <span className="text-white font-medium">{sale.adult_count} × {sale.adult_price}₽ = {sale.adult_count * sale.adult_price}₽</span>
                  </div>
                  {sale.child_count > 0 && sale.child_price && (
                    <div className="flex justify-between">
                      <span className="text-white/70">Детских билетов:</span>
                      <span className="text-white font-medium">{sale.child_count} × {sale.child_price}₽ = {sale.child_count * sale.child_price}₽</span>
                    </div>
                  )}
                  {sale.concession_count > 0 && sale.concession_price && (
                    <div className="flex justify-between">
                      <span className="text-white/70">Льготных билетов:</span>
                      <span className="text-white font-medium">{sale.concession_count} × {sale.concession_price}₽ = {sale.concession_count * sale.concession_price}₽</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
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
                  <span className="text-lg text-white/90 font-medium">Итого:</span>
                  <span className="text-2xl font-bold text-white">{sale.total_amount}₽</span>
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
