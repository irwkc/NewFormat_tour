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
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Текущие балансы</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Баланс</div>
              <div className="text-2xl font-bold text-green-600">
                {Number(user?.balance || 0).toFixed(2)}₽
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Долг компании</div>
              <div className="text-2xl font-bold text-red-600">
                {Number(user?.debt_to_company || 0).toFixed(2)}₽
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Фильтры</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тип баланса
              </label>
              <select
                value={filter.balance_type || ''}
                onChange={(e) => setFilter({ ...filter, balance_type: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Все</option>
                <option value="balance">Баланс</option>
                <option value="debt_to_company">Долг компании</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тип операции
              </label>
              <select
                value={filter.transaction_type || ''}
                onChange={(e) => setFilter({ ...filter, transaction_type: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Все</option>
                <option value="credit">Пополнение</option>
                <option value="debit">Выплата</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">История операций</h2>
          </div>
          {loading ? (
            <div className="p-6 text-center">Загрузка...</div>
          ) : history.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Нет операций</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Тип баланса
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Операция
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Сумма
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Баланс до
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Баланс после
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Описание
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleString('ru-RU')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.balance_type === 'balance' ? 'Баланс' : 'Долг компании'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.transaction_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.transaction_type === 'credit' ? 'Пополнение' : 'Выплата'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        item.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.transaction_type === 'credit' ? '+' : '-'}{Number(item.amount).toFixed(2)}₽
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Number(item.balance_before).toFixed(2)}₽
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {Number(item.balance_after).toFixed(2)}₽
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
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
