import type { Metadata } from 'next'
import { MarketingArticle } from '@/components/Marketing/MarketingArticle'
import { aboutTeam, SITE_PUBLIC } from '@/lib/marketing/site-content'

export const metadata: Metadata = {
  title: `О нас — ${aboutTeam.title} | ${SITE_PUBLIC.siteName}`,
  description: aboutTeam.paragraphs[0],
}

export default function AboutTeamPage() {
  return (
    <MarketingArticle eyebrow="О нас" title={aboutTeam.title}>
      {aboutTeam.paragraphs.map((p, i) => (
        <p key={i} className="text-base">
          {p}
        </p>
      ))}
      <div className="glass-card p-6 space-y-4 mt-8">
        <h2 className="text-lg font-semibold text-white">Как формируется список менеджеров на сайте</h2>
        {aboutTeam.managersNote.map((p, i) => (
          <p key={i} className="text-sm text-white/80">
            {p}
          </p>
        ))}
      </div>
    </MarketingArticle>
  )
}
