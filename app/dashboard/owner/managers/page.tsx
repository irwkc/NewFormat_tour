'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

export default function OwnerManagersPage() {
  const { token } = useAuthStore()
  const [managers, setManagers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchManagers()
    }
  }, [token])

  const fetchManagers = async () => {
    try {
      const response = await fetch('/api/users/managers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setManagers(data.data)
      }
    } catch (error) {
      console.error('Error fetching managers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResetBalance = async (userId: string) => {
    if (!confirm('Обнулить баланс этого менеджера?')) return

    try {
      const response = await fetch(`/api/users/${userId}/reset-balance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        fetchManagers()
        alert('Баланс обнулен')
      } else {
        alert(result.error || 'Ошибка обнуления баланса')
      }
    } catch (error) {
      alert('Ошибка обнуления баланса')
    }
  }

  const handleResetDebt = async (userId: string) => {
    if (!confirm('Обнулить долг компании этого менеджера?')) return

    try {
      const response = await fetch(`/api/users/${userId}/reset-debt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        fetchManagers()
        alert('Долг обнулен')
      } else {
        alert(result.error || 'Ошибка обнуления долга')
      }
    } catch (error) {
      alert('Ошибка обнуления долга')
    }
  }

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      const result = await response.json()
      if (result.success) {
        fetchManagers()
      } else {
        alert(result.error || 'Ошибка изменения статуса')
      }
    } catch (error) {
      alert('Ошибка изменения статуса')
    }
  }

  const navItems = [
    { label: 'Экскурсии на модерации', href: '/dashboard/owner/moderation' },
    { label: 'Категории', href: '/dashboard/owner/categories' },
    { label: 'Промоутеры', href: '/dashboard/owner/promoters' },
    { label: 'Менеджеры', href: '/dashboard/owner/managers' },
    { label: 'Выдача вещей', href: '/dashboard/owner/issued-items' },
    { label: 'Статистика', href: '/dashboard/owner/statistics' },
  ]

  return (
    <DashboardLayout title="Менеджеры" navItems={navItems}>
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">Список менеджеров</h2>
          </div>
          {loading ? (
            <div className="p-6 text-center">Загрузка...</div>
          ) : managers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Нет менеджеров</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ФИО
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Баланс
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Долг компании
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {managers.map((manager) => (
                    <tr key={manager.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {manager.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {manager.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {Number(manager.balance).toFixed(2)}₽
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                        {Number(manager.debt_to_company).toFixed(2)}₽
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          manager.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {manager.is_active ? 'Активен' : 'Заблокирован'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => handleResetBalance(manager.id)}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          Обнулить баланс
                        </button>
                        {Number(manager.debt_to_company) > 0 && (
                          <button
                            onClick={() => handleResetDebt(manager.id)}
                            className="text-orange-600 hover:text-orange-800"
                          >
                            Обнулить долг
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleStatus(manager.id, manager.is_active)}
                          className={`${
                            manager.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {manager.is_active ? 'Заблокировать' : 'Разблокировать'}
                        </button>
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
