import { api } from './client'

export type WorkLog = {
  id: string
  repairOrderId: string
  technicianId: string
  taskType: string
  benchId?: string | null
  startTime: string
  endTime?: string | null
  notes?: string | null
  status: 'running' | 'completed' | 'aborted'
}

export async function startWorkLog(payload: { repairOrderId: string; taskType: string; benchId?: string; notes?: string }) {
  const res = await api.post('/worklogs', payload)
  return res.data.log as WorkLog
}

export async function stopWorkLog(id: string) {
  const res = await api.post(`/worklogs/${id}/stop`)
  return res.data.log as WorkLog
}

export async function abortWorkLog(id: string) {
  const res = await api.post(`/worklogs/${id}/abort`)
  return res.data.log as WorkLog
}

export async function activeWorkLog(repairOrderId: string) {
  const res = await api.get(`/worklogs/active/${repairOrderId}`)
  return res.data.log as WorkLog | null
}

export async function listWorkLogs(params?: { repairOrderId?: string; technicianId?: string; status?: string; from?: string; to?: string }) {
  const res = await api.get('/worklogs', { params })
  return res.data.logs as WorkLog[]
}

export async function reportProductiveHours(params?: { from?: string; to?: string; technicianId?: string }) {
  const res = await api.get('/worklogs/reports/productive-hours', { params })
  return res.data as { window: { from: string; to: string }; totalsMs: Record<string, number> }
}

export async function reportBenchUtilization(params?: { from?: string; to?: string; benchId?: string }) {
  const res = await api.get('/worklogs/reports/bench-utilization', { params })
  return res.data as { window: { from: string; to: string }; utilization: Record<string, number> }
}
