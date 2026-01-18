'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { customConfirm, customAlert } from '@/utils/modals'

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
    const confirmed = await customConfirm('Обнулить баланс этого менеджера?')
    if (!confirmed) return

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
        await customAlert('Баланс обнулен')
      } else {
        await customAlert(result.error || 'Ошибка обнуления баланса')
      }
    } catch (error) {
      await customAlert('Ошибка обнуления баланса')
    }
  }

  const handleResetDebt = async (userId: string) => {
    const confirmed = await customConfirm('Обнулить долг компании этого менеджера?')
    if (!confirmed) return

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
        await customAlert('Долг обнулен')
      } else {
        await customAlert(result.error || 'Ошибка обнуления долга')
      }
    } catch (error) {
      await customAlert('Ошибка обнуления долга')
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
        await customAlert(result.error || 'Ошибка изменения статуса')
      }
    } catch (error) {
      await customAlert('Ошибка изменения статуса')
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
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Список менеджеров</h2>
          <p className="text-white/70 text-sm mt-1">Управление менеджерами и их балансами</p>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="p-6 text-center text-white/70">Загрузка...</div>
          ) : managers.length === 0 ? (
            <div className="p-6 text-center text-white/70">Нет менеджеров</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>ФИО</th>
                    <th>Баланс</th>
                    <th>Долг компании</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {managers.map((manager) => (
                    <tr key={manager.id}>
                      <td className="text-sm text-white whitespace-nowrap">
                        {manager.email}
                      </td>
                      <td className="text-sm text-white whitespace-nowrap">
                        {manager.full_name}
                      </td>
                      <td className="text-sm font-medium text-green-300 whitespace-nowrap">
                        {Number(manager.balance).toFixed(2)}₽
                      </td>
                      <td className="text-sm font-medium text-red-300 whitespace-nowrap">
                        {Number(manager.debt_to_company).toFixed(2)}₽
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full border ${
                          manager.is_active ? 'bg-green-300/30 text-green-200 border-green-400/30' : 'bg-red-300/30 text-red-200 border-red-400/30'
                        }`}>
                          {manager.is_active ? 'Активен' : 'Заблокирован'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => handleResetBalance(manager.id)}
                          className="btn-secondary text-xs px-3 py-1"
                        >
                          Обнулить баланс
                        </button>
                        {Number(manager.debt_to_company) > 0 && (
                          <button
                            onClick={() => handleResetDebt(manager.id)}
                            className="btn-warning text-xs px-3 py-1"
                          >
                            Обнулить долг
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleStatus(manager.id, manager.is_active)}
                          className={`text-xs px-3 py-1 rounded-xl ${
                            manager.is_active ? 'btn-danger text-xs px-3 py-1' : 'btn-success text-xs px-3 py-1'
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
