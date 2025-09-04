import React, { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useSocket } from '@/context/SocketContext'
import { addNotificationListener, emitNotification } from '@/events/notifications'

// Normalize incoming socket payloads to a stored notification object
function buildNotif(eventType: string, payload: any) {
  const now = Date.now()
  const titleMap: Record<string, string> = {
    'notification:new': 'New Notification',
    'repair:created': 'Task Assigned',
    'repair:status': 'Repair Status Updated',
    'repair:cost_change': 'Repair Cost Changed',
    'approval:expired': 'Approval Expired',
    'approval:created': 'Approval Requested',
    'approval:updated': 'Approval Updated',
    'task:assigned': 'Task Assigned',
  }
  // Determine entity and recipient
  const repair = payload?.repair || payload?.data?.repair || payload?.metadata?.repair
  const entityType = payload?.entityType || (repair ? 'repair' : undefined)
  const entityId = payload?.entityId
    || payload?.repairId
    || payload?.data?.repairId
    || repair?.id
    || payload?.metadata?.entityId
  const recipientId = payload?.recipientId || payload?.userId || payload?.technicianId || payload?.customerId

  // Human-friendly message derivation
  let title = payload?.title || titleMap[eventType] || 'Notification'
  let message = payload?.message || payload?.text || payload?.description || ''
  if (!payload?.message) {
    if (eventType === 'repair:created') {
      // If a technician is assigned, make it actionable
      if (payload?.technicianId || repair?.technicianId) {
        message = 'You have a new task assigned.'
      } else {
        message = 'A new repair has been created.'
      }
    } else if (eventType === 'repair:status') {
      const to = payload?.status || payload?.to || payload?.newStatus || payload?.next
      const from = payload?.prev || payload?.from || payload?.oldStatus
      if (to && from) message = `Status changed from ${from} to ${to}.`
      else if (to) message = `Status updated to ${to}.`
    }
  }

  // Build structured record and keep the original payload under metadata
  const base = {
    id: payload?.id ? String(payload.id) : `${eventType}:${now}:${Math.random().toString(36).slice(2, 8)}`,
    type: eventType,
    title,
    message,
    entityType,
    entityId,
    recipientId,
    createdAt: payload?.createdAt || now,
    read: false,
  }

  const { id, type, title: _t, message: _m, entityType: _et, entityId: _eid, recipientId: _rid, createdAt: _ca, read: _r, ...rest } = payload || {}
  return {
    ...base,
    metadata: rest && typeof rest === 'object' ? rest : undefined,
  }
}

function getStoreKey(role: 'admin' | 'technician' | 'customer', userId: string) {
  if (role === 'admin') return `admin_notifs_${userId}`
  if (role === 'technician') return `tech_notifs_${userId}`
  return `customer_notifs_${userId}`
}

// Determine if an incoming payload is meant for the current user
function isForCurrentUser(
  payload: any,
  currentUserId: string,
  currentRole: 'admin' | 'technician' | 'customer'
) {
  // Fast path: explicit audience
  const audience = payload?.audience // e.g., { users?: string[], roles?: string[] }
  if (audience && typeof audience === 'object') {
    const users: string[] | undefined = audience.users
    const roles: string[] | undefined = audience.roles
    if (Array.isArray(users) && users.includes(currentUserId)) return true
    if (Array.isArray(roles) && roles.includes(currentRole)) return true
  }

  // Common id fields seen in repair/approval flows
  const fields = [
    'userId',
    'recipientId',
    'customerId',
    'technicianId',
    'assignedTo',
    'assignedTechnicianId',
    'createdBy',
  ]
  for (const key of fields) {
    const v = payload?.[key]
    if (v && String(v) === String(currentUserId)) return true
  }

  // Repairs often embed nested objects
  const repair = payload?.repair || payload?.data?.repair
  if (repair && typeof repair === 'object') {
    const candidates = [repair.customerId, repair.technicianId, repair.assignedTo]
    if (candidates.some((v: any) => v && String(v) === String(currentUserId))) return true
  }

  // Role-based fallbacks: server may target a role
  const roleHints = [payload?.role, payload?.targetRole, payload?.forRole]
  if (roleHints.some((r: any) => r && String(r) === String(currentRole))) return true

  // Admins often get global events that are relevant to all admins only
  if (currentRole === 'admin' && (payload?.adminOnly === true || payload?.toAdmin === true)) return true

  // If payload indicates broadcast, do NOT store unless audience includes the user/role
  if (payload?.broadcast === true) return false
  // Fallback: if we can't determine targeting, allow it through so users still receive
  // notifications in environments where the backend doesn't yet specify explicit audience fields.
  return true
}

function loadNotifs(storeKey: string) {
  try { return JSON.parse(localStorage.getItem(storeKey) || '[]') as any[] } catch { return [] as any[] }
}
function saveNotifs(storeKey: string, list: any[]) {
  try {
    localStorage.setItem(storeKey, JSON.stringify(list))
    // Also dispatch a custom event so same-tab listeners can react immediately
    window.dispatchEvent(new CustomEvent('notifications:updated', { detail: { storeKey } }))
  } catch {}
}

// This component:
// 1) Bridges Socket.IO events to the local notification event bus
// 2) Persists notifications to localStorage per user/role
// 3) Triggers app-wide toast notifications
const NotificationsBridge: React.FC = () => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const userId = user?.id
  const role = user?.role

  // Bridge socket events to bus
  useEffect(() => {
    if (!socket) return
    const onNotification = (payload: any) => emitNotification({ type: 'notification:new', payload })
    const onRepairCreated = (payload: any) => emitNotification({ type: 'repair:created', payload })
    const onRepairStatus = (payload: any) => emitNotification({ type: 'repair:status', payload })
    const onRepairCost = (payload: any) => emitNotification({ type: 'repair:cost_change', payload })
    const onApprovalExpired = (payload: any) => emitNotification({ type: 'approval:expired', payload })
    const onApprovalCreated = (payload: any) => emitNotification({ type: 'approval:created', payload })
    const onApprovalUpdated = (payload: any) => emitNotification({ type: 'approval:updated', payload })

    socket.on('notification:new', onNotification)
    socket.on('repair:created', onRepairCreated)
    socket.on('repair:status', onRepairStatus)
    socket.on('repair:cost_change', onRepairCost)
    socket.on('approval:expired', onApprovalExpired)
    socket.on('approval:created', onApprovalCreated)
    socket.on('approval:updated', onApprovalUpdated)

    return () => {
      try {
        socket.off('notification:new', onNotification)
        socket.off('repair:created', onRepairCreated)
        socket.off('repair:status', onRepairStatus)
        socket.off('repair:cost_change', onRepairCost)
        socket.off('approval:expired', onApprovalExpired)
        socket.off('approval:created', onApprovalCreated)
        socket.off('approval:updated', onApprovalUpdated)
      } catch {}
    }
  }, [socket])

  // Persist incoming bus events for the current user and raise a toast
  useEffect(() => {
    if (!userId || !role) return
    const storeKey = getStoreKey(role, userId)
    const unsub = addNotificationListener((evt) => {
      const payload = (evt as any).payload
      if (!isForCurrentUser(payload, userId, role)) return
      const notif = buildNotif(evt.type, payload)
      const next = [notif, ...loadNotifs(storeKey)].slice(0, 200)
      saveNotifs(storeKey, next)

      const msg = notif.title + (notif.message ? `: ${notif.message}` : '')
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'info', message: msg } }))
    })
    return () => { unsub() }
  }, [userId, role])

  return null
}

export default NotificationsBridge
