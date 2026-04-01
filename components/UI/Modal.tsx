'use client'

import { useEffect } from 'react'
import type { AlertVariant } from '@/utils/modals'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  type?: 'info' | 'confirm' | 'alert'
  onConfirm?: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  /** Для alert: цветовой акцент */
  variant?: AlertVariant
  /** Для confirm: опасное действие — красная кнопка подтверждения */
  destructive?: boolean
}

const variantStyles: Record<AlertVariant, string> = {
  default: 'border border-white/20 shadow-xl',
  error: 'border border-red-500/40 shadow-lg shadow-red-900/20 ring-1 ring-red-500/20',
  success: 'border border-emerald-500/35 shadow-lg shadow-emerald-900/15 ring-1 ring-emerald-500/20',
  warning: 'border border-amber-500/40 shadow-lg shadow-amber-900/15 ring-1 ring-amber-500/20',
}

const variantTitleStyles: Record<AlertVariant, string> = {
  default: 'text-white',
  error: 'text-red-100',
  success: 'text-emerald-100',
  warning: 'text-amber-100',
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  type = 'info',
  onConfirm,
  onCancel,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'default',
  destructive = false,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    onClose()
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (type === 'confirm') {
        return
      }
      onClose()
    }
  }

  const cardClass =
    type === 'alert' && variant !== 'default'
      ? `relative max-w-md w-full mx-auto animate-in fade-in zoom-in-95 duration-200 rounded-3xl p-6 bg-slate-950/85 backdrop-blur-xl ${variantStyles[variant]}`
      : 'relative glass-card max-w-md w-full mx-auto animate-in fade-in zoom-in-95 duration-200'

  const titleClass = type === 'alert' && variant !== 'default' ? variantTitleStyles[variant] : 'text-white'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" aria-hidden />

      <div
        className={cardClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {title && (
          <div className="mb-4 flex items-start gap-3">
            {type === 'alert' && variant === 'error' && (
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 text-lg" aria-hidden>
                !
              </span>
            )}
            {type === 'alert' && variant === 'success' && (
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-lg" aria-hidden>
                ✓
              </span>
            )}
            {type === 'alert' && variant === 'warning' && (
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-lg" aria-hidden>
                ⚠
              </span>
            )}
            <h3 id="modal-title" className={`text-xl font-bold leading-tight ${titleClass}`}>
              {title}
            </h3>
          </div>
        )}

        <div className={`text-white/90 mb-6 ${!title ? 'pt-0' : ''}`}>{children}</div>

        <div className="flex flex-wrap gap-3 justify-end">
          {type === 'confirm' && (
            <>
              <button type="button" onClick={handleCancel} className="btn-secondary px-4 py-2">
                {cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={destructive ? 'btn-danger px-4 py-2' : 'btn-primary px-4 py-2'}
              >
                {confirmText}
              </button>
            </>
          )}
          {type === 'alert' && (
            <button type="button" onClick={onClose} className="btn-primary px-5 py-2.5 min-w-[100px]">
              Понятно
            </button>
          )}
          {type === 'info' && (
            <button type="button" onClick={onClose} className="btn-secondary px-4 py-2">
              Закрыть
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
