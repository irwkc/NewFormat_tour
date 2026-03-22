'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { RoleOnboardingOverlay } from '@/components/Onboarding/RoleOnboardingOverlay'
import Link from 'next/link'

type OwnerPromoterSummary = {
  id: string
  full_name: string
  promoter_id: number | null
  balance: number | string
}

type OwnerManagerSummary = {
  id: string
  full_name: string
  balance: number | string
  debt_to_company: number | string
}

type ModerationTourRow = {
  id: string
  company: string
  category: { name: string }
  partner_min_adult_price: number | string
  partner_min_child_price: number | string
  partner_min_concession_price?: number | string | null
  flights?: { id: string }[]
}

export default function OwnerDashboard() {
  const { token, user } = useAuthStore()
  const [promoters, setPromoters] = useState<OwnerPromoterSummary[]>([])
  const [managers, setManagers] = useState<OwnerManagerSummary[]>([])
  const [toursOnModeration, setToursOnModeration] = useState<ModerationTourRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [token])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = 'nf_onboarding_owner_seen'
    if (!window.localStorage.getItem(key)) setShowOnboarding(true)
  }, [])

  const finishOnboarding = () => {
    if (typeof window !== 'undefined') window.localStorage.setItem('nf_onboarding_owner_seen', '1')
    setShowOnboarding(false)
  }

  const fetchData = async () => {
    try {
      const [promotersRes, managersRes, toursRes] = await Promise.all([
        fetch('/api/users/promoters', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/users/managers', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/tours?moderation_status=pending', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ])

      const promotersData = await promotersRes.json()
      const managersData = await managersRes.json()
      const toursData = await toursRes.json()

      if (promotersData.success) setPromoters(promotersData.data)
      if (managersData.success) setManagers(managersData.data)
      if (toursData.success) setToursOnModeration(toursData.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Панель владельца">
      {showOnboarding && (
        <RoleOnboardingOverlay role="owner" onFinish={finishOnboarding} />
      )}
      <div className="space-y-6">
        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-2 text-white">Добро пожаловать{user?.full_name || user?.email ? `, ${user.full_name || user.email}` : ''}!</h2>
          <p className="text-white/70">Обзор системы управления экскурсиями</p>
        </div>

        {/* Экскурсии на модерации */}
        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4 text-white flex items-center">
            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
            Экскурсии на модерации
          </h3>
          {loading ? (
            <p className="text-white/70">Загрузка...</p>
          ) : toursOnModeration.length === 0 ? (
            <p className="text-white/60">Нет экскурсий на модерации</p>
          ) : (
            <div className="space-y-3">
              {toursOnModeration.map((tour) => (
                <Link
                  key={tour.id}
                  href={`/dashboard/owner/moderation/${tour.id}`}
                  className="block rounded-2xl p-4 hover:bg-white/10 transition-all border border-white/10"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-white">{tour.company}</div>
                      <div className="text-sm text-white/70 mt-1">
                        Категория: {tour.category.name} · Рейсов: {tour.flights?.length || 0}
                      </div>
                      <div className="text-sm mt-1 text-white/60">
                        Цены партнёра: взр. {Number(tour.partner_min_adult_price).toFixed(0)}₽, дет. {Number(tour.partner_min_child_price).toFixed(0)}₽
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-yellow-300/30 text-yellow-200 rounded-full text-sm border border-yellow-400/30 shrink-0">
                      На модерации
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
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