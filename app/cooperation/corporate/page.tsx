import type { Metadata } from 'next'
import { MarketingArticle } from '@/components/Marketing/MarketingArticle'
import { corporate, SITE_PUBLIC } from '@/lib/marketing/site-content'

export const metadata: Metadata = {
  title: `${corporate.title} | ${SITE_PUBLIC.siteName}`,
  description: corporate.lead,
}

export default function CorporatePage() {
  return (
    <MarketingArticle eyebrow={corporate.section} title={corporate.title}>
      <p>{corporate.lead}</p>
      <h2 className="text-xl font-semibold text-white pt-4">{corporate.whyTitle}</h2>
      <ul className="space-y-4">
        {corporate.why.map((w) => (
          <li key={w.title} className="glass-card p-4">
            <span className="font-semibold text-white">{w.title}</span>{' '}
            <span className="text-white/80">{w.text}</span>
          </li>
        ))}
      </ul>
      <h2 className="text-xl font-semibold text-white pt-6">{corporate.howTitle}</h2>
      <ol className="list-decimal pl-5 space-y-2">
        {corporate.how.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="pt-6 font-medium text-white/95">{corporate.closing}</p>
      <div className="glass-card p-6 mt-6 flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm">
        <div>
          <span className="text-white/50">Телефон</span>
          <div>
            <a href={SITE_PUBLIC.phoneHref} className="text-sky-300 text-base">
              {SITE_PUBLIC.phone}
            </a>
          </div>
        </div>
        <div>
          <span className="text-white/50">Email</span>
          <div>
            <a href={`mailto:${SITE_PUBLIC.email}`} className="text-sky-300 text-base">
              {SITE_PUBLIC.email}
            </a>
          </div>
        </div>
      </div>
    </MarketingArticle>
  )
}
