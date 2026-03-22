'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Script from 'next/script'
import { preprocessImageData } from '@/utils/face-preprocess'

const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master'
const POSE_HOLD_MS = 1200
const STEPS: { pose: 'center' | 'left' | 'right'; label: string }[] = [
  { pose: 'center', label: 'Центр' },
  { pose: 'left', label: 'Влево' },
  { pose: 'right', label: 'Вправо' },
  { pose: 'center', label: 'Центр' },
]

function getPoseFromLandmarks(landmarks: { getLeftEye: () => { x: number; y: number }[]; getRightEye: () => { x: number; y: number }[]; getNose: () => { x: number; y: number }[] }): 'center' | 'left' | 'right' {
  const leftEye = landmarks.getLeftEye()
  const rightEye = landmarks.getRightEye()
  const nose = landmarks.getNose()
  if (!leftEye?.length || !rightEye?.length || !nose?.length) return 'center'
  const leftCenterX = leftEye.reduce((s, p) => s + p.x, 0) / leftEye.length
  const rightCenterX = rightEye.reduce((s, p) => s + p.x, 0) / rightEye.length
  const eyeCenterX = (leftCenterX + rightCenterX) / 2
  const noseX = nose[3]?.x ?? nose[0]?.x ?? eyeCenterX
  const spanX = Math.abs(rightCenterX - leftCenterX) || 1
  const dx = (noseX - eyeCenterX) / spanX
  if (dx < -0.2) return 'left'
  if (dx > 0.2) return 'right'
  return 'center'
}

interface FaceRegisterBlockProps {
  token: string
  onRegistered: () => void
}

