'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { customAlert } from '@/utils/modals'

export default function OwnerStatisticsPage() {
  const { token } = useAuthStore()
  const [overview, setOverview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'by-tour' | 'by-seller' | 'by-payment'>('overview')
  const [stats, setStats] = useState<any[]>([])

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [token, activeTab])

  const fetchData = async () => {
    try {
      setLoading(true)
      let endpoint = '/api/statistics/overview'
      
      if (activeTab === 'by-tour') endpoint = '/api/statistics/by-tour'
      else if (activeTab === 'by-seller') endpoint = '/api/statistics/by-seller'
      else if (activeTab === 'by-payment') endpoint = '/api/statistics/by-payment-method'

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        if (activeTab === 'overview') {
          setOverview(data.data)
        } else {
          setStats(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch('/api/statistics/export', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `statistics-${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        await customAlert('Ошибка экспорта статистики')
      }
    } catch (error) {
      await customAlert('Ошибка экспорта статистики')
    }
  }

  const navItems = [
    { label: 'Экскурсии на модерации', href: '/dashboard/owner/moderation' },
    { label: 'Категории', href: '/dashboard/owner/categories' },
    { label: 'Промоутеры', href: '/dashboard/owner/promoters' },
    { label: 'Менеджеры', href: '/dashboard/owner/managers' },
    { label: 'Выдача вещей', href: '/dashboard/owner/issued-items' },
    { label: 'Статистика', href: '/dashboard/owner/statistics' },
    { label: 'Приглашения', href: '/dashboard/owner/invitations' },
    { label: 'Рефералы', href: '/dashboard/owner/referrals' },
    { label: 'Настройки', href: '/dashboard/owner/settings' },
  ]

  return (
    <DashboardLayout title="Статистика" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Статистика продаж</h2>
          <button
            onClick={handleExport}
            className="btn-success"
          >
            Экспорт в Excel
          </button>
        </div>

        <div className="glass-card">
          <div className="flex space-x-4 border-b border-white/10 pb-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeTab === 'overview'
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Общая статистика
            </button>
            <button
              onClick={() => setActiveTab('by-tour')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeTab === 'by-tour'
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              По экскурсиям
            </button>
            <button
              onClick={() => setActiveTab('by-seller')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeTab === 'by-seller'
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              По продавцам
            </button>
            <button
              onClick={() => setActiveTab('by-payment')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeTab === 'by-payment'
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              По способам оплаты
            </button>
          </div>
        </div>

        {loading ? (
          <div className="glass-card text-center text-white/70">Загрузка...</div>
        ) : activeTab === 'overview' && overview ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card">
              <h3 className="text-lg font-semibold mb-2 text-white/70">Всего продаж</h3>
              <div className="text-3xl font-bold text-purple-300">
                {overview.total_sales || 0}
              </div>
            </div>
            <div className="glass-card">
              <h3 className="text-lg font-semibold mb-2 text-white/70">Общая сумма</h3>
              <div className="text-3xl font-bold text-green-300">
                {Number(overview.total_amount || 0).toFixed(2)}₽
              </div>
            </div>
            <div className="glass-card">
              <h3 className="text-lg font-semibold mb-2 text-white/70">Всего билетов</h3>
              <div className="text-3xl font-bold text-blue-300">
                {overview.total_tickets || 0}
              </div>
            </div>
          </div>
        ) : (
          <div className="table-container">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    {activeTab === 'by-tour' && (
                      <>
                        <th>Экскурсия</th>
                        <th>Продаж</th>
                        <th>Сумма</th>
                      </>
                    )}
                    {activeTab === 'by-seller' && (
                      <>
                        <th>Продавец</th>
                        <th>Продаж</th>
                        <th>Сумма</th>
                      </>
                    )}
                    {activeTab === 'by-payment' && (
                      <>
                        <th>Способ оплаты</th>
                        <th>Продаж</th>
                        <th>Сумма</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat, index) => (
                    <tr key={index}>
                      {activeTab === 'by-tour' && (
                        <>
                          <td className="text-sm text-white whitespace-nowrap">
                            {stat.tour?.company} - {stat.tour?.flight_number}
                          </td>
                          <td className="text-sm text-white/70 whitespace-nowrap">
                            {stat.count || 0}
                          </td>
                          <td className="text-sm font-medium text-white whitespace-nowrap">
                            {Number(stat.total || 0).toFixed(2)}₽
                          </td>
                        </>
                      )}
                      {activeTab === 'by-seller' && (
                        <>
                          <td className="text-sm text-white whitespace-nowrap">
                            {stat.seller?.full_name || stat.promoter?.full_name || '-'}
                          </td>
                          <td className="text-sm text-white/70 whitespace-nowrap">
                            {stat.count || 0}
                          </td>
                          <td className="text-sm font-medium text-white whitespace-nowrap">
                            {Number(stat.total || 0).toFixed(2)}₽
                          </td>
                        </>
                      )}
                      {activeTab === 'by-payment' && (
                        <>
                          <td className="text-sm text-white whitespace-nowrap">
                            {stat.payment_method === 'online_yookassa' ? 'Онлайн' :
                             stat.payment_method === 'cash' ? 'Наличные' : 'Эквайринг'}
                          </td>
                          <td className="text-sm text-white/70 whitespace-nowrap">
                            {stat.count || 0}
                          </td>
                          <td className="text-sm font-medium text-white whitespace-nowrap">
                            {Number(stat.total || 0).toFixed(2)}₽
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
