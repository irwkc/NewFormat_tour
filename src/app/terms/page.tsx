import Link from 'next/link'
import { TERMS_FULL } from './content'

export const metadata = {
  title: 'Пользовательское соглашение',
  description: 'Условия использования сервиса НФ Путешествия',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white p-6 pb-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/auth/login" className="text-white/70 hover:text-white text-sm mb-6 inline-block">
          ← Назад к входу
        </Link>
        <h1 className="text-2xl font-bold mb-2">Условия использования сервиса «Новый формат путешествий»</h1>
        <p className="text-white/70 text-sm mb-8">
          ИП Коростелев Н.Д. (ИНН 410125118968, ОГРНИП 325410000007073). Сервис доступен по адресу nf-travel.ru.
        </p>

        <section className="space-y-4 mb-8">
          <pre className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {TERMS_FULL}
          </pre>
        </section>

        <p className="text-white/60 text-xs mt-8">
          Дата публикации: 03.12.2025. ИП Коростелев Н.Д., ИНН 410125118968, ОГРНИП 325410000007073. Контакты: <a href="mailto:nf-travel@mail.ru" className="text-indigo-300">nf-travel@mail.ru</a>, 8 (911) 186 74-22.
        </p>
      </div>
    </div>
  )
}
