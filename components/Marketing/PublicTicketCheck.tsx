'use client'

import { useState } from 'react'

type LookupFlight = {
  flight_number: string
  date: string
  departure_time: string
  boarding_location_url: string | null
}

type LookupOk = {
  found: true
  message: string
  status: 'sold' | 'used' | 'cancelled'
  status_label: string
  tour: { company: string; category: string }
  flight: LookupFlight | null
  adult_count: number
  child_count: number
  concession_count: number
}

type LookupNotFound = {
  found: false
  message: string
}

type LookupData = LookupOk | LookupNotFound

const glassShellClass =
  'relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent shadow-lg shadow-black/20 backdrop-blur-xl'

type Props = {
  layout?: 'home' | 'page'
  inputId?: string
}

export function PublicTicketCheck({ layout = 'page', inputId = 'sale-code' }: Props) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LookupData | null>(null)

  const submit = async () => {
    const trimmed = code.trim()
    if (!/^\d{6}$/.test(trimmed)) {
      setError('Нужны 6 цифр с чека')
      setData(null)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/public/ticket-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale_number: trimmed }),
      })
      const json = await res.json()
      if (!json.success) {
        setData(null)
        setError(json.error || 'Не удалось проверить')
        return
      }
      setData(json.data as LookupData)
    } catch {
      setData(null)
      setError('Ошибка сети. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  const isHome = layout === 'home'

  if (isHome) {
    return (
      <div className={`${glassShellClass} p-5 sm:p-6 md:p-7`}>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-sky-500/10 blur-2xl"
        />
        <div className="relative space-y-4">
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            placeholder="000000"
            aria-label="Номер заказа, 6 цифр"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="input-glass w-full text-center text-xl tracking-[0.35em] font-mono"
          />
          <button type="button" onClick={submit} disabled={loading} className="btn-primary w-full">
            {loading ? 'Проверка…' : 'Проверить'}
          </button>

          {error ? (
            <div className="alert-error">
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : null}

          {data && !data.found ? (
            <div className="alert-warning">
              <p className="text-sm font-medium">{data.message}</p>
            </div>
          ) : null}

          {data?.found ? (
            <div className="border-t border-white/10 pt-5 space-y-3 text-white/90 text-sm sm:text-base">
              <p className="text-white font-medium">{data.message}</p>
              <p>
                <span className="text-white/60">Статус: </span>
                <span className="text-white font-medium">{data.status_label}</span>
              </p>
              <p>
                <span className="text-white/60">Экскурсия: </span>
                {data.tour.company}
                {data.flight ? ` — ${data.flight.flight_number}` : ''}
              </p>
              <p>
                <span className="text-white/60">Категория: </span>
                {data.tour.category}
              </p>
              {data.flight ? (
                <>
                  <p>
                    <span className="text-white/60">Дата: </span>
                    {new Date(data.flight.date).toLocaleDateString('ru-RU')}
                  </p>
                  <p>
                    <span className="text-white/60">Отправление: </span>
                    {new Date(data.flight.departure_time).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {data.flight.boarding_location_url ? (
                    <p>
                      <a
                        href={data.flight.boarding_location_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-300 hover:text-sky-200 underline"
                      >
                        Место посадки на карте
                      </a>
                    </p>
                  ) : null}
                </>
              ) : null}
              <p>
                <span className="text-white/60">Места: </span>
                взрослых {data.adult_count}
                {data.child_count > 0 ? `, детских ${data.child_count}` : ''}
                {data.concession_count > 0 ? `, льготных ${data.concession_count}` : ''}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-3 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Проверка билета</h1>
      <p className="text-white/70 text-sm sm:text-base mb-8 leading-relaxed">
        Введите шестизначный номер заказа с чека или из письма — мы покажем экскурсию, дату отправления и статус билета.
      </p>

      <div className="glass-card space-y-4">
        <div>
          <label htmlFor={inputId} className="block text-sm font-medium text-white/90 mb-2">
            Номер заказа (6 цифр)
          </label>
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="input-glass text-center text-xl tracking-[0.35em] font-mono w-full"
          />
        </div>
        <button type="button" onClick={submit} disabled={loading} className="btn-primary w-full">
          {loading ? 'Проверка…' : 'Проверить'}
        </button>

        {error ? (
          <div className="alert-error">
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : null}

        {data && !data.found ? (
          <div className="alert-warning">
            <p className="text-sm font-medium">{data.message}</p>
          </div>
        ) : null}

        {data?.found ? (
          <div className="border-t border-white/10 pt-6 space-y-3 text-white/90 text-sm sm:text-base">
            <p className="text-white font-medium">{data.message}</p>
            <p>
              <span className="text-white/60">Статус: </span>
              <span className="text-white font-medium">{data.status_label}</span>
            </p>
            <p>
              <span className="text-white/60">Экскурсия: </span>
              {data.tour.company}
              {data.flight ? ` — ${data.flight.flight_number}` : ''}
            </p>
            <p>
              <span className="text-white/60">Категория: </span>
              {data.tour.category}
            </p>
            {data.flight ? (
              <>
                <p>
                  <span className="text-white/60">Дата: </span>
                  {new Date(data.flight.date).toLocaleDateString('ru-RU')}
                </p>
                <p>
                  <span className="text-white/60">Отправление: </span>
                  {new Date(data.flight.departure_time).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {data.flight.boarding_location_url ? (
                  <p>
                    <a
                      href={data.flight.boarding_location_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-300 hover:text-sky-200 underline"
                    >
                      Место посадки на карте
                    </a>
                  </p>
                ) : null}
              </>
            ) : null}
            <p>
              <span className="text-white/60">Места: </span>
              взрослых {data.adult_count}
              {data.child_count > 0 ? `, детских ${data.child_count}` : ''}
              {data.concession_count > 0 ? `, льготных ${data.concession_count}` : ''}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
