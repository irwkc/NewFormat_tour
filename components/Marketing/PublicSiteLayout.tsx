import Image from 'next/image'
import NextLink from 'next/link'
import { PUBLIC_NAV_MAIN } from '@/lib/marketing/public-nav'
import { SITE_PUBLIC } from '@/lib/marketing/site-content'

const headerSurfaceStyle = {
  marginTop: 'calc(-1 * env(safe-area-inset-top, 0px))',
  paddingTop: 'env(safe-area-inset-top, 0px)',
} as const

export function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col relative z-10 [-webkit-tap-highlight-color:transparent]">
      <header
        className="sticky top-0 z-50 border-b border-white/10 bg-[#0f172a]"
        style={headerSurfaceStyle}
      >
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
            {PUBLIC_NAV_MAIN.map((item) => (
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
            {PUBLIC_NAV_MAIN.map((item) => (
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

      <footer className="border-t border-white/[0.08] bg-slate-950/90 mt-auto pb-[env(safe-area-inset-bottom,0px)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="min-w-0 space-y-1">
              <div className="text-sm font-semibold text-white tracking-tight">{SITE_PUBLIC.siteName}</div>
              <p className="text-[13px] leading-snug text-white/55 max-w-md">
                Экскурсии на воде и пешком. Официальное оформление, прозрачные правила.
              </p>
              <p className="text-[11px] text-white/35 break-all sm:break-normal">{SITE_PUBLIC.domain}</p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end sm:text-right shrink-0 text-[13px]">
              <a
                href={SITE_PUBLIC.phoneHref}
                className="text-sky-400/90 hover:text-sky-300 w-fit sm:ml-auto min-h-[40px] sm:min-h-0 inline-flex items-center py-1 transition-colors"
              >
                {SITE_PUBLIC.phone}
              </a>
              <a
                href={`mailto:${SITE_PUBLIC.email}`}
                className="text-sky-400/90 hover:text-sky-300 w-fit sm:ml-auto break-all max-w-full min-h-[40px] sm:min-h-0 inline-flex items-center py-1 transition-colors"
              >
                {SITE_PUBLIC.email}
              </a>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.06] text-[11px] leading-tight text-white/40">
            ИНН {SITE_PUBLIC.inn}
            <span className="mx-1.5 text-white/25">·</span>
            ОГРНИП {SITE_PUBLIC.ogrnip}
          </div>
        </div>
      </footer>
    </div>
  )
}
