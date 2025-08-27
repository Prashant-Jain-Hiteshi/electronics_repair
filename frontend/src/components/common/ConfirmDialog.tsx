import React from 'react'
import Modal from './Modal'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ open, title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel }) => {
  return (
    <Modal open={open} onClose={onCancel} title={title}
      footer={(
        <>
          <button className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/5" onClick={onCancel}>{cancelText}</button>
          <button className="rounded-md border border-[#A48AFB] bg-[#A48AFB]/20 hover:bg-[#A48AFB]/30 px-3 py-1.5 text-sm text-white" onClick={onConfirm}>{confirmText}</button>
        </>
      )}
    >
      <p className="text-slate-300 text-sm">{message}</p>
    </Modal>
  )
}

export default ConfirmDialog
