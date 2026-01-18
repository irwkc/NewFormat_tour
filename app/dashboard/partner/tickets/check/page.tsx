'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'

export default function TicketCheckPage() {
  const router = useRouter()
  const { token } = useAuthStore()
  const [ticketNumber, setTicketNumber] = useState('')
  const [qrData, setQrData] = useState('')
  const [ticketInfo, setTicketInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [method, setMethod] = useState<'qr' | 'number'>('qr')

  const checkByQR = async () => {
    if (!qrData.trim()) {
      setError('Введите данные QR кода')
      return
    }

    try {
      setError(null)
      setLoading(true)
      const response = await fetch(`/api/tickets/check/qr/${encodeURIComponent(qrData)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        setTicketInfo(result.data)
      } else {
        setError(result.error || 'Ошибка проверки билета')
      }
    } catch (err) {
      setError('Ошибка при проверке билета')
    } finally {
      setLoading(false)
    }
  }

  const checkByNumber = async () => {
    if (!ticketNumber.trim()) {
      setError('Введите номер билета')
      return
    }

    // Проверка формата: AA00000000 (2 заглавные буквы + 8 цифр)
    const ticketNumberRegex = /^[A-Z]{2}\d{8}$/
    if (!ticketNumberRegex.test(ticketNumber.toUpperCase())) {
      setError('Неверный формат номера билета. Ожидается: AA00000000 (2 заглавные буквы + 8 цифр)')
      return
    }

    try {
      setError(null)
      setLoading(true)
      const response = await fetch('/api/tickets/check/number', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticket_number: ticketNumber.toUpperCase(),
        }),
      })

      const result = await response.json()
      if (result.success) {
        setTicketInfo(result.data)
      } else {
        setError(result.error || 'Ошибка проверки билета')
      }
    } catch (err) {
      setError('Ошибка при проверке билета')
    } finally {
      setLoading(false)
    }
  }

  const confirmTicket = async () => {
    if (!ticketInfo?.ticket?.id) return

    try {
      setError(null)
      setLoading(true)
      const response = await fetch(`/api/tickets/${ticketInfo.ticket.id}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        // Обновить информацию о билете
        if (method === 'qr') {
          await checkByQR()
        } else {
          await checkByNumber()
        }
        alert('Билет подтвержден!')
      } else {
        setError(result.message || result.error || 'Ошибка подтверждения билета')
      }
    } catch (err) {
      setError('Ошибка при подтверждении билета')
    } finally {
      setLoading(false)
    }
  }

  const navItems = [
    { label: 'Мои экскурсии', href: '/dashboard/partner/tours' },
    { label: 'Проверка билетов', href: '/dashboard/partner/tickets/check' },
  ]

  return (
    <DashboardLayout title="Проверка билетов" navItems={navItems}>
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow-md rounded-lg p-6 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Проверка билетов</h2>

          <div className="mb-6">
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => {
                  setMethod('qr')
                  setTicketInfo(null)
                  setError(null)
                  setQrData('')
                  setTicketNumber('')
                }}
                className={`px-4 py-2 rounded-md ${
                  method === 'qr'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                По QR коду
              </button>
              <button
                onClick={() => {
                  setMethod('number')
                  setTicketInfo(null)
                  setError(null)
                  setQrData('')
                  setTicketNumber('')
                }}
                className={`px-4 py-2 rounded-md ${
                  method === 'number'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                По номеру билета
              </button>
            </div>

            {method === 'qr' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Данные QR кода
                  </label>
                  <input
                    type="text"
                    value={qrData}
                    onChange={(e) => setQrData(e.target.value)}
                    placeholder="Введите данные QR кода или отсканируйте"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={checkByQR}
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Проверка...' : 'Проверить по QR'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Номер билета (формат: AA00000000)
                  </label>
                  <input
                    type="text"
                    value={ticketNumber}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase()
                      setTicketNumber(value)
                    }}
                    placeholder="AB12345678"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                  />
                  <p className="text-xs text-gray-500 mt-1">Формат: 2 заглавные буквы + 8 цифр</p>
                </div>
                <button
                  onClick={checkByNumber}
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Проверка...' : 'Проверить по номеру'}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {ticketInfo && ticketInfo.ticket && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Информация о билете</h3>
              
              {!ticketInfo.is_valid && (
                <div className="rounded-md bg-red-50 p-4 mb-4">
                  <p className="text-sm text-red-800">{ticketInfo.message}</p>
                </div>
              )}

              {ticketInfo.is_valid && (
                <>
                  <div className="space-y-2 mb-4">
                    <p><strong>Экскурсия:</strong> {ticketInfo.ticket.tour.company} - {ticketInfo.ticket.tour.flight_number}</p>
                    <p><strong>Дата:</strong> {new Date(ticketInfo.ticket.tour.date).toLocaleDateString('ru-RU')}</p>
                    <p><strong>Время отправления:</strong> {new Date(ticketInfo.ticket.tour.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p><strong>Категория:</strong> {ticketInfo.ticket.tour.category}</p>
                    <p><strong>Взрослых мест:</strong> {ticketInfo.ticket.adult_count}</p>
                    {ticketInfo.ticket.child_count > 0 && (
                      <p><strong>Детских мест:</strong> {ticketInfo.ticket.child_count}</p>
                    )}
                    <p><strong>Статус:</strong> {
                      ticketInfo.ticket.ticket_status === 'sold' ? 'Продано' :
                      ticketInfo.ticket.ticket_status === 'used' ? 'Использовано' :
                      'Отменено'
                    }</p>
                    {ticketInfo.ticket.used_at && (
                      <p><strong>Использовано:</strong> {new Date(ticketInfo.ticket.used_at).toLocaleString('ru-RU')}</p>
                    )}
                    {ticketInfo.ticket.usedBy && (
                      <p><strong>Проверил:</strong> {ticketInfo.ticket.usedBy.full_name}</p>
                    )}
                    {ticketInfo.ticket.ticket_photo_url && (
                      <div>
                        <p><strong>Фото билета:</strong></p>
                        <img src={ticketInfo.ticket.ticket_photo_url} alt="Ticket" className="max-w-xs mt-2 rounded" />
                      </div>
                    )}
                  </div>

                  {ticketInfo.can_confirm && (
                    <div className="flex space-x-4">
                      <button
                        onClick={confirmTicket}
                        disabled={loading}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {loading ? 'Подтверждение...' : 'Подтвердить'}
                      </button>
                      <button
                        onClick={() => {
                          setTicketInfo(null)
                          setError(null)
                        }}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                      >
                        Отмена
                      </button>
                    </div>
                  )}

                  {!ticketInfo.can_confirm && ticketInfo.message && (
                    <div className="rounded-md bg-yellow-50 p-4">
                      <p className="text-sm text-yellow-800">{ticketInfo.message}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
