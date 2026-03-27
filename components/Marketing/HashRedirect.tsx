'use client'

import { useEffect } from 'react'

/** Редирект со старых URL на главную с якорём (фрагмент обрабатывается в браузере). */
export function HashRedirect({ anchor }: { anchor: string }) {
  useEffect(() => {
    const id = anchor.startsWith('#') ? anchor.slice(1) : anchor
    window.location.replace(`/#${id}`)
  }, [anchor])

  return (
    <div className="min-h-[50dvh] flex items-center justify-center bg-[#020617] text-white/45 text-sm">
      Переход на главную…
    </div>
  )
}
