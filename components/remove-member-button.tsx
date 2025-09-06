"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function RemoveMemberButton({ teamId, userId, disabled }: { teamId: string; userId: string; disabled?: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function remove() {
    if (loading) return
    const ok = window.confirm('Remove this member from the team?')
    if (!ok) return
    setLoading(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      className="border-red-500/40 text-red-400 hover:text-red-300"
      onClick={remove}
      disabled={disabled || loading}
      aria-label="Remove member"
      title="Remove member"
    >
      {loading ? 'Removing…' : 'Remove'}
    </Button>
  )
}

