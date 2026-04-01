// Глобальные модальные окна через ModalProvider (без нативных alert/confirm, где возможно)

import { normalizeUserFacingMessage } from './user-facing-message'

export type AlertVariant = 'default' | 'error' | 'success' | 'warning'

export type CustomAlertOptions = {
  title?: string
  variant?: AlertVariant
}

export type ConfirmOptions = {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  /** Красная кнопка подтверждения (удаление и т.п.) */
  destructive?: boolean
}

let confirmFn: ((options: ConfirmOptions) => Promise<boolean>) | null = null
let alertFn:
  | ((message: string, title: string | undefined, options: { variant: AlertVariant }) => Promise<void>)
  | null = null

const pendingAlerts: Array<{
  message: string
  title: string | undefined
  variant: AlertVariant
  resolve: () => void
}> = []

const pendingConfirms: Array<{
  options: ConfirmOptions
  resolve: (v: boolean) => void
}> = []

export function setModalFunctions(
  confirm: (options: ConfirmOptions) => Promise<boolean>,
  alert: (message: string, title: string | undefined, options: { variant: AlertVariant }) => Promise<void>
) {
  confirmFn = confirm
  alertFn = alert

  while (pendingConfirms.length) {
    const p = pendingConfirms.shift()!
    void confirm(p.options).then(p.resolve)
  }
  while (pendingAlerts.length) {
    const p = pendingAlerts.shift()!
    void alert(p.message, p.title, { variant: p.variant }).then(p.resolve)
  }
}

function defaultAlertTitle(variant: AlertVariant): string | undefined {
  switch (variant) {
    case 'error':
      return 'Ошибка'
    case 'success':
      return 'Готово'
    case 'warning':
      return 'Внимание'
    default:
      return undefined
  }
}

/** Подбор варианта по тексту, если явно не задан */
function inferAlertVariant(text: string): AlertVariant {
  const t = text.trim()
  if (
    /ошибка|не удалось|внутренняя ошибка|нет соединения|превышено время|сессия истекла|недостаточно прав|неверн(ые|ый) данные|запрещено|не найден|экскурсия не найдена|продажа не найдена|пользователь не найден/i.test(
      t
    )
  ) {
    return 'error'
  }
  if (
    /готово|успешно|создано|сохранен|добавлен|удален|обнулен|отражен|подтвержд|выплат|скопирован|ссылка скопирована/i.test(
      t
    )
  ) {
    return 'success'
  }
  if (/^внимание/i.test(t)) {
    return 'warning'
  }
  return 'default'
}

function parseAlertArgs(
  message: string,
  second?: string | CustomAlertOptions
): { text: string; title: string | undefined; variant: AlertVariant } {
  const text = normalizeUserFacingMessage(message)
  if (second == null) {
    const variant = inferAlertVariant(text)
    return { text, title: defaultAlertTitle(variant), variant }
  }
  if (typeof second === 'string') {
    return { text, title: second, variant: inferAlertVariant(text) }
  }
  const explicit = second.variant
  const variant =
    explicit !== undefined && explicit !== null ? explicit : inferAlertVariant(text)
  const title = second.title ?? defaultAlertTitle(variant)
  return { text, title, variant }
}

/**
 * Уведомление в стиле приложения (не window.alert).
 * Вызов: customAlert('Текст') | customAlert('Текст', 'Заголовок') | customAlert('Текст', { variant: 'error' })
 */
export async function customAlert(
  message: string,
  second?: string | CustomAlertOptions
): Promise<void> {
  const { text, title, variant } = parseAlertArgs(message, second)
  const finalTitle = title

  return new Promise<void>((resolve) => {
    if (alertFn) {
      void alertFn(text, finalTitle, { variant }).then(resolve)
      return
    }
    pendingAlerts.push({
      message: text,
      title: finalTitle,
      variant,
      resolve,
    })
  })
}

/**
 * Подтверждение в стиле приложения.
 * Третий аргумент: подписи кнопок и режим destructive (красная кнопка).
 */
export async function customConfirm(
  message: string,
  title?: string,
  options?: Pick<ConfirmOptions, 'confirmText' | 'cancelText' | 'destructive'>
): Promise<boolean> {
  const text = message.trim() ? normalizeUserFacingMessage(message) : 'Подтвердить действие?'
  const payload: ConfirmOptions = {
    message: text,
    title,
    confirmText: options?.confirmText,
    cancelText: options?.cancelText,
    destructive: options?.destructive,
  }

  return new Promise<boolean>((resolve) => {
    if (confirmFn) {
      void confirmFn(payload).then(resolve)
      return
    }
    pendingConfirms.push({ options: payload, resolve })
  })
}
