'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { PUBLIC_NAV_MAIN } from '@/lib/marketing/public-nav'
import { SITE_PUBLIC } from '@/lib/marketing/site-content'

export function PublicSiteHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const headerSurfaceStyle = {
    marginTop: 'calc(-1 * env(safe-area-inset-top, 0px))',
    paddingTop: 'env(safe-area-inset-top, 0px)',
  } as const

  return (
    <>
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

          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/15 active:bg-white/20 transition-colors shrink-0"
            aria-expanded={open}
            aria-controls="public-site-drawer"
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-black/50 lg:hidden"
            aria-label="Закрыть меню"
            onClick={() => setOpen(false)}
          />
          <div
            id="public-site-drawer"
            className="fixed top-0 right-0 bottom-0 z-[61] w-[min(100%,20rem)] flex flex-col border-l border-white/10 bg-[#0f172a] shadow-2xl lg:hidden"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="font-semibold text-white">Разделы</span>
              <button
                type="button"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-white/80 hover:bg-white/10"
                aria-label="Закрыть"
                onClick={() => setOpen(false)}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2 px-2" aria-label="Навигация по сайту">
              {PUBLIC_NAV_MAIN.map((item) => (
                <NextLink
                  key={item.href}
                  href={item.href}
                  className="flex items-center min-h-[48px] px-3 text-[15px] text-white/90 rounded-xl hover:bg-white/10 active:bg-white/15"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </NextLink>
              ))}
            </nav>
            <div className="p-4 border-t border-white/10">
              <NextLink
                href="/auth/login"
                className="flex items-center justify-center min-h-[48px] w-full text-sm font-medium rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-colors"
                onClick={() => setOpen(false)}
              >
                Войти
              </NextLink>
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}
