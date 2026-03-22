'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { getNavForRole } from '@/lib/dashboard-nav'
import { customConfirm, customAlert } from '@/utils/modals'

type OwnerPromoterRow = {
  id: string
  promoter_id: number | null
  full_name?: string | null
  email?: string | null
  balance: number | string
  is_active: boolean
}

export default function OwnerPromotersPage() {
  const { token, user } = useAuthStore()
  const [promoters, setPromoters] = useState<OwnerPromoterRow[]>([])
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

  const navItems = getNavForRole(user?.role || 'owner')

  return (
    <DashboardLayout title="Промоутеры" navItems={navItems}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Список промоутеров</h2>
          <p className="text-white/70 text-sm mt-1">Управление промоутерами и их балансами</p>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="glass-card p-6 text-center text-white/70">Загрузка...</div>
          ) : promoters.length === 0 ? (
            <div className="glass-card p-6 text-center text-white/70">Нет промоутеров</div>
          ) : (
            <>
              {/* Мобильный вид — карточки */}
              <div className="space-y-3 md:hidden">
                {promoters.map((promoter) => (
                  <div key={promoter.id} className="glass-card">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm text-white/60">Промоутер ID</div>
                      <div className="text-sm font-semibold text-white">
                        {promoter.promoter_id}
                      </div>
                    </div>
                    <div className="text-white font-medium">
                      {promoter.full_name || 'Без имени'}
                    </div>
                    <div className="text-xs text-white/60 mt-1">
                      {promoter.email || 'Email не указан'}
                    </div>
                    <div className="flex justify-between items-center mt-3 text-sm">
                      <div>
                        <div className="text-white/60 text-xs">Баланс</div>
                        <div className="text-green-300 font-semibold">
                          {Number(promoter.balance).toFixed(2)}₽
                        </div>
                      </div>
                      <div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full border ${
                            promoter.is_active
                              ? 'bg-green-300/30 text-green-200 border-green-400/30'
                              : 'bg-red-300/30 text-red-200 border-red-400/30'
                          }`}
                        >
                          {promoter.is_active ? 'Активен' : 'Заблокирован'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleResetBalance(promoter.id)}
                        className="btn-secondary text-xs px-3 py-2 flex-1"
                      >
                        Обнулить баланс
                      </button>
                      <button
                        onClick={() => handleToggleStatus(promoter.id, promoter.is_active)}
                        className={`text-xs px-3 py-2 rounded-2xl flex-1 ${
                          promoter.is_active ? 'btn-danger' : 'btn-success'
                        }`}
                      >
                        {promoter.is_active ? 'Заблокировать' : 'Разблокировать'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Десктопный вид — таблица */}
              <div className="hidden md:block table-container">
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
                            <span
                              className={`px-2 py-1 text-xs rounded-full border ${
                                promoter.is_active
                                  ? 'bg-green-300/30 text-green-200 border-green-400/30'
                                  : 'bg-red-300/30 text-red-200 border-red-400/30'
                              }`}
                            >
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
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
