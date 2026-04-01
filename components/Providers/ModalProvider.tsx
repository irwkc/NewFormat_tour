'use client'

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react'
import Modal from '../UI/Modal'
import { setModalFunctions, type AlertVariant, type ConfirmOptions } from '@/utils/modals'

interface ModalContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (message: string, title?: string, options?: { variant?: AlertVariant }) => Promise<void>
}

const ModalContext = createContext<ModalContextType | null>(null)

export function useModalContext() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModalContext: нужен ModalProvider')
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
    variant: AlertVariant
    resolve: () => void
  } | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      })
    })
  }, [])

  const alert = useCallback(
    (message: string, title?: string, options?: { variant?: AlertVariant }): Promise<void> => {
      return new Promise((resolve) => {
        setAlertState({
          isOpen: true,
          message,
          title,
          variant: options?.variant ?? 'default',
          resolve,
        })
      })
    },
    []
  )

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
    setModalFunctions(
      (options) => confirm(options),
      (message, title, opts) => alert(message, title, opts)
    )
  }, [confirm, alert])

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}

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
          destructive={confirmState.options.destructive}
        >
          <p className="whitespace-pre-wrap leading-relaxed">{confirmState.options.message}</p>
        </Modal>
      )}

      {alertState && (
        <Modal
          isOpen={alertState.isOpen}
          onClose={handleAlertClose}
          title={alertState.title ?? 'Уведомление'}
          type="alert"
          variant={alertState.variant}
        >
          <p className="whitespace-pre-wrap leading-relaxed">{alertState.message}</p>
        </Modal>
      )}
    </ModalContext.Provider>
  )
}
