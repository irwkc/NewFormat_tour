'use client'

import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { getNavForRole } from '@/lib/dashboard-nav'
import { customAlert } from '@/utils/modals'

type PartnerStatsData = {
  turnover: number
  profit: number
  paid?: number
  unpaid_remaining: number
  sold_places: number
  tickets_count: number
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const toDateInputValue = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

export default function PartnerStatisticsPage() {
  const { token, user } = useAuthStore()
  const navItems = getNavForRole(user?.role || 'partner')

  const now = useMemo(() => new Date(), [])
  const defaultStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now])
  const defaultEnd = useMemo(() => new Date(), [])

  const [startInput, setStartInput] = useState<string>(toDateInputValue(defaultStart))
  const [endInput, setEndInput] = useState<string>(toDateInputValue(defaultEnd))
  const [startDate, setStartDate] = useState<string>(toDateInputValue(defaultStart))
  const [endDate, setEndDate] = useState<string>(toDateInputValue(defaultEnd))

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<PartnerStatsData | null>(null)

  const fetchStats = async () => {
    if (!token) return
    setLoading(true)
    try {
      const r = await fetch(`/api/statistics/partner?start_date=${startDate}&end_date=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await r.json()
      if (!d.success) {
        await customAlert(d.error || 'Ошибка загрузки статистики')
        return
      }
      setStats(d.data)
    } catch {
      await customAlert('Ошибка загрузки статистики')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, startDate, endDate])

  return (
    <DashboardLayout title="Статистика партнёра" navItems={navItems}>
      <div className="space-y-6">
        <div className="glass-card p-5">
          <h2 className="text-2xl font-bold text-white mb-4">Статистика</h2>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60 whitespace-nowrap">С</span>
              <input
                type="date"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                className="input-glass text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60 whitespace-nowrap">По</span>
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
          <p className="text-xs text-white/60 mt-3">
            Показатели считаются только по билетам в статусе «прошёл посадку».
          </p>
        </div>

        {loading ? (
          <div className="glass-card text-center text-white/70">Загрузка...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold mb-1 text-white/70">Оборот</h3>
              <div className="text-2xl font-bold text-purple-300">{Number(stats?.turnover || 0).toFixed(2)}₽</div>
            </div>
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold mb-1 text-white/70">Невыплаченный остаток</h3>
              <p className="text-xs text-white/50 mb-1">Начислено за период минус выплаты от владельца.</p>
              <div className="text-2xl font-bold text-amber-200">{Number(stats?.unpaid_remaining ?? 0).toFixed(2)}₽</div>
            </div>
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold mb-1 text-white/70">Проданных мест</h3>
              <div className="text-2xl font-bold text-blue-300">{stats?.sold_places ?? 0}</div>
            </div>
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold mb-1 text-white/70">Билетов (used)</h3>
              <div className="text-2xl font-bold text-pink-300">{stats?.tickets_count ?? 0}</div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
