'use client'

import React, { useState, useCallback } from 'react'
import Link from 'next/link'

type Role = 'owner' | 'partner' | 'manager' | 'promoter'

type Step = {
  title: string
  description: string
  /** Дополнительные абзацы для полного обучения */
  details?: string[]
  /** Ссылка в приложении, где это найти */
  href?: string
  linkLabel?: string
}

const STEPS: Record<Role, Step[]> = {
  owner: [
    {
      title: 'Добро пожаловать в панель владельца',
      description: 'Здесь вы управляете всей системой: экскурсии, партнёры, промоутеры и менеджеры.',
      details: [
        'С главной страницы видны сводки по промоутерам и менеджерам, их балансы и долги.',
        'В боковом меню — быстрый доступ ко всем разделам.',
      ],
    },
    {
      title: 'Модерация экскурсий',
      description: 'Партнёры создают экскурсии и рейсы — вы их одобряете или отклоняете.',
      details: [
        'На главной странице в блоке «Экскурсии на модерации» — заявки партнёров. Можно задать минимальную цену и процент промоутера.',
        'После одобрения экскурсия появляется в каталоге для менеджеров и промоутеров.',
      ],
      href: '/dashboard/owner',
      linkLabel: 'На главную',
    },
    {
      title: 'Категории и настройки',
      description: 'Категории помогают структурировать экскурсии. Настройки — управление приглашениями и доступом.',
      details: [
        'В «Категориях» создавайте и редактируйте типы экскурсий.',
        'В «Приглашениях» — приглашайте промоутеров и менеджеров по ссылкам.',
      ],
      href: '/dashboard/owner/categories',
      linkLabel: 'Категории',
    },
    {
      title: 'Промоутеры и менеджеры',
      description: 'Промоутеры продают билеты по своему промо‑ID и получают процент. Менеджеры ведут продажи от компании.',
      details: [
        'В разделах «Промоутеры» и «Менеджеры» — списки пользователей, балансы, долг компании. Можно обнулять кошельки при необходимости.',
        '«Выдача вещей» — учёт выданного оборудования (эквайринг, мерч).',
      ],
      href: '/dashboard/owner/promoters',
      linkLabel: 'Промоутеры',
    },
    {
      title: 'Статистика и отчёты',
      description: 'Общая аналитика по продажам, загрузке рейсов и финансам.',
      details: [
        'В «Статистике» — сводки по периодам, турам и партнёрам.',
        'В «Рефералах» — данные по реферальной программе.',
      ],
      href: '/dashboard/owner/statistics',
      linkLabel: 'Статистика',
    },
  ],
  partner: [
    {
      title: 'Добро пожаловать в панель партнёра',
      description: 'Вы представляете организатора экскурсий: создаёте туры, рейсы и проверяете билеты на посадке.',
      details: [
        'Главный экран показывает ваши экскурсии и их статус (на модерации, одобрены, отклонены).',
      ],
    },
    {
      title: 'Создание экскурсий',
      description: 'Сначала создайте экскурсию и добавьте рейсы с датами и ценами.',
      details: [
        'В «Моих экскурсиях» нажмите «Создать экскурсию». Укажите название, описание, категорию.',
        'Для каждой экскурсии добавьте рейсы: дата, время, цены (взрослый, детский, льготный). После сохранения заявка уходит на модерацию владельцу.',
      ],
      href: '/dashboard/partner',
      linkLabel: 'Мои экскурсии',
    },
    {
      title: 'Проверка билетов',
      description: 'На входе контролёр проверяет билеты по QR-коду или номеру.',
      details: [
        'В разделе «Проверка билетов» введите код с билета или отсканируйте QR. Система покажет, действителен ли билет и сколько гостей.',
        'После проверки билет отмечается использованным — доход засчитывается промоутеру и менеджеру.',
      ],
      href: '/dashboard/partner/tickets/check',
      linkLabel: 'Проверка билетов',
    },
    {
      title: 'Статистика партнёра',
      description: 'Смотрите продажи и загрузку своих рейсов по датам и турам.',
      details: [
        'В «Статистике» — отчёты по проданным билетам, выручке и загрузке. Удобно планировать рейсы и анализировать спрос.',
      ],
      href: '/dashboard/partner',
      linkLabel: 'Статистика',
    },
  ],
  manager: [
    {
      title: 'Добро пожаловать в панель менеджера',
      description: 'Вы продаёте билеты от имени компании: создаёте заказы, выбираете способ оплаты и привязываете продажи к промоутерам при необходимости.',
      details: [
        'На главном экране — ваши доходы (за подтверждённые билеты) и долг компании (выданные вещи, авансы).',
      ],
    },
    {
      title: 'Доходы и долг',
      description: 'Доходы — это ваш процент с проданных и использованных билетов. Долг — то, что вы должны компании.',
      details: [
        'Доход начисляется после того, как партнёр подтверждает билет на посадке.',
        'Долг формируется из выданных вещей (эквайринг, мерч) и при необходимости обнуляется владельцем.',
      ],
    },
    {
      title: 'Продажи',
      description: 'Создавайте заказы: выберите экскурсию, рейс, количество билетов и способ оплаты.',
      details: [
        'В разделе «Продажи» — список заказов и кнопка «Создать продажу». Укажите тур, рейс, взрослых/детей/льготных, способ оплаты (наличные, карта, онлайн).',
        'Если продажа идёт по промоутеру — укажите промо‑ID, чтобы ему начислился процент.',
      ],
      href: '/dashboard/manager/sales',
      linkLabel: 'Продажи',
    },
    {
      title: 'Выданные вещи и приглашения',
      description: 'Здесь отображаются выданные вам предметы и реферальные ссылки.',
      details: [
        '«Выданные вещи» — список того, что вам передали (терминалы, мерч). Фото и статус хранятся в системе.',
        '«Приглашения» — ваша реферальная ссылка и промо‑ID для привязки продаж.',
      ],
      href: '/dashboard/manager/issued-items',
      linkLabel: 'Выданные вещи',
    },
  ],
  promoter: [
    {
      title: 'Добро пожаловать в панель промоутера',
      description: 'Вы продаёте билеты по своей ссылке или промо‑ID и получаете процент с каждого использованного билета.',
      details: [
        'На главном экране — ваш текущий доход и список доступных экскурсий для продажи.',
      ],
    },
    {
      title: 'Ваш кошелёк',
      description: 'Доход начисляется после того, как клиент воспользовался билетом (партнёр подтвердил его на посадке).',
      details: [
        'Сумма «Доходы» — это ваш процент с проданных и уже использованных билетов. Выплаты производятся по правилам платформы.',
      ],
    },
    {
      title: 'Доступные экскурсии и продажи',
      description: 'Выбирайте экскурсию и рейс, создавайте продажу и отправляйте клиенту ссылку или QR.',
      details: [
        'В блоке «Доступные экскурсии» — одобренные туры и рейсы. Нажмите «Продать» — откроется форма заказа.',
        'После создания заказа клиент может оплатить по ссылке. Вы можете показать QR для оплаты на месте.',
      ],
      href: '/dashboard/promoter/sales',
      linkLabel: 'Продажи',
    },
    {
      title: 'Приглашения и промо‑ID',
      description: 'Ваша реферальная ссылка и промо‑ID — чтобы клиенты и менеджеры привязывали продажи к вам.',
      details: [
        'В разделе «Реферальная программа» — ваша персональная ссылка и промо‑ID. Делитесь ими с клиентами или передавайте менеджерам для учёта продаж.',
        'В «Истории баланса» видно начисления по каждой продаже.',
      ],
      href: '/dashboard/promoter/invitations',
      linkLabel: 'Реферальная программа',
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
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1

  const goNext = useCallback(() => {
    if (isLast) {
      onFinish()
      return
    }
    setStepIndex((i) => i + 1)
  }, [isLast, onFinish])

  const goPrev = useCallback(() => {
    if (isFirst) return
    setStepIndex((i) => i - 1)
  }, [isFirst])

  const goToStep = useCallback((idx: number) => {
    setStepIndex(idx)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6">
      <div className="w-full max-w-2xl flex flex-col rounded-3xl bg-slate-900/95 border border-white/20 shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Прогресс: точки-страницы */}
        <div className="flex items-center justify-center gap-2 py-4 px-4 border-b border-white/10 shrink-0">
          <span className="text-xs uppercase tracking-widest text-white/50 mr-2">
            Обучение
          </span>
          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Шаг ${idx + 1}`}
                onClick={() => goToStep(idx)}
                className={
                  'h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full transition-all duration-200 ' +
                  (idx === stepIndex
                    ? 'bg-indigo-400 scale-125'
                    : idx < stepIndex
                      ? 'bg-white/70 hover:bg-white/90'
                      : 'bg-white/30 hover:bg-white/50')
                }
              />
            ))}
          </div>
          <span className="text-xs text-white/50 ml-2">
            {stepIndex + 1} / {steps.length}
          </span>
        </div>

        {/* Область контента со сменой страниц */}
        <div className="overflow-hidden flex-1 min-h-0">
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(-${stepIndex * 100}%)`,
            }}
          >
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 w-full overflow-y-auto px-6 py-5 sm:py-6"
                style={{ minHeight: '280px' }}
              >
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
                  {step.title}
                </h2>
                <p className="text-white/85 leading-relaxed mb-4">
                  {step.description}
                </p>
                {step.details && step.details.length > 0 && (
                  <ul className="space-y-2 mb-5">
                    {step.details.map((paragraph, i) => (
                      <li
                        key={i}
                        className="text-sm text-white/70 leading-relaxed pl-4 border-l-2 border-white/20"
                      >
                        {paragraph}
                      </li>
                    ))}
                  </ul>
                )}
                {step.href && (
                  <Link
                    href={step.href}
                    onClick={onFinish}
                    className="inline-flex items-center gap-2 text-sm font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
                  >
                    <span>{step.linkLabel ?? 'Перейти в раздел'}</span>
                    <span aria-hidden>→</span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Кнопки навигации */}
        <div className="flex items-center justify-between gap-4 p-4 sm:p-5 border-t border-white/10 bg-black/20 shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onFinish}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              Пропустить
            </button>
            {!isFirst && (
              <button
                type="button"
                onClick={goPrev}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/90 bg-white/10 hover:bg-white/20 transition-colors"
              >
                ← Назад
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={goNext}
            className="btn-primary px-5 py-2.5 text-sm shrink-0"
          >
            {isLast ? 'Завершить' : 'Далее →'}
          </button>
        </div>
      </div>
    </div>
  )
}
