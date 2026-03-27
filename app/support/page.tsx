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
      <div className="max-w-3xl mx-auto px-3.5 sm:px-6 py-8 sm:py-12 md:py-14">
        <p className="text-sky-300/90 text-xs sm:text-sm font-medium uppercase tracking-wide mb-1.5 sm:mb-2">{supportBlock.section}</p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-5 sm:mb-6 leading-tight font-[family-name:var(--font-poppins)] text-balance">
          {supportBlock.title}
        </h1>
        <p className="text-white/85 text-[15px] sm:text-base leading-relaxed mb-6">{supportBlock.intro}</p>
        <h2 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">{supportBlock.helpTitle}</h2>
        <ul className="list-disc pl-4 sm:pl-5 space-y-2.5 text-white/80 text-[15px] sm:text-base mb-8 sm:mb-10">
          {supportBlock.help.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="text-white/90 text-[15px] sm:text-base mb-8 sm:mb-10">{supportBlock.closing}</p>

        <div className="glass-card p-5 sm:p-6 mb-10 sm:mb-12 space-y-4 text-sm">
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

        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Часто задаваемые вопросы</h2>
        <div className="space-y-6 sm:space-y-8">
          {faqSections.map((section) => (
            <section key={section.title}>
              <h3 className="text-base sm:text-lg font-semibold text-sky-200/95 mb-2 sm:mb-3 pr-1">{section.title}</h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <details key={item.q} className="glass rounded-2xl border border-white/15 overflow-hidden group">
                    <summary className="px-3.5 sm:px-4 py-3.5 cursor-pointer text-white font-medium text-sm sm:text-base list-none flex gap-3 items-start text-left hover:bg-white/5 [&::-webkit-details-marker]:hidden min-h-[52px] sm:min-h-0">
                      <span className="flex-1 min-w-0 break-words leading-snug pt-0.5">{item.q}</span>
                      <span className="text-white/40 shrink-0 mt-1 group-open:rotate-180 transition-transform duration-200" aria-hidden>
                        ▼
                      </span>
                    </summary>
                    <div className="px-3.5 sm:px-4 pb-4 text-white/75 text-sm leading-relaxed whitespace-pre-line border-t border-white/10 pt-3">
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
