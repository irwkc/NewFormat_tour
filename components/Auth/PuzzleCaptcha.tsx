'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

type Config = {
  width: number
  height: number
  pieceWidth: number
  pieceHeight: number
  pieceY: number
}

type Props = {
  captchaId: string
  backgroundImage: string
  pieceImage: string
  config: Config
  onPositionChange: (x: number) => void
  onRefresh: () => void
  disabled?: boolean
}

export default function PuzzleCaptcha({
  captchaId: _captchaId,
  backgroundImage,
  pieceImage,
  config,
  onPositionChange,
  onRefresh,
  disabled,
}: Props) {
  const [pieceX, setPieceX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startPieceXRef = useRef(0)

  const maxX = config.width - config.pieceWidth
  const clamp = useCallback((x: number) => Math.max(0, Math.min(maxX, x)), [maxX])

  useEffect(() => {
    onPositionChange(pieceX)
  }, [pieceX, onPositionChange])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return
      e.preventDefault()
      startXRef.current = e.clientX
      startPieceXRef.current = pieceX
      setDragging(true)
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    [disabled, pieceX]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - startXRef.current
      const next = clamp(startPieceXRef.current + dx)
      setPieceX(next)
    },
    [dragging, clamp]
  )

  const handlePointerUp = useCallback(() => {
    setDragging(false)
  }, [])

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/90">Перетащите фрагмент в нужное место</p>
      <div
        ref={trackRef}
        className="relative rounded-xl overflow-hidden border border-white/20 bg-white/5 select-none touch-none"
        style={{ width: config.width, height: config.height }}
      >
        {/* Фон с вырезом */}
        <img
          src={backgroundImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
        {/* Перетаскиваемый фрагмент */}
        <div
          role="slider"
          aria-label="Позиция пазла"
          aria-valuemin={0}
          aria-valuemax={maxX}
          aria-valuenow={pieceX}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute cursor-grab active:cursor-grabbing z-10 transition-shadow hover:shadow-lg"
          style={{
            left: pieceX,
            top: config.pieceY,
            width: config.pieceWidth,
            height: config.pieceHeight,
          }}
        >
          <img
            src={pieceImage}
            alt=""
            className="w-full h-full pointer-events-none"
            draggable={false}
          />
        </div>
      </div>
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={onRefresh}
          disabled={disabled}
          className="text-sm text-white/70 hover:text-white transition-colors disabled:opacity-50"
        >
          Обновить картинку
        </button>
      </div>
    </div>
  )
}
