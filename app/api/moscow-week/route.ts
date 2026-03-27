import { NextResponse } from 'next/server'
import { getMoscowTwoWeekDates, toDateString, getMoscowDateString } from '@/lib/moscow-time'

const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

// GET /api/moscow-week — даты на 2 недели (текущая + следующая) по Москве
export async function GET() {
  const today = getMoscowDateString()
  const dates = getMoscowTwoWeekDates()
  const result = dates.map((d, i) => {
    const dateStr = toDateString(d)
    const weekdayIndex = i % 7
    return {
      dateStr,
      dayName: WEEKDAY_NAMES[weekdayIndex],
      dayOfMonth: d.getUTCDate(),
      isPast: dateStr < today,
    }
  })
  return NextResponse.json(
    { success: true, data: result, today },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      },
    }
  )
}
