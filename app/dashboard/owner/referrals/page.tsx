'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ReferralsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/owner/invitations')
  }, [router])
  return null
}
