'use client'

import type { ReactNode } from 'react'
import { RevealOnScroll } from '@/components/Marketing/RevealOnScroll'

type Props = {
  icon: ReactNode
  title: string
  children: React.ReactNode
  delayMs?: number
  className?: string
}

export function HomeSectionCard({ icon, title, children, delayMs = 0, className = '' }: Props) {
  return (
    <RevealOnScroll delayMs={delayMs}>
      <div
        className={`group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent p-5 sm:p-6 shadow-lg shadow-black/20 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-sky-400/35 hover:shadow-sky-500/10 ${className}`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-sky-500/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-60"
        />
        <div className="relative">
          <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25 transition-transform duration-300 group-hover:scale-105">
            {icon}
          </div>
          <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
          <div className="mt-2 text-sm text-white/65 leading-relaxed">{children}</div>
        </div>
      </div>
    </RevealOnScroll>
  )
}
