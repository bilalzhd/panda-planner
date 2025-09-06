"use client"
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogFooter, DialogHeader } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function DeleteProject({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)

  const code = useMemo(() => {
    // Simple, predictable confirmation code
    return `DELETE ${projectName}`
  }, [projectName])

  async function onDelete() {
    if (value !== code) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (res.ok) {
        setOpen(false)
        router.push('/projects')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="border-red-500/40 text-red-400 hover:text-red-300"
        onClick={() => setOpen(true)}
      >
        Delete Project
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>Delete Project</DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-white/80">
            This action permanently deletes the project “{projectName}” and all associated tasks, timesheets, and credentials. This cannot be undone.
          </p>
          <p className="text-white/60">To confirm, type the following code:</p>
          <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs select-all">{code}</div>
          <Input
            placeholder="Type the confirmation code exactly"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button
            onClick={onDelete}
            disabled={loading || value !== code}
            className="bg-red-600 text-white hover:bg-red-500"
          >
            {loading ? 'Deleting…' : 'Confirm Delete'}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}

