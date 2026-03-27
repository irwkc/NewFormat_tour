import Image from 'next/image'
import NextLink from 'next/link'
import { SITE_PUBLIC } from '@/lib/marketing/site-content'

const navMain = [
  { label: 'Главная', href: '/' },
  { label: 'О нас', href: '/about/team' },
  { label: 'Документы', href: '/documents' },
  { label: 'Партнёрам', href: '/cooperation/partners' },
  { label: 'Вакансии', href: '/cooperation/vacancies' },
  { label: 'Корпоративным', href: '/cooperation/corporate' },
  { label: 'Поддержка', href: '/support' },
]

export function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col relative z-10 [-webkit-tap-highlight-color:transparent]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/90 backdrop-blur-xl pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 min-h-[3.25rem] sm:min-h-16 py-2 sm:py-0">
          <NextLink
            href="/"
            className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-h-[44px] min-w-0 pr-1 -ml-0.5 sm:ml-0 rounded-xl active:bg-white/5"
          >
            <Image
              src="/logo.png"
              alt="NF Travel"
              width={40}
              height={40}
              className="h-10 w-10 sm:h-9 sm:w-9 object-contain rounded-lg shrink-0"
              sizes="40px"
            />
            <span className="font-semibold text-white text-sm sm:text-base leading-tight font-[family-name:var(--font-poppins)]">
              {SITE_PUBLIC.siteName}
            </span>
          </NextLink>
          <nav className="hidden lg:flex items-center gap-0.5 flex-wrap justify-end">
            {navMain.map((item) => (
              <NextLink
                key={item.href}
                href={item.href}
                className="px-3 py-2 text-sm text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                {item.label}
              </NextLink>
            ))}
            <NextLink
              href="/auth/login"
              className="ml-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-colors"
            >
              Войти
            </NextLink>
          </nav>
          <NextLink
            href="/auth/login"
            className="lg:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 text-sm font-medium rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-colors shrink-0"
          >
            Войти
          </NextLink>
        </div>
        <nav
          className="lg:hidden border-t border-white/10 overflow-x-auto scrollbar-hide overscroll-x-contain touch-pan-x"
          aria-label="Разделы сайта"
        >
          <div className="flex gap-2 px-3 sm:px-6 py-2.5 snap-x snap-mandatory">
            {navMain.map((item) => (
              <NextLink
                key={item.href}
                href={item.href}
                className="snap-start shrink-0 inline-flex items-center min-h-[44px] px-4 text-sm text-white/90 rounded-xl bg-white/[0.07] border border-white/10 hover:bg-white/12 active:bg-white/15 whitespace-nowrap"
              >
                {item.label}
              </NextLink>
            ))}
            <span className="shrink-0 w-2 sm:w-0" aria-hidden />
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/10 bg-slate-950/80 mt-auto pb-[env(safe-area-inset-bottom,0px)]">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-8 sm:py-10 grid sm:grid-cols-2 gap-8 sm:gap-10 text-sm">
          <div>
            <div className="font-semibold text-white mb-2 text-base">{SITE_PUBLIC.siteName}</div>
            <p className="text-white/65 leading-relaxed text-[15px] sm:text-sm">
              Экскурсии по городу — водные прогулки и пешие маршруты. Официальная работа, прозрачные документы.
            </p>
            <p className="text-white/50 text-xs mt-3 break-all">{SITE_PUBLIC.domain}</p>
          </div>
          <div className="space-y-3 text-white/80">
            <div className="flex flex-col gap-0.5">
              <span className="text-white/50 text-xs uppercase tracking-wide">Телефон</span>
              <a
                href={SITE_PUBLIC.phoneHref}
                className="text-sky-300 hover:text-sky-200 text-base sm:text-sm py-1 -my-1 w-fit min-h-[44px] sm:min-h-0 inline-flex items-center"
              >
                {SITE_PUBLIC.phone}
              </a>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-white/50 text-xs uppercase tracking-wide">Email</span>
              <a
                href={`mailto:${SITE_PUBLIC.email}`}
                className="text-sky-300 hover:text-sky-200 text-base sm:text-sm py-1 -my-1 break-all w-fit min-h-[44px] sm:min-h-0 inline-flex items-center"
              >
                {SITE_PUBLIC.email}
              </a>
            </div>
            <div className="text-white/50 text-xs pt-1 leading-relaxed">
              ИНН {SITE_PUBLIC.inn}
              <br className="sm:hidden" />
              <span className="hidden sm:inline"> · </span>
              ОГРНИП {SITE_PUBLIC.ogrnip}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
