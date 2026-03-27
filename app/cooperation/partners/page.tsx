import type { Metadata } from 'next'
import { MarketingArticle } from '@/components/Marketing/MarketingArticle'
import { cooperationPartners, SITE_PUBLIC } from '@/lib/marketing/site-content'

export const metadata: Metadata = {
  title: `${cooperationPartners.title} | ${SITE_PUBLIC.siteName}`,
  description: cooperationPartners.intro,
}

export default function PartnersPage() {
  return (
    <MarketingArticle eyebrow={cooperationPartners.section} title={cooperationPartners.title}>
      <p>{cooperationPartners.intro}</p>
      <ul className="list-disc pl-5 space-y-2">
        {cooperationPartners.list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>{cooperationPartners.outro}</p>
      <div className="glass-card p-6 mt-6">
        <h2 className="text-lg font-semibold text-white mb-3">{cooperationPartners.contactTitle}</h2>
        <ul className="text-white/85 space-y-2 text-sm">
          <li>
            Email:{' '}
            <a href={`mailto:${SITE_PUBLIC.email}`} className="text-sky-300">
              {SITE_PUBLIC.email}
            </a>
          </li>
          <li>
            Телефон:{' '}
            <a href={SITE_PUBLIC.phoneHref} className="text-sky-300">
              {SITE_PUBLIC.phone}
            </a>
          </li>
        </ul>
        <p className="text-white/75 mt-4">{cooperationPartners.closing}</p>
      </div>
    </MarketingArticle>
  )
}
