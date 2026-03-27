import Link from 'next/link'

export const metadata = {
  title: 'Политика конфиденциальности',
  description: 'Политика конфиденциальности ИП Коростелев Н.Д.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white p-6 pb-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-white/70 hover:text-white text-sm mb-6 inline-block">
          ← На главную
        </Link>
        <h1 className="text-2xl font-bold mb-2">Политика конфиденциальности</h1>
        <p className="text-white/70 text-sm mb-8">
          ИП Коростелев Никита Дмитриевич (ИНН 410125118968, ОГРНИП 325410000007073). Сайт nf-travel.ru, staff.nf-travel.ru.
        </p>

        <section className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">1. Общие положения</h2>
          <p className="text-white/90 text-sm leading-relaxed">
            Настоящая политика определяет порядок обработки персональных данных посетителей и пользователей сервисов Организации в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">2. Какие данные мы обрабатываем</h2>
          <p className="text-white/90 text-sm">
            При использовании сайта и оформлении заказов/билетов мы можем обрабатывать: имя, контактный телефон, адрес электронной почты, данные документа, удостоверяющего личность (при необходимости), сведения о покупках и участии в экскурсиях, технические данные (IP, тип браузера) в объёме, необходимом для работы сервиса.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">3. Цели обработки</h2>
          <p className="text-white/90 text-sm">
            Обработка персональных данных осуществляется в целях: заключения и исполнения договоров (продажа билетов, оказание услуг), связи с пользователем, направления уведомлений, исполнения требований законодательства, улучшения работы сервиса.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">4. Передача данных</h2>
          <p className="text-white/90 text-sm">
            Персональные данные могут передаваться партнёрам и контрагентам только в объёме, необходимом для оказания услуг (например, платёжным системам, перевозчикам). Обработка данных граждан РФ осуществляется с использованием баз данных на территории Российской Федерации.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">5. Права пользователя</h2>
          <p className="text-white/90 text-sm">
            Пользователь имеет право на доступ к своим персональным данным, их уточнение, блокирование или удаление, отзыв согласия на обработку. Для реализации прав направьте запрос на <a href="mailto:nf-travel@mail.ru" className="text-indigo-300 hover:underline">nf-travel@mail.ru</a> или по телефону 8 (911) 186 74-22.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">6. Изменения</h2>
          <p className="text-white/90 text-sm">
            Организация вправе вносить изменения в настоящую Политику. Актуальная версия размещается на данной странице. Продолжение использования сервиса после изменений означает согласие с новой редакцией.
          </p>
        </section>

        <p className="text-white/60 text-xs mt-8">
          ИП Коростелев Н.Д., ИНН 410125118968, ОГРНИП 325410000007073. Контакты: <a href="mailto:nf-travel@mail.ru" className="text-indigo-300">nf-travel@mail.ru</a>, 8 (911) 186 74-22.
        </p>
      </div>
    </div>
  )
}
