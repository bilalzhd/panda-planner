"use client"
import { useMemo, useState } from 'react'
import { Dialog, DialogFooter, DialogHeader } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AccessLevel = 'READ' | 'EDIT'

type ManagedUser = {
  id: string
  name: string | null
  email: string | null
  isSuperAdmin?: boolean
  accesses: { projectId: string; projectName?: string | null; accessLevel: AccessLevel }[]
  permissions: {
    canAccessUsers: boolean
    canCreateUsers: boolean
    canEditUsers: boolean
    canDeleteUsers: boolean
  }
}

type ProjectInfo = { id: string; name: string }

type Capability = {
  isSuperAdmin: boolean
  canAccessUsers: boolean
  canCreateUsers: boolean
  canEditUsers: boolean
  canDeleteUsers: boolean
}

type FormState = {
  id?: string
  name: string
  email: string
  projects: Record<string, { enabled: boolean; level: AccessLevel }>
  permissions: {
    canAccessUsers: boolean
    canCreateUsers: boolean
    canEditUsers: boolean
    canDeleteUsers: boolean
  }
}

const emptyPermissions = {
  canAccessUsers: false,
  canCreateUsers: false,
  canEditUsers: false,
  canDeleteUsers: false,
}

const buildProjectState = (projects: ProjectInfo[], user?: ManagedUser) => {
  const state: Record<string, { enabled: boolean; level: AccessLevel }> = {}
  projects.forEach((p) => {
    state[p.id] = { enabled: false, level: 'READ' }
  })
  if (user) {
    user.accesses.forEach((acc) => {
      state[acc.projectId] = { enabled: true, level: acc.accessLevel }
    })
  }
  return state
}

function createFormState(projects: ProjectInfo[], user?: ManagedUser): FormState {
  return {
    id: user?.id,
    name: user?.name || '',
    email: user?.email || '',
    projects: buildProjectState(projects, user),
    permissions: user ? { ...emptyPermissions, ...user.permissions } : { ...emptyPermissions },
  }
}

