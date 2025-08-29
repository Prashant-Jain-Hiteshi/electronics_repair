import React, { useEffect, useMemo, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { latestRunForRepair, listTemplates, startRun, submitStep, completeRun, abortRun, type DiagnosticRun, type DiagnosticTemplate } from '@/api/diagnostics'
import { api } from '@/api/client'

const Section: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> = ({ title, children, right }) => (
  <div className="rounded-xl border bg-white shadow-sm">
    <div className="flex items-center justify-between px-4 py-3 border-b">
      <h3 className="font-medium text-slate-800">{title}</h3>
      {right}
    </div>
    <div className="p-4">{children}</div>
  </div>
)

const Pill: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'emerald' }) => (
  <span className={`inline-flex items-center rounded-full bg-${color}-100 text-${color}-700 px-2 py-0.5 text-xs`}>{children}</span>
)

export default function RepairWizard() {
  const { id: repairId } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<DiagnosticTemplate[]>([])
  const [run, setRun] = useState<DiagnosticRun | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const currentIndex = run?.progress?.currentIndex ?? 0
  const currentStep: any = useMemo(() => {
    if (!run) return null
    return run.steps?.[currentIndex] ?? null
  }, [run, currentIndex])

  useEffect(() => {
    if (!repairId) return
    let mounted = true
    async function boot() {
      setLoading(true)
      setError(null)
      try {
        // Try latest run
        try {
          const r = await latestRunForRepair(repairId)
          if (mounted) setRun(r)
        } catch {
          // No runs yet: fetch templates to offer selection
          const rep = await api.get(`/repairs/${repairId}`)
          const deviceType = rep?.data?.repair?.deviceType
          const tpls = await listTemplates({ deviceType })
          if (mounted) setTemplates(tpls)
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load diagnostics')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    boot()
    return () => { mounted = false }
  }, [repairId])

  async function handleStart(templateId?: string) {
    if (!repairId) return
    setSaving(true)
    try {
      const r = await startRun(repairId, templateId ? { templateId } : undefined)
      setRun(r)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to start diagnostic')
    } finally {
      setSaving(false)
    }
  }

  async function handleAnswer(answer: any, nextIndex?: number) {
    if (!run) return
    setSaving(true)
    try {
      const updated = await submitStep(run.id, { answer, nextIndex })
      setRun(updated)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to submit step')
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete() {
    if (!run) return
    setSaving(true)
    try {
      const updated = await completeRun(run.id)
      setRun(updated)
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'success', message: 'Diagnostics completed. You can now order parts.' } }))
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to complete run')
    } finally { setSaving(false) }
  }

  async function handleAbort() {
    if (!run) return
    setSaving(true)
    try {
      const updated = await abortRun(run.id)
      setRun(updated)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to abort run')
    } finally { setSaving(false) }
  }

  if (!repairId) return <Navigate to="/technician" replace />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500"><Link to="/technician" className="hover:underline">Technician</Link> / <span className="text-slate-700">Repair</span></div>
          <h1 className="text-xl font-semibold text-slate-800">Guided Diagnostics</h1>
        </div>
        <div className="text-sm text-slate-600">Repair ID: <code>{repairId}</code></div>
      </div>

      {loading && <div className="rounded-xl border bg-white p-4">Loading...</div>}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm">{error}</div>
      )}

      {!loading && !run && (
        <Section title="Start Diagnostics" right={<Pill>Setup</Pill>}>
          {templates.length === 0 ? (
            <div className="text-sm text-slate-600">
              No template matched this device. You can still try auto-select based on device type.
              <div className="mt-3">
                <button disabled={saving} onClick={() => handleStart(undefined)} className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm hover:bg-emerald-700 disabled:opacity-50">Auto-select Template</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-slate-700">Select a template to begin:</div>
              <div className="grid sm:grid-cols-2 gap-3">
                {templates.map(t => (
                  <div key={t.id} className="rounded-lg border p-3">
                    <div className="font-medium text-slate-800">{t.name}</div>
                    <div className="text-xs text-slate-500">Device: {t.deviceType}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-xs text-slate-500">{t.steps.length} steps</div>
                      <button disabled={saving} onClick={() => handleStart(t.id)} className="rounded-md bg-emerald-600 text-white px-3 py-1 text-xs hover:bg-emerald-700 disabled:opacity-50">Start</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {!!run && (
        <>
          <Section title="Progress" right={<Pill>{run.status}</Pill>}>
            <div className="text-sm text-slate-700">Step {currentIndex + 1} of {run.steps.length}</div>
            <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Math.round(((currentIndex) / Math.max(1, run.steps.length)) * 100))}%` }} />
            </div>
          </Section>

          <Section title="Step">
            {!currentStep ? (
              <div className="text-sm text-slate-600">No current step. {run.status === 'in_progress' ? 'You can complete the run.' : 'Run is not active.'}</div>
            ) : (
              <StepRenderer
                step={currentStep}
                value={run.progress?.answers?.[currentIndex]}
                onSubmit={(answer: any, nextIndex?: number) => handleAnswer(answer, nextIndex)}
                disabled={saving || run.status !== 'in_progress'}
              />
            )}

            <div className="mt-4 flex items-center gap-2">
              <button disabled={saving || run.status !== 'in_progress'} onClick={handleComplete} className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm hover:bg-emerald-700 disabled:opacity-50">Mark Complete</button>
              <button disabled={saving || run.status !== 'in_progress'} onClick={handleAbort} className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50">Abort</button>
              <Link to={`/technician`} className="ml-auto rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50">Back to Dashboard</Link>
            </div>
          </Section>
        </>
      )}
    </div>
  )
}

function StepRenderer({ step, value, onSubmit, disabled }: { step: any; value: any; onSubmit: (answer: any, nextIndex?: number) => void; disabled?: boolean }) {
  const [answer, setAnswer] = useState<any>(value ?? '')
  useEffect(() => { setAnswer(value ?? '') }, [value])

  // Generic schema support
  const kind = step?.type || step?.kind || 'question'
  const title = step?.title || step?.label || 'Diagnostic Step'
  const description = step?.description || step?.text || ''
  const options: Array<{ value: any; label: string; nextIndex?: number }> = Array.isArray(step?.options) ? step.options : []

  return (
    <div className="space-y-3">
      <div>
        <div className="font-medium text-slate-800">{title}</div>
        {description && <div className="text-sm text-slate-600">{description}</div>}
      </div>

      {options.length > 0 ? (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-sm">
              <input type="radio" name="ans" disabled={disabled} checked={answer === opt.value} onChange={() => setAnswer(opt.value)} />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      ) : (
        <textarea
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Type your observations/measurements..."
          disabled={disabled}
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          rows={4}
        />
      )}

      <div className="pt-1">
        {options.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {options.map((opt, i) => (
              <button
                key={i}
                disabled={disabled}
                onClick={() => onSubmit(opt.value, typeof opt.nextIndex === 'number' ? opt.nextIndex : undefined)}
                className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <button disabled={disabled} onClick={() => onSubmit(answer)} className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm hover:bg-emerald-700 disabled:opacity-50">Save & Next</button>
        )}
      </div>
    </div>
  )
}
