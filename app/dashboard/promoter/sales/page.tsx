'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'

type PromoterSalesRow = {
  id: string
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
  payment_status: 'pending' | 'completed' | 'failed'
}

export default function PromoterSalesPage() {
  const { token } = useAuthStore()
  const [sales, setSales] = useState<PromoterSalesRow[]>([])
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
    { label: 'Продажи', href: '/dashboard/promoter/sales' },
    { label: 'История баланса', href: '/dashboard/promoter/balance-history' },
    { label: 'Выданные вещи', href: '/dashboard/promoter/issued-items' },
    { label: 'Реферальная программа', href: '/dashboard/promoter/invitations' },
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
            href="/dashboard/promoter/sales/create"
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
                        <th>Экскурсия</th>
                        <th>Дата</th>
                        <th>Билеты</th>
                        <th>Сумма</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((sale) => (
                        <tr key={sale.id}>
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
