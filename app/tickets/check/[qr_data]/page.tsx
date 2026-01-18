'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

// Публичная страница для проверки билета по QR коду (для клиента)
export default function TicketCheckPublicPage() {
  const params = useParams()
  const qrData = params.qr_data as string
  const [ticketInfo, setTicketInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (qrData) {
      fetchTicketInfo()
    }
  }, [qrData])

  const fetchTicketInfo = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Найти билет по QR данным (используем API endpoint для проверки)
      // Но так как это публичная страница, нам нужно найти билет напрямую
      const response = await fetch(`/api/tickets/check/qr/${encodeURIComponent(qrData)}`, {
        method: 'GET',
      })

      // Если требуется авторизация, показываем публичную информацию
      if (response.status === 401 || response.status === 403) {
        // Попробуем получить информацию другим способом (нужно создать публичный endpoint)
        setError('Требуется авторизация для просмотра информации о билете')
        setLoading(false)
        return
      }

      const result = await response.json()
      if (result.success && result.data.is_valid) {
        setTicketInfo(result.data.ticket)
      } else {
        setError(result.data?.message || 'Билет не найден')
      }
    } catch (err) {
      setError('Ошибка при загрузке информации о билете')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="text-center">
          <p className="text-white">Загрузка информации о билете...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="glass-card">
          <h1 className="text-2xl font-bold mb-6 text-white">Информация о билете</h1>
          
          {error && (
            <div className="alert-error mb-4">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {ticketInfo && (
            <div className="space-y-4">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-lg font-semibold mb-2 text-white">Экскурсия</h2>
                <div className="space-y-1 text-white/90">
                  <p><strong className="text-white">Компания:</strong> {ticketInfo.tour.company}</p>
                  <p><strong className="text-white">Рейс:</strong> {ticketInfo.tour.flight_number}</p>
                  <p><strong className="text-white">Дата:</strong> {new Date(ticketInfo.tour.date).toLocaleDateString('ru-RU')}</p>
                  <p><strong className="text-white">Время отправления:</strong> {new Date(ticketInfo.tour.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p><strong className="text-white">Категория:</strong> {ticketInfo.tour.category}</p>
                </div>
              </div>
              
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-lg font-semibold mb-2 text-white">Детали билета</h2>
                <div className="space-y-1 text-white/90">
                  <p><strong className="text-white">Взрослых мест:</strong> {ticketInfo.adult_count}</p>
                  {ticketInfo.child_count > 0 && (
                    <p><strong className="text-white">Детских мест:</strong> {ticketInfo.child_count}</p>
                  )}
                  <p><strong className="text-white">Статус:</strong> {
                    ticketInfo.ticket_status === 'sold' ? 'Продано' :
                    ticketInfo.ticket_status === 'used' ? 'Использовано' :
                    'Отменено'
                  }</p>
                </div>
              </div>

              {ticketInfo.ticket_number && (
                <div className="text-white/90">
                  <p><strong className="text-white">Номер билета:</strong> {ticketInfo.ticket_number}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
