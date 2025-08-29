import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getMyUser, updateMyUser, uploadMyAvatar } from '@/api/users'
import { getMyTechnicianProfile, upsertMyTechnicianProfile, TechnicianProfile } from '@/api/technicians'

const TechnicianProfilePage: React.FC = () => {
  const { user, fetchMe } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // Basic user fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [address, setAddress] = useState('')
  const [mobile, setMobile] = useState('')
  const [initialUser, setInitialUser] = useState({ firstName: '', lastName: '', address: '', mobile: '' })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)

  // Technician fields
  const [skillsInput, setSkillsInput] = useState('')
  const [dailyCapacity, setDailyCapacity] = useState<number>(3)
  const [timezone, setTimezone] = useState<string>('')
  const [color, setColor] = useState<string>('')
  const [initialTech, setInitialTech] = useState({ skillsInput: '', dailyCapacity: 3, timezone: '', color: '' })
  const [newSkill, setNewSkill] = useState('')

  const skills = useMemo(() => skillsInput.split(',').map(s => s.trim()).filter(Boolean), [skillsInput])

  const initials = useMemo(() => {
    const f = firstName?.[0] || ''
    const l = lastName?.[0] || ''
    return (f + l).toUpperCase() || 'T'
  }, [firstName, lastName])

  const addSkill = useCallback((value: string) => {
    const v = value.trim()
    if (!v) return
    const set = new Set(skills)
    set.add(v)
    setSkillsInput(Array.from(set).join(', '))
  }, [skills])

  const removeSkill = useCallback((value: string) => {
    const next = skills.filter(s => s.toLowerCase() !== value.toLowerCase())
    setSkillsInput(next.join(', '))
  }, [skills])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [u, p] = await Promise.all([getMyUser(), getMyTechnicianProfile()])
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
        setInitialUser({ firstName: f, lastName: l, address: a, mobile: m })
        if (p) {
          const si = (p.skills || []).join(', ')
          const dc = p.dailyCapacity ?? 3
          const tz = p.timezone || ''
          const c = p.color || ''
          setSkillsInput(si)
          setDailyCapacity(dc)
          setTimezone(tz)
          setColor(c)
          setInitialTech({ skillsInput: si, dailyCapacity: dc, timezone: tz, color: c })
        }
      } catch (e) {
        // noop
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
      await Promise.all([
        updateMyUser({ firstName, lastName, address, mobile }),
        upsertMyTechnicianProfile({ skills, dailyCapacity, timezone, color }),
      ])
      await fetchMe()
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'success', message: 'Profile updated' } }))
      setEditMode(false)
      setInitialUser({ firstName, lastName, address, mobile })
      setInitialTech({ skillsInput, dailyCapacity, timezone, color })
    } catch (e) {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: 'Failed to update profile' } }))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-white">Loading...</div>

  return (
    <div className="text-white">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Profile</h1>
        {!editMode ? (
          <button type="button" onClick={() => setEditMode(true)} className="rounded-md border border-white/10 px-3 py-2 hover:bg-white/5">Update Profile</button>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-md border border-white/10 px-3 py-2 hover:bg-white/5" onClick={() => { setFirstName(initialUser.firstName); setLastName(initialUser.lastName); setAddress(initialUser.address); setSkillsInput(initialTech.skillsInput); setDailyCapacity(initialTech.dailyCapacity); setTimezone(initialTech.timezone); setColor(initialTech.color); setEditMode(false) }}>Cancel</button>
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
            {/* Camera icon */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 size-7 rounded-full bg-[#A48AFB] text-white border border-white/20 shadow flex items-center justify-center"
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
                  const u = await getMyUser()
                  setAvatarUrl((u as any).avatarUrl || null)
                  window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'success', message: 'Avatar updated' } }))
                } catch {
                  window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: 'Failed to upload avatar' } }))
                }
              }}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{firstName || '—'} {lastName || ''}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10">Technician</span>
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
        <section className="space-y-4">
          <h2 className="font-semibold">Basic Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1 text-slate-300">Address</label>
              <input value={address ?? ''} onChange={e=>setAddress(e.target.value)} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white" disabled={!editMode} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold">Technician Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1 text-slate-300">Skills (comma separated)</label>
              {/* Chip editor */}
              {!editMode ? (
                <div className="flex flex-wrap gap-2">
                  {skills.length ? skills.map(s => (
                    <span key={s} className="px-2 py-1 rounded-full bg-white/10 border border-white/10 text-sm">{s}</span>
                  )) : <span className="text-slate-400 text-sm">No skills added</span>}
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {skills.map(s => (
                      <button type="button" key={s} onClick={() => removeSkill(s)} className="group flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/10 text-sm hover:bg-white/15">
                        <span>{s}</span>
                        <span className="opacity-60 group-hover:opacity-100">×</span>
                      </button>
                    ))}
                  </div>
                  <input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        addSkill(newSkill.replace(/,$/, ''))
                        setNewSkill('')
                      }
                    }}
                    placeholder="Type a skill and press Enter"
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm mb-1 text-slate-300">Daily Capacity</label>
              <input type="number" min={1} max={20} value={dailyCapacity} onChange={e=>setDailyCapacity(Number(e.target.value) || 0)} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white" disabled={!editMode} />
            </div>
            <div>
              <label className="block text-sm mb-1 text-slate-300">Timezone</label>
              <input value={timezone} onChange={e=>setTimezone(e.target.value)} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white" placeholder="e.g. America/New_York" disabled={!editMode} />
            </div>
            <div>
              <label className="block text-sm mb-1 text-slate-300">Color</label>
              <input value={color} onChange={e=>setColor(e.target.value)} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white" placeholder="#A48AFB or a name" disabled={!editMode} />
            </div>
          </div>
        </section>

        {editMode && (
          <button disabled={saving} className="rounded-md bg-[#A48AFB] text-white px-4 py-2 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </form>
    </div>
  )
}

export default TechnicianProfilePage
