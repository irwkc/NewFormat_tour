import { NextResponse } from 'next/server'
import { getPublicManagersFromPrisma } from '@/lib/public-managers'

// GET /api/public/managers — публичный список менеджеров (лендинг; при необходимости — PUBLIC_MANAGERS_FETCH_URL=https://staff.nf-travel.ru/api/public/managers)
export async function GET() {
  try {
    const data = await getPublicManagersFromPrisma(24)
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (e) {
    console.error('public managers:', e)
    return NextResponse.json({ success: false, data: [] }, { status: 500 })
  }
}
