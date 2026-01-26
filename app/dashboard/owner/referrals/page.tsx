'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

export default function ReferralsPage() {
  const { token } = useAuthStore()
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(null)
  const [balanceHistory, setBalanceHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    if (token) {
      fetchReferrals()
    }
  }, [token])

  const fetchReferrals = async () => {
    try {
      const response = await fetch('/api/referrals', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setReferrals(data.data)
      }
    } catch (error) {
      console.error('Error fetching referrals:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBalanceHistory = async (userId: string) => {
    if (selectedReferralId === userId && balanceHistory.length > 0) {
      setSelectedReferralId(null)
      setBalanceHistory([])
      return
    }

    setHistoryLoading(true)
    setSelectedReferralId(userId)

    try {
      const response = await fetch(`/api/referrals/${userId}/balance-history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setBalanceHistory(data.data)
      }
    } catch (error) {
      console.error('Error fetching balance history:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  const navItems = [
    { label: 'Экскурсии на модерации', href: '/dashboard/owner/moderation' },
    { label: 'Категории', href: '/dashboard/owner/categories' },
    { label: 'Промоутеры', href: '/dashboard/owner/promoters' },
    { label: 'Менеджеры', href: '/dashboard/owner/managers' },
    { label: 'Выдача вещей', href: '/dashboard/owner/issued-items' },
    { label: 'Статистика', href: '/dashboard/owner/statistics' },
    { label: 'Приглашения', href: '/dashboard/owner/invitations' },
    { label: 'Рефералы', href: '/dashboard/owner/referrals' },
    { label: 'Настройки', href: '/dashboard/owner/settings' },
  ]

  return (
    <DashboardLayout title="Рефералы" navItems={navItems}>
      <div className="space-y-6">
        <div className="glass-card">
          <h2 className="text-xl font-bold mb-4 text-white">Реферально приглашенные промоутеры</h2>
          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <span className="ml-3 text-white/70">Загрузка...</span>
              </div>
            </div>
          ) : referrals.length === 0 ? (
            <div className="p-6 text-center text-white/60">Нет реферально приглашенных промоутеров</div>
          ) : (
            <div className="space-y-4">
              {referrals.map((referral) => (
                <div key={referral.id} className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="font-semibold text-white">
                        {referral.full_name || 'Без имени'}
                      </div>
                      {referral.promoter_id && (
                        <div className="text-sm text-white/90 mt-1">
                          ID промоутера: {referral.promoter_id}
                        </div>
                      )}
                      {referral.email && (
                        <div className="text-sm text-white/90">
                          Email: {referral.email}
                        </div>
                      )}
                      <div className="text-sm text-white/90 mt-2">
                        Приглашен: {referral.invitedBy?.full_name || 'Неизвестно'} 
                        {referral.invitedBy?.promoter_id && ` (ID: ${referral.invitedBy.promoter_id})`}
                      </div>
                      <div className="text-sm text-white/70 mt-1">
                        Дата регистрации: {new Date(referral.created_at).toLocaleString('ru-RU')}
                      </div>
                      <div className="text-lg font-bold text-white mt-2">
                        Баланс: {Number(referral.balance || 0).toFixed(2)}₽
                      </div>
                    </div>
                    <button
                      onClick={() => fetchBalanceHistory(referral.id)}
                      className="btn-secondary text-sm"
                    >
                      {selectedReferralId === referral.id && balanceHistory.length > 0
                        ? 'Скрыть историю'
                        : 'История баланса'}
                    </button>
                  </div>

                  {selectedReferralId === referral.id && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      {historyLoading ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
                        </div>
                      ) : balanceHistory.length === 0 ? (
                        <div className="text-center text-white/60 py-4">История пуста</div>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
                          {balanceHistory.map((history) => (
                            <div key={history.id} className="bg-white/10 rounded-xl p-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="text-sm text-white/90">{history.description}</div>
                                  {history.ticket?.tour && (
                                    <div className="text-xs text-white/70 mt-1">
                                      {history.ticket.tour.company}{history.ticket.flight && ` - ${history.ticket.flight.flight_number}`}
                                    </div>
                                  )}
                                  <div className="text-xs text-white/70">
                                    {new Date(history.created_at).toLocaleString('ru-RU')}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-semibold ${history.transaction_type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                                    {history.transaction_type === 'credit' ? '+' : '-'}{Number(history.amount).toFixed(2)}₽
                                  </div>
                                  <div className="text-xs text-white/70">
                                    Баланс: {Number(history.balance_after).toFixed(2)}₽
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
