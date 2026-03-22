'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'

export default function TicketCheck() {
  const { token } = useAuthStore()
  const router = useRouter()
  const [qrData, setQrData] = useState('')
  const [ticketNumber, setTicketNumber] = useState('')
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'qr' | 'number'>('qr')

  const checkByQR = async () => {
    if (!qrData) {
      setError('Введите данные QR кода')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/tickets/check/qr/${qrData}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await response.json()
      
      if (result.success && result.data.is_valid) {
        setTicket(result.data.ticket)
        setError(result.data.message)
      } else {
        setError(result.data.message || 'Билет не найден')
        setTicket(null)
      }
    } catch (err) {
      setError('Ошибка при проверке билета')
    } finally {
      setLoading(false)
    }
  }

  const checkByNumber = async () => {
    if (!ticketNumber || !ticketNumber.match(/^[A-Z]{2}\d{8}$/)) {
      setError('Номер билета должен быть в формате AA00000000')
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
        body: JSON.stringify({ ticket_number: ticketNumber }),
      })

      const result = await response.json()
      
      if (result.success && result.data.is_valid) {
        setTicket(result.data.ticket)
        setError(result.data.message)
      } else {
        setError(result.data.message || 'Билет не найден')
        setTicket(null)
      }
    } catch (err) {
      setError('Ошибка при проверке билета')
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
        // Обновить данные билета
        if (mode === 'qr') {
          checkByQR()
        } else {
          checkByNumber()
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
          <div className="flex space-x-2 mb-4 bg-purple-50/50 p-1 rounded-xl">
            <button
              onClick={() => {
                setMode('qr')
                setTicket(null)
                setError(null)
              }}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                mode === 'qr'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md shadow-purple-500/30'
                  : 'text-gray-600 hover:text-purple-700 hover:bg-white/50'
              }`}
            >
              По QR коду
            </button>
            <button
              onClick={() => {
                setMode('number')
                setTicket(null)
                setError(null)
              }}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                mode === 'number'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md shadow-purple-500/30'
                  : 'text-gray-600 hover:text-purple-700 hover:bg-white/50'
              }`}
            >
              По номеру билета
            </button>
          </div>

          {mode === 'qr' ? (
            <div className="space-y-4">
              <input
                type="text"
                value={qrData}
                onChange={(e) => setQrData(e.target.value)}
                placeholder="Введите данные QR кода"
                className="input-glass"
              />
              <button
                onClick={checkByQR}
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Проверка...' : 'Проверить'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
                placeholder="AA00000000"
                pattern="[A-Z]{2}\d{8}"
                maxLength={10}
                className="input-glass uppercase"
              />
              <button
                onClick={checkByNumber}
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Проверка...' : 'Проверить'}
              </button>
            </div>
          )}
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

            {ticket.can_confirm && ticket.ticket_status === 'sold' && (
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
