import type { Metadata } from 'next'
import { HomeGate } from '@/components/Marketing/HomeGate'
import { SITE_PUBLIC } from '@/lib/marketing/site-content'
import { getPublicManagers } from '@/lib/public-managers'
import { getSiteOrigin } from '@/lib/seo/site-origin'
import { PUBLIC_SITE_KEYWORDS } from '@/lib/seo/public-keywords'

export const dynamic = 'force-dynamic'

const base = getSiteOrigin()

export const metadata: Metadata = {
  title: `${SITE_PUBLIC.siteName} — экскурсии | ${SITE_PUBLIC.domain}`,
  description: `${SITE_PUBLIC.siteName} (${SITE_PUBLIC.domain}): водные и пешие экскурсии, проверка билета по номеру заказа, команда менеджеров, документы и поддержка. Сайт и сервис: irwkc.`,
  keywords: [...PUBLIC_SITE_KEYWORDS],
  authors: [{ name: 'irwkc', url: 'https://github.com/irwkc' }],
  creator: 'irwkc',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  alternates: { canonical: `${base}/` },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: `${base}/`,
    siteName: SITE_PUBLIC.siteName,
    title: `${SITE_PUBLIC.siteName} — экскурсии на воде и пешком`,
    description: `Официальный сайт ${SITE_PUBLIC.siteName}. Экскурсии, билеты, проверка заказа. irwkc.`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_PUBLIC.siteName} — экскурсии`,
    description: `NF Travel · nf-travel.ru · irwkc`,
  },
}

export default async function HomePage() {
  const initialManagers = await getPublicManagers(24)
  return <HomeGate initialManagers={initialManagers} />
}
