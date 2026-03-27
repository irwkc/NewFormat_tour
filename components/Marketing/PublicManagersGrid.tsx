'use client'

import Image from 'next/image'
import type { PublicManager } from '@/lib/public-managers'
import { RevealOnScroll } from '@/components/Marketing/RevealOnScroll'

type Props = {
  managers: PublicManager[]
}

export function PublicManagersGrid({ managers }: Props) {
  if (managers.length === 0) {
    return (
      <p className="text-sm text-white/55 max-w-xl">
        Список менеджеров обновляется. Для консультации используйте телефон или почту внизу страницы.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {managers.map((m, i) => (
        <RevealOnScroll key={m.id} delayMs={Math.min(i * 45, 360)}>
          <article className="glass-card p-4 sm:p-5 h-full flex gap-3 sm:gap-4 border-white/10 hover:border-sky-500/20 transition-colors">
            <div className="relative h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] shrink-0 rounded-xl overflow-hidden bg-white/10 ring-1 ring-white/10">
              {m.photo_url ? (
                <Image src={m.photo_url} alt={m.full_name || 'Фото'} fill className="object-cover" sizes="72px" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-white/50">
                  {(m.full_name || '?')
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-sky-300/90 uppercase tracking-wide">{m.role_label}</p>
              <h3 className="text-base font-semibold text-white mt-0.5 leading-snug">{m.full_name || 'Менеджер'}</h3>
              {m.phone ? (
                <a href={`tel:${m.phone.replace(/\D/g, '')}`} className="text-sm text-white/70 hover:text-sky-200 mt-1 inline-block">
                  {m.phone}
                </a>
              ) : null}
              <p className="text-[11px] text-white/40 mt-2">Гостей с билетами: {m.guests_served}</p>
            </div>
          </article>
        </RevealOnScroll>
      ))}
    </div>
  )
}
