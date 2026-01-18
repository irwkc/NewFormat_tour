'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { customConfirm, customAlert } from '@/utils/modals'

export default function OwnerPromotersPage() {
  const { token } = useAuthStore()
  const [promoters, setPromoters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchPromoters()
    }
  }, [token])

  const fetchPromoters = async () => {
    try {
      const response = await fetch('/api/users/promoters', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setPromoters(data.data)
      }
    } catch (error) {
      console.error('Error fetching promoters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResetBalance = async (userId: string) => {
    const confirmed = await customConfirm('Обнулить баланс этого промоутера?')
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
        fetchPromoters()
        await customAlert('Баланс обнулен')
      } else {
        await customAlert(result.error || 'Ошибка обнуления баланса')
      }
    } catch (error) {
      await customAlert('Ошибка обнуления баланса')
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
        fetchPromoters()
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
    <DashboardLayout title="Промоутеры" navItems={navItems}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Список промоутеров</h2>
          <p className="text-white/70 text-sm mt-1">Управление промоутерами и их балансами</p>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="p-6 text-center text-white/70">Загрузка...</div>
          ) : promoters.length === 0 ? (
            <div className="p-6 text-center text-white/70">Нет промоутеров</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>ФИО</th>
                    <th>Email</th>
                    <th>Баланс</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {promoters.map((promoter) => (
                    <tr key={promoter.id}>
                      <td className="text-sm font-medium text-white whitespace-nowrap">
                        {promoter.promoter_id}
                      </td>
                      <td className="text-sm text-white whitespace-nowrap">
                        {promoter.full_name}
                      </td>
                      <td className="text-sm text-white/70 whitespace-nowrap">
                        {promoter.email || '-'}
                      </td>
                      <td className="text-sm font-medium text-green-300 whitespace-nowrap">
                        {Number(promoter.balance).toFixed(2)}₽
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full border ${
                          promoter.is_active ? 'bg-green-300/30 text-green-200 border-green-400/30' : 'bg-red-300/30 text-red-200 border-red-400/30'
                        }`}>
                          {promoter.is_active ? 'Активен' : 'Заблокирован'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => handleResetBalance(promoter.id)}
                          className="btn-secondary text-xs px-3 py-1"
                        >
                          Обнулить баланс
                        </button>
                        <button
                          onClick={() => handleToggleStatus(promoter.id, promoter.is_active)}
                          className={`text-xs px-3 py-1 rounded-xl ${
                            promoter.is_active ? 'btn-danger text-xs px-3 py-1' : 'btn-success text-xs px-3 py-1'
                          }`}
                        >
                          {promoter.is_active ? 'Заблокировать' : 'Разблокировать'}
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
