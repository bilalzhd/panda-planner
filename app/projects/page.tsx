import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

async function getProjects() {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  return prisma.project.findMany({ where: { teamId: { in: teamIds } }, orderBy: { createdAt: 'desc' } })
}

export default async function ProjectsPage() {
  const projects = await getProjects()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        <form action={async (fd: FormData) => {
          'use server'
          const name = String(fd.get('name') || '').trim()
          if (!name) return
          await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
        }} className="hidden"></form>
        <Link href="/dashboard" className="text-sm text-white/70 hover:text-white">Create via sidebar</Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <Card key={p.id}>
            <CardHeader className="font-semibold flex items-center justify-between">
              <span>{p.name}</span>
              <Link className="text-sm text-white/70 hover:text-white" href={`/projects/${p.id}`}>Open</Link>
            </CardHeader>
            <CardContent>
              <div className="text-white/70 text-sm">{p.description || 'No description'}</div>
            </CardContent>
          </Card>
        ))}
        {projects.length === 0 && <div className="text-white/60">No projects yet. Use “Add Project” in the sidebar.</div>}
      </div>
    </div>
  )
}

