'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'

export default function ManagerDashboard() {
  const { token, user } = useAuthStore()
  const [tours, setTours] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [balanceHistory, setBalanceHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [token])

  const fetchData = async () => {
    try {
      const [toursRes, salesRes, historyRes] = await Promise.all([
        fetch('/api/tours?moderation_status=approved', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch('/api/sales', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch('/api/users/me/balance-history', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
      ])

      const toursData = await toursRes.json()
      const salesData = await salesRes.json()
      const historyData = await historyRes.json()

      if (toursData.success) setTours(toursData.data)
      if (salesData.success) setSales(salesData.data)
      if (historyData.success) setBalanceHistory(historyData.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const navItems = [
    { label: 'Продажи', href: '/dashboard/manager/sales' },
    { label: 'История баланса', href: '/dashboard/manager/balance-history' },
    { label: 'Выданные вещи', href: '/dashboard/manager/issued-items' },
    { label: 'Приглашения', href: '/dashboard/manager/invitations' },
  ]

  return (
    <DashboardLayout title="Панель менеджера" navItems={navItems}>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Ваш баланс</h2>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {Number(user?.balance || 0).toFixed(2)}₽
            </div>
            {Number(user?.debt_to_company || 0) > 0 && (
              <div className="text-lg text-red-600">
                Долг компании: {Number(user?.debt_to_company || 0).toFixed(2)}₽
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Доступные экскурсии</h3>
            {loading ? (
              <p>Загрузка...</p>
            ) : (
              <div className="space-y-2">
                {tours.slice(0, 5).map((tour) => (
                  <Link
                    key={tour.id}
                    href={`/dashboard/manager/tours/${tour.id}`}
                    className="block p-3 border rounded hover:bg-gray-50"
                  >
                    <div className="font-semibold">{tour.company} - {tour.flight_number}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(tour.date).toLocaleDateString('ru-RU')} {new Date(tour.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Последние продажи</h3>
            {loading ? (
              <p>Загрузка...</p>
            ) : (
              <div className="space-y-2">
                {sales.slice(0, 5).map((sale) => (
                  <div key={sale.id} className="p-3 border rounded">
                    <div className="font-semibold">{sale.tour.company}</div>
                    <div className="text-sm text-gray-600">
                      {sale.adult_count} взр. {sale.child_count > 0 && `${sale.child_count} дет.`} - {Number(sale.total_amount).toFixed(2)}₽
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
