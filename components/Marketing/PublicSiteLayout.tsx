import { PublicSiteHeader } from '@/components/Marketing/PublicSiteHeader'
import { SITE_PUBLIC } from '@/lib/marketing/site-content'

export function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col relative z-10 [-webkit-tap-highlight-color:transparent]">
      <PublicSiteHeader />

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
