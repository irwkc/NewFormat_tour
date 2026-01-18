'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'

export default function PromoterIssuedItemsPage() {
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
    { label: 'Продажи', href: '/dashboard/promoter/sales' },
    { label: 'История баланса', href: '/dashboard/promoter/balance-history' },
    { label: 'Выданные вещи', href: '/dashboard/promoter/issued-items' },
  ]

  return (
    <DashboardLayout title="Выданные вещи" navItems={navItems}>
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">Выданные мне вещи</h2>
          </div>
          {loading ? (
            <div className="p-6 text-center">Загрузка...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Нет выданных вещей</div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    {item.item_photo_url && (
                      <img
                        src={item.item_photo_url}
                        alt={item.item_name}
                        className="w-full h-48 object-cover rounded mb-4"
                      />
                    )}
                    <h3 className="text-lg font-semibold mb-2">{item.item_name}</h3>
                    {item.item_description && (
                      <p className="text-sm text-gray-600 mb-2">{item.item_description}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Выдано: {new Date(item.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
