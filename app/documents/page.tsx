import type { Metadata } from 'next'
import NextLink from 'next/link'
import { MarketingArticle } from '@/components/Marketing/MarketingArticle'
import { documentsIntro, SITE_PUBLIC } from '@/lib/marketing/site-content'

export const metadata: Metadata = {
  title: `Документы | ${SITE_PUBLIC.siteName}`,
  description: documentsIntro.lead,
}

export default function DocumentsPage() {
  return (
    <MarketingArticle eyebrow="Юридическая информация" title={documentsIntro.title}>
      <p>{documentsIntro.lead}</p>
      <p className="text-white/70 text-sm">{documentsIntro.filesNote}</p>
      <ul className="space-y-3 pt-4">
        {documentsIntro.links.map((l) => (
          <li key={l.href}>
            <NextLink href={l.href} className="text-sky-300 hover:text-sky-200 font-medium underline-offset-2 hover:underline">
              {l.label}
            </NextLink>
          </li>
        ))}
      </ul>
      <div className="glass-card p-5 sm:p-6 mt-6 sm:mt-8 text-sm">
        <h2 className="text-white font-semibold mb-3">Реквизиты</h2>
        <p className="text-white/80">
          ИНН: <span className="text-white">{SITE_PUBLIC.inn}</span>
        </p>
        <p className="text-white/80 mt-1">
          ОГРНИП: <span className="text-white">{SITE_PUBLIC.ogrnip}</span>
        </p>
        <p className="text-white/60 text-xs mt-4">
          Скан-копии подписанных документов при необходимости запрашивайте по email:{' '}
          <a href={`mailto:${SITE_PUBLIC.email}`} className="text-sky-300">
            {SITE_PUBLIC.email}
          </a>
        </p>
      </div>
    </MarketingArticle>
  )
}
