import type { Metadata } from 'next'
import { SITE_PUBLIC } from '@/lib/marketing/site-content'

export const metadata: Metadata = {
  title: `О нас — команда | ${SITE_PUBLIC.siteName}`,
  description: 'Команда NF Travel — на главной странице.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
