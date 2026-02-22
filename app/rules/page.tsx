import Link from 'next/link'

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

        <section className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">1. Общие положения</h2>
          <p className="text-white/90 text-sm leading-relaxed">
            Правила разработаны в соответствии с законодательством РФ о культуре, ГК РФ, Законом о защите прав потребителей, 152-ФЗ «О персональных данных», 54-ФЗ о ККТ и иными актами. Правила регламентируют порядок продажи и возврата билетов на экскурсии и мероприятия Организации.
          </p>
          <p className="text-white/90 text-sm">
            Правила размещаются на официальном сайте Организации (nf-travel.ru, staff.nf-travel.ru). Приобретая билет, посетитель соглашается с Правилами.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">2. Правила продажи</h2>
          <p className="text-white/90 text-sm">
            Билет можно приобрести: через онлайн-продажу на сайте Организации; в кассе (наличными, банковской картой). При покупке у лиц, не имеющих полномочий на реализацию билетов Организации, Организация ответственности не несет.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">3. Возврат билетов</h2>
          <p className="text-white/90 text-sm mb-4">Размер возмещения при отказе посетителя от посещения:</p>
          <ul className="text-sm text-white/90 space-y-2 list-disc pl-5">
            <li>Отмена/перенос мероприятия по инициативе Организации — <strong>100%</strong></li>
            <li>Отказ по уважительным причинам (болезнь, смерть родственника, форс-мажор) при предоставлении документов — <strong>100%</strong></li>
            <li>За 10 и более дней до мероприятия — <strong>100%</strong></li>
            <li>За 5–9 дней — <strong>50%</strong></li>
            <li>За 3–4 дня — <strong>30%</strong></li>
            <li>Менее чем за 3 дня — средства не возвращаются</li>
          </ul>
          <p className="text-white/90 text-sm mt-4">
            Возврат экскурсии для сборных групп: 100% при отказе не позднее чем за 1 час до начала.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">4. Оформление возврата</h2>
          <p className="text-white/90 text-sm">
            Для возврата заполняется заявление установленного образца. Бланк можно получить у работника Организации или скачать на сайте nf-travel.ru. Заявление и документы передаются в кассу или отправляются на <a href="mailto:nf-travel@mail.ru" className="text-indigo-300 hover:underline">nf-travel@mail.ru</a>. Возврат производится в течение 10 суток.
          </p>
          <p className="text-white/90 text-sm">
            <strong>Касса (возврат наличных/картой):</strong> г. Санкт-Петербург, ул. Малая Морская, д. 6, стр. 1. Вторник–пятница с 12:00 до 17:00.
          </p>
        </section>

        <p className="text-white/60 text-xs mt-8">
          ИП Коростелев Н.Д., ИНН 410125118968. Контакты: <a href="mailto:nf-travel@mail.ru" className="text-indigo-300">nf-travel@mail.ru</a>, 8 (911) 186 74-22.
        </p>
      </div>
    </div>
  )
}
