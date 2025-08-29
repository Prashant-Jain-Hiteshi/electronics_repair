import { useEffect } from 'react'
import { connectSocket, getSocket } from '../api/socket'
import { emitNotification } from '../events/notifications'

/**
 * Connects Socket.IO (with provided auth token) and bridges server events into the
 * local notification event bus. Use once at app bootstrap after auth.
 */
export function useSocketNotifications(token?: string | null) {
  useEffect(() => {
    if (!token) return
    const sock = connectSocket(token)
    if (!sock) return

    const onNotification = (payload: any) => emitNotification({ type: 'notification:new', payload })
    const onRepairCreated = (payload: any) => emitNotification({ type: 'repair:created', payload })
    const onRepairStatus = (payload: any) => emitNotification({ type: 'repair:status', payload })
    const onRepairCost = (payload: any) => emitNotification({ type: 'repair:cost_change', payload })
    const onApprovalExpired = (payload: any) => emitNotification({ type: 'approval:expired', payload })
    const onApprovalCreated = (payload: any) => emitNotification({ type: 'approval:created', payload })
    const onApprovalUpdated = (payload: any) => emitNotification({ type: 'approval:updated', payload })

    sock.on('notification:new', onNotification)
    sock.on('repair:created', onRepairCreated)
    sock.on('repair:status', onRepairStatus)
    sock.on('repair:cost_change', onRepairCost)
    sock.on('approval:expired', onApprovalExpired)
    sock.on('approval:created', onApprovalCreated)
    sock.on('approval:updated', onApprovalUpdated)

    return () => {
      const s = getSocket()
      try {
        s?.off('notification:new', onNotification)
        s?.off('repair:created', onRepairCreated)
        s?.off('repair:status', onRepairStatus)
        s?.off('repair:cost_change', onRepairCost)
        s?.off('approval:expired', onApprovalExpired)
        s?.off('approval:created', onApprovalCreated)
        s?.off('approval:updated', onApprovalUpdated)
      } catch {}
    }
  }, [token])
}
