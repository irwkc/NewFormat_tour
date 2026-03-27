'use client'

import NextLink from 'next/link'
import { PublicSiteLayout } from '@/components/Marketing/PublicSiteLayout'
import { PublicTicketCheck } from '@/components/Marketing/PublicTicketCheck'
import { PublicManagersGrid } from '@/components/Marketing/PublicManagersGrid'
import { RevealOnScroll } from '@/components/Marketing/RevealOnScroll'
import { SITE_PUBLIC } from '@/lib/marketing/site-content'
import {
  homeCorporate,
  homeDocuments,
  homeFaq,
  homePartners,
  homeSupport,
  homeVacancies,
} from '@/lib/marketing/home-sections'
import { TERMS_FULL } from '@/app/terms/content'
import { PRIVACY_FULL_TEXT } from '@/app/privacy/content'
import type { PublicManager } from '@/lib/public-managers'
import { HashScrollOnMount } from '@/components/Marketing/HashScrollOnMount'

const sectionClass =
  'scroll-mt-[calc(4.25rem+env(safe-area-inset-top,0px))] lg:scroll-mt-[calc(4.25rem+env(safe-area-inset-top,0px))]'

type Props = {
  managers: PublicManager[]
}

export function HomeLanding({ managers }: Props) {
  return (
    <PublicSiteLayout>
      <HashScrollOnMount />
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.2),transparent)] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-6 sm:pt-10 md:pt-12 pb-6 sm:pb-10 relative space-y-10 sm:space-y-14 md:space-y-16">
          <RevealOnScroll>
            <div id="proverka-bileta" className={sectionClass}>
              <PublicTicketCheck layout="home" inputId="sale-code-home" />
            </div>
          </RevealOnScroll>

          <RevealOnScroll delayMs={40}>
            <section id="glavnaya" className={sectionClass}>
              <h1 className="text-[1.65rem] leading-snug sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white max-w-3xl text-balance font-[family-name:var(--font-poppins)]">
                Экскурсии — на воде и пешком
              </h1>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg text-white/70 max-w-2xl leading-relaxed">
                Бронь и билеты через менеджеров. Официальное оформление.
              </p>
              <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3">
                <a href="#podderzhka" className="btn-primary inline-flex justify-center items-center min-h-[48px] w-full sm:w-auto px-6">
                  Связаться
                </a>
                <a href="#dokumenty" className="btn-secondary inline-flex justify-center items-center min-h-[48px] w-full sm:w-auto px-6">
                  Документы
                </a>
                <NextLink
                  href="/auth/login"
                  className="inline-flex justify-center items-center min-h-[48px] w-full sm:w-auto px-5 rounded-xl border border-white/25 text-white/90 hover:bg-white/10 active:bg-white/15 transition-colors text-center font-medium"
                >
                  Вход для сотрудников
                </NextLink>
              </div>
            </section>
          </RevealOnScroll>

          <RevealOnScroll delayMs={60}>
            <section id="komanda" className={`${sectionClass} border-t border-white/10 pt-10 sm:pt-12`}>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-[family-name:var(--font-poppins)]">Наша команда</h2>
              <p className="mt-2 text-sm text-white/60 max-w-xl">
                Сначала — старшие менеджеры (с терминалом и наличными), далее по числу обслуженных гостей. Данные с рабочей системы.
              </p>
              <div className="mt-6">
                <PublicManagersGrid managers={managers} />
              </div>
            </section>
          </RevealOnScroll>

          <RevealOnScroll delayMs={40}>
            <section id="dokumenty" className={`${sectionClass} border-t border-white/10 pt-10 sm:pt-12`}>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-[family-name:var(--font-poppins)]">{homeDocuments.title}</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-white/70 list-disc list-inside max-w-xl">
                {homeDocuments.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <div className="mt-5 space-y-3 max-w-3xl">
                <details className="glass-card p-4 sm:p-5 group">
                  <summary className="cursor-pointer text-sm font-medium text-sky-200/90 list-none flex items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                    Пользовательское соглашение (полный текст)
                    <span className="text-white/40 text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <pre className="mt-4 text-[12px] sm:text-[13px] leading-relaxed text-white/80 whitespace-pre-wrap font-sans max-h-[min(70vh,28rem)] overflow-y-auto border-t border-white/10 pt-4">
                    {TERMS_FULL}
                  </pre>
                </details>
                <details className="glass-card p-4 sm:p-5 group">
                  <summary className="cursor-pointer text-sm font-medium text-sky-200/90 list-none flex items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                    Политика конфиденциальности (полный текст)
                    <span className="text-white/40 text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <pre className="mt-4 text-[12px] sm:text-[13px] leading-relaxed text-white/80 whitespace-pre-wrap font-sans max-h-[min(70vh,28rem)] overflow-y-auto border-t border-white/10 pt-4">
                    {PRIVACY_FULL_TEXT}
                  </pre>
                </details>
              </div>
            </section>
          </RevealOnScroll>

          <RevealOnScroll delayMs={40}>
            <section id="partneram" className={`${sectionClass} border-t border-white/10 pt-10 sm:pt-12`}>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-[family-name:var(--font-poppins)]">{homePartners.title}</h2>
              <p className="mt-3 text-sm sm:text-base text-white/70 max-w-2xl leading-relaxed">{homePartners.text}</p>
            </section>
          </RevealOnScroll>

          <RevealOnScroll delayMs={40}>
            <section id="vakansii" className={`${sectionClass} border-t border-white/10 pt-10 sm:pt-12`}>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-[family-name:var(--font-poppins)]">{homeVacancies.title}</h2>
              <p className="mt-3 text-sm sm:text-base text-white/70 max-w-2xl leading-relaxed">{homeVacancies.text}</p>
            </section>
          </RevealOnScroll>

          <RevealOnScroll delayMs={40}>
            <section id="korporativ" className={`${sectionClass} border-t border-white/10 pt-10 sm:pt-12`}>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-[family-name:var(--font-poppins)]">{homeCorporate.title}</h2>
              <p className="mt-3 text-sm sm:text-base text-white/70 max-w-2xl leading-relaxed">{homeCorporate.text}</p>
            </section>
          </RevealOnScroll>

          <RevealOnScroll delayMs={40}>
            <section id="podderzhka" className={`${sectionClass} border-t border-white/10 pt-10 sm:pt-12 pb-4`}>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-[family-name:var(--font-poppins)]">{homeSupport.title}</h2>
              <p className="mt-3 text-sm sm:text-base text-white/70 max-w-xl">{homeSupport.text}</p>
              <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm">
                <a href={SITE_PUBLIC.phoneHref} className="text-sky-300 hover:text-sky-200 font-medium">
                  {SITE_PUBLIC.phone}
                </a>
                <a href={`mailto:${SITE_PUBLIC.email}`} className="text-sky-300 hover:text-sky-200 font-medium break-all">
                  {SITE_PUBLIC.email}
                </a>
              </div>
              <div className="mt-8 space-y-2">
                <h3 className="text-sm font-semibold text-white/90">Коротко</h3>
                {homeFaq.map((item, i) => (
                  <details key={i} className="glass rounded-xl px-4 py-3 border border-white/10 open:bg-white/[0.04] transition-colors">
                    <summary className="cursor-pointer text-sm text-white/90 font-medium list-none [&::-webkit-details-marker]:hidden">
                      {item.q}
                    </summary>
                    <p className="mt-2 text-sm text-white/65 leading-relaxed">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </RevealOnScroll>
        </div>
      </div>
    </PublicSiteLayout>
  )
}
