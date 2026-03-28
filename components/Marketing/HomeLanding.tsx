'use client'

import { PublicSiteLayout } from '@/components/Marketing/PublicSiteLayout'
import { PublicTicketCheck } from '@/components/Marketing/PublicTicketCheck'
import { PublicManagersGrid } from '@/components/Marketing/PublicManagersGrid'
import { RevealOnScroll } from '@/components/Marketing/RevealOnScroll'
import { HomeSectionCard } from '@/components/Marketing/HomeSectionCard'
import { HomeSectionHeader } from '@/components/Marketing/HomeSectionHeader'
import {
  IconBriefcase,
  IconBuilding,
  IconChart,
  IconCheck,
  IconDoc,
  IconGift,
  IconMail,
  IconMap,
  IconPhone,
  IconShield,
  IconSpark,
  IconUsers,
} from '@/components/Marketing/HomeIcons'
import { SITE_PUBLIC } from '@/lib/marketing/site-content'
import {
  homeCorporate,
  homeDocuments,
  homeFaq,
  homeHero,
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

const detailsCardClass =
  'group glass-card p-4 sm:p-5 transition-all duration-300 hover:border-white/20 open:border-sky-400/25 open:shadow-lg open:shadow-sky-500/5'

const heroGlassClass =
  'relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent p-6 sm:p-8 md:p-10 shadow-lg shadow-black/20 backdrop-blur-xl'

type Props = {
  managers: PublicManager[]
}

export function HomeLanding({ managers }: Props) {
  return (
    <PublicSiteLayout>
      <HashScrollOnMount />
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.2),transparent)] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-6 sm:pt-10 md:pt-12 pb-6 sm:pb-10 relative space-y-12 sm:space-y-16 md:space-y-20">
          <section id="glavnaya" className={sectionClass}>
            <RevealOnScroll>
              <div className={heroGlassClass}>
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sky-500/15 blur-3xl"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl"
                />
                <div className="relative">
                  <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-sky-400/90">{homeHero.eyebrow}</p>
                  <h1 className="mt-2 text-[1.65rem] leading-snug sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white max-w-3xl text-balance font-[family-name:var(--font-poppins)]">
                    Экскурсии — на воде и пешком
                  </h1>
                  <p className="mt-3 sm:mt-4 text-base sm:text-lg text-white/70 max-w-2xl leading-relaxed">
                    Бронь и билеты через менеджеров. Официальное оформление и сопровождение до посадки.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2 sm:gap-2.5">
                    {homeHero.bullets.map((t, i) => (
                      <RevealOnScroll key={t} delayMs={80 + i * 70}>
                        <span className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-2 text-xs sm:text-sm text-white/80 backdrop-blur-sm transition-all duration-300 hover:border-sky-400/30 hover:bg-white/[0.09] hover:-translate-y-px">
                          {t}
                        </span>
                      </RevealOnScroll>
                    ))}
                  </div>
                  <div className="mt-6 sm:mt-7">
                    <RevealOnScroll delayMs={120}>
                      <a href="#podderzhka" className="btn-primary inline-flex justify-center items-center min-h-[48px] w-full sm:w-auto px-6">
                        Связаться
                      </a>
                    </RevealOnScroll>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </section>

          <section id="proverka-bileta" className={`${sectionClass} border-t border-white/10 pt-12 sm:pt-14`}>
            <RevealOnScroll>
              <div className="max-w-lg mx-auto w-full">
                <PublicTicketCheck layout="home" inputId="sale-code-home" />
              </div>
            </RevealOnScroll>
          </section>

          <section id="komanda" className={`${sectionClass} border-t border-white/10 pt-12 sm:pt-14`}>
            <RevealOnScroll>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-poppins)]">Наша команда</h2>
            </RevealOnScroll>
            <div className="mt-8">
              <PublicManagersGrid managers={managers} />
            </div>
          </section>

          <section id="partneram" className={`${sectionClass} border-t border-white/10 pt-12 sm:pt-14 space-y-8`}>
            <HomeSectionHeader eyebrow={homePartners.eyebrow} title={homePartners.title} lead={homePartners.lead} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              <HomeSectionCard icon={<IconBuilding />} title={homePartners.blocks[0].title} delayMs={0}>
                {homePartners.blocks[0].text}
              </HomeSectionCard>
              <HomeSectionCard icon={<IconSpark />} title={homePartners.blocks[1].title} delayMs={70}>
                {homePartners.blocks[1].text}
              </HomeSectionCard>
              <HomeSectionCard icon={<IconChart />} title={homePartners.blocks[2].title} delayMs={140}>
                {homePartners.blocks[2].text}
              </HomeSectionCard>
            </div>
          </section>

          <section id="vakansii" className={`${sectionClass} border-t border-white/10 pt-12 sm:pt-14 space-y-8`}>
            <HomeSectionHeader eyebrow={homeVacancies.eyebrow} title={homeVacancies.title} lead={homeVacancies.lead} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              <HomeSectionCard icon={<IconGift />} title="Что даём" delayMs={0}>
                <ul className="mt-1 space-y-2.5">
                  {homeVacancies.offer.map((line) => (
                    <li key={line} className="flex gap-2.5 text-sm text-white/65 leading-relaxed">
                      <IconCheck className="h-5 w-5 shrink-0 text-emerald-400/90 mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </HomeSectionCard>
              <HomeSectionCard icon={<IconUsers />} title="Задачи" delayMs={80}>
                <ul className="mt-1 space-y-2.5">
                  {homeVacancies.tasks.map((line) => (
                    <li key={line} className="flex gap-2.5 text-sm text-white/65 leading-relaxed">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400/80" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </HomeSectionCard>
            </div>
            <RevealOnScroll delayMs={100}>
              <p className="text-sm text-white/60 max-w-2xl leading-relaxed border-l-2 border-sky-500/40 pl-4 py-1">
                {homeVacancies.closing}
              </p>
            </RevealOnScroll>
          </section>

          <section id="korporativ" className={`${sectionClass} border-t border-white/10 pt-12 sm:pt-14 space-y-8`}>
            <HomeSectionHeader eyebrow={homeCorporate.eyebrow} title={homeCorporate.title} lead={homeCorporate.lead} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <HomeSectionCard icon={<IconGift />} title={homeCorporate.features[0].title} delayMs={0}>
                {homeCorporate.features[0].text}
              </HomeSectionCard>
              <HomeSectionCard icon={<IconUsers />} title={homeCorporate.features[1].title} delayMs={60}>
                {homeCorporate.features[1].text}
              </HomeSectionCard>
              <HomeSectionCard icon={<IconDoc />} title={homeCorporate.features[2].title} delayMs={120}>
                {homeCorporate.features[2].text}
              </HomeSectionCard>
              <HomeSectionCard icon={<IconMap />} title={homeCorporate.features[3].title} delayMs={180}>
                {homeCorporate.features[3].text}
              </HomeSectionCard>
            </div>
            <RevealOnScroll delayMs={120}>
              <div className="rounded-2xl border border-sky-400/20 bg-gradient-to-r from-sky-500/10 via-violet-500/10 to-transparent px-5 py-4 sm:px-6 sm:py-5 transition-all duration-300 hover:border-sky-400/35">
                <p className="text-sm sm:text-base text-white/85 leading-relaxed">{homeCorporate.cta}</p>
              </div>
            </RevealOnScroll>
          </section>

          <section id="podderzhka" className={`${sectionClass} border-t border-white/10 pt-12 sm:pt-14 space-y-8`}>
            <HomeSectionHeader eyebrow={homeSupport.eyebrow} title={homeSupport.title} lead={homeSupport.lead} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <RevealOnScroll delayMs={0}>
                <a
                  href={SITE_PUBLIC.phoneHref}
                  className="group flex h-full gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/35 hover:shadow-lg hover:shadow-sky-500/10"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25 transition-transform duration-300 group-hover:scale-105">
                    <IconPhone className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/45">{homeSupport.channels[0].label}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{SITE_PUBLIC.phone}</p>
                    <p className="mt-2 text-xs text-white/50">{homeSupport.channels[0].hint}</p>
                  </div>
                </a>
              </RevealOnScroll>
              <RevealOnScroll delayMs={80}>
                <a
                  href={`mailto:${SITE_PUBLIC.email}`}
                  className="group flex h-full gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/35 hover:shadow-lg hover:shadow-violet-500/10"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/25 transition-transform duration-300 group-hover:scale-105">
                    <IconMail className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/45">{homeSupport.channels[1].label}</p>
                    <p className="mt-1 text-base sm:text-lg font-semibold text-white break-all">{SITE_PUBLIC.email}</p>
                    <p className="mt-2 text-xs text-white/50">{homeSupport.channels[1].hint}</p>
                  </div>
                </a>
              </RevealOnScroll>
            </div>
            <div>
              <RevealOnScroll delayMs={40}>
                <h3 className="text-sm font-semibold text-white/90 mb-3">Частые вопросы</h3>
              </RevealOnScroll>
              <div className="space-y-2.5">
                {homeFaq.map((item, i) => (
                  <RevealOnScroll key={item.q} delayMs={60 + i * 50}>
                    <details className="group rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 sm:px-5 transition-all duration-300 hover:border-white/15 open:border-sky-400/25 open:bg-white/[0.05] open:shadow-md open:shadow-sky-500/5">
                      <summary className="cursor-pointer text-sm text-white/90 font-medium list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2">
                        {item.q}
                        <span className="text-white/35 text-xs shrink-0 transition-transform duration-300 group-open:rotate-180">
                          ▼
                        </span>
                      </summary>
                      <p className="mt-2.5 text-sm text-white/60 leading-relaxed pr-2">{item.a}</p>
                    </details>
                  </RevealOnScroll>
                ))}
              </div>
            </div>
          </section>

          <section id="dokumenty" className={`${sectionClass} border-t border-white/10 pt-12 sm:pt-14 space-y-8 pb-2`}>
            <HomeSectionHeader
              eyebrow={homeDocuments.eyebrow}
              title={homeDocuments.title}
              lead={homeDocuments.lead}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              <HomeSectionCard icon={<IconDoc />} title={homeDocuments.highlights[0].title} delayMs={0}>
                {homeDocuments.highlights[0].text}
              </HomeSectionCard>
              <HomeSectionCard icon={<IconShield />} title={homeDocuments.highlights[1].title} delayMs={70}>
                {homeDocuments.highlights[1].text}
              </HomeSectionCard>
              <HomeSectionCard icon={<IconBriefcase />} title={homeDocuments.highlights[2].title} delayMs={140}>
                {homeDocuments.highlights[2].text}
              </HomeSectionCard>
            </div>
            <div className="space-y-4 max-w-3xl">
              <RevealOnScroll delayMs={80}>
                <details className={detailsCardClass}>
                  <summary className="cursor-pointer text-sm font-medium text-sky-200/90 list-none flex items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                    Пользовательское соглашение — полный текст
                    <span className="text-white/40 text-xs transition-transform duration-300 group-open:rotate-180">▼</span>
                  </summary>
                  <pre className="mt-4 text-[12px] sm:text-[13px] leading-relaxed text-white/80 whitespace-pre-wrap font-sans max-h-[min(70vh,28rem)] overflow-y-auto border-t border-white/10 pt-4">
                    {TERMS_FULL}
                  </pre>
                </details>
              </RevealOnScroll>
              <RevealOnScroll delayMs={120}>
                <details className={detailsCardClass}>
                  <summary className="cursor-pointer text-sm font-medium text-sky-200/90 list-none flex items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                    Политика конфиденциальности — полный текст
                    <span className="text-white/40 text-xs transition-transform duration-300 group-open:rotate-180">▼</span>
                  </summary>
                  <pre className="mt-4 text-[12px] sm:text-[13px] leading-relaxed text-white/80 whitespace-pre-wrap font-sans max-h-[min(70vh,28rem)] overflow-y-auto border-t border-white/10 pt-4">
                    {PRIVACY_FULL_TEXT}
                  </pre>
                </details>
              </RevealOnScroll>
            </div>
          </section>
        </div>
      </div>
    </PublicSiteLayout>
  )
}