export function UserManagement({
  initialUsers,
  projects,
  capability,
  currentUserId,
}: {
  initialUsers: ManagedUser[]
  projects: ProjectInfo[]
  capability: Capability
  currentUserId: string
}) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(() => createFormState(projects))

  function openCreate() {
    setError(null)
    setForm(createFormState(projects))
    setDialogOpen(true)
  }

  function openEdit(user: ManagedUser) {
    setError(null)
    setForm(createFormState(projects, user))
    setDialogOpen(true)
  }

  const payloadProjects = useMemo(() => {
    return Object.entries(form.projects)
      .filter(([, cfg]) => cfg.enabled)
      .map(([projectId, cfg]) => ({ projectId, accessLevel: cfg.level }))
  }, [form.projects])

  async function refresh() {
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to refresh users')
      const data = await res.json()
      setUsers(Array.isArray(data?.users) ? data.users : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to refresh users')
    }
  }

  async function submit() {
    if (!form.email.trim()) {
      setError('Email is required')
      return
    }
    setLoading(true)
    setError(null)
    const body = {
      name: form.name.trim() || null,
      email: form.email.trim(),
      projectAccesses: payloadProjects,
      permissions: { ...form.permissions },
    }
    const url = form.id ? `/api/admin/users/${form.id}` : '/api/admin/users'
    const method = form.id ? 'PATCH' : 'POST'
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        let msg = 'Failed to save user'
        try {
          const data = await res.json()
          if (typeof data?.error === 'string') msg = data.error
        } catch {}
        throw new Error(msg)
      }
      await refresh()
      setDialogOpen(false)
      setForm(createFormState(projects))
    } catch (e: any) {
      setError(e?.message || 'Failed to save user')
    } finally {
      setLoading(false)
    }
  }

  async function deleteUser(target: ManagedUser) {
    const confirmed = window.confirm(`Delete ${target.name || target.email || 'this user'}? This cannot be undone.`)
    if (!confirmed) return
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${target.id}`, { method: 'DELETE' })
      if (!res.ok) {
        let msg = 'Failed to delete user'
        try {
          const data = await res.json()
          if (typeof data?.error === 'string') msg = data.error
        } catch {}
        throw new Error(msg)
      }
      await refresh()
    } catch (e: any) {
      setError(e?.message || 'Failed to delete user')
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <div className="text-sm font-semibold">Team Members</div>
          <p className="text-xs text-white/60">Assign projects and manage permissions.</p>
        </div>
        {capability.canCreateUsers && (
          <Button onClick={openCreate}>Add user</Button>
        )}
      </div>
      {error && (
        <div className="px-4 py-2 text-sm text-rose-300">{error}</div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-white/50">
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium">Projects</th>
              <th className="px-4 py-2 font-medium">Permissions</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-white/60" colSpan={4}>
                  No users yet.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-t border-white/10">
                <td className="px-4 py-3">
                  <div className="font-medium text-white/90 flex items-center gap-2">
                    {u.name || u.email || 'User'}
                    {u.isSuperAdmin && <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-200">Super Admin</span>}
                  </div>
                  <div className="text-xs text-white/50">{u.email || '—'}</div>
                </td>
                <td className="px-4 py-3 text-xs text-white/70">
                  {u.isSuperAdmin && <div>All projects (edit)</div>}
                  {!u.isSuperAdmin && u.accesses.length === 0 && <div>No access assigned</div>}
                  {!u.isSuperAdmin && u.accesses.length > 0 && (
                    <ul className="space-y-1">
                      {u.accesses.map((acc) => (
                        <li key={`${u.id}-${acc.projectId}`} className="flex items-center justify-between gap-2">
                          <span>{acc.projectName || 'Project'}</span>
                          <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide">{acc.accessLevel}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-white/70">
                  {u.permissions.canAccessUsers ? (
                    <div>
                      <div>Access Users</div>
                      <ul className="mt-1 space-y-1 text-[11px] text-white/50">
                        {u.permissions.canCreateUsers && <li>• Can add users</li>}
                        {u.permissions.canEditUsers && <li>• Can edit users</li>}
                        {u.permissions.canDeleteUsers && <li>• Can delete users</li>}
                      </ul>
                    </div>
                  ) : (
                    <div>Standard</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    {capability.canEditUsers && !u.isSuperAdmin && (
                      <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => openEdit(u)}>
                        Edit
                      </Button>
                    )}
                    {capability.canDeleteUsers && !u.isSuperAdmin && u.id !== currentUserId && (
                      <Button
                        variant="ghost"
                        className="h-8 px-3 text-xs text-rose-300 hover:text-rose-200"
                        onClick={() => deleteUser(u)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setForm(createFormState(projects)) }}>
        <DialogHeader>{form.id ? 'Edit user' : 'Add user'}</DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <div>
            <div className="mb-2 text-sm font-semibold text-white">Project access</div>
            <div className="space-y-2 max-h-60 overflow-auto pr-1 -mr-1">
              {projects.map((project) => {
                const cfg = form.projects[project.id] || { enabled: false, level: 'READ' as AccessLevel }
                return (
                  <div key={project.id} className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
                    <label className="flex items-center justify-between text-sm">
                      <span>{project.name}</span>
                      <input
                        type="checkbox"
                        checked={cfg.enabled}
                        onChange={(e) => {
                          const enabled = e.target.checked
                          setForm((prev) => ({
                            ...prev,
                            projects: {
                              ...prev.projects,
                              [project.id]: { ...cfg, enabled },
                            },
                          }))
                        }}
                      />
                    </label>
                    {cfg.enabled && (
                      <select
                        className="mt-2 w-full rounded-md border border-white/10 bg-white/10 px-2 py-1 text-sm"
                        value={cfg.level}
                        onChange={(e) => {
                          const level = e.target.value === 'EDIT' ? 'EDIT' : 'READ'
                          setForm((prev) => ({
                            ...prev,
                            projects: {
                              ...prev.projects,
                              [project.id]: { enabled: true, level },
                            },
                          }))
                        }}
                      >
                        <option value="READ">Read only</option>
                        <option value="EDIT">Edit</option>
                      </select>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.permissions.canAccessUsers}
                onChange={(e) => {
                  const enabled = e.target.checked
                  setForm((prev) => ({
                    ...prev,
                    permissions: { ...prev.permissions, canAccessUsers: enabled },
                  }))
                }}
              />
              Can access Users section
            </label>
            {form.permissions.canAccessUsers && (
              <div className="ml-6 mt-2 space-y-1 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.permissions.canCreateUsers}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        permissions: { ...prev.permissions, canCreateUsers: e.target.checked },
                      }))
                    }
                  />
                  Can add users
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.permissions.canEditUsers}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        permissions: { ...prev.permissions, canEditUsers: e.target.checked },
                      }))
                    }
                  />
                  Can edit users
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.permissions.canDeleteUsers}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        permissions: { ...prev.permissions, canDeleteUsers: e.target.checked },
                      }))
                    }
                  />
                  Can delete users
                </label>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>{loading ? 'Saving…' : 'Save user'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
