/** Канонический origin публичного сайта (без слэша в конце). */
export function getSiteOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (env) return env.replace(/\/$/, '')
  return 'https://nf-travel.ru'
}
