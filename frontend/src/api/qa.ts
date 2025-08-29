import { api } from './client'

export type ChecklistItem = { id: string; label: string; pass: boolean; notes?: string }
export type ChecklistState = {
  checklist: ChecklistItem[] | null
  checklistPassed: boolean | null
  checklistByUserId: string | null
  checklistAt: string | null
  qaRequired: boolean
  qaApproved: boolean | null
  qaByUserId: string | null
  qaAt: string | null
  qaNotes: string | null
}

export async function getChecklist(repairId: string): Promise<ChecklistState> {
  const { data } = await api.get(`/repairs/${repairId}/checklist`)
  return data as ChecklistState
}

export async function submitChecklist(repairId: string, passed: boolean, checklist?: ChecklistItem[]) {
  const { data } = await api.post(`/repairs/${repairId}/checklist`, { passed, checklist })
  return data as Pick<ChecklistState, 'checklist'|'checklistPassed'|'checklistByUserId'|'checklistAt'>
}

export async function qaSignOff(repairId: string, approved: boolean, notes?: string) {
  const { data } = await api.post(`/repairs/${repairId}/qa/signoff`, { approved, notes })
  return data as Pick<ChecklistState, 'qaApproved'|'qaByUserId'|'qaAt'|'qaNotes'>
}

export async function setQaRequired(repairId: string, required: boolean) {
  const { data } = await api.put(`/repairs/${repairId}/qa/required`, { required })
  return data as Pick<ChecklistState, 'qaRequired'>
}
