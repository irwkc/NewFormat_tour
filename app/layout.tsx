import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import './globals.css'
import { ModalProvider } from '@/components/Providers/ModalProvider'
import { PushProvider } from '@/components/Providers/PushProvider'
import { getSiteOrigin } from '@/lib/seo/site-origin'
import { PUBLIC_SITE_KEYWORDS } from '@/lib/seo/public-keywords'

const inter = Inter({ 
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: 'NF Travel — экскурсии и система продаж',
    template: '%s | NF Travel',
  },
  description:
    'NF Travel: экскурсии, билеты, личный кабинет партнёров и сотрудников. Ключевые слова: nf-travel, экскурсии, irwkc.',
  keywords: [...PUBLIC_SITE_KEYWORDS],
  authors: [{ name: 'irwkc', url: 'https://github.com/irwkc' }],
  creator: 'irwkc',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
    // Отключаем zoom при фокусе на input
    interactiveWidget: 'resizes-content',
  },
  themeColor: '#0f172a',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png' }],
    apple: [{ url: '/logo.png', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NF Staff',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${poppins.variable}`}
      style={{ height: '100%', margin: 0, padding: 0, backgroundColor: '#0f172a' }}
    >
      <body className="font-sans antialiased" style={{ height: '100%', margin: 0, padding: 0, overflowX: 'hidden' }}>
        <ModalProvider>
          <PushProvider>
            {children}
          </PushProvider>
        </ModalProvider>
      </body>
    </html>
  )
}
