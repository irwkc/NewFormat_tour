'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { HomeLanding } from '@/components/Marketing/HomeLanding'
import type { PublicManager } from '@/lib/public-managers'

type Props = {
  initialManagers: PublicManager[]
}

export function HomeGate({ initialManagers }: Props) {
  const router = useRouter()
  const { user, isAuthenticated, hydrated } = useAuthStore()

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated || !user) return
    const role = user.role
    if (role === 'owner') router.replace('/dashboard/owner')
    else if (role === 'owner_assistant') router.replace('/dashboard/owner-assistant')
    else if (role === 'partner') router.replace('/dashboard/partner')
    else if (role === 'partner_controller') router.replace('/dashboard/partner-controller')
    else if (role === 'manager') router.replace('/dashboard/manager')
    else if (role === 'promoter') router.replace('/dashboard/promoter')
    else router.replace('/dashboard')
  }, [hydrated, isAuthenticated, user, router])

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    )
  }

  return <HomeLanding managers={initialManagers} />
}
