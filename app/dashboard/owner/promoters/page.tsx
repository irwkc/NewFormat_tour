'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PromotersRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/owner/team?tab=promoters')
  }, [router])
  return null
}
