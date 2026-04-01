'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false)
  const { user, hydrated } = useAuthStore()

  useEffect(() => {
    if (initialized) return
    if (typeof window === 'undefined') return
    if (!hydrated) return
    const role = user?.role
    if (role === 'manager' || role === 'promoter') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (!VAPID_PUBLIC_KEY) return

    const registerAndSubscribe = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')

        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const existing = await registration.pushManager.getSubscription()
        let subscription = existing

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          })
        }

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription }),
        })

        setInitialized(true)
      } catch (e) {
        console.error('Push init error', e)
      }
    }

    registerAndSubscribe()
  }, [initialized, hydrated, user?.role])

  return <>{children}</>
}

