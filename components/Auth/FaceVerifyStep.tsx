'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Script from 'next/script'

const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master'

declare global {
  interface Window {
    faceapi?: {
      nets: {
        ssdMobilenetv1: { loadFromUri: (url: string) => Promise<void> }
        faceLandmark68Net: { loadFromUri: (url: string) => Promise<void> }
        faceRecognitionNet: { loadFromUri: (url: string) => Promise<void> }
      }
      detectSingleFace: (input: HTMLVideoElement | HTMLCanvasElement, options?: unknown) => { withFaceLandmarks: () => { withFaceDescriptor: () => Promise<{ descriptor: Float32Array }> } }
      SsdMobilenetv1Options: new () => unknown
    }
  }
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const modelsLoadedRef = useRef(false)

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
      setMessage('Разрешите доступ к камере')
      setStatus('camera')
      navigator.mediaDevices
        .getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } })
        .then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop())
            return
          }
          streamRef.current = stream
          setMessage('Наведите камеру на лицо и нажмите «Проверить»')
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
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [loadModels])

  // Привязка потока к video после монтирования (когда status === 'camera')
  useEffect(() => {
    if (status !== 'camera' || !streamRef.current || !videoRef.current) return
    const video = videoRef.current
    const stream = streamRef.current
    video.srcObject = stream
    video.play().catch((e) => console.warn('video.play:', e))
  }, [status])

  const handleCapture = async () => {
    const faceapi = window.faceapi
    const video = videoRef.current
    if (!faceapi || !video || !modelsLoadedRef.current || video.readyState < 2) {
      setError('Камера не готова')
      return
    }
    setStatus('capturing')
    setMessage('Обнаружение лица...')
    setError(null)
    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptor()
      if (!detection?.descriptor) {
        setStatus('camera')
        setError('Лицо не обнаружено. Расположите лицо в кадре.')
        return
      }
      const descriptor = Array.from(detection.descriptor)
      setStatus('verifying')
      setMessage('Проверка...')
      const res = await fetch('/api/auth/face-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, descriptor }),
      })
      const data = await res.json()
      if (data.success && data.authenticated && data.data?.token && data.data?.user) {
        onSuccess(data.data.token, data.data.user)
        return
      }
      setStatus('camera')
      setError(data.error || 'Лицо не совпадает. Попробуйте снова.')
    } catch (e: any) {
      setStatus('camera')
      setError(e?.message || 'Ошибка проверки')
    }
  }

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
          <div className="relative rounded-2xl overflow-hidden bg-black/40 w-full min-h-[300px] aspect-video max-w-xl mx-auto">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full min-h-[300px] object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          </div>
        )}
        <p className="text-center text-white/80 text-sm">{message}</p>
        {error && (
          <div className="rounded-xl bg-red-500/20 border border-red-400/40 px-4 py-2 text-red-200 text-sm text-center">
            {error}
          </div>
        )}
        <div className="flex gap-3 justify-center">
          {status === 'camera' && (
            <button type="button" onClick={handleCapture} className="btn-primary">
              Проверить лицо
            </button>
          )}
          <button type="button" onClick={onCancel} className="btn-secondary">
            Назад к вводу пароля
          </button>
        </div>
      </div>
    </>
  )
}
