import type { Metadata } from 'next'
import { SITE_PUBLIC } from '@/lib/marketing/site-content'

export const metadata: Metadata = {
  title: `Партнёрам | ${SITE_PUBLIC.siteName}`,
  description: 'Сотрудничество — на главной странице.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
