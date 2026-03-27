import { PublicSiteLayout } from '@/components/Marketing/PublicSiteLayout'

export function MarketingArticle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <PublicSiteLayout>
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {eyebrow && <p className="text-sky-300/90 text-sm font-medium uppercase tracking-wide mb-2">{eyebrow}</p>}
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-8 font-[family-name:var(--font-poppins)]">{title}</h1>
        <div className="space-y-6 text-white/85 leading-relaxed">{children}</div>
      </article>
    </PublicSiteLayout>
  )
}
