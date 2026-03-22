'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'

type ManagerSalesRow = {
  id: string
  sale_number?: string | null
  tour: {
    company: string
  }
  flight?: {
    flight_number: string
    date: string
    departure_time: string
  }
  created_at: string
  adult_count: number
  child_count: number
  concession_count: number
  total_amount: number | string
  payment_method: 'online_yookassa' | 'cash' | 'acquiring'
  payment_status: 'pending' | 'completed' | 'failed'
  promoter?: {
    full_name?: string | null
  } | null
}

export default function ManagerSalesPage() {
  const { token } = useAuthStore()
  const [sales, setSales] = useState<ManagerSalesRow[]>([])
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
            <>
              {/* Мобильный вид — карточки */}
              <div className="space-y-3 md:hidden">
                {sales.map((sale) => (
                  <div key={sale.id} className="glass-card">
                    <div className="text-sm font-semibold text-white">
                      {sale.sale_number && (
                        <span className="text-white/60 mr-2">#{sale.sale_number}</span>
                      )}
                      {sale.tour.company}
                      {sale.flight && ` — ${sale.flight.flight_number}`}
                    </div>
                    {sale.flight && (
                      <div className="text-xs text-white/60 mt-1">
                        {new Date(sale.flight.date).toLocaleDateString('ru-RU')}{' '}
                        {new Date(sale.flight.departure_time).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-3 text-sm">
                      <div className="text-white/80">
                        {sale.adult_count} взр.
                        {sale.child_count > 0 && `, ${sale.child_count} дет.`}
                        {sale.concession_count > 0 && `, ${sale.concession_count} льг.`}
                      </div>
                      <div className="text-white font-semibold">
                        {Number(sale.total_amount).toFixed(2)}₽
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs text-white/70">
                      <span>
                        {sale.payment_method === 'online_yookassa'
                          ? 'Онлайн'
                          : sale.payment_method === 'cash'
                          ? 'Наличные'
                          : 'Эквайринг'}
                      </span>
                      <span>
                        {sale.promoter ? sale.promoter.full_name : 'Без промоутера'}
                      </span>
                    </div>
                    <div className="mt-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full border ${
                          sale.payment_status === 'completed'
                            ? 'bg-green-300/30 text-green-200 border-green-400/30'
                            : sale.payment_status === 'pending'
                            ? 'bg-yellow-300/30 text-yellow-200 border-yellow-400/30'
                            : 'bg-red-300/30 text-red-200 border-red-400/30'
                        }`}
                      >
                        {sale.payment_status === 'completed'
                          ? 'Оплачено'
                          : sale.payment_status === 'pending'
                          ? 'Ожидание'
                          : 'Ошибка'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Десктопный вид — таблица */}
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>№</th>
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
                          <td className="text-sm text-white/80 whitespace-nowrap">
                            {sale.sale_number || '-'}
                          </td>
                          <td>
                            <div className="text-sm font-medium text-white">
                              {sale.tour.company}
                              {sale.flight && ` - ${sale.flight.flight_number}`}
                            </div>
                            {sale.flight && (
                              <div className="text-sm text-white/70">
                                {new Date(sale.flight.date).toLocaleDateString('ru-RU')}{' '}
                                {new Date(sale.flight.departure_time).toLocaleTimeString('ru-RU', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            )}
                          </td>
                          <td className="text-sm text-white/70 whitespace-nowrap">
                            {new Date(sale.created_at).toLocaleDateString('ru-RU')}
                          </td>
                          <td className="text-sm text-white whitespace-nowrap">
                            {sale.adult_count} взр.
                            {sale.child_count > 0 && `, ${sale.child_count} дет.`}
                            {sale.concession_count > 0 && `, ${sale.concession_count} льг.`}
                          </td>
                          <td className="text-sm font-medium text-white whitespace-nowrap">
                            {Number(sale.total_amount).toFixed(2)}₽
                          </td>
                          <td className="text-sm text-white/70 whitespace-nowrap">
                            {sale.payment_method === 'online_yookassa'
                              ? 'Онлайн'
                              : sale.payment_method === 'cash'
                              ? 'Наличные'
                              : 'Эквайринг'}
                          </td>
                          <td className="whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs rounded-full border ${
                                sale.payment_status === 'completed'
                                  ? 'bg-green-300/30 text-green-200 border-green-400/30'
                                  : sale.payment_status === 'pending'
                                  ? 'bg-yellow-300/30 text-yellow-200 border-yellow-400/30'
                                  : 'bg-red-300/30 text-red-200 border-red-400/30'
                              }`}
                            >
                              {sale.payment_status === 'completed'
                                ? 'Оплачено'
                                : sale.payment_status === 'pending'
                                ? 'Ожидание'
                                : 'Ошибка'}
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
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
