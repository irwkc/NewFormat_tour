import type { Metadata } from 'next'
import { SITE_PUBLIC } from '@/lib/marketing/site-content'

export const metadata: Metadata = {
  title: `Документы | ${SITE_PUBLIC.siteName}`,
  description: 'Документы и реквизиты — на главной странице.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
