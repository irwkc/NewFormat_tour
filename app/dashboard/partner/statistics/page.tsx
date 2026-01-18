'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

export default function PartnerStatisticsPage() {
  const { token, user } = useAuthStore()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token && user) {
      fetchStatistics()
    }
  }, [token, user])

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`/api/statistics/by-partner/${user?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const navItems = [
    { label: 'Мои экскурсии', href: '/dashboard/partner/tours' },
    { label: 'Проверка билетов', href: '/dashboard/partner/tickets/check' },
    { label: 'Статистика', href: '/dashboard/partner/statistics' },
  ]

  return (
    <DashboardLayout title="Статистика по моим экскурсиям" navItems={navItems}>
      <div className="px-4 py-6 sm:px-0">
        {loading ? (
          <div className="bg-white p-6 rounded-lg shadow text-center">Загрузка...</div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Всего продаж</h3>
              <div className="text-3xl font-bold text-indigo-600">
                {stats.total_sales || 0}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Общая сумма</h3>
              <div className="text-3xl font-bold text-green-600">
                {Number(stats.total_amount || 0).toFixed(2)}₽
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Всего билетов</h3>
              <div className="text-3xl font-bold text-blue-600">
                {stats.total_tickets || 0}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
            Нет данных для отображения
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
