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
    <div className="min-h-screen flex flex-col relative z-10">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 h-16">
          <NextLink href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="" width={36} height={36} className="h-9 w-auto rounded-lg" />
            <span className="font-semibold text-white hidden sm:inline font-[family-name:var(--font-poppins)]">
              {SITE_PUBLIC.siteName}
            </span>
          </NextLink>
          <nav className="hidden lg:flex items-center gap-1 flex-wrap justify-end">
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
              className="ml-2 px-4 py-2 text-sm font-medium rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-colors"
            >
              Войти
            </NextLink>
          </nav>
          <NextLink
            href="/auth/login"
            className="lg:hidden px-3 py-2 text-sm font-medium rounded-xl bg-white/15 text-white border border-white/20"
          >
            Войти
          </NextLink>
        </div>
        <div className="lg:hidden border-t border-white/10 overflow-x-auto">
          <div className="flex gap-1 px-4 py-2 min-w-max">
            {navMain.map((item) => (
              <NextLink
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-xs text-white/85 rounded-lg bg-white/5 hover:bg-white/10 whitespace-nowrap"
              >
                {item.label}
              </NextLink>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/10 bg-slate-950/80 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-2 gap-8 text-sm">
          <div>
            <div className="font-semibold text-white mb-2">{SITE_PUBLIC.siteName}</div>
            <p className="text-white/65 leading-relaxed">
              Экскурсии по городу — водные прогулки и пешие маршруты. Официальная работа, прозрачные документы.
            </p>
            <p className="text-white/50 text-xs mt-3">{SITE_PUBLIC.domain}</p>
          </div>
          <div className="space-y-2 text-white/80">
            <div>
              <span className="text-white/50">Телефон: </span>
              <a href={SITE_PUBLIC.phoneHref} className="text-sky-300 hover:text-sky-200">
                {SITE_PUBLIC.phone}
              </a>
            </div>
            <div>
              <span className="text-white/50">Email: </span>
              <a href={`mailto:${SITE_PUBLIC.email}`} className="text-sky-300 hover:text-sky-200">
                {SITE_PUBLIC.email}
              </a>
            </div>
            <div className="text-white/50 text-xs pt-2">
              ИНН {SITE_PUBLIC.inn} · ОГРНИП {SITE_PUBLIC.ogrnip}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
