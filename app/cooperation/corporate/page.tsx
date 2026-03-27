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
      <ul className="space-y-3 sm:space-y-4 list-none pl-0 m-0">
        {corporate.why.map((w) => (
          <li key={w.title} className="glass-card p-4 sm:p-5 list-none">
            <p className="font-semibold text-white m-0">{w.title}</p>
            <p className="text-white/80 m-0 mt-2 sm:mt-1.5 leading-relaxed">{w.text}</p>
          </li>
        ))}
      </ul>
      <h2 className="text-lg sm:text-xl font-semibold text-white pt-5 sm:pt-6">{corporate.howTitle}</h2>
      <ol className="list-decimal pl-4 sm:pl-5 space-y-2.5 text-[15px] sm:text-base">
        {corporate.how.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="pt-6 font-medium text-white/95">{corporate.closing}</p>
      <div className="glass-card p-5 sm:p-6 mt-6 flex flex-col sm:flex-row gap-5 sm:gap-8 text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-white/50 text-xs uppercase tracking-wide">Телефон</span>
          <a href={SITE_PUBLIC.phoneHref} className="text-sky-300 text-base min-h-[44px] inline-flex items-center w-fit">
            {SITE_PUBLIC.phone}
          </a>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-white/50 text-xs uppercase tracking-wide">Email</span>
          <a href={`mailto:${SITE_PUBLIC.email}`} className="text-sky-300 text-base break-all min-h-[44px] inline-flex items-center">
            {SITE_PUBLIC.email}
          </a>
        </div>
      </div>
    </MarketingArticle>
  )
}
