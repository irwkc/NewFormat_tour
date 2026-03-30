/** Публичный маркетинговый сайт (гости). Отдельно от staff-поддомена. */
export function getPublicMarketingSiteOrigin(): string {
  const u = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL?.trim()
  if (u) return u.replace(/\/$/, '')
  return 'https://nf-travel.ru'
}
