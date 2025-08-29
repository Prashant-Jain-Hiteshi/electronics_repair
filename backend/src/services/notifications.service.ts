import { emitToUser } from '../socket'

export type Channel = 'in_app' | 'email' | 'sms'

export type NotificationPayload = {
  userId: string
  event: string
  data: any
  channels?: Channel[]
}

export async function notify({ userId, event, data, channels = ['in_app'] }: NotificationPayload) {
  try {
    if (channels.includes('in_app')) {
      emitToUser(userId, event, data)
    }
    if (channels.includes('email')) {
      // TODO: integrate email provider (e.g. SendGrid). For now, log stub.
      try { console.log(`[notify] email -> user=${userId} event=${event}`) } catch {}
    }
    if (channels.includes('sms')) {
      // TODO: integrate SMS provider (e.g. Twilio). For now, log stub.
      try { console.log(`[notify] sms -> user=${userId} event=${event}`) } catch {}
    }
  } catch (err) {
    try { console.error('[notify] failed', err) } catch {}
  }
}
