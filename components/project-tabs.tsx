"use client"
import { useState } from 'react'
import { Tabs } from '@/components/ui/tabs'
import { ProjectBoard } from '@/components/project-board'
import { ProjectMedia } from '@/components/project-media'
import { CredentialsPanel } from '@/components/credentials-panel'
import { TaskList } from '@/components/task-list'
import { InlineEdit } from '@/components/inline-edit'

type UserLite = { id: string; name: string | null; email: string | null; image: string | null }
type TaskLite = {
  id: string
  title: string
  description?: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  dueDate?: string | Date | null
  assignedToId?: string | null
  assignedTo?: UserLite | null
  timesheets?: { hours: any }[]
}

export function ProjectTabs({ projectId, tasks, overdue }: { projectId: string; tasks: TaskLite[]; overdue: TaskLite[] }) {
  const [active, setActive] = useState('board')
  const [description, setDescription] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [healthAuto, setHealthAuto] = useState(true)
  const [health, setHealth] = useState<'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK'>(() => computeHealth(tasks))

  // On mount, fetch minimal project info for description + health
  // Using GET on the page already loaded data would be nicer, but we keep it minimal.
  if (typeof window !== 'undefined' && !loaded) {
    setLoaded(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, { cache: 'no-store' })
        if (res.ok) {
          const p = await res.json()
          setDescription(p.description || '')
          if (p.health) setHealth(p.health)
          if (typeof p.healthAuto === 'boolean') setHealthAuto(p.healthAuto)
        }
      } catch {}
    })()
  }

  return (
    <div className="mt-2">
      <Tabs
        tabs={[
          { key: 'overview', label: 'Overview', icon: iconOverview },
          { key: 'list', label: 'List', icon: iconList },
          { key: 'board', label: 'Board', icon: iconBoard },
          { key: 'files', label: 'Files', icon: iconFiles },
          { key: 'credentials', label: 'Credentials', icon: iconKey },
        ]}
        initial={active}
        onChange={setActive}
      />

      {active === 'overview' && (
        <div className="py-4 space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 text-sm font-semibold">Description</div>
                <InlineEdit
                  value={description || ''}
                  placeholder="Click to add a short project description..."
                  onSave={async (val) => {
                    setDescription(val)
                    await fetch(`/api/projects/${projectId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ description: val }),
                    })
                  }}
                />
              </div>
            </div>
            <div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 text-sm font-semibold">Status</div>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 text-sm ${healthColor(health)}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${healthDot(health)}`} />
                    <span>{healthLabel(health)}</span>
                  </div>
                  <label className="text-xs text-white/70 flex items-center gap-2">
                    <input type="checkbox" checked={healthAuto} onChange={async (e) => {
                      const v = e.target.checked
                      setHealthAuto(v)
                      const newHealth = v ? computeHealth(tasks) : health
                      if (v) setHealth(newHealth)
                      await fetch(`/api/projects/${projectId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ healthAuto: v, health: newHealth }),
                      })
                    }} />
                    Auto
                  </label>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {(['ON_TRACK','AT_RISK','OFF_TRACK'] as const).map((h) => (
                    <button
                      key={h}
                      className={`text-xs rounded px-2 py-1 border ${health === h ? 'border-white/30 bg-white/10' : 'border-white/10 hover:bg-white/5'} ${healthColor(h)}`}
                      onClick={async () => {
                        setHealth(h)
                        setHealthAuto(false)
                        await fetch(`/api/projects/${projectId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ health: h, healthAuto: false }),
                        })
                      }}
                    >
                      {healthLabel(h)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {overdue.length === 0 ? (
            <div className="text-sm text-white/70">No overdue tasks. Looking good! ✨</div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 text-sm font-semibold">Overdue Tasks</div>
              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {overdue.slice(0, 9).map((t) => (
                  <li key={t.id} className="rounded-md border border-white/10 bg-white/5 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate" title={t.title}>{t.title}</div>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                        t.priority === 'HIGH' ? 'bg-rose-500/20 text-rose-200' : t.priority === 'MEDIUM' ? 'bg-amber-500/20 text-amber-200' : 'bg-emerald-500/20 text-emerald-200'
                      }`}>{t.priority}</span>
                    </div>
                    {t.dueDate && <div className="text-xs text-white/60">Due {new Date(t.dueDate).toLocaleDateString()}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {active === 'list' && (
        <div className="py-4">
          <TaskList tasks={tasks as any} />
        </div>
      )}

      {active === 'board' && (
        <div className="py-4">
          <ProjectBoard projectId={projectId} initialTasks={tasks as any} />
        </div>
      )}

      {active === 'files' && (
        <div className="py-4">
          <ProjectMedia projectId={projectId} />
        </div>
      )}

      {active === 'credentials' && (
        <div className="py-4">
          <CredentialsPanel projectId={projectId} />
        </div>
      )}
    </div>
  )
}

const iconOverview = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

const iconList = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 6h12M9 12h12M9 18h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="4" cy="6" r="1.5" fill="currentColor"/>
    <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="4" cy="18" r="1.5" fill="currentColor"/>
  </svg>
)

const iconBoard = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="6" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="10.5" y="4" width="4.5" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="16.5" y="4" width="4.5" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

const iconFiles = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

function computeHealth(tasks: TaskLite[]) {
  const today = new Date()
  const total = tasks.length || 1
  const overdue = tasks.filter((t) => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < today)
  const ratio = overdue.length / total
  const hasHigh = overdue.some((t) => t.priority === 'HIGH')
  if (ratio > 0.4 || (hasHigh && ratio > 0.2)) return 'OFF_TRACK'
  if (ratio > 0.15 || hasHigh) return 'AT_RISK'
  return 'ON_TRACK'
}

function healthLabel(h: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK') {
  if (h === 'ON_TRACK') return 'On Track'
  if (h === 'AT_RISK') return 'At Risk'
  return 'Off Track'
}

function healthDot(h: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK') {
  if (h === 'ON_TRACK') return 'bg-emerald-400'
  if (h === 'AT_RISK') return 'bg-amber-400'
  return 'bg-rose-400'
}

function healthColor(h: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK') {
  if (h === 'ON_TRACK') return 'text-emerald-200'
  if (h === 'AT_RISK') return 'text-amber-200'
  return 'text-rose-200'
}

const iconKey = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M11 12h9M17 12v4M20 12v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)
