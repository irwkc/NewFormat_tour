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

interface FaceRegisterBlockProps {
  token: string
  onRegistered: () => void
}

export default function FaceRegisterBlock({ token, onRegistered }: FaceRegisterBlockProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'camera' | 'capturing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
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

  const startCamera = useCallback(async () => {
    setError(null)
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
              setMessage('Наведите камеру на лицо и нажмите «Зарегистрировать»')
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
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus('idle')
    setMessage('')
    setError(null)
  }, [])

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
        setError('Лицо не обнаружено. Расположите лицо в кадре.')
        setStatus('camera')
        return
      }
      const descriptor = Array.from(detection.descriptor)
      setMessage('Сохранение...')
      const res = await fetch('/api/auth/face-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ descriptor }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
        setMessage(`Лицо зарегистрировано. Снимков: ${data.count ?? 1}. При следующем входе потребуется проверка по лицу.`)
        stopCamera()
        onRegistered()
      } else {
        setStatus('camera')
        setError(data.error || 'Ошибка регистрации')
      }
    } catch (e: any) {
      setStatus('camera')
      setError(e?.message || 'Ошибка')
    }
  }

  // Привязка потока к video после монтирования (когда status === 'camera' и элемент в DOM)
  useEffect(() => {
    if (status !== 'camera' || !streamRef.current || !videoRef.current) return
    const video = videoRef.current
    const stream = streamRef.current
    video.srcObject = stream
    video.play().catch((e) => console.warn('video.play:', e))
  }, [status])

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
                className="w-full h-full min-h-[320px] object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleCapture} className="btn-primary">
                Зарегистрировать
              </button>
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
      </div>
    </>
  )
}
