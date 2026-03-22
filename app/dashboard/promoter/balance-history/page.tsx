'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

type BalanceHistoryItem = {
  id: string
  transaction_type: 'credit' | 'debit'
  amount: number | string
  balance_before: number | string
  balance_after: number | string
  description: string
  created_at: string
}

export default function PromoterBalanceHistoryPage() {
  const { token, user, updateUser } = useAuthStore()
  const [balance, setBalance] = useState<number | null>(null)
  const [history, setHistory] = useState<BalanceHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{ transaction_type?: string }>({})

  useEffect(() => {
    if (token) fetchMe()
  }, [token])

  useEffect(() => {
    if (token) fetchHistory()
  }, [token, filter])

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success && data.data) {
        const freshBalance = Number(data.data.balance ?? 0)
        setBalance(freshBalance)
        updateUser({ balance: freshBalance })
      }
    } catch {
      setBalance(null)
    }
  }

  const fetchHistory = async () => {
    try {
      const params = new URLSearchParams()
      params.append('balance_type', 'balance')
      if (filter.transaction_type) params.append('transaction_type', filter.transaction_type)

      const response = await fetch(`/api/users/me/balance-history?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setHistory(data.data)
      }
    } catch (error) {
      console.error('Error fetching balance history:', error)
    } finally {
      setLoading(false)
    }
  }

  const navItems = [
    { label: 'Продажи', href: '/dashboard/promoter/sales' },
    { label: 'История баланса', href: '/dashboard/promoter/balance-history' },
    { label: 'Выданные вещи', href: '/dashboard/promoter/issued-items' },
    { label: 'Реферальная программа', href: '/dashboard/promoter/invitations' },
  ]

  return (
    <DashboardLayout title="История баланса" navItems={navItems}>
      <div className="space-y-6">
        <div className="glass-card">
          <h2 className="text-xl font-bold mb-4 text-white">Кошелёк доходов</h2>
          <div className="text-3xl font-bold text-green-300">
            {balance !== null ? Number(balance).toFixed(2) : Number(user?.balance ?? 0).toFixed(2)}₽
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4 text-white">Фильтры</h3>
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Тип операции
            </label>
            <select
              value={filter.transaction_type || ''}
              onChange={(e) => setFilter({ transaction_type: e.target.value || undefined })}
              className="input-glass"
            >
              <option value="">Все</option>
              <option value="credit">Пополнение</option>
              <option value="debit">Выплата</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">История операций</h2>
          </div>
          {loading ? (
            <div className="p-6 text-center text-white/70">Загрузка...</div>
          ) : history.length === 0 ? (
            <div className="p-6 text-center text-white/70">Нет операций</div>
          ) : (
            <>
              {/* Мобильный вид — карточки */}
              <div className="space-y-3 md:hidden p-4">
                {history.map((item) => (
                  <div key={item.id} className="glass-card">
                    <div className="text-xs text-white/60 mb-1">
                      {new Date(item.created_at).toLocaleString('ru-RU')}
                    </div>
                    <div className="flex justify-between items-center mb-2 text-sm">
                      <div
                        className={`text-sm font-semibold ${
                          item.transaction_type === 'credit' ? 'text-green-300' : 'text-red-300'
                        }`}
                      >
                        {item.transaction_type === 'credit' ? '+' : '-'}
                        {Number(item.amount).toFixed(2)}₽
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full border ${
                          item.transaction_type === 'credit'
                            ? 'bg-green-300/30 text-green-200 border-green-400/30'
                            : 'bg-red-300/30 text-red-200 border-red-400/30'
                        }`}
                      >
                        {item.transaction_type === 'credit' ? 'Пополнение' : 'Выплата'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-white/70 mt-1">
                      <span>До: {Number(item.balance_before).toFixed(2)}₽</span>
                      <span>После: {Number(item.balance_after).toFixed(2)}₽</span>
                    </div>
                    {item.description && (
                      <div className="text-xs text-white/70 mt-2">{item.description}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Десктопный вид — таблица */}
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Дата</th>
                        <th>Операция</th>
                        <th>Сумма</th>
                        <th>Баланс до</th>
                        <th>Баланс после</th>
                        <th>Описание</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item) => (
                        <tr key={item.id}>
                          <td className="text-sm text-white/70 whitespace-nowrap">
                            {new Date(item.created_at).toLocaleString('ru-RU')}
                          </td>
                          <td className="whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs rounded-full border ${
                                item.transaction_type === 'credit'
                                  ? 'bg-green-300/30 text-green-200 border-green-400/30'
                                  : 'bg-red-300/30 text-red-200 border-red-400/30'
                              }`}
                            >
                              {item.transaction_type === 'credit' ? 'Пополнение' : 'Выплата'}
                            </span>
                          </td>
                          <td
                            className={`text-sm font-medium whitespace-nowrap ${
                              item.transaction_type === 'credit'
                                ? 'text-green-300'
                                : 'text-red-300'
                            }`}
                          >
                            {item.transaction_type === 'credit' ? '+' : '-'}
                            {Number(item.amount).toFixed(2)}₽
                          </td>
                          <td className="text-sm text-white/70 whitespace-nowrap">
                            {Number(item.balance_before).toFixed(2)}₽
                          </td>
                          <td className="text-sm font-medium text-white whitespace-nowrap">
                            {Number(item.balance_after).toFixed(2)}₽
                          </td>
                          <td className="text-sm text-white/70">
                            {item.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
