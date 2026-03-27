'use client'

import { useEffect } from 'react'

/** Прокрутка к якорю при открытии /#section (редиректы со старых URL). */
export function HashScrollOnMount() {
  useEffect(() => {
    const h = window.location.hash?.replace(/^#/, '')
    if (!h) return
    const t = window.setTimeout(() => {
      document.getElementById(h)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
    return () => window.clearTimeout(t)
  }, [])
  return null
}
