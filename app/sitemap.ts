import type { MetadataRoute } from 'next'
import { getSiteOrigin } from '@/lib/seo/site-origin'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteOrigin()
  const now = new Date()
  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/documents`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/support`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]
}
