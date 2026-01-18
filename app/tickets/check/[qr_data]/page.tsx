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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Загрузка информации о билете...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Информация о билете</h1>
        
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {ticketInfo && (
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold mb-2">Экскурсия</h2>
              <p><strong>Компания:</strong> {ticketInfo.tour.company}</p>
              <p><strong>Рейс:</strong> {ticketInfo.tour.flight_number}</p>
              <p><strong>Дата:</strong> {new Date(ticketInfo.tour.date).toLocaleDateString('ru-RU')}</p>
              <p><strong>Время отправления:</strong> {new Date(ticketInfo.tour.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
              <p><strong>Категория:</strong> {ticketInfo.tour.category}</p>
            </div>
            
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold mb-2">Детали билета</h2>
              <p><strong>Взрослых мест:</strong> {ticketInfo.adult_count}</p>
              {ticketInfo.child_count > 0 && (
                <p><strong>Детских мест:</strong> {ticketInfo.child_count}</p>
              )}
              <p><strong>Статус:</strong> {
                ticketInfo.ticket_status === 'sold' ? 'Продано' :
                ticketInfo.ticket_status === 'used' ? 'Использовано' :
                'Отменено'
              }</p>
            </div>

            {ticketInfo.ticket_number && (
              <div>
                <p><strong>Номер билета:</strong> {ticketInfo.ticket_number}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
