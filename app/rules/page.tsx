import Link from 'next/link'
import { RULES_FULL } from './content'

export const metadata = {
  title: 'Правила продажи и возврата билетов',
  description: 'Правила продажи и возврата билетов ИП Коростелев Н.Д.',
}

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white p-6 pb-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/auth/login" className="text-white/70 hover:text-white text-sm mb-6 inline-block">
          ← Назад к входу
        </Link>
        <h1 className="text-2xl font-bold mb-2">Правила продажи и возврата билетов</h1>
        <p className="text-white/70 text-sm mb-8">
          ИП Коростелев Никита Дмитриевич (ИНН 410125118968, ОГРНИП 325410000007073). Утверждены приказом от 22.01.2026 № 22.
        </p>

        <section className="space-y-4 mb-8">
          <pre className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {RULES_FULL}
          </pre>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">Бланки заявлений о возврате</h2>
          <p className="text-white/90 text-sm">
            По нажатию ссылки сразу загрузится файл бланка (HTML). Откройте его и при необходимости сохраните в PDF через Печать → Сохранить как PDF.
          </p>
          <ul className="text-white/90 text-sm space-y-2 list-none pl-0">
            <li>
              <a href="/api/rules/forms/1" download className="text-indigo-300 hover:underline">
                Приложение № 1 — возврат по инициативе посетителя
              </a>
            </li>
            <li>
              <a href="/api/rules/forms/2" download className="text-indigo-300 hover:underline">
                Приложение № 2 — возврат в связи с болезнью посетителя
              </a>
            </li>
            <li>
              <a href="/api/rules/forms/3" download className="text-indigo-300 hover:underline">
                Приложение № 3 — возврат в связи со смертью члена семьи / близкого родственника
              </a>
            </li>
          </ul>
        </section>

        <p className="text-white/60 text-xs mt-8">
          ИП Коростелев Н.Д., ИНН 410125118968, ОГРНИП 325410000007073. Контакты: <a href="mailto:nf-travel@mail.ru" className="text-indigo-300">nf-travel@mail.ru</a>, 8 (911) 186 74-22.
        </p>
      </div>
    </div>
  )
}
