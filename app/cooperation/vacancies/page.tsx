import type { Metadata } from 'next'
import { MarketingArticle } from '@/components/Marketing/MarketingArticle'
import { vacancies, SITE_PUBLIC } from '@/lib/marketing/site-content'

export const metadata: Metadata = {
  title: `${vacancies.title} | ${SITE_PUBLIC.siteName}`,
  description: vacancies.lead,
}

export default function VacanciesPage() {
  return (
    <MarketingArticle eyebrow={vacancies.section} title={vacancies.title}>
      <p className="font-medium text-white">{vacancies.lead}</p>
      <p>{vacancies.invite}</p>
      <h2 className="text-xl font-semibold text-white pt-4">{vacancies.offerTitle}</h2>
      <ul className="list-disc pl-5 space-y-2">
        {vacancies.offer.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2 className="text-xl font-semibold text-white pt-4">{vacancies.tasksTitle}</h2>
      <ul className="list-disc pl-5 space-y-2">
        {vacancies.tasks.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2 className="text-xl font-semibold text-white pt-4">{vacancies.expectTitle}</h2>
      <ul className="list-disc pl-5 space-y-2">
        {vacancies.expect.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="glass-card p-6 mt-6">
        <h2 className="text-lg font-semibold text-white mb-2">{vacancies.applyTitle}</h2>
        <p>
          Отправьте короткое резюме на{' '}
          <a href={`mailto:${SITE_PUBLIC.email}`} className="text-sky-300">
            {SITE_PUBLIC.email}
          </a>
          . Мы свяжемся с вами в рабочее время, чтобы обсудить детали и назначить собеседование.
        </p>
      </div>
      <p className="text-white/90 pt-4">{vacancies.closing}</p>
    </MarketingArticle>
  )
}
