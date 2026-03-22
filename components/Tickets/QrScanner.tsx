'use client'

import { useEffect, useRef, useState } from 'react'

type QrScannerProps = {
  onScan: (data: string) => void
  onError?: (err: string) => void
}

export default function QrScanner({ onScan, onError }: QrScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let scanner: any = null

    const init = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        scanner = new Html5Qrcode('qr-reader')
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText: string) => {
            onScan(decodedText)
          },
          () => {}
        )
        setError(null)
      } catch (err: any) {
        const msg = err?.message || 'Не удалось запустить камеру'
        setError(msg)
        onError?.(msg)
      } finally {
        setLoading(false)
      }
    }

    init()
    return () => {
      if (scanner?.isScanning) {
        scanner.stop().catch(() => {})
      }
    }
  }, [onScan, onError])

  return (
    <div className="relative">
      <div id="qr-reader" ref={containerRef} className="rounded-2xl overflow-hidden" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
          <p className="text-white">Запуск камеры...</p>
        </div>
      )}
      {error && (
        <div className="mt-2 p-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
