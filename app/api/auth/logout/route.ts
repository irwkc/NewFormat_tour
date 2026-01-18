import { NextRequest, NextResponse } from 'next/server'

// POST /api/auth/logout - выход из системы
export async function POST(request: NextRequest) {
  // На клиенте очищается токен из store и localStorage
  // Это просто подтверждение на сервере
  return NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  })
}
