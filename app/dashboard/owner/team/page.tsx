'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { getNavForRole } from '@/lib/dashboard-nav'
import { customConfirm, customAlert } from '@/utils/modals'

type OwnerPromoterRow = {
  id: string
  promoter_id: number | null
  full_name?: string | null
  email?: string | null
  balance: number | string
  is_active: boolean
}

type OwnerManagerRow = {
  id: string
  email: string
  full_name?: string | null
  balance: number | string
  debt_to_company: number | string
  is_active: boolean
}

type Tab = 'promoters' | 'managers'

function OwnerTeamContent() {
  const { token, user } = useAuthStore()
  const [promoters, setPromoters] = useState<OwnerPromoterRow[]>([])
  const [managers, setManagers] = useState<OwnerManagerRow[]>([])
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get('tab') as Tab | null
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>(tabFromUrl === 'managers' ? 'managers' : 'promoters')

  useEffect(() => {
    if (tabFromUrl === 'managers' || tabFromUrl === 'promoters') {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])

  useEffect(() => {
    if (token) {
      Promise.all([
        fetch('/api/users/promoters', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch('/api/users/managers', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      ]).then(([promo, mgr]) => {
        if (promo.success) setPromoters(promo.data)
        if (mgr.success) setManagers(mgr.data)
      }).catch(console.error).finally(() => setLoading(false))
    }
  }, [token])

  const fetchPromoters = () => {
    if (!token) return
    fetch('/api/users/promoters', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.success && setPromoters(d.data))
  }

  const fetchManagers = () => {
    if (!token) return
    fetch('/api/users/managers', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.success && setManagers(d.data))
  }

  const handleResetBalance = async (userId: string) => {
    const confirmed = await customConfirm(
      activeTab === 'promoters' ? 'Обнулить баланс этого промоутера?' : 'Обнулить баланс этого менеджера?'
    )
    if (!confirmed) return

    try {
      const r = await fetch(`/api/users/${userId}/reset-balance`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await r.json()
      if (d.success) {
        if (activeTab === 'promoters') fetchPromoters()
        else fetchManagers()
        await customAlert('Баланс обнулен')
      } else {
        await customAlert(d.error || 'Ошибка обнуления баланса')
      }
    } catch {
      await customAlert('Ошибка обнуления баланса')
    }
  }

  const handleResetDebt = async (userId: string) => {
    const confirmed = await customConfirm('Обнулить долг компании этого менеджера?')
    if (!confirmed) return

    try {
      const r = await fetch(`/api/users/${userId}/reset-debt`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await r.json()
      if (d.success) {
        fetchManagers()
        await customAlert('Долг обнулен')
      } else {
        await customAlert(d.error || 'Ошибка обнуления долга')
      }
    } catch {
      await customAlert('Ошибка обнуления долга')
    }
  }

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const r = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      })
      const d = await r.json()
      if (d.success) {
        if (activeTab === 'promoters') fetchPromoters()
        else fetchManagers()
      } else {
        await customAlert(d.error || 'Ошибка изменения статуса')
      }
    } catch {
      await customAlert('Ошибка изменения статуса')
    }
  }

  const navItems = getNavForRole(user?.role || 'owner')

  return (
    <DashboardLayout title="Промоутеры и менеджеры" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex gap-2 border-b border-white/20 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('promoters')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'promoters' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            Промоутеры
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('managers')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'managers' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            Менеджеры
          </button>
        </div>

        {activeTab === 'promoters' && (
          <div className="glass-card">
            <h2 className="text-xl font-bold mb-4 text-white">Список промоутеров</h2>
            {loading ? (
              <div className="p-6 text-center text-white/70">Загрузка...</div>
            ) : promoters.length === 0 ? (
              <div className="p-6 text-center text-white/60">Нет промоутеров</div>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {promoters.map((p) => (
                    <div key={p.id} className="bg-white/10 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm text-white/60">ID</div>
                        <div className="text-sm font-semibold text-white">{p.promoter_id}</div>
                      </div>
                      <div className="text-white font-medium">{p.full_name || 'Без имени'}</div>
                      <div className="text-xs text-white/60 mt-1">{p.email || '—'}</div>
                      <div className="flex justify-between items-center mt-3 text-sm">
                        <div className="text-green-300 font-semibold">{Number(p.balance).toFixed(2)}₽</div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full border ${
                            p.is_active ? 'bg-green-300/30 text-green-200 border-green-400/30' : 'bg-red-300/30 text-red-200 border-red-400/30'
                          }`}
                        >
                          {p.is_active ? 'Активен' : 'Заблокирован'}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => handleResetBalance(p.id)} className="btn-secondary text-xs px-3 py-2 flex-1">
                          Обнулить баланс
                        </button>
                        <button
                          onClick={() => handleToggleStatus(p.id, p.is_active)}
                          className={`text-xs px-3 py-2 rounded-2xl flex-1 ${p.is_active ? 'btn-danger' : 'btn-success'}`}
                        >
                          {p.is_active ? 'Заблокировать' : 'Разблокировать'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>ФИО</th>
                        <th>Email</th>
                        <th>Баланс</th>
                        <th>Статус</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promoters.map((p) => (
                        <tr key={p.id}>
                          <td className="text-sm font-medium text-white">{p.promoter_id}</td>
                          <td className="text-sm text-white">{p.full_name}</td>
                          <td className="text-sm text-white/70">{p.email || '-'}</td>
                          <td className="text-sm font-medium text-green-300">{Number(p.balance).toFixed(2)}₽</td>
                          <td>
                            <span
                              className={`px-2 py-1 text-xs rounded-full border ${
                                p.is_active ? 'bg-green-300/30 text-green-200 border-green-400/30' : 'bg-red-300/30 text-red-200 border-red-400/30'
                              }`}
                            >
                              {p.is_active ? 'Активен' : 'Заблокирован'}
                            </span>
                          </td>
                          <td className="text-sm space-x-2">
                            <button onClick={() => handleResetBalance(p.id)} className="btn-secondary text-xs px-3 py-1">
                              Обнулить баланс
                            </button>
                            <button
                              onClick={() => handleToggleStatus(p.id, p.is_active)}
                              className={`text-xs px-3 py-1 rounded-xl ${p.is_active ? 'btn-danger' : 'btn-success'}`}
                            >
                              {p.is_active ? 'Заблокировать' : 'Разблокировать'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'managers' && (
          <div className="glass-card">
            <h2 className="text-xl font-bold mb-4 text-white">Список менеджеров</h2>
            {loading && managers.length === 0 ? (
              <div className="p-6 text-center text-white/70">Загрузка...</div>
            ) : managers.length === 0 ? (
              <div className="p-6 text-center text-white/60">Нет менеджеров</div>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {managers.map((m) => (
                    <div key={m.id} className="bg-white/10 rounded-xl p-4">
                      <div className="text-white font-medium">{m.full_name || 'Без имени'}</div>
                      <div className="text-xs text-white/60 mt-1">{m.email}</div>
                      <div className="flex justify-between items-center mt-3 text-sm">
                        <div>
                          <div className="text-white/60 text-xs">Баланс</div>
                          <div className="text-green-300 font-semibold">{Number(m.balance).toFixed(2)}₽</div>
                        </div>
                        <div>
                          <div className="text-white/60 text-xs">Долг</div>
                          <div className="text-red-300 font-semibold">{Number(m.debt_to_company).toFixed(2)}₽</div>
                        </div>
                      </div>
                      <span
                        className={`inline-block mt-2 px-2 py-1 text-xs rounded-full border ${
                          m.is_active ? 'bg-green-300/30 text-green-200 border-green-400/30' : 'bg-red-300/30 text-red-200 border-red-400/30'
                        }`}
                      >
                        {m.is_active ? 'Активен' : 'Заблокирован'}
                      </span>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button onClick={() => handleResetBalance(m.id)} className="btn-secondary text-xs px-3 py-2 flex-1">
                          Обнулить баланс
                        </button>
                        {Number(m.debt_to_company) > 0 && (
                          <button onClick={() => handleResetDebt(m.id)} className="btn-warning text-xs px-3 py-2 flex-1">
                            Обнулить долг
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleStatus(m.id, m.is_active)}
                          className={`text-xs px-3 py-2 rounded-2xl flex-1 ${m.is_active ? 'btn-danger' : 'btn-success'}`}
                        >
                          {m.is_active ? 'Заблокировать' : 'Разблокировать'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>ФИО</th>
                        <th>Баланс</th>
                        <th>Долг компании</th>
                        <th>Статус</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managers.map((m) => (
                        <tr key={m.id}>
                          <td className="text-sm text-white">{m.email}</td>
                          <td className="text-sm text-white">{m.full_name}</td>
                          <td className="text-sm font-medium text-green-300">{Number(m.balance).toFixed(2)}₽</td>
                          <td className="text-sm font-medium text-red-300">{Number(m.debt_to_company).toFixed(2)}₽</td>
                          <td>
                            <span
                              className={`px-2 py-1 text-xs rounded-full border ${
                                m.is_active ? 'bg-green-300/30 text-green-200 border-green-400/30' : 'bg-red-300/30 text-red-200 border-red-400/30'
                              }`}
                            >
                              {m.is_active ? 'Активен' : 'Заблокирован'}
                            </span>
                          </td>
                          <td className="text-sm space-x-2">
                            <button onClick={() => handleResetBalance(m.id)} className="btn-secondary text-xs px-3 py-1">
                              Обнулить баланс
                            </button>
                            {Number(m.debt_to_company) > 0 && (
                              <button onClick={() => handleResetDebt(m.id)} className="btn-warning text-xs px-3 py-1">
                                Обнулить долг
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleStatus(m.id, m.is_active)}
                              className={`text-xs px-3 py-1 rounded-xl ${m.is_active ? 'btn-danger' : 'btn-success'}`}
                            >
                              {m.is_active ? 'Заблокировать' : 'Разблокировать'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function OwnerTeamPage() {
  return (
    <Suspense fallback={
      <DashboardLayout title="Промоутеры и менеджеры" navItems={getNavForRole('owner')}>
        <div className="p-6 text-center text-white/70">Загрузка...</div>
      </DashboardLayout>
    }>
      <OwnerTeamContent />
    </Suspense>
  )
}
