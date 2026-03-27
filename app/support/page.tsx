import type { Metadata } from 'next'
import { PublicSiteLayout } from '@/components/Marketing/PublicSiteLayout'
import { faqSections, SITE_PUBLIC, supportBlock } from '@/lib/marketing/site-content'

export const metadata: Metadata = {
  title: `Поддержка и вопросы | ${SITE_PUBLIC.siteName}`,
  description: supportBlock.intro,
}

export default function SupportPage() {
  return (
    <PublicSiteLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <p className="text-sky-300/90 text-sm font-medium uppercase tracking-wide mb-2">{supportBlock.section}</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6 font-[family-name:var(--font-poppins)]">{supportBlock.title}</h1>
        <p className="text-white/85 leading-relaxed mb-6">{supportBlock.intro}</p>
        <h2 className="text-lg font-semibold text-white mb-3">{supportBlock.helpTitle}</h2>
        <ul className="list-disc pl-5 space-y-2 text-white/80 mb-10">
          {supportBlock.help.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="text-white/90 mb-10">{supportBlock.closing}</p>

        <div className="glass-card p-6 mb-12 space-y-2 text-sm">
          <div>
            <span className="text-white/50">Телефон: </span>
            <a href={SITE_PUBLIC.phoneHref} className="text-sky-300">
              {SITE_PUBLIC.phone}
            </a>
          </div>
          <div>
            <span className="text-white/50">Email: </span>
            <a href={`mailto:${SITE_PUBLIC.email}`} className="text-sky-300">
              {SITE_PUBLIC.email}
            </a>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-6">Часто задаваемые вопросы</h2>
        <div className="space-y-8">
          {faqSections.map((section) => (
            <section key={section.title}>
              <h3 className="text-lg font-semibold text-sky-200/95 mb-3">{section.title}</h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <details key={item.q} className="glass rounded-2xl border border-white/15 overflow-hidden group">
                    <summary className="px-4 py-3 cursor-pointer text-white font-medium text-sm sm:text-base list-none flex justify-between gap-2 items-center hover:bg-white/5 [&::-webkit-details-marker]:hidden">
                      <span>{item.q}</span>
                      <span className="text-white/40 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="px-4 pb-4 text-white/75 text-sm leading-relaxed whitespace-pre-line border-t border-white/10 pt-3">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PublicSiteLayout>
  )
}
