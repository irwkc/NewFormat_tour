'use client'

import { useEffect } from 'react'

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
        // Для confirm не закрываем по клику на backdrop
        return
      }
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative glass-card max-w-md w-full mx-auto animate-in fade-in zoom-in-95 duration-200">
        {title && (
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
        )}
        
        <div className="text-white/90 mb-6">
          {children}
        </div>
        
        <div className="flex gap-3 justify-end">
          {type === 'confirm' && (
            <>
              <button
                onClick={handleCancel}
                className="btn-secondary px-4 py-2"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className="btn-primary px-4 py-2"
              >
                {confirmText}
              </button>
            </>
          )}
          {type === 'alert' && (
            <button
              onClick={onClose}
              className="btn-primary px-4 py-2"
            >
              ОК
            </button>
          )}
          {type === 'info' && (
            <button
              onClick={onClose}
              className="btn-secondary px-4 py-2"
            >
              Закрыть
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
