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
          ИП Коростелев Никита Дмитриевич (ИНН 410125118968). Утверждены приказом от 22.01.2026 № 22.
        </p>

        <div className="bg-slate-800/50 rounded-lg p-6 overflow-x-auto">
          <pre className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {RULES_FULL}
          </pre>
        </div>

        <p className="text-white/60 text-xs mt-8">
          ИП Коростелев Н.Д., ИНН 410125118968. Контакты: <a href="mailto:nf-travel@mail.ru" className="text-indigo-300">nf-travel@mail.ru</a>, 8 (911) 186 74-22.
        </p>
      </div>
    </div>
  )
}
