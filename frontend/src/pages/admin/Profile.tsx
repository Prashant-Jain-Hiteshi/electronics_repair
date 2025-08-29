import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getMyUser, updateMyUser, uploadMyAvatar } from '@/api/users'

const AdminProfile: React.FC = () => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [address, setAddress] = useState('')
  const [mobile, setMobile] = useState('')
  const [initial, setInitial] = useState({ firstName: '', lastName: '', address: '', mobile: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)

  const initials = useMemo(() => {
    const f = firstName?.[0] || ''
    const l = lastName?.[0] || ''
    return (f + l).toUpperCase() || 'A'
  }, [firstName, lastName])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const u = await getMyUser()
        if (!alive) return
        const f = u.firstName || ''
        const l = u.lastName || ''
        const a = u.address || ''
        const m = (u as any).mobile || ''
        const av = (u as any).avatarUrl || null
        setFirstName(f)
        setLastName(l)
        setAddress(a)
        setMobile(m)
        setAvatarUrl(av)
        setInitial({ firstName: f, lastName: l, address: a, mobile: m })
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateMyUser({ firstName, lastName, address, mobile })
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'success', message: 'Profile updated' } }))
      setEditMode(false)
      setInitial({ firstName, lastName, address, mobile })
    } catch (e) {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: 'Failed to update profile' } }))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-white">Loading...</div>

  return (
    <div className="text-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">My Profile</h1>
        {!editMode ? (
          <button type="button" onClick={() => setEditMode(true)} className="rounded-md border border-white/10 px-3 py-2 hover:bg-white/5">Update Profile</button>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-md border border-white/10 px-3 py-2 hover:bg-white/5" onClick={() => { setFirstName(initial.firstName); setLastName(initial.lastName); setAddress(initial.address); setMobile(initial.mobile); setEditMode(false) }}>Cancel</button>
            <button disabled={saving} className="rounded-md bg-[#A48AFB] text-white px-4 py-2 disabled:opacity-60">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        )}
      </div>
      {/* Identity card */}
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarPreview || avatarUrl ? (
              <img
                src={avatarPreview || avatarUrl || ''}
                alt="avatar"
                className="size-14 rounded-full object-cover border border-white/10 cursor-pointer"
                onClick={() => setViewerOpen(true)}
              />
            ) : (
              <div
                className="size-14 rounded-full bg-[#A48AFB]/20 border border-white/10 flex items-center justify-center text-lg font-semibold cursor-pointer"
                onClick={() => setViewerOpen(true)}
              >
                {initials}
              </div>
            )}
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 size-7 rounded-full bg-[#A48AFB] text-white border border-white/20 shadow flex items-center justify-center"
                title="Change photo"
              >
                {/* camera icon */}
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
                    window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'success', message: 'Avatar updated' } }))
                  } catch {
                    window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: 'Failed to upload avatar' } }))
                  }
                }}
              />
            </>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{firstName || '—'} {lastName || ''}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10">Admin</span>
            </div>
            <div className="text-sm text-slate-300 mt-0.5">{mobile ? `+91 ${mobile}` : 'Phone not set'}</div>
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
          <label className="block text-sm mb-1 text-slate-300">First Name</label>
          <input value={firstName} onChange={e=>setFirstName(e.target.value)} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white" disabled={!editMode} />
        </div>
        <div>
          <label className="block text-sm mb-1 text-slate-300">Last Name</label>
          <input value={lastName} onChange={e=>setLastName(e.target.value)} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white" disabled={!editMode} />
        </div>
        <div>
          <label className="block text-sm mb-1 text-slate-300">Phone</label>
          <input value={mobile} onChange={e=>setMobile(e.target.value.replace(/\D/g,'').slice(0,10))} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white" placeholder="10-digit mobile" disabled={!editMode} />
          <p className="text-xs text-slate-400 mt-1">Use 10 digits</p>
        </div>
        <div>
          <label className="block text-sm mb-1 text-slate-300">Address</label>
          <input value={address ?? ''} onChange={e=>setAddress(e.target.value)} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white" disabled={!editMode} />
        </div>
        {editMode && (
          <button disabled={saving} className="rounded-md bg-[#A48AFB] text-white px-4 py-2 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </form>
    </div>
  )
}

export default AdminProfile
