import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { requireUser, projectScopeForUser, buildProjectWhere } from '@/lib/tenant'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

async function getProjects(query?: string, archived = false) {
  const { user } = await requireUser()
  const scope = await projectScopeForUser(user.id)
  const clauses: any[] = [buildProjectWhere(scope, { includeArchived: archived }), archived ? { archivedAt: { not: null } } : { archivedAt: null }]
  if (query && query.trim()) {
    clauses.push({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    })
  }
  const where = clauses.length > 1 ? { AND: clauses } : clauses[0]
  return prisma.project.findMany({ where, orderBy: { createdAt: 'desc' } })
}

export default async function ProjectsPage({ searchParams }: { searchParams?: { q?: string } }) {
  const q = (searchParams?.q || '').trim()
  const [projects, archived] = await Promise.all([
    getProjects(q, false),
    getProjects(q, true),
  ])
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Projects</h1>
        <div className="flex items-center gap-2">
          <form className="flex items-center gap-2" action="/projects" method="get">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search projects..."
              className="h-8 w-48 rounded-md border border-white/10 bg-white/5 px-3 text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
            <Button type="submit" className="h-8">Search</Button>
          </form>
          <Link href="/dashboard" className="text-sm text-white/70 hover:text-white">Create via sidebar</Link>
        </div>
      </div>
      <section className="space-y-3">
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
          {projects.length === 0 && (
            <div className="text-white/60">
              {q ? 'No matching projects' : 'No projects yet. Use “Add Project” in the sidebar.'}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-sm font-semibold">Archived</div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {archived.map((p) => (
            <Card key={p.id} className="border-dashed border-white/10 bg-white/[0.02]">
              <CardHeader className="font-semibold flex items-center justify-between">
                <span>{p.name}</span>
                <Link className="text-sm text-white/70 hover:text-white" href={`/projects/${p.id}`}>Open</Link>
              </CardHeader>
              <CardContent>
                <div className="text-white/70 text-sm">{p.description || 'No description'}</div>
              </CardContent>
            </Card>
          ))}
          {archived.length === 0 && (
            <div className="text-white/50 text-sm">No archived projects</div>
          )}
        </div>
      </section>
    </div>
  )
}
