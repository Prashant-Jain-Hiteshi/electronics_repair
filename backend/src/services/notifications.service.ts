import { emitToUser } from '../socket'
import { enqueueNotification } from '../queue'

export type Channel = 'in_app' | 'email' | 'sms'

export type NotificationPayload = {
  userId: string
  event: string
  data?: Record<string, unknown>
  channels?: Channel[]
}

// Immediate, in-process notifier (used by workers and when async queue is disabled)
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

// Enqueue for background processing
export async function notifyAsync(payload: NotificationPayload) {
  try {
    await enqueueNotification(payload, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
  } catch (e) {
    // Fallback to inline notify on enqueue failure
    try {
      const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : String(e)
      console.warn('[notifyAsync] enqueue failed, falling back inline', msg)
    } catch {}
    await notify(payload)
  }
}

// Helper: choose async vs sync based on env flag
export async function notifySmart(payload: NotificationPayload) {
  const useQueue = (process.env.NOTIFICATIONS_USE_QUEUE || 'true').toLowerCase() !== 'false';
  if (useQueue) return notifyAsync(payload);
  return notify(payload);
}
