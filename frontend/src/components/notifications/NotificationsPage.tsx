import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/hooks/useNotifications'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'

export type NotificationsScope = 'customer' | 'admin' | 'technician'

interface NotificationsPageProps {
  scope: NotificationsScope
}

type AnyNotif = {
  id: string
  read?: boolean
  createdAt?: string | number
  title?: string
  message?: string
  description?: string
  text?: string
  type?: string
  [key: string]: any
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ scope }) => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Centralized notifications state/actions
  const { items: notifs, timeAgo, iconFor, linkFor, markAllRead, markRead, clearAll } = useNotifications()
  // No local storage wiring here; the hook already subscribes to updates

  // Lightweight optimistic read feedback while the hook updates
  const [pendingRead, setPendingRead] = useState<Set<string>>(new Set())

  const title = useMemo(() => {
    if (scope === 'admin') return 'Admin Notifications'
    if (scope === 'technician') return 'Technician Notifications'
    return 'Notifications'
  }, [scope])

  const openDetails = (n: AnyNotif) => {
    const deep = linkFor(n as any)
    if (deep) {
      if (n?.id) {
        setPendingRead(prev => new Set(prev).add(n.id))
        markRead(n.id)
      }
      navigate(deep)
    } else {
      if (n?.id) {
        setPendingRead(prev => new Set(prev).add(n.id))
        markRead(n.id)
      }
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'info', message: 'No details available for this notification.' } }))
    }
  }

  const primaryText = (n: AnyNotif) => n.title || n.message || n.type || 'Notification'
  const secondaryText = (n: AnyNotif) => n.description || n.text || ''

  const backHref = scope === 'admin' ? '/admin' : scope === 'technician' ? '/technician' : '/'

  const isLoading = !Array.isArray(notifs)

  return (
    <div className="min-h-[70vh] text-white">
      <h1 className="text-2xl font-semibold mb-4">{title}</h1>

      <div className="rounded-2xl border border-white/10 bg-[#12151d] p-0 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between text-sm text-slate-300" role="region" aria-label="Notifications toolbar">
          <span>Only real notifications are shown.</span>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              className="rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="Mark all notifications as read"
              disabled={!notifs || notifs.length === 0}
              aria-disabled={!notifs || notifs.length === 0}
              onMouseDown={(e) => e.preventDefault()}
              onClickCapture={() => {
                // Optimistic visual: mark all as pending read
                if (Array.isArray(notifs)) setPendingRead(new Set(notifs.map(n => n.id)))
              }}
            >Mark all read</button>
            <button
              onClick={clearAll}
              className="rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="Clear all notifications"
              disabled={!notifs || notifs.length === 0}
              aria-disabled={!notifs || notifs.length === 0}
              onMouseDown={(e) => e.preventDefault()}
            >Clear</button>
          </div>

        </div>

        {isLoading ? (
          <div className="p-6" aria-busy="true" aria-live="polite">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-6 w-6 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48" />
                    <div className="mt-2"><Skeleton className="h-3 w-80" /></div>
                  </div>
                </div>
              ))}
            </div>
            <span className="sr-only">Loading notifications</span>
          </div>
        ) : notifs.length === 0 ? (
          <div className="p-6 text-center text-slate-300">
            <div className="text-base">No notifications yet.</div>
            <div className="text-sm text-slate-400 mt-1">You will see notifications here when actions occur in the app.</div>
          </div>
        ) : (
          <ul className="divide-y divide-white/10" role="list" aria-label="Notifications list">
            {notifs.map((n) => (
              <li
                key={n.id}
                className={`p-4 flex items-start gap-3 cursor-pointer hover:bg-white/5 focus:bg-white/5 outline-none ${(n.read || pendingRead.has(n.id)) ? 'opacity-80' : ''}`}
                onClick={() => openDetails(n)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetails(n) } }}
                role="button"
                tabIndex={0}
                aria-label={`${n.read ? 'Read' : 'Unread'} notification: ${primaryText(n)}`}
                aria-pressed={n.read || pendingRead.has(n.id) ? true : false}
              >
                <span className={`mt-0.5 text-lg ${n.read ? 'opacity-50' : ''}`}>{iconFor(n.type)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate font-medium text-white/90">{primaryText(n)}</div>
                    <div className="shrink-0 text-xs text-slate-400">{timeAgo(n.createdAt as any)}</div>
                  </div>
                  {secondaryText(n) && (
                    <div className="mt-1 text-sm text-slate-300">{secondaryText(n)}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between" role="region" aria-label="Notifications footer">
          <div className="text-xs text-slate-400">Stored locally per user.</div>
          <div className="flex items-center gap-2">
            <Link to={backHref} className="rounded-md border border-white/10 px-3 py-1.5 text-sm" aria-label="Go back">Back</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationsPage
