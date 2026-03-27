import type { Metadata } from 'next'
import { HomeGate } from '@/components/Marketing/HomeGate'
import { SITE_PUBLIC } from '@/lib/marketing/site-content'
import { getPublicManagers } from '@/lib/public-managers'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `${SITE_PUBLIC.siteName} — экскурсии | ${SITE_PUBLIC.domain}`,
  description: 'Водные и пешие экскурсии, проверка билета, команда, документы. NF Travel.',
}

export default async function HomePage() {
  const initialManagers = await getPublicManagers(24)
  return <HomeGate initialManagers={initialManagers} />
}
