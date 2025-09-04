import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export type NotificationItem = {
  id: string
  type: string
  title: string
  message?: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, any>
  recipientId?: string
  createdAt: number | string
  read?: boolean
  readAt?: number | string | null
  [key: string]: any
}

function storeKeyFor(role: 'admin'|'technician'|'customer', userId: string) {
  if (role === 'admin') return `admin_notifs_${userId}`
  if (role === 'technician') return `tech_notifs_${userId}`
  return `customer_notifs_${userId}`
}

function load(key: string): NotificationItem[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function save(key: string, items: NotificationItem[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items))
    window.dispatchEvent(new CustomEvent('notifications:updated', { detail: { storeKey: key } }))
  } catch {}
}

function timeAgo(ts?: number | string) {
  if (!ts) return ''
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts)
  const diff = Date.now() - d.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleString()
}

function iconFor(type?: string) {
  switch (type) {
    case 'repair:created': return '🛠️'
    case 'repair:status': return '📈'
    case 'repair:cost_change': return '💲'
    case 'approval:created': return '✅'
    case 'approval:updated': return '✏️'
    case 'approval:expired': return '⏳'
    default: return '🔔'
  }
}

function linkFor(n: NotificationItem, role: 'admin'|'technician'|'customer') {
  const id = n.entityId || n.repairId || n.metadata?.repairId || n.metadata?.entityId
  const et = (n.entityType || n.metadata?.entityType || '').toLowerCase()
  if (!id) return null
  const kind = (n as any)?.kind || n.metadata?.kind || ''
  const hasRepairSignal =
    et === 'repair'
    || (n.type?.startsWith('repair:') ?? false)
    || (typeof kind === 'string' && kind.toLowerCase().includes('repair'))
    || !!n.metadata?.repairId

  if (hasRepairSignal) {
    if (role === 'admin') return `/admin/repairs/${id}`
    if (role === 'customer') return `/repairs/${id}`
    // For technician, link to panel root or a future detail route
    if (role === 'technician') return `/technician` // adjust when a detail route exists
  }
  return null
}

export function useNotifications() {
  const { user } = useAuth()
  const userId = user?.id
  const role = user?.role
  const storeKey = useMemo(() => userId && role ? storeKeyFor(role, userId) : null, [userId, role])

  const [items, setItems] = useState<NotificationItem[]>([])

  useEffect(() => {
    if (!storeKey) return
    const sync = () => setItems(load(storeKey))
    sync()
    const onStorage = (e: StorageEvent) => { if (e.key === storeKey) sync() }
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as { storeKey?: string } | undefined
      if (!detail || detail.storeKey === storeKey) sync()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('notifications:updated', onLocal as EventListener)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('notifications:updated', onLocal as EventListener)
    }
  }, [storeKey])

  const unreadCount = useMemo(() => items.filter(i => !i.read).length, [items])

  const markAllRead = () => {
    if (!storeKey) return
    const next = items.map(i => ({ ...i, read: true, readAt: i.readAt || Date.now() }))
    save(storeKey, next)
    setItems(next)
  }
  const markRead = (id: string) => {
    if (!storeKey) return
    const next = items.map(i => i.id === id ? ({ ...i, read: true, readAt: i.readAt || Date.now() }) : i)
    save(storeKey, next)
    setItems(next)
  }
  const clearAll = () => {
    if (!storeKey) return
    save(storeKey, [])
    setItems([])
  }

  return {
    items,
    unreadCount,
    timeAgo,
    iconFor,
    linkFor: (n: NotificationItem) => role ? linkFor(n, role) : null,
    markAllRead,
    markRead,
    clearAll,
  }
}
