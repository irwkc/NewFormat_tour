'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { getNavForRole } from '@/lib/dashboard-nav'
import { customAlert } from '@/utils/modals'

type PartnerDebtItem = {
  partner: { id: string; full_name: string | null; email: string | null }
  profit: number
  paid: number
  remaining: number
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
  const [payoutAmounts, setPayoutAmounts] = useState<Record<string, string>>({})
  const [payoutLoading, setPayoutLoading] = useState(false)

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

  const refresh = async () => {
    if (!token) return
    setLoading(true)
    try {
      const r = await fetch('/api/owner/settlement', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await r.json()
      if (d.success) setData(d.data)
      else customAlert(d.error || 'Ошибка загрузки расчёта')
    } catch {
      customAlert('Ошибка загрузки расчёта')
    } finally {
      setLoading(false)
    }
  }

  const handlePayout = async (partnerId: string) => {
    const raw = payoutAmounts[partnerId]
    const amount = Number(raw)
    if (!Number.isFinite(amount) || amount <= 0) {
      await customAlert('Введите сумму выплаты')
      return
    }

    try {
      setPayoutLoading(true)
      const r = await fetch('/api/owner/settlement/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ partner_id: partnerId, amount }),
      })
      const d = await r.json()
      if (!d.success) {
        await customAlert(d.error || 'Ошибка выплаты')
        return
      }
      setPayoutAmounts((s) => ({ ...s, [partnerId]: '' }))
      await refresh()
    } catch {
      await customAlert('Ошибка выплаты')
    } finally {
      setPayoutLoading(false)
    }
  }

  const navItems = getNavForRole(user?.role || 'owner')

  return (
    <DashboardLayout title="Расчёт" navItems={navItems}>
      <div className="space-y-6">
        <div className="glass-card p-5">
          <h2 className="text-xl font-bold text-white mb-2">Общий долг</h2>
          <div className="text-2xl font-bold text-purple-300">
            {data ? Number(data.total_debt || 0).toFixed(2) : loading ? '—' : '0.00'}₽
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Партнёр</th>
                  <th>Прибыль партнёра</th>
                  <th>Выплачено</th>
                  <th>Остаток к выплате</th>
                  <th>Продаж</th>
                  <th>Мест</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center text-white/70">
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
                        {Number(it.profit || 0).toFixed(2)}₽
                      </td>
                      <td className="text-sm font-medium text-white/70 whitespace-nowrap">
                        {Number(it.paid || 0).toFixed(2)}₽
                      </td>
                      <td className="text-sm font-medium text-purple-300 whitespace-nowrap">
                        {Number(it.remaining || 0).toFixed(2)}₽
                      </td>
                      <td className="text-sm text-white/70 whitespace-nowrap">{it.sales_count}</td>
                      <td className="text-sm text-white/70 whitespace-nowrap">{it.places}</td>
                      <td className="text-sm whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="₽"
                            value={payoutAmounts[it.partner.id] ?? ''}
                            onChange={(e) =>
                              setPayoutAmounts((s) => ({
                                ...s,
                                [it.partner.id]: e.target.value,
                              }))
                            }
                            className="input-glass w-28 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            disabled={payoutLoading || (it.remaining || 0) <= 0}
                          />
                          <button
                            type="button"
                            className="btn-success text-xs px-3 py-2"
                            disabled={payoutLoading || (it.remaining || 0) <= 0}
                            onClick={() => handlePayout(it.partner.id)}
                          >
                            Выплатить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center text-white/60">
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

