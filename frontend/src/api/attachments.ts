import { api } from './client'

export type RepairAttachment = {
  id: string
  repairOrderId: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  createdAt?: string
}

export async function listAttachments(repairOrderId: string) {
  const res = await api.get(`/repairs/${repairOrderId}/attachments`)
  return (res.data?.attachments || []) as RepairAttachment[]
}

export async function uploadAttachments(repairOrderId: string, files: File[]) {
  const form = new FormData()
  files.forEach((f) => form.append('attachments', f))
  const res = await api.post(`/repairs/${repairOrderId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return (res.data?.attachments || []) as RepairAttachment[]
}

export async function deleteAttachment(repairOrderId: string, attachmentId: string) {
  await api.delete(`/repairs/${repairOrderId}/attachments/${attachmentId}`)
}

export function getUploadsBaseUrl() {
  // api baseURL likely ends with /api; strip it to form uploads origin
  const base = (api.defaults.baseURL || '').toString()
  return base.replace(/\/?api\/?$/, '') || ''
}
