// Lightweight notifications/event bus for client-side real-time updates
// Components can subscribe to updates without coupling to Socket.IO directly.

export type NotificationEvent =
  | { type: 'notification:new'; payload: any }
  | { type: 'repair:created'; payload: any }
  | { type: 'repair:status'; payload: any }
  | { type: 'repair:cost_change'; payload: any }
  | { type: 'approval:expired'; payload: any }
  | { type: 'approval:created'; payload: any }
  | { type: 'approval:updated'; payload: any }

export type NotificationListener = (event: NotificationEvent) => void

const listeners = new Set<NotificationListener>()

export function addNotificationListener(fn: NotificationListener) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function emitNotification(event: NotificationEvent) {
  for (const fn of Array.from(listeners)) {
    try { fn(event) } catch (e) { /* no-op */ }
  }
}