export default function FaceRegisterBlock({ token, onRegistered }: FaceRegisterBlockProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'camera' | 'capturing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const modelsLoadedRef = useRef(false)
  const faceDetectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const collectedRef = useRef<number[][]>([])
  const poseHoldStartRef = useRef<number | null>(null)

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

  const startCamera = useCallback(async () => {
    setError(null)
    setStep(0)
    setProgress(0)
    collectedRef.current = []
    poseHoldStartRef.current = null
    setStatus('loading')
    setMessage('Загрузка моделей...')
    if (typeof window === 'undefined') return
    const waitFaceApi = () => {
      if (window.faceapi?.nets) {
        loadModels().then((ok) => {
          if (!ok) {
            setStatus('error')
            setError('Не удалось загрузить модели')
            return
          }
          modelsLoadedRef.current = true
          setMessage('Запрос камеры...')
          navigator.mediaDevices
            .getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } })
            .then((stream) => {
              streamRef.current = stream
              setStatus('camera')
              const currentStep = STEPS[0]
              setMessage(`Держите лицо в кадре. Поза: ${currentStep.label}. Удерживайте ~1 с для захвата.`)
            })
            .catch((err) => {
              setStatus('error')
              setError(err.name === 'NotAllowedError' ? 'Доступ к камере запрещён' : 'Ошибка камеры')
            })
        })
      } else {
        setTimeout(waitFaceApi, 100)
      }
    }
    waitFaceApi()
  }, [loadModels])

  const stopCamera = useCallback(() => {
    if (faceDetectionIntervalRef.current) {
      clearInterval(faceDetectionIntervalRef.current)
      faceDetectionIntervalRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    const ov = overlayRef.current
    if (ov?.getContext('2d')) ov.getContext('2d')!.clearRect(0, 0, ov.width, ov.height)
    setStatus('idle')
    setMessage('')
    setError(null)
    setStep(0)
    setProgress(0)
  }, [])

  const captureAndAdvance = useCallback(async () => {
    const faceapi = window.faceapi
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!faceapi || !video || !modelsLoadedRef.current || video.readyState < 2 || !canvas) return
    setStatus('capturing')
    setMessage('Обработка...')
    setError(null)
    try {
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setStatus('camera')
        return
      }
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.save()
      ctx.scale(-1, 1)
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
      ctx.restore()
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      imageData = preprocessImageData(imageData)
      ctx.putImageData(imageData, 0, 0)
      const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptor()
      if (!detection?.descriptor) {
        setError('Лицо не обнаружено. Повторите позу.')
        setStatus('camera')
        poseHoldStartRef.current = null
        return
      }
      const descriptor = Array.from(detection.descriptor)
      collectedRef.current = [...collectedRef.current, descriptor]
      const nextStepIndex = step + 1
      setProgress(Math.round((nextStepIndex / STEPS.length) * 100))
      if (nextStepIndex >= STEPS.length) {
        setMessage('Сохранение...')
        const res = await fetch('/api/auth/face-register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ descriptors: collectedRef.current }),
        })
        const data = await res.json()
        if (data.success) {
          setStatus('success')
          setMessage(`Лицо зарегистрировано (${data.count ?? collectedRef.current.length} ракурсов). При следующем входе потребуется проверка по лицу.`)
          stopCamera()
          onRegistered()
        } else {
          setStatus('camera')
          setError(data.error || 'Ошибка регистрации')
          poseHoldStartRef.current = null
        }
        return
      }
      setStep(nextStepIndex)
      const nextStep = STEPS[nextStepIndex]
      setMessage(`Поза: ${nextStep.label}. Удерживайте ~1 с для захвата.`)
      setStatus('camera')
      poseHoldStartRef.current = null
    } catch (e: any) {
      setStatus('camera')
      setError(e?.message || 'Ошибка')
      poseHoldStartRef.current = null
    }
  }, [step, token, stopCamera, onRegistered])

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

  useEffect(() => {
    if (status !== 'camera' || !videoRef.current || !overlayRef.current || !modelsLoadedRef.current) return
    const faceapi = window.faceapi
    if (!faceapi) return
    const video = videoRef.current
    const overlay = overlayRef.current
    const expectedPose = STEPS[step]?.pose ?? 'center'
    faceDetectionIntervalRef.current = setInterval(async () => {
      if (!streamRef.current || status !== 'camera') return
      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.SsdMobilenetv1Options())
          .withFaceLandmarks()
        if (detection?.landmarks) {
          const currentPose = getPoseFromLandmarks(detection.landmarks)
          const now = Date.now()
          if (currentPose === expectedPose) {
            if (poseHoldStartRef.current === null) poseHoldStartRef.current = now
            const held = now - (poseHoldStartRef.current ?? now)
            if (held >= POSE_HOLD_MS) {
              poseHoldStartRef.current = null
              captureAndAdvance()
              return
            }
          } else {
            poseHoldStartRef.current = null
          }
          const ctx = overlay.getContext('2d')
          if (ctx && video) {
            ctx.clearRect(0, 0, overlay.width, overlay.height)
            const scaleX = overlay.width / video.videoWidth
            const scaleY = overlay.height / video.videoHeight
            const leftEye = detection.landmarks.getLeftEye()
            const rightEye = detection.landmarks.getRightEye()
            const nose = detection.landmarks.getNose()
            const allPoints: { x: number; y: number }[] = detection.landmarks.positions ?? [...leftEye, ...rightEye, ...nose]
            if (allPoints.length > 0) {
              let minX = allPoints[0].x
              let minY = allPoints[0].y
              let maxX = minX
              let maxY = minY
              allPoints.forEach((p: { x: number; y: number }) => {
                minX = Math.min(minX, p.x)
                minY = Math.min(minY, p.y)
                maxX = Math.max(maxX, p.x)
                maxY = Math.max(maxY, p.y)
              })
              const pad = 15
              const padTop = 28
              minX = Math.max(0, minX - pad)
              minY = Math.max(0, minY - padTop)
              maxX = Math.min(video.videoWidth, maxX + pad)
              maxY = Math.min(video.videoHeight, maxY + pad)
              const x = maxX * scaleX
              const y = minY * scaleY
              const w = (minX - maxX) * scaleX
              const h = (maxY - minY) * scaleY
              ctx.strokeStyle = currentPose === expectedPose ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 200, 0, 0.6)'
              ctx.lineWidth = 2
              ctx.strokeRect(x, y, w, h)
              ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
              allPoints.forEach((p: { x: number; y: number }) => {
                ctx.beginPath()
                ctx.arc(p.x * scaleX, p.y * scaleY, 2, 0, Math.PI * 2)
                ctx.fill()
              })
            }
          }
        } else {
          const ctx = overlay.getContext('2d')
          if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height)
          poseHoldStartRef.current = null
        }
      } catch (_) {}
    }, 100)
    return () => {
      if (faceDetectionIntervalRef.current) clearInterval(faceDetectionIntervalRef.current)
    }
  }, [status, step, captureAndAdvance])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"
        strategy="lazyOnload"
      />
      <div className="space-y-3">
        {status === 'idle' && (
          <button type="button" onClick={startCamera} className="btn-primary">
            Зарегистрировать лицо для входа (2FA)
          </button>
        )}
        {(status === 'loading' || status === 'capturing') && (
          <div className="flex items-center gap-2 text-white/80">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
            <span>{message}</span>
          </div>
        )}
        {status === 'camera' && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black/40 w-full min-h-[320px] aspect-video max-w-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full min-h-[320px] object-cover absolute inset-0"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas
                ref={overlayRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
            {STEPS.length > 0 && (
              <div className="flex gap-1">
                {STEPS.map((s, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded ${
                      i < step ? 'bg-green-500/80' : i === step ? 'bg-white/60' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
            )}
            {progress > 0 && progress < 100 && (
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
            <p className="text-white/60 text-xs">
              Шаг {step + 1}/{STEPS.length}: {STEPS[step]?.label}. Удерживайте позу ~1 с — захват автоматически.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={stopCamera} className="btn-secondary">
                Отмена
              </button>
            </div>
          </div>
        )}
        {status === 'success' && (
          <p className="text-green-300 text-sm">{message}</p>
        )}
        {error && (
          <p className="text-red-300 text-sm">{error}</p>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </>
  )
}
