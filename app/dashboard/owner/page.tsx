'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

export default function OwnerDashboard() {
  const { token } = useAuthStore()
  const [stats, setStats] = useState<any>(null)
  const [promoters, setPromoters] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [token])

  const fetchData = async () => {
    try {
      const [promotersRes, managersRes] = await Promise.all([
        fetch('/api/users/promoters', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch('/api/users/managers', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
      ])

      const promotersData = await promotersRes.json()
      const managersData = await managersRes.json()

      if (promotersData.success) {
        setPromoters(promotersData.data)
      }
      if (managersData.success) {
        setManagers(managersData.data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
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
    <DashboardLayout title="Панель владельца" navItems={navItems}>
      <div className="space-y-6">
        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-2 text-white">Добро пожаловать, Никита!</h2>
          <p className="text-white/70">Обзор системы управления экскурсиями</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card">
            <h3 className="text-lg font-semibold mb-4 text-white flex items-center">
              <span className="w-2 h-2 bg-white/60 rounded-full mr-2"></span>
              Промоутеры
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : promoters.length === 0 ? (
              <p className="text-white/60 text-center py-4">Промоутеры не найдены</p>
            ) : (
              <div className="space-y-3">
                {promoters.slice(0, 5).map((promoter) => (
                  <div key={promoter.id} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                    <div>
                      <span className="text-white font-medium">{promoter.full_name}</span>
                      <span className="text-white/60 text-sm ml-2">(ID: {promoter.promoter_id})</span>
                    </div>
                    <span className="font-bold text-white">{Number(promoter.balance).toFixed(2)}₽</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card">
            <h3 className="text-lg font-semibold mb-4 text-white flex items-center">
              <span className="w-2 h-2 bg-white/60 rounded-full mr-2"></span>
              Менеджеры
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : managers.length === 0 ? (
              <p className="text-white/60 text-center py-4">Менеджеры не найдены</p>
            ) : (
              <div className="space-y-3">
                {managers.slice(0, 5).map((manager) => (
                  <div key={manager.id} className="py-2 border-b border-white/10 last:border-0">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">{manager.full_name}</span>
                      <div className="text-right">
                        <div className="font-bold text-white">{Number(manager.balance).toFixed(2)}₽</div>
                        {Number(manager.debt_to_company) > 0 && (
                          <div className="text-red-300 text-sm font-medium">
                            Долг: {Number(manager.debt_to_company).toFixed(2)}₽
                          </div>
                        )}
                      </div>
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