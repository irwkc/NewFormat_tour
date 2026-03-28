import type { MetadataRoute } from 'next'
import { getSiteOrigin } from '@/lib/seo/site-origin'

export default function robots(): MetadataRoute.Robots {
  const base = getSiteOrigin()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/', '/dashboard'],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
