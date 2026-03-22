// Утилиты для работы с модальными окнами
// Эти функции будут использовать глобальный ModalProvider

let confirmFn: ((options: { title?: string; message: string; confirmText?: string; cancelText?: string }) => Promise<boolean>) | null = null
let alertFn: ((message: string, title?: string) => Promise<void>) | null = null

export function setModalFunctions(
  confirm: typeof confirmFn,
  alert: typeof alertFn
) {
  confirmFn = confirm
  alertFn = alert
}

export async function customConfirm(message: string, title?: string): Promise<boolean> {
  if (confirmFn) {
    return confirmFn({ message, title })
  }
  return window.confirm(message)
}

export async function customAlert(message: string, title?: string): Promise<void> {
  if (alertFn) {
    return alertFn(message, title)
  }
  window.alert(message)
}
