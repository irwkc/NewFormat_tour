'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/auth'

export default function TicketCheck() {
  const { token } = useAuthStore()
  const [ticketNumber, setTicketNumber] = useState('')
  const [ticket, setTicket] = useState<any>(null)
  const [canConfirm, setCanConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkByNumber = async () => {
    const trimmed = ticketNumber.trim()
    if (!trimmed || !/^\d{6}$/.test(trimmed)) {
      setError('Введите 6-значный код заказа с чека')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/tickets/check/number', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sale_number: trimmed }),
      })

      const result = await response.json()
      
      if (result.success && result.data.is_valid) {
        setTicket(result.data.ticket)
        setCanConfirm(result.data.can_confirm ?? false)
        setError(result.data.message)
      } else {
        setError(result.data.message || 'Билет не найден')
        setTicket(null)
        setCanConfirm(false)
      }
    } catch (err) {
      setError('Ошибка при проверке билета')
      setTicket(null)
      setCanConfirm(false)
    } finally {
      setLoading(false)
    }
  }

  const confirmTicket = async () => {
    if (!ticket) return

    setLoading(true)
    
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await response.json()
      
      if (result.success) {
        setError('Билет успешно подтвержден!')
        setCanConfirm(false)
        if (ticket?.qr_code_data) {
          const res = await fetch(`/api/tickets/check/qr/${encodeURIComponent(ticket.qr_code_data)}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const data = await res.json()
          if (data.success && data.data?.ticket) setTicket(data.data.ticket)
        }
      } else {
        setError(result.error || 'Ошибка при подтверждении билета')
      }
    } catch (err) {
      setError('Ошибка при подтверждении билета')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-card">
        <h2 className="text-2xl font-bold mb-6 text-gradient">Проверка билетов</h2>

        <div className="mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Код заказа (6 цифр с чека)</label>
              <input
                type="text"
                inputMode="numeric"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="704261"
                maxLength={6}
                className="input-glass"
              />
            </div>
            <button
              onClick={checkByNumber}
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Проверка...' : 'Проверить по коду'}
            </button>
          </div>
        </div>

        {error && (
          <div className={`mb-4 p-4 rounded-xl backdrop-blur-sm border ${
            error.includes('успешно') || ticket?.ticket_status === 'used' || ticket?.ticket_status === 'cancelled'
              ? 'bg-yellow-50/80 text-yellow-800 border-yellow-200/50' : 'bg-red-50/80 text-red-800 border-red-200/50'
          }`}>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {ticket && (
          <div className="border-t border-purple-100/50 pt-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Информация о билете</h3>
            <div className="glass p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-gray-600 text-sm">Экскурсия:</span>
                <span className="text-gray-900 font-medium text-right">
                  {ticket.tour.company}
                  {ticket.flight && ` - ${ticket.flight.flight_number}`}
                </span>
              </div>
              {ticket.flight && (
                <>
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600 text-sm">Дата:</span>
                    <span className="text-gray-900 font-medium">{new Date(ticket.flight.date).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600 text-sm">Время отправления:</span>
                    <span className="text-gray-900 font-medium">{new Date(ticket.flight.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-start">
                <span className="text-gray-600 text-sm">Взрослых мест:</span>
                <span className="text-gray-900 font-medium">{ticket.adult_count}</span>
              </div>
              {ticket.child_count > 0 && (
                <div className="flex justify-between items-start">
                  <span className="text-gray-600 text-sm">Детских мест:</span>
                  <span className="text-gray-900 font-medium">{ticket.child_count}</span>
                </div>
              )}
              {ticket.concession_count > 0 && (
                <div className="flex justify-between items-start">
                  <span className="text-gray-600 text-sm">Льготных мест:</span>
                  <span className="text-gray-900 font-medium">{ticket.concession_count}</span>
                </div>
              )}
              <div className="flex justify-between items-start">
                <span className="text-gray-600 text-sm">Статус:</span>
                <span className={`font-medium px-3 py-1 rounded-full text-xs ${
                  ticket.ticket_status === 'sold' ? 'bg-blue-100 text-blue-700' :
                  ticket.ticket_status === 'used' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {ticket.ticket_status === 'sold' ? 'Продано' :
                   ticket.ticket_status === 'used' ? 'Использовано' :
                   'Отменено'}
                </span>
              </div>
              {ticket.ticket_photo_url && (
                <div className="mt-4">
                  <img src={ticket.ticket_photo_url} alt="Фото билета" className="max-w-full rounded-lg shadow-md" />
                </div>
              )}
            </div>

            {canConfirm && ticket.ticket_status === 'sold' && (
              <div className="mt-6 flex space-x-4">
                <button
                  onClick={confirmTicket}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-2.5 px-4 rounded-xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Подтвердить
                </button>
                <button
                  onClick={() => {
                    setTicket(null)
                    setError(null)
                  }}
                  className="btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
