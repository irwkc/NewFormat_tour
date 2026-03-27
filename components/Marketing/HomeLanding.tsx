import NextLink from 'next/link'
import { PublicSiteLayout } from '@/components/Marketing/PublicSiteLayout'

const cards = [
  {
    title: 'О нас',
    desc: 'Наша команда и как мы работаем.',
    href: '/about/team',
  },
  {
    title: 'Документы',
    desc: 'Договор, политика, реквизиты.',
    href: '/documents',
  },
  {
    title: 'Партнёрам',
    desc: 'Агентствам, отелям и инвесторам.',
    href: '/cooperation/partners',
  },
  {
    title: 'Вакансии',
    desc: 'Менеджер по продажам экскурсий.',
    href: '/cooperation/vacancies',
  },
  {
    title: 'Корпоративным',
    desc: 'Группы от 10 человек со скидками.',
    href: '/cooperation/corporate',
  },
  {
    title: 'Поддержка и FAQ',
    desc: 'Вопросы, возвраты, контакты.',
    href: '/support',
  },
]

export function HomeLanding() {
  return (
    <PublicSiteLayout>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.2),transparent)] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-6 sm:pt-10 md:pt-12 pb-10 sm:pb-16 relative">
          <h1 className="text-[1.65rem] leading-snug sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white max-w-3xl text-balance font-[family-name:var(--font-poppins)]">
            Экскурсии по городу — на воде и пешком
          </h1>
          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-white/75 max-w-2xl leading-relaxed">
            Выбирайте маршруты, бронируйте билеты и получайте поддержку нашей команды. Официальное оформление и прозрачные
            правила.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
            <NextLink href="/support" className="btn-primary inline-flex justify-center items-center min-h-[48px] w-full sm:w-auto px-6">
              Связаться с нами
            </NextLink>
            <NextLink href="/documents" className="btn-secondary inline-flex justify-center items-center min-h-[48px] w-full sm:w-auto px-6">
              Документы
            </NextLink>
            <NextLink
              href="/auth/login"
              className="inline-flex justify-center items-center min-h-[48px] w-full sm:w-auto px-5 rounded-xl border border-white/25 text-white/90 hover:bg-white/10 active:bg-white/15 transition-colors text-center font-medium"
            >
              Вход для сотрудников
            </NextLink>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-3.5 sm:px-6 pb-12 sm:pb-16">
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">Разделы сайта</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {cards.map((c) => (
            <NextLink
              key={c.href}
              href={c.href}
              className="glass-card p-5 sm:p-6 hover:border-sky-400/30 hover:bg-slate-800/40 transition-all group active:scale-[0.99]"
            >
              <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-sky-200 transition-colors">{c.title}</h3>
              <p className="text-sm text-white/65 mt-2 leading-relaxed">{c.desc}</p>
              <span className="inline-block mt-3 sm:mt-4 text-sm text-sky-300 group-hover:text-sky-200">Подробнее →</span>
            </NextLink>
          ))}
        </div>
      </section>
    </PublicSiteLayout>
  )
}
