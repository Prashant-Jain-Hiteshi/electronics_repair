import { api } from './client'

export type TechnicianProfile = {
  id: string
  userId: string
  skills: string[]
  dailyCapacity: number
  timezone?: string | null
  color?: string | null
}

export async function getMyTechnicianProfile(): Promise<TechnicianProfile | null> {
  const { data } = await api.get('/technicians/me')
  return data.profile ?? null
}

export async function upsertMyTechnicianProfile(payload: Partial<Omit<TechnicianProfile, 'id'|'userId'>>): Promise<TechnicianProfile> {
  const { data } = await api.put('/technicians/me', payload)
  return data.profile
}
