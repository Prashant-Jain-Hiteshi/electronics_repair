import { api } from './client'

export type DiagnosticTemplate = {
  id: string
  name: string
  deviceType: string
  steps: any[]
  isActive: boolean
}

export type DiagnosticRun = {
  id: string
  repairOrderId: string
  templateId: string | null
  steps: any[]
  progress: { currentIndex: number; answers: Record<string, any> }
  status: 'in_progress' | 'completed' | 'aborted'
  startedByUserId: string
  completedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export async function listTemplates(params?: { deviceType?: string; includeInactive?: boolean }) {
  const res = await api.get('/diagnostics/templates', { params })
  return res.data.templates as DiagnosticTemplate[]
}

export async function startRun(repairId: string, payload?: { templateId?: string }) {
  const res = await api.post(`/diagnostics/repairs/${repairId}/runs`, payload || {})
  return res.data.run as DiagnosticRun
}

export async function listRunsForRepair(repairId: string) {
  const res = await api.get(`/diagnostics/repairs/${repairId}/runs`)
  return res.data.runs as DiagnosticRun[]
}

export async function latestRunForRepair(repairId: string) {
  const res = await api.get(`/diagnostics/repairs/${repairId}/runs/latest`)
  return res.data.run as DiagnosticRun
}

export async function submitStep(runId: string, payload: { answer: any; nextIndex?: number }) {
  const res = await api.post(`/diagnostics/runs/${runId}/step`, payload)
  return res.data.run as DiagnosticRun
}

export async function completeRun(runId: string) {
  const res = await api.post(`/diagnostics/runs/${runId}/complete`)
  return res.data.run as DiagnosticRun
}

export async function abortRun(runId: string) {
  const res = await api.post(`/diagnostics/runs/${runId}/abort`)
  return res.data.run as DiagnosticRun
}
