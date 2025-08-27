import React, { useEffect } from 'react'

export type ToastProps = {
  kind?: 'success' | 'error' | 'info'
  children: React.ReactNode
  onClose?: () => void
  autoHideMs?: number
}

const bgByKind: Record<NonNullable<ToastProps['kind']>, string> = {
  success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  error: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  info: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
}

const Toast: React.FC<ToastProps> = ({ kind = 'info', children, onClose, autoHideMs }) => {
  useEffect(() => {
    if (!autoHideMs || !onClose) return
    const t = setTimeout(onClose, autoHideMs)
    return () => clearTimeout(t)
  }, [autoHideMs, onClose])

  return (
    <div className={["rounded-md border px-3 py-2 text-sm", bgByKind[kind]].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">{children}</div>
        {onClose && (
          <button className="shrink-0 text-xs rounded border border-white/10 px-2 py-0.5 hover:bg-white/5 text-white" onClick={onClose}>Close</button>
        )}
      </div>
    </div>
  )
}

export default Toast
