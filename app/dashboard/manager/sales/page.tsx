'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'

export default function ManagerSalesPage() {
  const { token } = useAuthStore()
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchSales()
    }
  }, [token])

  const fetchSales = async () => {
    try {
      const response = await fetch('/api/sales', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setSales(data.data)
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
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
    <DashboardLayout title="Мои продажи" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Мои продажи</h2>
            <p className="text-white/70 text-sm mt-1">История всех ваших продаж</p>
          </div>
          <Link
            href="/dashboard/manager/sales/create"
            className="btn-primary"
          >
            + Создать продажу
          </Link>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="p-6 text-center text-white/70">Загрузка...</div>
          ) : sales.length === 0 ? (
            <div className="p-6 text-center text-white/70">Нет продаж</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Экскурсия</th>
                    <th>Дата</th>
                    <th>Билеты</th>
                    <th>Сумма</th>
                    <th>Способ оплаты</th>
                    <th>Статус</th>
                    <th>Промоутер</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td>
                        <div className="text-sm font-medium text-white">
                          {sale.tour.company} - {sale.tour.flight_number}
                        </div>
                        <div className="text-sm text-white/70">
                          {new Date(sale.tour.date).toLocaleDateString('ru-RU')}
                        </div>
                      </td>
                      <td className="text-sm text-white/70 whitespace-nowrap">
                        {new Date(sale.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="text-sm text-white whitespace-nowrap">
                        {sale.adult_count} взр.
                        {sale.child_count > 0 && `, ${sale.child_count} дет.`}
                      </td>
                      <td className="text-sm font-medium text-white whitespace-nowrap">
                        {Number(sale.total_amount).toFixed(2)}₽
                      </td>
                      <td className="text-sm text-white/70 whitespace-nowrap">
                        {sale.payment_method === 'online_yookassa' ? 'Онлайн' :
                         sale.payment_method === 'cash' ? 'Наличные' : 'Эквайринг'}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full border ${
                          sale.payment_status === 'completed' ? 'bg-green-300/30 text-green-200 border-green-400/30' :
                          sale.payment_status === 'pending' ? 'bg-yellow-300/30 text-yellow-200 border-yellow-400/30' :
                          'bg-red-300/30 text-red-200 border-red-400/30'
                        }`}>
                          {sale.payment_status === 'completed' ? 'Оплачено' :
                           sale.payment_status === 'pending' ? 'Ожидание' : 'Ошибка'}
                        </span>
                      </td>
                      <td className="text-sm text-white/70 whitespace-nowrap">
                        {sale.promoter ? sale.promoter.full_name : '-'}
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
