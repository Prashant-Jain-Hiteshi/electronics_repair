import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

export type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, footer, className }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={[
        'relative w-full max-w-[90vw] sm:max-w-md md:max-w-lg rounded-2xl border border-white/10 bg-[#12151d] p-5 shadow-xl text-white max-h-[85vh] overflow-y-auto',
        className || '',
      ].join(' ')}>
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <div className="space-y-3 overflow-x-hidden">{children}</div>
        {footer && (
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default Modal
