'use client'

import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { getNavForRole } from '@/lib/dashboard-nav'
import { customAlert } from '@/utils/modals'

type Metric = 'turnover' | 'income' | 'salary'
type Scope = 'total' | 'partner' | 'tour'
type PaymentScope = 'all' | 'cash' | 'acquiring' | 'qr'

type SalesMetricsItem = {
  id: string
  name: string
  value: number
  sales_count: number
  places: number
}

type SalesMetricsResponse = {
  total_value: number
  sales_count: number
  places: number
  items: SalesMetricsItem[]
}

const pad2 = (n: number) => String(n).padStart(2, '0')

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export default function OwnerStatisticsPage() {
  const { token, user } = useAuthStore()

  const now = useMemo(() => new Date(), [])
  const defaultStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now])
  const defaultEnd = useMemo(() => new Date(), [])

  const [metric, setMetric] = useState<Metric>('turnover')
  const [scope, setScope] = useState<Scope>('total')
  const [turnoverPayment, setTurnoverPayment] = useState<PaymentScope>('all')

  const [startInput, setStartInput] = useState<string>(toDateInputValue(defaultStart))
  const [endInput, setEndInput] = useState<string>(toDateInputValue(defaultEnd))

  const [startDate, setStartDate] = useState<string>(toDateInputValue(defaultStart))
  const [endDate, setEndDate] = useState<string>(toDateInputValue(defaultEnd))

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SalesMetricsResponse | null>(null)

  const navItems = getNavForRole(user?.role || 'owner')

  const titleByMetric: Record<Metric, string> = {
    turnover: 'Оборот',
    income: 'Чистая прибыль',
    salary: 'Зп',
  }

  const scopeLabel: Record<Scope, string> = {
    total: 'Общий',
    partner: 'По партнёрам',
    tour: 'По экскурсиям',
  }

  const fetchData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const paymentParam = metric === 'turnover' || metric === 'income' ? `&payment=${turnoverPayment}` : ''
      const endpoint = `/api/statistics/sales-metrics?metric=${metric}&group=${scope}&start_date=${startDate}&end_date=${endDate}${paymentParam}`
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await response.json()
      if (!d.success) {
        await customAlert(d.error || 'Ошибка загрузки статистики')
        return
      }
      setData(d.data as SalesMetricsResponse)
    } catch (error) {
      console.error('Error fetching sales metrics:', error)
      await customAlert('Ошибка загрузки статистики')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, metric, scope, turnoverPayment, startDate, endDate])

  const handleExport = async () => {
    try {
      const response = await fetch('/api/statistics/export', {
        headers: { Authorization: `Bearer ${token}` },
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
    } catch {
      await customAlert('Ошибка экспорта статистики')
    }
  }

  const formatValue = (v: number) => Number(v || 0).toFixed(2)

  return (
    <DashboardLayout title="Статистика" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-bold text-white">Статистика продаж</h2>
          <button onClick={handleExport} className="btn-success">
            Экспорт в Excel
          </button>
        </div>

        <div className="glass-card p-5">
          <div className="flex flex-wrap items-end gap-4 justify-between">
            <div className="space-y-1">
              <div className="text-sm text-white/70">Период</div>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-white/60 whitespace-nowrap">С</div>
                  <input
                    type="date"
                    value={startInput}
                    onChange={(e) => setStartInput(e.target.value)}
                    className="input-glass text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-white/60 whitespace-nowrap">По</div>
                  <input
                    type="date"
                    value={endInput}
                    onChange={(e) => setEndInput(e.target.value)}
                    className="input-glass text-sm"
                  />
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setStartDate(startInput)
                    setEndDate(endInput)
                  }}
                >
                  Применить
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap gap-2">
              {(['turnover', 'income', 'salary'] as Metric[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    metric === m ? 'bg-white/20 text-white border border-white/30' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {titleByMetric[m]}
                </button>
              ))}
            </div>

            {(metric === 'turnover' || metric === 'income') && (
              <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
                {([
                  ['all', 'Общий'],
                  ['acquiring', 'Эквайринг'],
                  ['qr', 'QR'],
                  ['cash', 'Нал'],
                ] as Array<[PaymentScope, string]>).map(([p, label]) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTurnoverPayment(p)}
                    className={`px-4 py-2 rounded-xl transition-all ${
                      turnoverPayment === p ? 'bg-white/20 text-white border border-white/30' : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
              {(['total', 'partner', 'tour'] as Scope[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    scope === s ? 'bg-white/20 text-white border border-white/30' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {scopeLabel[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="glass-card text-center text-white/70">Загрузка...</div>
        ) : !data ? (
          <div className="glass-card text-center text-white/70">Нет данных</div>
        ) : scope === 'total' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-5">
              <h3 className="text-lg font-semibold mb-2 text-white/70">{titleByMetric[metric]}</h3>
              <div className="text-3xl font-bold text-purple-300">{formatValue(data.total_value)}₽</div>
              <div className="text-sm text-white/60 mt-2">
                Продаж: {data.sales_count} · Мест: {data.places}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card p-5">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>{scope === 'partner' ? 'Партнёр' : 'Экскурсия'}</th>
                    <th>Продаж</th>
                    <th>Мест</th>
                    <th>{titleByMetric[metric]}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-white/60">
                        Нет данных
                      </td>
                    </tr>
                  ) : (
                    data.items.map((it) => (
                      <tr key={it.id}>
                        <td className="text-sm text-white whitespace-nowrap">{it.name}</td>
                        <td className="text-sm text-white/70 whitespace-nowrap">{it.sales_count}</td>
                        <td className="text-sm text-white/70 whitespace-nowrap">{it.places}</td>
                        <td className="text-sm font-medium text-purple-300 whitespace-nowrap">{formatValue(it.value)}₽</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
