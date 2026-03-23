'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { getNavForRole } from '@/lib/dashboard-nav'
import { customAlert } from '@/utils/modals'

type PartnerDebtItem = {
  partner: { id: string; full_name: string | null; email: string | null }
  debt: number
  sales_count: number
  places: number
}

type OwnerSettlementResponse = {
  range?: { start: string | Date; end: string | Date }
  total_debt: number
  items: PartnerDebtItem[]
}

export default function OwnerSettlementPage() {
  const { token, user } = useAuthStore()
  const [data, setData] = useState<OwnerSettlementResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetch('/api/owner/settlement', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data)
        else customAlert(d.error || 'Ошибка загрузки расчёта')
      })
      .catch(() => customAlert('Ошибка загрузки расчёта'))
      .finally(() => setLoading(false))
  }, [token])

  const navItems = getNavForRole(user?.role || 'owner')

  return (
    <DashboardLayout title="Расчёт" navItems={navItems}>
      <div className="space-y-6">
        <div className="glass-card p-5">
          <h2 className="text-xl font-bold text-white mb-2">Сколько владелец должен партнёрам</h2>
          <div className="text-2xl font-bold text-purple-300">
            {data ? Number(data.total_debt || 0).toFixed(2) : loading ? '—' : '0.00'}₽
          </div>
          <div className="text-white/60 text-sm mt-2">
            Показывается за период: текущий месяц (можно передать `start_date` / `end_date` в API).
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Партнёр</th>
                  <th>Сумма к выплате</th>
                  <th>Продаж</th>
                  <th>Мест</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center text-white/70">
                      Загрузка...
                    </td>
                  </tr>
                ) : data && data.items.length > 0 ? (
                  data.items.map((it) => (
                    <tr key={it.partner.id}>
                      <td>
                        <div className="text-sm font-medium text-white">
                          {it.partner.full_name || 'Без имени'}
                        </div>
                        <div className="text-xs text-white/60">{it.partner.email || ''}</div>
                      </td>
                      <td className="text-sm font-medium text-purple-300 whitespace-nowrap">
                        {Number(it.debt || 0).toFixed(2)}₽
                      </td>
                      <td className="text-sm text-white/70 whitespace-nowrap">{it.sales_count}</td>
                      <td className="text-sm text-white/70 whitespace-nowrap">{it.places}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center text-white/60">
                      Нет данных
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

