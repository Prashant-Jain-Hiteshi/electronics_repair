import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getMyUser, updateMyUser, uploadMyAvatar } from '@/api/users'

const CustomerProfile: React.FC = () => {
  const { user, fetchMe } = useAuth()
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')
  const [address, setAddress] = useState(user?.address || '')
  const [mobile, setMobile] = useState(user?.mobile || '')
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)

  const initials = useMemo(() => {
    const f = firstName?.[0] || ''
    const l = lastName?.[0] || ''
    return (f + l).toUpperCase() || 'C'
  }, [firstName, lastName])

  useEffect(() => {
    // refresh from server on mount
    let alive = true
    ;(async () => {
      try {
        const u = await getMyUser()
        if (!alive) return
        setFirstName(u.firstName || '')
        setLastName(u.lastName || '')
        setAddress(u.address || '')
        setMobile((u as any).mobile || '')
        setAvatarUrl((u as any).avatarUrl || null)
      } catch {}
    })()
    return () => { alive = false }
  }, [])

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await updateMyUser({ firstName, lastName, address, mobile })
      await fetchMe()
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'success', message: 'Profile updated' } }))
      setEditMode(false)
    } catch (err) {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: 'Failed to update profile' } }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="text-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-900">My Profile</h1>
        {!editMode ? (
          <button type="button" className="rounded-md border px-3 py-2 text-slate-800 hover:bg-slate-50" onClick={() => setEditMode(true)}>Update Profile</button>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-md border px-3 py-2 hover:bg-slate-50" onClick={() => { setFirstName(user?.firstName || ''); setLastName(user?.lastName || ''); setAddress(user?.address || ''); setMobile(user?.mobile || ''); setEditMode(false) }}>Cancel</button>
            <button disabled={saving} className="rounded-md bg-emerald-600 text-white px-4 py-2 disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        )}
      </div>
      {/* Identity card */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarPreview || avatarUrl ? (
              <img
                src={avatarPreview || avatarUrl || ''}
                alt="avatar"
                className="size-14 rounded-full object-cover border border-slate-200 cursor-pointer"
                onClick={() => setViewerOpen(true)}
              />
            ) : (
              <div
                className="size-14 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-lg font-semibold text-emerald-800 cursor-pointer"
                onClick={() => setViewerOpen(true)}
              >
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 size-7 rounded-full bg-emerald-600 text-white border border-emerald-200 shadow flex items-center justify-center"
              title="Change photo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M9 3a1 1 0 0 0-.894.553L7.382 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2.382l-.724-1.447A1 1 0 0 0 13 3H9zm3 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const url = URL.createObjectURL(file)
                setAvatarPreview(url)
                try {
                  await uploadMyAvatar(file)
                  await fetchMe()
                  const u2 = await getMyUser()
                  setAvatarUrl((u2 as any).avatarUrl || null)
                  window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'success', message: 'Avatar updated' } }))
                } catch {
                  window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: 'Failed to upload avatar' } }))
                }
              }}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{firstName || '—'} {lastName || ''}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">Customer</span>
            </div>
            <div className="text-sm text-slate-600 mt-0.5">{mobile ? `+91 ${mobile}` : 'Phone not set'}</div>
          </div>
        </div>
      </div>

      {/* Image viewer */}
      {viewerOpen && (avatarPreview || avatarUrl) && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setViewerOpen(false)}>
          <img src={avatarPreview || avatarUrl || ''} alt="avatar" className="max-w-[90vw] max-h-[85vh] object-contain" />
        </div>
      )}

      <form onSubmit={onSave} className="space-y-6 max-w-3xl">
        <div>
          <label className="block text-sm mb-1">First Name</label>
          <input value={firstName} onChange={e=>setFirstName(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="John" disabled={!editMode} />
        </div>
        <div>
          <label className="block text-sm mb-1">Last Name</label>
          <input value={lastName} onChange={e=>setLastName(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="Doe" disabled={!editMode} />
        </div>
        <div>
          <label className="block text-sm mb-1">Phone</label>
          <input value={mobile} onChange={e=>setMobile(e.target.value.replace(/\D/g, '').slice(0,10))} className="w-full rounded-md border px-3 py-2" placeholder="10-digit mobile" disabled={!editMode} />
          <p className="text-xs text-slate-500 mt-1">Use 10 digits</p>
        </div>
        <div>
          <label className="block text-sm mb-1">Address</label>
          <input value={address ?? ''} onChange={e=>setAddress(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="Address" disabled={!editMode} />
        </div>
        {editMode && (
          <button disabled={saving} className="rounded-md bg-emerald-600 text-white px-4 py-2 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </form>
    </div>
  )
}

export default CustomerProfile
