import React, { useState } from 'react'

type Role = 'owner' | 'partner' | 'manager' | 'promoter'

type Step = {
  title: string
  description: string
}

const STEPS: Record<Role, Step[]> = {
  owner: [
    {
      title: 'Модерация экскурсий',
      description:
        'В этом разделе вы одобряете экскурсии партнёров, настраиваете минимальные цены и комиссию.',
    },
    {
      title: 'Статистика и балансы',
      description:
        'Здесь собрана общая аналитика по продажам, а также кошельки промоутеров и менеджеров.',
    },
    {
      title: 'Управление пользователями',
      description:
        'В разделах Промоутеры и Менеджеры вы видите людей, их балансы и можете обнулять кошельки.',
    },
  ],
  partner: [
    {
      title: 'Сначала создайте экскурсию',
      description:
        'В разделе «Мои экскурсии» вы создаёте и настраиваете туры. После модерации они становятся доступны для продаж.',
    },
    {
      title: 'Проверка билетов',
      description:
        'Во вкладке «Проверка билетов» контролёр подтверждает билеты на посадке по QR или номеру.',
    },
    {
      title: 'Статистика партнёра',
      description:
        'Раздел «Статистика» показывает продажи и загрузку ваших рейсов по датам и турам.',
    },
  ],
  manager: [
    {
      title: 'Ваши кошельки',
      description:
        'На главном экране вы видите доходы и долг компании — это главный финансовый блок менеджера.',
    },
    {
      title: 'Продажи',
      description:
        'Через раздел «Продажи» вы создаёте заказы, выбираете рейсы, способ оплаты и промо‑ID.',
    },
    {
      title: 'Выданные вещи',
      description:
        'Во вкладке «Выданные вещи» отображаются все выданные вам предметы (кофты, эквайринг и т.д.) с фото.',
    },
  ],
  promoter: [
    {
      title: 'Ваш кошелёк доходов',
      description:
        'На главном экране показан ваш доход — сколько вы уже заработали по использованным билетам.',
    },
    {
      title: 'Доступные экскурсии',
      description:
        'Через список экскурсий вы создаёте продажи, отправляете ссылки клиентам или показываете QR.',
    },
    {
      title: 'Приглашения и промо‑ID',
      description:
        'В разделе приглашений вы видите реферальные ссылки и управляете работой по своему промо‑ID.',
    },
  ],
}

type Props = {
  role: Role
  onFinish: () => void
}

export function RoleOnboardingOverlay({ role, onFinish }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const steps = STEPS[role]
  const current = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900/90 border border-white/15 shadow-2xl p-5 sm:p-6 text-white">
        <div className="text-xs uppercase tracking-[0.2em] text-white/50 mb-2">
          Быстрый тур по кабинету
        </div>
        <h2 className="text-lg sm:text-xl font-semibold mb-2">{current.title}</h2>
        <p className="text-sm text-white/75 mb-4">{current.description}</p>

        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={
                  'h-1.5 w-6 rounded-full transition-all ' +
                  (idx <= stepIndex ? 'bg-white' : 'bg-white/30')
                }
              />
            ))}
          </div>
          <div className="text-xs text-white/60">
            Шаг {stepIndex + 1} из {steps.length}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="btn-secondary text-xs sm:text-sm px-3 py-1.5"
            onClick={onFinish}
          >
            Пропустить
          </button>
          <button
            type="button"
            className="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1.5"
            onClick={() => {
              if (isLast) {
                onFinish()
              } else {
                setStepIndex((i) => i + 1)
              }
            }}
          >
            {isLast ? 'Понятно' : 'Далее'}
          </button>
        </div>
      </div>
    </div>
  )
}

