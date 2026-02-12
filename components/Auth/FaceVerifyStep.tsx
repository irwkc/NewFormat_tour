'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Script from 'next/script'
import { preprocessImageData } from '@/utils/face-preprocess'

const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master'
const MIN_BLINKS = 2
const MIN_HEAD_MOVEMENTS = 3
const MIN_DURATION_MS = 3000
const BLINK_THRESHOLD = 0.3
const OPEN_THRESHOLD = 0.35
const HEAD_MOVEMENT_THRESHOLD = 25
const LIVENESS_INTERVAL_MS = 200
const LIVENESS_TIMEOUT_MS = 20000

declare global {
  interface Window {
    faceapi?: {
      nets: {
        ssdMobilenetv1: { loadFromUri: (url: string) => Promise<void> }
        faceLandmark68Net: { loadFromUri: (url: string) => Promise<void> }
        faceRecognitionNet: { loadFromUri: (url: string) => Promise<void> }
      }
      detectSingleFace: (input: HTMLVideoElement | HTMLCanvasElement, options?: unknown) => {
        withFaceLandmarks: () => {
          withFaceDescriptor: () => Promise<{
            descriptor: Float32Array
            landmarks: { getLeftEye: () => { x: number; y: number }[]; getRightEye: () => { x: number; y: number }[]; getNose: () => { x: number; y: number }[] }
          }>
        }
      }
      SsdMobilenetv1Options: new () => unknown
    }
  }
}

function getEyeAspectRatio(eye: { x: number; y: number }[]): number {
  if (!eye || eye.length < 6) return 0.5
  const v1 = Math.sqrt(Math.pow(eye[1].x - eye[5].x, 2) + Math.pow(eye[1].y - eye[5].y, 2))
  const v2 = Math.sqrt(Math.pow(eye[2].x - eye[4].x, 2) + Math.pow(eye[2].y - eye[4].y, 2))
  const h = Math.sqrt(Math.pow(eye[0].x - eye[3].x, 2) + Math.pow(eye[0].y - eye[3].y, 2))
  if (h === 0) return 0.5
  return Math.max(0, Math.min(1, (v1 + v2) / (2 * h)))
}

function calculateEyeAspectRatio(
  leftEye: { x: number; y: number }[],
  rightEye: { x: number; y: number }[]
): number {
  return (getEyeAspectRatio(leftEye) + getEyeAspectRatio(rightEye)) / 2
}

interface FaceVerifyStepProps {
  tempToken: string
  onSuccess: (token: string, user: any) => void
  onCancel: () => void
}

