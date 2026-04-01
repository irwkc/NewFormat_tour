import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { getAppSettings, updateMaxManagerPercentForPromoterSale } from '@/lib/app-settings'

const patchSchema = z.object({
  max_manager_percent_of_ticket_for_promoter_sale: z.number().min(0).max(100),
})

/** Чтение лимита — любой авторизованный пользователь ЛК (не только менеджер: иначе 403 и лишние ошибки в консоли). */
export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    const settings = await getAppSettings()
    return NextResponse.json({
      success: true,
      data: {
        max_manager_percent_of_ticket_for_promoter_sale: Number(
          settings.max_manager_percent_of_ticket_for_promoter_sale
        ),
      },
    })
  })
}

export async function PATCH(request: NextRequest) {
  return withAuth(
    request,
    async () => {
      try {
        const body = await request.json()
        const data = patchSchema.parse(body)
        await updateMaxManagerPercentForPromoterSale(data.max_manager_percent_of_ticket_for_promoter_sale)
        const settings = await getAppSettings()
        return NextResponse.json({
          success: true,
          data: {
            max_manager_percent_of_ticket_for_promoter_sale: Number(
              settings.max_manager_percent_of_ticket_for_promoter_sale
            ),
          },
        })
      } catch (e) {
        if (e instanceof z.ZodError) {
          return NextResponse.json({ success: false, error: 'Некорректные данные' }, { status: 400 })
        }
        throw e
      }
    },
    [UserRole.owner]
  )
}
