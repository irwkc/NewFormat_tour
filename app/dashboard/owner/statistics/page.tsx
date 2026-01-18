'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

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
        alert('Ошибка экспорта статистики')
      }
    } catch (error) {
      alert('Ошибка экспорта статистики')
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
    <DashboardLayout title="Статистика" navItems={navItems}>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Статистика продаж</h2>
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            Экспорт в Excel
          </button>
        </div>

        <div className="mb-6">
          <div className="flex space-x-4 border-b">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 ${
                activeTab === 'overview'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500'
              }`}
            >
              Общая статистика
            </button>
            <button
              onClick={() => setActiveTab('by-tour')}
              className={`px-4 py-2 ${
                activeTab === 'by-tour'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500'
              }`}
            >
              По экскурсиям
            </button>
            <button
              onClick={() => setActiveTab('by-seller')}
              className={`px-4 py-2 ${
                activeTab === 'by-seller'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500'
              }`}
            >
              По продавцам
            </button>
            <button
              onClick={() => setActiveTab('by-payment')}
              className={`px-4 py-2 ${
                activeTab === 'by-payment'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500'
              }`}
            >
              По способам оплаты
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white p-6 rounded-lg shadow text-center">Загрузка...</div>
        ) : activeTab === 'overview' && overview ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Всего продаж</h3>
              <div className="text-3xl font-bold text-indigo-600">
                {overview.total_sales || 0}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Общая сумма</h3>
              <div className="text-3xl font-bold text-green-600">
                {Number(overview.total_amount || 0).toFixed(2)}₽
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Всего билетов</h3>
              <div className="text-3xl font-bold text-blue-600">
                {overview.total_tickets || 0}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {activeTab === 'by-tour' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Экскурсия</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Продаж</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                      </>
                    )}
                    {activeTab === 'by-seller' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Продавец</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Продаж</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                      </>
                    )}
                    {activeTab === 'by-payment' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Способ оплаты</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Продаж</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.map((stat, index) => (
                    <tr key={index}>
                      {activeTab === 'by-tour' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {stat.tour?.company} - {stat.tour?.flight_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {stat.count || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {Number(stat.total || 0).toFixed(2)}₽
                          </td>
                        </>
                      )}
                      {activeTab === 'by-seller' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {stat.seller?.full_name || stat.promoter?.full_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {stat.count || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {Number(stat.total || 0).toFixed(2)}₽
                          </td>
                        </>
                      )}
                      {activeTab === 'by-payment' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {stat.payment_method === 'online_yookassa' ? 'Онлайн' :
                             stat.payment_method === 'cash' ? 'Наличные' : 'Эквайринг'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {stat.count || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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
