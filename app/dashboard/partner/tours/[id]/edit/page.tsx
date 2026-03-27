'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuthStore } from '@/store/auth'
import { getNavForRole } from '@/lib/dashboard-nav'
import { customAlert } from '@/utils/modals'

type FlightTemplate = {
  flight_number: string
  departure_time: string
  max_places: number
  duration_minutes?: number | null
  boarding_location_url?: string
}

type Flight = {
  id: string
  flight_number: string
  departure_time: string
  date: string
  max_places: number
  current_booked_places: number
  duration_minutes?: number | null
  boarding_location_url?: string | null
}

type Tour = {
  id: string
  company: string
  category?: { name: string }
  partner_min_adult_price?: number | string | null
  partner_min_child_price?: number | string | null
  partner_min_concession_price?: number | string | null
  partner_commission_type?: string | null
  partner_commission_percentage?: number | string | null
  partner_fixed_adult_price?: number | string | null
  partner_fixed_child_price?: number | string | null
  partner_fixed_concession_price?: number | string | null
  flights?: Flight[]
}

type WeekDay = { dateStr: string; dayName: string; dayOfMonth: number; isPast?: boolean }

export default function EditTourPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { token, user } = useAuthStore()
  const [tour, setTour] = useState<Tour | null>(null)
  const [loading, setLoading] = useState(true)
  const [applyLoading, setApplyLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [prices, setPrices] = useState({
    partner_min_adult_price: '',
    partner_min_child_price: '',
    partner_min_concession_price: '',
    partner_commission_type: 'percentage' as 'percentage' | 'fixed',
    partner_commission_percentage: '',
    partner_fixed_adult_price: '',
    partner_fixed_child_price: '',
    partner_fixed_concession_price: '',
  })

  const [flights, setFlights] = useState<FlightTemplate[]>([
    { flight_number: '', departure_time: '10:00', max_places: 20, duration_minutes: 60, boarding_location_url: '' },
  ])
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [editingDay, setEditingDay] = useState<string | null>(null)
  const [dayFlights, setDayFlights] = useState<Flight[]>([])
  const [dayFlightsLoading, setDayFlightsLoading] = useState(false)
  const [weekDates, setWeekDates] = useState<WeekDay[]>([])

  useEffect(() => {
    fetch('/api/moscow-week', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => d.success && setWeekDates(d.data))
  }, [])

  const fetchTour = useCallback(() => {
    if (!token || !id) return
    fetch(`/api/tours/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setTour(d.data)
          setPrices({
            partner_min_adult_price: String(d.data.partner_min_adult_price ?? ''),
            partner_min_child_price: String(d.data.partner_min_child_price ?? ''),
            partner_min_concession_price: String(d.data.partner_min_concession_price ?? ''),
            partner_commission_type: (d.data.partner_commission_type || 'percentage') as 'percentage' | 'fixed',
            partner_commission_percentage: String(d.data.partner_commission_percentage ?? ''),
            partner_fixed_adult_price: String(d.data.partner_fixed_adult_price ?? ''),
            partner_fixed_child_price: String(d.data.partner_fixed_child_price ?? ''),
            partner_fixed_concession_price: String(d.data.partner_fixed_concession_price ?? ''),
          })
        } else {
          setError(d.error || 'Экскурсия не найдена')
        }
      })
      .catch(() => setError('Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [token, id])

  useEffect(() => {
    fetchTour()
  }, [fetchTour])

  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev)
      if (next.has(dateStr)) next.delete(dateStr)
      else next.add(dateStr)
      return next
    })
  }

  const addFlightRow = () => {
    setFlights((prev) => [
      ...prev,
      { flight_number: '', departure_time: '10:00', max_places: 20, duration_minutes: 60, boarding_location_url: '' },
    ])
  }

  const removeFlightRow = (idx: number) => {
    setFlights((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateFlight = (idx: number, field: keyof FlightTemplate, value: string | number) => {
    setFlights((prev) => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: value }
      return copy
    })
  }

  const handleApply = async () => {
    if (selectedDates.size === 0) {
      await customAlert('Выберите дни в календаре')
      return
    }
    const validFlights = flights.filter((f) => f.flight_number.trim())
    if (validFlights.length === 0) {
      await customAlert('Добавьте хотя бы один рейс')
      return
    }
    const adultPrice = Number(prices.partner_min_adult_price)
    if (!adultPrice || adultPrice <= 0) {
      await customAlert('Укажите минимальную цену взрослого билета')
      return
    }

    try {
      setApplyLoading(true)
      setError(null)
      const datesToSend = Array.from(selectedDates).filter((d) => !weekDates.find((w) => w.dateStr === d)?.isPast)
      if (datesToSend.length === 0) {
        setError('Выбранные дни уже прошли. Выберите актуальные даты.')
        setApplyLoading(false)
        return
      }
      const body: {
        dates: string[]
        prices?: Record<string, unknown>
        flights: { flight_number: string; departure_time: string; max_places: number; duration_minutes?: number | null; boarding_location_url?: string }[]
      } = {
        dates: datesToSend,
        flights: validFlights.map((f) => ({
          flight_number: f.flight_number.trim(),
          departure_time: f.departure_time,
          max_places: f.max_places,
          duration_minutes: f.duration_minutes ?? null,
          boarding_location_url: f.boarding_location_url?.trim() || undefined,
        })),
      }
      const childPrice = Number(prices.partner_min_child_price)
      const concessionPrice = Number(prices.partner_min_concession_price)
      if (adultPrice > 0) {
        body.prices = {
          partner_min_adult_price: adultPrice,
          partner_min_child_price: childPrice > 0 ? childPrice : null,
          partner_min_concession_price: concessionPrice > 0 ? concessionPrice : null,
          partner_commission_type: prices.partner_commission_type,
          partner_commission_percentage: prices.partner_commission_type === 'percentage' ? Number(prices.partner_commission_percentage) || null : null,
          partner_fixed_adult_price: prices.partner_commission_type === 'fixed' ? Number(prices.partner_fixed_adult_price) || null : null,
          partner_fixed_child_price: prices.partner_commission_type === 'fixed' ? Number(prices.partner_fixed_child_price) || null : null,
          partner_fixed_concession_price: prices.partner_commission_type === 'fixed' ? Number(prices.partner_fixed_concession_price) || null : null,
        }
      }

      const r = await fetch(`/api/tours/${id}/schedule/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (d.success) {
        setSelectedDates(new Set())
        setFlights([
          { flight_number: '', departure_time: '10:00', max_places: 20, duration_minutes: 60, boarding_location_url: '' },
        ])
        fetchTour()
        await customAlert(`Создано рейсов: ${d.data.created.length}`)
      } else {
        setError(d.error || 'Ошибка применения расписания')
      }
    } catch {
      setError('Ошибка при применении расписания')
    } finally {
      setApplyLoading(false)
    }
  }

  const openDayEdit = (dateStr: string) => {
    setEditingDay(dateStr)
    setDayFlightsLoading(true)
    setDayFlights([])
    fetch(`/api/tours/${id}/flights?date=${dateStr}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setDayFlights(d.data)
      })
      .finally(() => setDayFlightsLoading(false))
  }

  const getFlightsForDate = (dateStr: string) => {
    const tourFlights = tour?.flights || []
    return tourFlights.filter((f) => {
      const d = typeof f.date === 'string'
        ? f.date.split('T')[0]
        : new Date(f.date as unknown as string).toISOString().split('T')[0]
      return d === dateStr
    })
  }

  const navItems = getNavForRole(user?.role || 'partner')

  if (loading || !tour) {
    return (
      <DashboardLayout title="Редактирование" navItems={navItems}>
        <div className="p-8 text-center text-white/70">
          {loading ? 'Загрузка...' : error || 'Экскурсия не найдена'}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title={`Редактирование: ${tour.company}`} navItems={navItems}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/partner" className="text-white/70 hover:text-white text-sm">
            ← Мои экскурсии
          </Link>
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">Цены и доля партнёра</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/80 mb-1">Мин. цена взрослый (₽) *</label>
              <input
                type="number"
                min={1}
                value={prices.partner_min_adult_price}
                onChange={(e) => setPrices((p) => ({ ...p, partner_min_adult_price: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-white/80 mb-1">Мин. цена детский (₽)</label>
              <input
                type="number"
                min={0}
                value={prices.partner_min_child_price}
                onChange={(e) => setPrices((p) => ({ ...p, partner_min_child_price: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-white/80 mb-1">Мин. цена льготный (₽)</label>
              <input
                type="number"
                min={0}
                value={prices.partner_min_concession_price}
                onChange={(e) => setPrices((p) => ({ ...p, partner_min_concession_price: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-white/80 mb-1">Тип комиссии</label>
              <select
                value={prices.partner_commission_type}
                onChange={(e) => setPrices((p) => ({ ...p, partner_commission_type: e.target.value as 'percentage' | 'fixed' }))}
                className="input-glass w-full"
              >
                <option value="percentage">Процент</option>
                <option value="fixed">Фиксированная</option>
              </select>
            </div>
            {prices.partner_commission_type === 'percentage' && (
              <div>
                <label className="block text-sm text-white/80 mb-1">Процент партнёра (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={prices.partner_commission_percentage}
                  onChange={(e) => setPrices((p) => ({ ...p, partner_commission_percentage: e.target.value }))}
                  className="input-glass w-full"
                />
              </div>
            )}
            {prices.partner_commission_type === 'fixed' && (
              <>
                <div>
                  <label className="block text-sm text-white/80 mb-1">Фикс. взрослый (₽)</label>
                  <input
                    type="number"
                    min={0}
                    value={prices.partner_fixed_adult_price}
                    onChange={(e) => setPrices((p) => ({ ...p, partner_fixed_adult_price: e.target.value }))}
                    className="input-glass w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/80 mb-1">Фикс. детский (₽)</label>
                  <input
                    type="number"
                    min={0}
                    value={prices.partner_fixed_child_price}
                    onChange={(e) => setPrices((p) => ({ ...p, partner_fixed_child_price: e.target.value }))}
                    className="input-glass w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/80 mb-1">Фикс. льготный (₽)</label>
                  <input
                    type="number"
                    min={0}
                    value={prices.partner_fixed_concession_price}
                    onChange={(e) => setPrices((p) => ({ ...p, partner_fixed_concession_price: e.target.value }))}
                    className="input-glass w-full"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-2">Рейсы (шаблон)</h3>
          <p className="text-sm text-white/60 mb-4">Заполните рейсы и выберите дни — они будут применены к выбранным датам.</p>
          <div className="space-y-4">
            {flights.map((f, idx) => (
              <div key={idx} className="relative p-4 rounded border border-white/10 space-y-3">
                <button
                  type="button"
                  onClick={() => removeFlightRow(idx)}
                  disabled={flights.length === 1}
                  className="absolute top-2 right-2 text-white/40 hover:text-white/80 text-xl leading-none disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Удалить"
                >
                  ×
                </button>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pr-8">
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Номер рейса</label>
                    <input
                      value={f.flight_number}
                      onChange={(e) => updateFlight(idx, 'flight_number', e.target.value)}
                      className="input-glass w-full"
                      placeholder="Например: Рейс 1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Время отправления</label>
                    <input
                      type="time"
                      value={f.departure_time}
                      onChange={(e) => updateFlight(idx, 'departure_time', e.target.value)}
                      className="input-glass w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Мест</label>
                    <input
                      type="number"
                      min={1}
                      value={f.max_places}
                      onChange={(e) => updateFlight(idx, 'max_places', Number(e.target.value) || 0)}
                      className="input-glass w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Длительность (мин)</label>
                    <input
                      type="number"
                      min={1}
                      value={f.duration_minutes ?? ''}
                      onChange={(e) => updateFlight(idx, 'duration_minutes', e.target.value ? Number(e.target.value) : 60)}
                      className="input-glass w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Ссылка на место посадки</label>
                  <input
                    value={f.boarding_location_url ?? ''}
                    onChange={(e) => updateFlight(idx, 'boarding_location_url', e.target.value)}
                    className="input-glass w-full"
                    placeholder="https://..."
                  />
                </div>
              </div>
            ))}
            <button type="button" onClick={addFlightRow} className="text-white/70 hover:text-white text-sm">
              + Добавить рейс
            </button>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">Календарь (текущая + следующая неделя)</h3>
          <p className="text-sm text-white/70 mb-4">Выберите дни и нажмите «Применить». Прошедшие даты недоступны для создания рейсов.</p>
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map(({ dateStr, dayName, dayOfMonth, isPast }) => {
              const dayFlightsCount = getFlightsForDate(dateStr).length
              const isSelected = selectedDates.has(dateStr)
              return (
                <div
                  key={dateStr}
                  role={isPast ? undefined : 'button'}
                  tabIndex={isPast ? undefined : 0}
                  onClick={() => !isPast && toggleDate(dateStr)}
                  onKeyDown={(e) => !isPast && e.key === 'Enter' && toggleDate(dateStr)}
                  className={`
                    p-4 rounded-lg border text-center transition relative
                    ${isPast
                      ? 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
                      : isSelected
                        ? 'bg-purple-500/30 border-purple-400 cursor-pointer'
                        : 'bg-white/5 border-white/20 hover:bg-white/10 cursor-pointer'
                    }
                  `}
                >
                  <div className="text-white/70 text-xs">{dayName}</div>
                  <div className="text-white font-semibold">{dayOfMonth}</div>
                  {dayFlightsCount > 0 && (
                    <div className="text-xs text-green-300 mt-1">{dayFlightsCount} рейс.</div>
                  )}
                  {dayFlightsCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openDayEdit(dateStr) }}
                      className={`mt-2 text-xs ${isPast ? 'text-white/50' : 'text-purple-300 hover:text-purple-200'}`}
                    >
                      Редакт.
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {error && (
            <div className="mt-4 alert-error">
              <p className="text-sm">{error}</p>
            </div>
          )}
          <div className="mt-4 flex gap-4">
            <button
              type="button"
              onClick={handleApply}
              disabled={applyLoading || selectedDates.size === 0}
              className="btn-primary"
            >
              {applyLoading ? 'Применяем...' : `Применить к ${selectedDates.size} дн.`}
            </button>
          </div>
        </div>

        {editingDay && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="glass-card max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Рейсы на {editingDay}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingDay(null)}
                  className="text-white/70 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              {dayFlightsLoading ? (
                <p className="text-white/70">Загрузка...</p>
              ) : dayFlights.length === 0 ? (
                <p className="text-white/70">Нет рейсов на эту дату</p>
              ) : (
                <div className="space-y-3">
                  {dayFlights.map((f) => (
                    <DayFlightRow key={f.id} flight={f} token={token!} onSaved={() => { fetchTour(); openDayEdit(editingDay) }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function DayFlightRow({ flight, token, onSaved }: { flight: Flight; token: string; onSaved: () => void }) {
  const [edit, setEdit] = useState(false)
  const [fn, setFn] = useState(flight.flight_number)
  const [time, setTime] = useState(() => {
    const d = new Date(flight.departure_time)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [places, setPlaces] = useState(flight.max_places)
  const [dur, setDur] = useState(flight.duration_minutes ?? 60)
  const [url, setUrl] = useState(flight.boarding_location_url ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    try {
      setSaving(true)
      const r = await fetch(`/api/flights/${flight.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          flight_number: fn,
          departure_time: time,
          max_places: places,
          duration_minutes: dur,
          boarding_location_url: url || null,
        }),
      })
      const d = await r.json()
      if (d.success) {
        setEdit(false)
        onSaved()
      } else {
        await customAlert(d.error || 'Ошибка')
      }
    } catch {
      await customAlert('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (!edit) {
    return (
      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
        <span className="text-white text-sm">
          {flight.flight_number} · {time} · мест: {flight.max_places} (забр.: {flight.current_booked_places})
        </span>
        <button type="button" onClick={() => setEdit(true)} className="btn-secondary text-xs">
          Изменить
        </button>
      </div>
    )
  }

  return (
    <div className="p-3 bg-white/5 rounded-lg space-y-2">
      <input
        value={fn}
        onChange={(e) => setFn(e.target.value)}
        placeholder="Номер"
        className="input-glass w-full text-sm"
      />
      <div className="flex gap-2">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input-glass text-sm" />
        <input
          type="number"
          min={1}
          value={places}
          onChange={(e) => setPlaces(Number(e.target.value) || 0)}
          className="input-glass w-20 text-sm"
        />
        <input
          type="number"
          min={1}
          value={dur}
          onChange={(e) => setDur(Number(e.target.value) || 60)}
          placeholder="Мин"
          className="input-glass w-16 text-sm"
        />
      </div>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Ссылка на место посадки"
        className="input-glass w-full text-sm"
      />
      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary text-sm">
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button type="button" onClick={() => setEdit(false)} className="btn-secondary text-sm">
          Отмена
        </button>
      </div>
    </div>
  )
}
