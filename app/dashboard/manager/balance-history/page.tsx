'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

export default function ManagerBalanceHistoryPage() {
  const { token, user } = useAuthStore()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{ balance_type?: string; transaction_type?: string }>({})

  useEffect(() => {
    if (token) {
      fetchHistory()
    }
  }, [token, filter])

  const fetchHistory = async () => {
    try {
      const params = new URLSearchParams()
      if (filter.balance_type) params.append('balance_type', filter.balance_type)
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
    { label: 'Продажи', href: '/dashboard/manager/sales' },
    { label: 'История баланса', href: '/dashboard/manager/balance-history' },
    { label: 'Выданные вещи', href: '/dashboard/manager/issued-items' },
  ]

  return (
    <DashboardLayout title="История баланса" navItems={navItems}>
      <div className="space-y-6">
        <div className="glass-card">
          <h2 className="text-xl font-bold mb-4 text-white">Текущие балансы</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-white/70">Баланс</div>
              <div className="text-2xl font-bold text-green-300">
                {Number(user?.balance || 0).toFixed(2)}₽
              </div>
            </div>
            <div>
              <div className="text-sm text-white/70">Долг компании</div>
              <div className="text-2xl font-bold text-red-300">
                {Number(user?.debt_to_company || 0).toFixed(2)}₽
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4 text-white">Фильтры</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Тип баланса
              </label>
              <select
                value={filter.balance_type || ''}
                onChange={(e) => setFilter({ ...filter, balance_type: e.target.value || undefined })}
                className="input-glass"
              >
                <option value="">Все</option>
                <option value="balance">Баланс</option>
                <option value="debt_to_company">Долг компании</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Тип операции
              </label>
              <select
                value={filter.transaction_type || ''}
                onChange={(e) => setFilter({ ...filter, transaction_type: e.target.value || undefined })}
                className="input-glass"
              >
                <option value="">Все</option>
                <option value="credit">Пополнение</option>
                <option value="debit">Выплата</option>
              </select>
            </div>
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
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Тип баланса</th>
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
                      <td className="text-sm text-white whitespace-nowrap">
                        {item.balance_type === 'balance' ? 'Баланс' : 'Долг компании'}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full border ${
                          item.transaction_type === 'credit' ? 'bg-green-300/30 text-green-200 border-green-400/30' : 'bg-red-300/30 text-red-200 border-red-400/30'
                        }`}>
                          {item.transaction_type === 'credit' ? 'Пополнение' : 'Выплата'}
                        </span>
                      </td>
                      <td className={`text-sm font-medium whitespace-nowrap ${
                        item.transaction_type === 'credit' ? 'text-green-300' : 'text-red-300'
                      }`}>
                        {item.transaction_type === 'credit' ? '+' : '-'}{Number(item.amount).toFixed(2)}₽
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
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
