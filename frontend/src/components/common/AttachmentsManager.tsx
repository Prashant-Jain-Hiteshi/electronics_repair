import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listAttachments, uploadAttachments, deleteAttachment, type RepairAttachment, getUploadsBaseUrl } from '@/api/attachments'
import Modal from '@/components/common/Modal'

export type AttachmentsManagerProps = {
  repairOrderId: string
  canUpload?: boolean
  canDelete?: boolean
  maxCount?: number
  maxSizeMB?: number
  accept?: string[]
  title?: string
}

const DEFAULT_ACCEPT = ['image/jpeg', 'image/png', 'image/webp']

function prettySize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(2)} MB`
}

const AttachmentsManager: React.FC<AttachmentsManagerProps> = ({
  repairOrderId,
  canUpload = true,
  canDelete = true,
  maxCount = 3,
  maxSizeMB = 5,
  accept = DEFAULT_ACCEPT,
  title = 'Attachments',
}) => {
  const [items, setItems] = useState<RepairAttachment[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const uploadsBase = useMemo(() => getUploadsBaseUrl(), [])

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      setErr(null)
      const list = await listAttachments(repairOrderId)
      setItems(list)
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to load attachments')
    } finally {
      setLoading(false)
    }
  }, [repairOrderId])

  useEffect(() => { fetchList() }, [fetchList])

  const remaining = Math.max(0, maxCount - items.length)

  function validateFiles(files: File[]): { ok: boolean; reason?: string } {
    if (files.length === 0) return { ok: false, reason: 'No files selected' }
    if (files.length > remaining) return { ok: false, reason: `You can upload up to ${remaining} more file(s).` }
    for (const f of files) {
      if (!accept.includes(f.type)) {
        return { ok: false, reason: `Unsupported file type: ${f.type || f.name}` }
      }
      const mb = f.size / (1024 * 1024)
      if (mb > maxSizeMB) {
        return { ok: false, reason: `${f.name} is too large. Max ${maxSizeMB}MB.` }
      }
    }
    return { ok: true }
  }

  async function onSelectFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    await doUpload(files)
    // reset input to allow re-selecting same files
    if (inputRef.current) inputRef.current.value = ''
  }

  async function doUpload(files: File[]) {
    if (!canUpload) return
    const v = validateFiles(files)
    if (!v.ok) {
      setErr(v.reason || 'Validation failed')
      return
    }
    try {
      setErr(null)
      setLoading(true)
      await uploadAttachments(repairOrderId, files)
      await fetchList()
      try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'success', message: 'Uploaded successfully' } })) } catch {}
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const onDrop = useCallback((evt: React.DragEvent<HTMLDivElement>) => {
    evt.preventDefault()
    if (!canUpload) return
    const files = Array.from(evt.dataTransfer.files || [])
    const onlyImages = files.filter(f => DEFAULT_ACCEPT.includes(f.type))
    void doUpload(onlyImages)
  }, [canUpload])

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!canUpload) return
    e.preventDefault()
  }

  async function onDelete(att: RepairAttachment) {
    if (!canDelete) return
    const yes = window.confirm('Delete this attachment?')
    if (!yes) return
    try {
      await deleteAttachment(repairOrderId, att.id)
      await fetchList()
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Delete failed')
    }
  }

  function attachmentUrl(att: RepairAttachment) {
    // backend stores under /uploads/repairs/:repairOrderId/:filename
    return `${uploadsBase}/uploads/repairs/${att.repairOrderId}/${encodeURIComponent(att.filename)}`
  }

  return (
    <div className="rounded-lg border border-white/10 p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-white">{title}</p>
        <div className="text-xs text-slate-300">{loading ? 'Loading…' : `${items.length}/${maxCount}`}</div>
      </div>
      {err && <div className="text-xs text-rose-300 mb-2">{err}</div>}

      {/* List */}
      {items.length === 0 ? (
        <div className="text-sm text-slate-400 mb-3">No attachments yet.</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
          {items.map((att) => (
            <div key={att.id} className="group relative border border-white/10 rounded-md overflow-hidden bg-white/5">
              <img
                src={attachmentUrl(att)}
                alt={att.originalName}
                className="w-full h-24 object-cover cursor-pointer"
                onClick={() => setPreview({ url: attachmentUrl(att), name: att.originalName })}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.4' }}
              />
              <div className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-2 bg-black/40">
                <button
                  onClick={() => setPreview({ url: attachmentUrl(att), name: att.originalName })}
                  className="px-2 py-1 text-xs rounded-md bg-white/80 text-black"
                >View</button>
                {canDelete && (
                  <button onClick={() => onDelete(att)} className="px-2 py-1 text-xs rounded-md bg-rose-500 text-white">Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload */}
      {canUpload && remaining > 0 && (
        <div className="space-y-2">
          <div
            onDragOver={onDragOver}
            onDrop={onDrop}
            className="rounded-md border-2 border-dashed border-white/15 bg-white/5 p-4 text-center text-sm text-slate-300"
          >
            Drag and drop images here, or
            <button
              onClick={() => inputRef.current?.click()}
              className="ml-1 px-2 py-1 rounded-md border border-white/10 bg-white/10 hover:bg-white/20 text-white"
            >Browse</button>
            <div className="mt-1 text-xs text-slate-500">Allowed: JPG, PNG, WEBP • Max {maxSizeMB}MB each • Up to {remaining} more</div>
            <input
              ref={inputRef}
              type="file"
              accept={accept.join(',')}
              multiple
              className="hidden"
              onChange={onSelectFiles}
            />
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <Modal open={true} onClose={() => setPreview(null)} title={preview.name}>
          <div className="p-2">
            <img src={preview.url} alt={preview.name} className="max-h-[70vh] w-auto mx-auto rounded-md" />
          </div>
        </Modal>
      )}

      {/* Footnote */}
      <div className="mt-3 text-[11px] text-slate-400">
        Uploaded files are stored securely. Large images may be resized by the server. Each file must be ≤ {maxSizeMB}MB. Total limit: {maxCount} files.
      </div>
    </div>
  )
}

export default AttachmentsManager
