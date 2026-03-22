'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/Layout/DashboardLayout'

const QrScanner = dynamic(() => import('@/components/Tickets/QrScanner'), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-white/70">Загрузка сканера...</div>,
})
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { customAlert } from '@/utils/modals'

type TicketInfo = {
  is_valid: boolean
  message?: string
  can_confirm: boolean
  ticket: {
    id: string
    qr_code_data?: string | null
    tour: {
      company: string
      category?: string
    }
    flight?: {
      flight_number: string
      date: string
      departure_time: string
    }
    adult_count: number
    child_count: number
    concession_count: number
    ticket_status: 'sold' | 'used' | 'cancelled'
    used_at?: string | null
    cancelled_at?: string | null
    ticket_number?: string | null
    ticket_photo_url?: string | null
    usedBy?: {
      full_name: string
    } | null
  }
}

export default function TicketCheckPage() {
  const router = useRouter()
  const { token } = useAuthStore()
  const [ticketNumber, setTicketNumber] = useState('')
  const [qrData, setQrData] = useState('')
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [method, setMethod] = useState<'qr' | 'number' | 'camera'>('qr')

  const doCheckByQrData = useCallback(async (data: string) => {
    if (!data?.trim()) return
    try {
      setError(null)
      setLoading(true)
      const response = await fetch(`/api/tickets/check/qr/${encodeURIComponent(data.trim())}`, {
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
  }, [token])

  const checkByQR = async () => {
    if (!qrData.trim()) {
      setError('Введите данные QR кода')
      return
    }
    await doCheckByQrData(qrData)
  }

  const checkByNumber = async () => {
    const trimmed = ticketNumber.trim()
    if (!trimmed) {
      setError('Введите 6-значный код заказа')
      return
    }

    if (!/^\d{6}$/.test(trimmed)) {
      setError('Код заказа — 6 цифр (с чека)')
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
        body: JSON.stringify({ sale_number: trimmed }),
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
        // Обновить информацию — после подтверждения sale_number обнуляется, используем QR
        const qrForRefresh = method === 'qr' ? qrData : ticketInfo?.ticket?.qr_code_data
        if (qrForRefresh) {
          await doCheckByQrData(qrForRefresh)
        }
        await customAlert('Билет подтвержден!')
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
    { label: 'Статистика', href: '/dashboard/partner/statistics' },
    { label: 'Настройки', href: '/dashboard/partner/settings' },
  ]

  return (
    <DashboardLayout title="Проверка билетов" navItems={navItems}>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-6 text-white">Проверка билетов</h2>

          <div className="mb-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => {
                  setMethod('camera')
                  setTicketInfo(null)
                  setError(null)
                  setQrData('')
                  setTicketNumber('')
                }}
                className={`flex-1 min-w-[120px] px-4 py-2 rounded-xl transition-all ${
                  method === 'camera' ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                Сканировать
              </button>
              <button
                onClick={() => {
                  setMethod('qr')
                  setTicketInfo(null)
                  setError(null)
                  setQrData('')
                  setTicketNumber('')
                }}
                className={`flex-1 min-w-[120px] px-4 py-2 rounded-xl transition-all ${
                  method === 'qr' ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                Ввод QR
              </button>
              <button
                onClick={() => {
                  setMethod('number')
                  setTicketInfo(null)
                  setError(null)
                  setQrData('')
                  setTicketNumber('')
                }}
                className={`flex-1 min-w-[120px] px-4 py-2 rounded-xl transition-all ${
                  method === 'number' ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                По коду
              </button>
            </div>

            {method === 'camera' ? (
              <div className="space-y-4">
                <QrScanner
                  onScan={(data) => doCheckByQrData(data)}
                  onError={(msg) => setError(msg)}
                />
              </div>
            ) : method === 'qr' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Данные QR кода
                  </label>
                  <input
                    type="text"
                    value={qrData}
                    onChange={(e) => setQrData(e.target.value)}
                    placeholder="Введите данные QR кода или отсканируйте"
                    className="input-glass"
                  />
                </div>
                <button
                  onClick={checkByQR}
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? 'Проверка...' : 'Проверить по QR'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Код заказа (6 цифр с чека)
                  </label>
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
                  className="btn-primary w-full"
                >
                  {loading ? 'Проверка...' : 'Проверить по коду'}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="alert-error mb-4">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {ticketInfo && ticketInfo.ticket && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <h3 className="text-lg font-semibold mb-4 text-white">Информация о билете</h3>
              
              {!ticketInfo.is_valid && (
                <div className="alert-error mb-4">
                  <p className="text-sm font-medium">{ticketInfo.message}</p>
                </div>
              )}

              {ticketInfo.is_valid && (
                <>
                  <div className="space-y-2 mb-4 text-white/90">
                    <p><strong className="text-white">Экскурсия:</strong> {ticketInfo.ticket.tour.company}{ticketInfo.ticket.flight && ` - ${ticketInfo.ticket.flight.flight_number}`}</p>
                    {ticketInfo.ticket.flight && (
                      <>
                        <p><strong className="text-white">Дата:</strong> {new Date(ticketInfo.ticket.flight.date).toLocaleDateString('ru-RU')}</p>
                        <p><strong className="text-white">Время отправления:</strong> {new Date(ticketInfo.ticket.flight.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                      </>
                    )}
                    <p><strong className="text-white">Категория:</strong> {ticketInfo.ticket.tour.category}</p>
                    <p><strong className="text-white">Взрослых мест:</strong> {ticketInfo.ticket.adult_count}</p>
                    {ticketInfo.ticket.child_count > 0 && (
                      <p><strong className="text-white">Детских мест:</strong> {ticketInfo.ticket.child_count}</p>
                    )}
                    {ticketInfo.ticket.concession_count > 0 && (
                      <p><strong className="text-white">Льготных мест:</strong> {ticketInfo.ticket.concession_count}</p>
                    )}
                    <p><strong className="text-white">Статус:</strong> {
                      ticketInfo.ticket.ticket_status === 'sold' ? 'Продано' :
                      ticketInfo.ticket.ticket_status === 'used' ? 'Использовано' :
                      'Отменено'
                    }</p>
                    {ticketInfo.ticket.used_at && (
                      <p><strong className="text-white">Использовано:</strong> {new Date(ticketInfo.ticket.used_at).toLocaleString('ru-RU')}</p>
                    )}
                    {ticketInfo.ticket.usedBy && (
                      <p><strong className="text-white">Проверил:</strong> {ticketInfo.ticket.usedBy.full_name}</p>
                    )}
                    {ticketInfo.ticket.ticket_photo_url && (
                      <div>
                        <p><strong className="text-white">Фото билета:</strong></p>
                        <img src={ticketInfo.ticket.ticket_photo_url} alt="Ticket" className="max-w-xs mt-2 rounded-2xl" />
                      </div>
                    )}
                  </div>

                  {ticketInfo.can_confirm && (
                    <div className="flex space-x-4">
                      <button
                        onClick={confirmTicket}
                        disabled={loading}
                        className="btn-success flex-1"
                      >
                        {loading ? 'Подтверждение...' : 'Подтвердить'}
                      </button>
                      <button
                        onClick={() => {
                          setTicketInfo(null)
                          setError(null)
                        }}
                        className="btn-secondary flex-1"
                      >
                        Отмена
                      </button>
                    </div>
                  )}

                  {!ticketInfo.can_confirm && ticketInfo.message && (
                    <div className="alert-warning">
                      <p className="text-sm font-medium">{ticketInfo.message}</p>
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
