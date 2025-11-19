"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogFooter, DialogHeader } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function ArchiveProject({ projectId, projectName, archivedAt }: { projectId: string; projectName: string; archivedAt?: string | Date | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const isArchived = !!archivedAt

  async function toggleArchive() {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !isArchived }),
      })
      if (res.ok) {
        setOpen(false)
        window.dispatchEvent(new Event('projects:refresh'))
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
        className={isArchived ? 'border-emerald-500/50 text-emerald-200 hover:text-emerald-100' : 'border-white/20'}
        onClick={() => setOpen(true)}
      >
        {isArchived ? 'Unarchive' : 'Archive'}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>{isArchived ? 'Unarchive project' : 'Archive project'}</DialogHeader>
        <div className="space-y-3 text-sm text-white/80">
          {isArchived ? (
            <p>Restore “{projectName}” to the active list.</p>
          ) : (
            <>
              <p>Archive “{projectName}” to hide it from active views without deleting any tasks, files, or credentials.</p>
              <p className="text-white/60">You can unarchive later from the Archives list.</p>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button
            onClick={toggleArchive}
            disabled={loading}
            className={isArchived ? undefined : 'border border-white/10'}
          >
            {loading ? (isArchived ? 'Restoring…' : 'Archiving…') : (isArchived ? 'Unarchive' : 'Archive Project')}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
