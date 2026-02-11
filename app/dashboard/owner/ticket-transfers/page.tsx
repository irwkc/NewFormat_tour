'use client'

import { useEffect, useState, useCallback } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

const TICKET_REGEX = /^[A-Za-z]{2}\d{8}$/

export default function TicketTransfersPage() {
  const { token, user } = useAuthStore()
  const [transfers, setTransfers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [managerEmail, setManagerEmail] = useState('')
  const [managerInfo, setManagerInfo] = useState<{
    found: boolean
    id?: string
    email?: string
    full_name?: string | null
    is_active?: boolean
  } | null>(null)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [checkingEmail, setCheckingEmail] = useState(false)

  const isOwner = user?.role === 'owner'
  const navItems = isOwner
    ? [
        { label: 'Экскурсии на модерации', href: '/dashboard/owner/moderation' },
        { label: 'Категории', href: '/dashboard/owner/categories' },
        { label: 'Промоутеры', href: '/dashboard/owner/promoters' },
        { label: 'Менеджеры', href: '/dashboard/owner/managers' },
        { label: 'Передача билетов', href: '/dashboard/owner/ticket-transfers' },
        { label: 'Выдача вещей', href: '/dashboard/owner/issued-items' },
        { label: 'Статистика', href: '/dashboard/owner/statistics' },
        { label: 'Приглашения', href: '/dashboard/owner/invitations' },
        { label: 'Рефералы', href: '/dashboard/owner/referrals' },
        { label: 'Настройки', href: '/dashboard/owner/settings' },
      ]
    : [
        { label: 'Выдача вещей', href: '/dashboard/owner-assistant' },
        { label: 'Передача билетов', href: '/dashboard/owner/ticket-transfers' },
      ]

  const fetchTransfers = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/manager-ticket-ranges', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setTransfers(data.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) fetchTransfers()
  }, [token, fetchTransfers])

  useEffect(() => {
    if (!managerEmail.trim()) {
      setManagerInfo(null)
      return
    }
    const t = setTimeout(async () => {
      setCheckingEmail(true)
      try {
        const res = await fetch(
          `/api/manager-ticket-ranges/check-manager?email=${encodeURIComponent(managerEmail.trim())}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const data = await res.json()
        if (data.success) {
          setManagerInfo({
            found: data.found,
            ...(data.manager || {}),
          })
        } else {
          setManagerInfo(null)
        }
      } catch (e) {
        setManagerInfo(null)
      } finally {
        setCheckingEmail(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [managerEmail, token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const email = managerEmail.trim()
    const startUp = start.trim().toUpperCase()
    const endUp = end.trim().toUpperCase()
    if (!email) {
      setError('Укажите email менеджера')
      return
    }
    if (!TICKET_REGEX.test(startUp) || !TICKET_REGEX.test(endUp)) {
      setError('Формат диапазона: AA00000000 (2 заглавные буквы + 8 цифр)')
      return
    }
    const [pStart, nStart] = [startUp.slice(0, 2), parseInt(startUp.slice(2), 10)]
    const [pEnd, nEnd] = [endUp.slice(0, 2), parseInt(endUp.slice(2), 10)]
    if (pStart !== pEnd || nStart > nEnd) {
      setError('Начало и конец диапазона должны иметь один префикс и начальный номер ≤ конечного')
      return
    }
    if (!managerInfo?.found) {
      setError('Сначала введите email зарегистрированного менеджера')
      return
    }
    setSubmitLoading(true)
    try {
      const res = await fetch('/api/manager-ticket-ranges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          manager_email: email,
          ticket_number_start: startUp,
          ticket_number_end: endUp,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setManagerEmail('')
        setStart('')
        setEnd('')
        setManagerInfo(null)
        fetchTransfers()
      } else {
        setError(data.error || 'Ошибка создания передачи')
      }
    } catch (e) {
      setError('Ошибка при создании передачи')
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <DashboardLayout title="Передача билетов" navItems={navItems}>
      <div className="space-y-6 max-w-4xl">
        <div className="glass-card">
          <h2 className="text-xl font-bold text-white mb-4">Передать пронумерованные билеты менеджеру</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Email менеджера *
              </label>
              <input
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                className="input-glass w-full"
                placeholder="manager@example.com"
              />
              {checkingEmail && (
                <p className="text-white/60 text-xs mt-1">Проверка...</p>
              )}
              {!checkingEmail && managerInfo && (
                <p className={`text-sm mt-1 ${managerInfo.found ? 'text-green-300' : 'text-amber-300'}`}>
                  {managerInfo.found
                    ? `Менеджер: ${managerInfo.full_name || managerInfo.email}${managerInfo.is_active === false ? ' (не активен)' : ''}`
                    : 'Менеджер с таким email не найден'}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Начало диапазона (AA00000000) *
                </label>
                <input
                  type="text"
                  value={start}
                  onChange={(e) => setStart(e.target.value.toUpperCase().slice(0, 10))}
                  className="input-glass w-full uppercase"
                  placeholder="AB10000000"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Конец диапазона (AA00000000) *
                </label>
                <input
                  type="text"
                  value={end}
                  onChange={(e) => setEnd(e.target.value.toUpperCase().slice(0, 10))}
                  className="input-glass w-full uppercase"
                  placeholder="AB10000099"
                  maxLength={10}
                />
              </div>
            </div>
            <p className="text-xs text-white/60">
              Один префикс (2 буквы), номера от 00000000 до 99999999. Начальный номер не больше конечного.
            </p>
            {error && (
              <div className="rounded-xl bg-red-500/20 border border-red-400/40 px-4 py-2 text-red-200 text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitLoading || !managerInfo?.found || managerInfo?.is_active === false}
              className="btn-primary"
            >
              {submitLoading ? 'Создание...' : 'Подтвердить передачу'}
            </button>
          </form>
        </div>

        <div className="glass-card">
          <h2 className="text-xl font-bold text-white mb-4">История передач</h2>
          {loading ? (
            <p className="text-white/70">Загрузка...</p>
          ) : transfers.length === 0 ? (
            <p className="text-white/60">Передач пока нет</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="py-2 pr-4 text-white/80 font-medium">Менеджер</th>
                    <th className="py-2 pr-4 text-white/80 font-medium">Диапазон</th>
                    <th className="py-2 pr-4 text-white/80 font-medium">Кто передал</th>
                    <th className="py-2 text-white/80 font-medium">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => (
                    <tr key={t.id} className="border-b border-white/10">
                      <td className="py-3 pr-4 text-white">
                        {t.manager?.full_name || t.manager?.email || t.manager_user_id}
                      </td>
                      <td className="py-3 pr-4 text-white/90">
                        {t.ticket_number_start} — {t.ticket_number_end}
                      </td>
                      <td className="py-3 pr-4 text-white/70 text-sm">
                        {t.createdBy?.full_name || t.createdBy?.email || '—'}
                      </td>
                      <td className="py-3 text-white/60 text-sm">
                        {new Date(t.created_at).toLocaleString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
