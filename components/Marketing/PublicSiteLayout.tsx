import Image from 'next/image'
import NextLink from 'next/link'
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
        <div className="max-w-6xl mx-auto px-3 sm:px-6 flex items-center min-h-[3.25rem] sm:min-h-16 py-2 sm:py-0">
          <NextLink
            href="/"
            className="flex items-center gap-2 sm:gap-2.5 min-h-[44px] min-w-0 -ml-0.5 sm:ml-0 rounded-xl active:bg-white/5"
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
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/[0.08] bg-slate-950/90 mt-auto pb-[env(safe-area-inset-bottom,0px)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 space-y-1">
              <div className="text-sm font-semibold text-white tracking-tight">{SITE_PUBLIC.siteName}</div>
              <p className="text-[13px] leading-snug text-white/55 max-w-md">
                Экскурсии на воде и пешком. Официальное оформление, прозрачные правила.
              </p>
              <p className="text-[11px] text-white/35 break-all sm:break-normal">{SITE_PUBLIC.domain}</p>
            </div>
            <div className="flex flex-nowrap items-center gap-x-2 text-[11px] sm:text-xs leading-tight shrink-0 text-sky-400/90 max-w-full overflow-x-auto scrollbar-hide pb-0.5 -mb-0.5">
              <a href={SITE_PUBLIC.phoneHref} className="hover:text-sky-300 transition-colors whitespace-nowrap shrink-0">
                {SITE_PUBLIC.phone}
              </a>
              <span className="text-white/25 select-none shrink-0" aria-hidden>
                ·
              </span>
              <a
                href={`mailto:${SITE_PUBLIC.email}`}
                className="hover:text-sky-300 transition-colors whitespace-nowrap shrink-0"
              >
                {SITE_PUBLIC.email}
              </a>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
            <p className="text-[11px] leading-tight text-white/40">
              ИНН {SITE_PUBLIC.inn}
              <span className="mx-1.5 text-white/25">·</span>
              ОГРНИП {SITE_PUBLIC.ogrnip}
            </p>
            <p className="text-[10px] sm:text-[11px] text-white/35">
              © {new Date().getFullYear()} {SITE_PUBLIC.siteName}. Все права защищены.
            </p>
            <p className="text-[10px] text-white/28">
              made by{' '}
              <a
                href="https://github.com/irwkc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-sky-400/90 underline-offset-2 hover:underline"
              >
                irwkc
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
