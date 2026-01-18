'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

export default function ManagerIssuedItemsPage() {
  const { token } = useAuthStore()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchItems()
    }
  }, [token])

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/issued-items/my-items', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setItems(data.data.filter((item: any) => !item.is_returned))
      }
    } catch (error) {
      console.error('Error fetching issued items:', error)
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
    <DashboardLayout title="Выданные вещи" navItems={navItems}>
      <div className="space-y-6">
        <div className="glass-card">
          <h2 className="text-xl font-bold mb-4 text-white">Выданные мне вещи</h2>
          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <span className="ml-3 text-white/70">Загрузка...</span>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-white/60">Нет выданных вещей</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <div key={item.id} className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl overflow-hidden shadow-2xl">
                  {item.item_photo_url && (
                    <img
                      src={item.item_photo_url}
                      alt={item.item_name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-2 text-white">{item.item_name}</h3>
                    {item.item_description && (
                      <p className="text-sm text-white/90 mb-2">{item.item_description}</p>
                    )}
                    <p className="text-xs text-white/70">
                      Выдано: {new Date(item.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
