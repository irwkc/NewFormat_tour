import { prisma } from '@/lib/prisma'

const APP_SETTINGS_ID = 'default'

export async function getAppSettings() {
  let row = await prisma.appSettings.findUnique({ where: { id: APP_SETTINGS_ID } })
  if (!row) {
    row = await prisma.appSettings.create({
      data: {
        id: APP_SETTINGS_ID,
        max_manager_percent_of_ticket_for_promoter_sale: 100,
      },
    })
  }
  return row
}

export async function updateMaxManagerPercentForPromoterSale(value: number) {
  return prisma.appSettings.upsert({
    where: { id: APP_SETTINGS_ID },
    create: {
      id: APP_SETTINGS_ID,
      max_manager_percent_of_ticket_for_promoter_sale: value,
    },
    update: {
      max_manager_percent_of_ticket_for_promoter_sale: value,
    },
  })
}
