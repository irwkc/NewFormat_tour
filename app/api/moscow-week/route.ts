import { NextResponse } from 'next/server'
import { getMoscowWeekDates, toDateString } from '@/lib/moscow-time'

const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

// GET /api/moscow-week — даты текущей недели по Москве
export async function GET() {
  const dates = getMoscowWeekDates()
  const result = dates.map((d, i) => ({
    dateStr: toDateString(d),
    dayName: WEEKDAY_NAMES[i],
    dayOfMonth: d.getUTCDate(),
  }))
  return NextResponse.json(
    { success: true, data: result },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      },
    }
  )
}