export default function FaceVerifyStep({ tempToken, onSuccess, onCancel }: FaceVerifyStepProps) {
  const [status, setStatus] = useState<'loading' | 'camera' | 'capturing' | 'verifying' | 'error'>('loading')
  const [message, setMessage] = useState('Загрузка моделей распознавания...')
  const [error, setError] = useState<string | null>(null)
  const [dots, setDots] = useState([false, false, false])
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const modelsLoadedRef = useRef(false)
  const livenessIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const livenessDataRef = useRef({
    blinks: 0,
    headMovements: 0,
    startTime: 0,
    frameCount: 0,
    previousLandmarks: null as { getNose: () => { x: number; y: number }[] } | null,
    blinkHistory: [] as { timestamp: number }[],
    movementHistory: [] as { direction: string }[],
    timestamp: 0,
  })
  const blinkStateRef = useRef<'open' | 'closed'>('open')
  const lastBlinkTimeRef = useRef(0)
  const lastHeadMovementTimeRef = useRef(0)
  const headPositionRef = useRef('center')

  const loadModels = useCallback(async () => {
    const faceapi = window.faceapi
    if (!faceapi?.nets) return false
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(`${MODEL_URL}/ssd_mobilenetv1`),
        faceapi.nets.faceLandmark68Net.loadFromUri(`${MODEL_URL}/face_landmark_68`),
        faceapi.nets.faceRecognitionNet.loadFromUri(`${MODEL_URL}/face_recognition`),
      ])
      return true
    } catch (e) {
      console.error('Model load error:', e)
      return false
    }
  }, [])

  const authenticate = useCallback(
    async (descriptor: number[], livenessData: typeof livenessDataRef.current) => {
      setStatus('verifying')
      setMessage('Проверка...')
      setError(null)
      try {
        const res = await fetch('/api/auth/face-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tempToken,
            descriptor,
            livenessData: {
              ...livenessData,
              timestamp: Date.now(),
            },
          }),
        })
        const data = await res.json()
        if (data.success && data.authenticated && data.data?.token && data.data?.user) {
          onSuccess(data.data.token, data.data.user)
          return
        }
        setStatus('camera')
        setError(data.error || 'Лицо не совпадает. Выполните проверку снова (мигание, повороты головы).')
      } catch (e: any) {
        setStatus('camera')
        setError(e?.message || 'Ошибка проверки')
      }
    },
    [tempToken, onSuccess]
  )

  useEffect(() => {
    let cancelled = false
    const init = () => {
      if (cancelled || typeof window === 'undefined') return
      if (!window.faceapi?.nets) {
        setTimeout(init, 100)
        return
      }
      loadModels().then((ok) => {
        if (cancelled) return
        modelsLoadedRef.current = ok
        if (!ok) {
          setStatus('error')
          setMessage('Не удалось загрузить модели. Проверьте интернет.')
          return
        }
        setMessage('Запрос доступа к камере...')
        navigator.mediaDevices
          .getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } })
          .then((stream) => {
            if (cancelled) {
              stream.getTracks().forEach((t) => t.stop())
              return
            }
            streamRef.current = stream
            setStatus('camera')
            setMessage('Выполните проверку подлинности: помигайте и поверните голову (вверх, вниз, влево, вправо).')
            setDots([false, false, false])
            livenessDataRef.current = {
              blinks: 0,
              headMovements: 0,
              startTime: Date.now(),
              frameCount: 0,
              previousLandmarks: null,
              blinkHistory: [],
              movementHistory: [],
              timestamp: 0,
            }
            blinkStateRef.current = 'open'
            lastBlinkTimeRef.current = 0
            lastHeadMovementTimeRef.current = 0
            headPositionRef.current = 'center'
          })
          .catch((err) => {
            if (cancelled) return
            setStatus('error')
            setError(err.name === 'NotAllowedError' ? 'Доступ к камере запрещён' : 'Ошибка камеры')
          })
      })
    }
    init()
    return () => {
      cancelled = true
      if (livenessIntervalRef.current) clearInterval(livenessIntervalRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [loadModels])

  useEffect(() => {
    if (status !== 'camera' || !streamRef.current || !videoRef.current || !modelsLoadedRef.current) return
    const video = videoRef.current
    const overlay = overlayRef.current
    const faceapi = window.faceapi
    if (!faceapi) return

    const runLiveness = () => {
      if (!streamRef.current || status !== 'camera') return
      faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .then((detection: any) => {
          if (!detection) {
            if (overlay) {
              const ctx = overlay.getContext('2d')
              if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height)
            }
            return
          }
          const currentTime = Date.now()
          const ld = livenessDataRef.current
          ld.frameCount++
          ld.timestamp = currentTime

          if (overlay && overlay.width && overlay.height) {
            const ctx = overlay.getContext('2d')
            if (ctx) {
              ctx.clearRect(0, 0, overlay.width, overlay.height)
              const box = detection.detection?.box
              if (box) {
                ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)'
                ctx.lineWidth = 2
                ctx.strokeRect(box.x, box.y, box.width, box.height)
              }
            }
          }

          const leftEye = detection.landmarks.getLeftEye()
          const rightEye = detection.landmarks.getRightEye()
          const eyeAspectRatio = calculateEyeAspectRatio(leftEye, rightEye)

          if (eyeAspectRatio < BLINK_THRESHOLD) {
            if (blinkStateRef.current === 'open') {
              blinkStateRef.current = 'closed'
              const timeSinceLastBlink = currentTime - lastBlinkTimeRef.current
              if (timeSinceLastBlink > 200 || ld.blinks === 0) {
                ld.blinks++
                lastBlinkTimeRef.current = currentTime
                ld.blinkHistory.push({ timestamp: currentTime })
                if (ld.blinks >= MIN_BLINKS) setDots((d) => [true, d[1], d[2]])
              }
            }
          } else if (eyeAspectRatio > OPEN_THRESHOLD) {
            if (blinkStateRef.current === 'closed') blinkStateRef.current = 'open'
          }

          const nose = detection.landmarks.getNose()
          const noseX = nose[3]?.x ?? nose[0]?.x ?? 0
          const noseY = nose[3]?.y ?? nose[0]?.y ?? 0

          if (ld.previousLandmarks) {
            const prevNose = ld.previousLandmarks.getNose()
            const prevX = prevNose[3]?.x ?? prevNose[0]?.x ?? 0
            const prevY = prevNose[3]?.y ?? prevNose[0]?.y ?? 0
            const movementX = Math.abs(noseX - prevX)
            const movementY = Math.abs(noseY - prevY)
            const totalMovement = Math.sqrt(movementX * movementX + movementY * movementY)

            if (totalMovement > HEAD_MOVEMENT_THRESHOLD) {
              const timeSinceLastMovement = currentTime - lastHeadMovementTimeRef.current
              let direction = 'center'
              if (Math.abs(noseX - prevX) > Math.abs(noseY - prevY)) {
                direction = noseX < prevX ? 'left' : 'right'
              } else {
                direction = noseY < prevY ? 'up' : 'down'
              }
              if (timeSinceLastMovement > 300) {
                const lastMovement = ld.movementHistory[ld.movementHistory.length - 1]
                const isNewDirection = !lastMovement || lastMovement.direction !== direction
                if (isNewDirection) {
                  ld.headMovements++
                  lastHeadMovementTimeRef.current = currentTime
                  ld.movementHistory.push({ direction })
                  headPositionRef.current = direction
                  if (ld.headMovements >= MIN_HEAD_MOVEMENTS) setDots((d) => [d[0], true, d[2]])
                }
              }
            }
          }
          ld.previousLandmarks = detection.landmarks

          const elapsed = currentTime - ld.startTime
          if (
            ld.blinks >= MIN_BLINKS &&
            ld.headMovements >= MIN_HEAD_MOVEMENTS &&
            elapsed >= MIN_DURATION_MS
          ) {
            if (livenessIntervalRef.current) {
              clearInterval(livenessIntervalRef.current)
              livenessIntervalRef.current = null
            }
            setDots((d) => [true, true, true])
            setMessage('Извлечение дескриптора...')
            setStatus('capturing')
            setTimeout(async () => {
              const c = canvasRef.current
              if (!c || !video || video.readyState < 2) {
                setStatus('camera')
                setError('Камера не готова')
                return
              }
              c.width = video.videoWidth
              c.height = video.videoHeight
              const ctx = c.getContext('2d')
              if (!ctx) return
              ctx.save()
              ctx.scale(-1, 1)
              ctx.drawImage(video, -c.width, 0, c.width, c.height)
              ctx.restore()
              let imageData = ctx.getImageData(0, 0, c.width, c.height)
              imageData = preprocessImageData(imageData)
              ctx.putImageData(imageData, 0, 0)
              const det = await faceapi
                .detectSingleFace(c, new faceapi.SsdMobilenetv1Options())
                .withFaceLandmarks()
                .withFaceDescriptor()
              if (!det?.descriptor) {
                setStatus('camera')
                setError('Лицо не обнаружено. Повторите проверку.')
                return
              }
              const descriptor = Array.from(det.descriptor)
              await authenticate(descriptor, { ...livenessDataRef.current })
            }, 300)
          }

          if (elapsed > LIVENESS_TIMEOUT_MS) {
            if (livenessIntervalRef.current) clearInterval(livenessIntervalRef.current)
            setStatus('camera')
            setError('Таймаут. Выполните проверку снова: помигайте и поверните голову.')
          }
        })
        .catch(() => {})
    }

    livenessIntervalRef.current = setInterval(runLiveness, LIVENESS_INTERVAL_MS)
    return () => {
      if (livenessIntervalRef.current) {
        clearInterval(livenessIntervalRef.current)
        livenessIntervalRef.current = null
      }
    }
  }, [status, authenticate])

  useEffect(() => {
    if (status !== 'camera' || !streamRef.current || !videoRef.current) return
    const video = videoRef.current
    const stream = streamRef.current
    video.srcObject = stream
    video.play().catch((e) => console.warn('video.play:', e))
    const onLoadedMetadata = () => {
      if (overlayRef.current && video.videoWidth && video.videoHeight) {
        overlayRef.current.width = video.videoWidth
        overlayRef.current.height = video.videoHeight
      }
    }
    video.addEventListener('loadedmetadata', onLoadedMetadata)
    if (video.videoWidth) onLoadedMetadata()
    return () => video.removeEventListener('loadedmetadata', onLoadedMetadata)
  }, [status])

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"
        strategy="lazyOnload"
      />
      <div className="space-y-4">
        <p className="text-white/90 text-center text-sm">
          Для входа в качестве владельца требуется проверка по лицу
        </p>
        {(status === 'loading' || status === 'verifying') && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/30 border-t-white" />
          </div>
        )}
        {status === 'camera' && (
          <>
            <div className="relative rounded-2xl overflow-hidden bg-black/40 w-full min-h-[300px] aspect-video max-w-xl mx-auto">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full min-h-[300px] object-cover absolute inset-0"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas
                ref={overlayRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
            <div className="flex justify-center gap-4 py-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full border-2 border-white/50 ${
                    dots[i - 1] ? 'bg-green-400' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
            <p className="text-center text-white/60 text-xs">
              1 — помигайте • 2 — поверните голову • 3 — готово (не менее 3 сек)
            </p>
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
        <p className="text-center text-white/80 text-sm">{message}</p>
        {error && (
          <div className="rounded-xl bg-red-500/20 border border-red-400/40 px-4 py-2 text-red-200 text-sm text-center">
            {error}
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Назад к вводу пароля
          </button>
        </div>
      </div>
    </>
  )
}
