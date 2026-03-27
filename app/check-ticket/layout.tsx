import type { Metadata } from 'next'
import { SITE_PUBLIC } from '@/lib/marketing/site-content'

export const metadata: Metadata = {
  title: `Проверка билета | ${SITE_PUBLIC.siteName}`,
  description: 'Проверка билета по номеру заказа — на главной странице.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
