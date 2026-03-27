import type { Metadata } from 'next'
import { HomeGate } from '@/components/Marketing/HomeGate'
import { SITE_PUBLIC } from '@/lib/marketing/site-content'

export const metadata: Metadata = {
  title: `${SITE_PUBLIC.siteName} — экскурсии | ${SITE_PUBLIC.domain}`,
  description: 'Водные и пешие экскурсии, документы, сотрудничество, поддержка. NF Travel / nf-travel.ru.',
}

export default function HomePage() {
  return <HomeGate />
}
