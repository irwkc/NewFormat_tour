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
      <article className="max-w-3xl mx-auto px-3.5 sm:px-6 py-8 sm:py-12 md:py-14">
        {eyebrow && (
          <p className="text-sky-300/90 text-xs sm:text-sm font-medium uppercase tracking-wide mb-1.5 sm:mb-2">{eyebrow}</p>
        )}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6 sm:mb-8 leading-tight font-[family-name:var(--font-poppins)] text-balance">
          {title}
        </h1>
        <div className="space-y-5 sm:space-y-6 text-[15px] sm:text-base text-white/85 leading-relaxed [&_ul]:pl-4 [&_ol]:pl-4 sm:[&_ul]:pl-5 sm:[&_ol]:pl-5 [&_li]:leading-relaxed [&_h2]:text-lg [&_h2]:sm:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:pt-2">
          {children}
        </div>
      </article>
    </PublicSiteLayout>
  )
}
