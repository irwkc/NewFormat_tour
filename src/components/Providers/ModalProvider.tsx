'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import Modal from '../UI/Modal'
import { setModalFunctions } from '@/utils/modals'

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
}

interface ModalContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (message: string, title?: string) => Promise<void>
}

const ModalContext = createContext<ModalContextType | null>(null)

export function useModalContext() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModalContext must be used within ModalProvider')
  }
  return context
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    options: ConfirmOptions
    resolve: (value: boolean) => void
  } | null>(null)

  const [alertState, setAlertState] = useState<{
    isOpen: boolean
    message: string
    title?: string
    resolve: () => void
  } | null>(null)

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      })
    })
  }

  const alert = (message: string, title?: string): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        message,
        title,
        resolve,
      })
    })
  }

  const handleConfirm = () => {
    if (confirmState) {
      confirmState.resolve(true)
      setConfirmState(null)
    }
  }

  const handleCancel = () => {
    if (confirmState) {
      confirmState.resolve(false)
      setConfirmState(null)
    }
  }

  const handleAlertClose = () => {
    if (alertState) {
      alertState.resolve()
      setAlertState(null)
    }
  }

  useEffect(() => {
    // Устанавливаем глобальные функции для использования в любом месте
    setModalFunctions(
      (options) => confirm(options),
      (message, title) => alert(message, title)
    )
  }, [confirm, alert])

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}
      
      {/* Confirm Dialog */}
      {confirmState && (
        <Modal
          isOpen={confirmState.isOpen}
          onClose={handleCancel}
          title={confirmState.options.title || 'Подтверждение'}
          type="confirm"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          confirmText={confirmState.options.confirmText}
          cancelText={confirmState.options.cancelText}
        >
          <p>{confirmState.options.message}</p>
        </Modal>
      )}

      {/* Alert Dialog */}
      {alertState && (
        <Modal
          isOpen={alertState.isOpen}
          onClose={handleAlertClose}
          title={alertState.title || 'Уведомление'}
          type="alert"
        >
          <p>{alertState.message}</p>
        </Modal>
      )}
    </ModalContext.Provider>
  )
}
