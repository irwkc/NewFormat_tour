import webPush from 'web-push'
import { prisma } from '@/lib/prisma'

const VAPID_PUBLIC_KEY = process.env.WEB_PUSH_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.WEB_PUSH_PRIVATE_KEY
const VAPID_SUBJECT = process.env.WEB_PUSH_SUBJECT || 'mailto:admin@nf-travel.ru'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export type PushPayload = {
  title: string
  body: string
  data?: Record<string, unknown>
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const subs = await prisma.pushSubscription.findMany({
    where: { user_id: userId },
  })

  if (!subs.length) return

  const body = JSON.stringify(payload)

  await Promise.all(
    subs.map(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          auth: sub.auth,
          p256dh: sub.p256dh,
        },
      }
      try {
        await webPush.sendNotification(subscription as any, body)
      } catch (e: any) {
        const status = e?.statusCode || e?.statusCode
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        }
      }
    })
  )
}

