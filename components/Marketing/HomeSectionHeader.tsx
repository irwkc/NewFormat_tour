'use client'

import { RevealOnScroll } from '@/components/Marketing/RevealOnScroll'

type Props = {
  eyebrow: string
  title: string
  lead: string
  delayMs?: number
}

export function HomeSectionHeader({ eyebrow, title, lead, delayMs = 0 }: Props) {
  return (
    <RevealOnScroll delayMs={delayMs}>
      <header className="max-w-3xl">
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-sky-400/90">{eyebrow}</p>
        <h2 className="mt-2 text-xl sm:text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-poppins)] tracking-tight">
          {title}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-white/65 leading-relaxed">{lead}</p>
      </header>
    </RevealOnScroll>
  )
}
