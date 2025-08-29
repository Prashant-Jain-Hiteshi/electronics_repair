import { api } from './client'

export type BasicUser = {
  id: string
  mobile: string
  role: 'admin' | 'technician' | 'customer'
  firstName: string
  lastName: string
  address?: string | null
  avatarUrl?: string | null
}

export async function getMyUser(): Promise<BasicUser> {
  const { data } = await api.get('/users/me')
  return data.user
}

export async function updateMyUser(payload: Partial<Pick<BasicUser, 'firstName'|'lastName'|'address'|'mobile'>>): Promise<BasicUser> {
  const { data } = await api.put('/users/me', payload)
  return data.user
}

export async function uploadMyAvatar(file: File): Promise<BasicUser> {
  const form = new FormData()
  form.append('avatar', file)
  const { data } = await api.post('/users/me/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.user
}
