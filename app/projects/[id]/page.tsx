import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { taskSchema } from '@/lib/validators'
import { TaskStatus } from '@prisma/client'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import { revalidatePath } from 'next/cache'
import { ProjectBoard } from '@/components/project-board'
import { CredentialsPanel } from '@/components/credentials-panel'
import { DeleteProject } from '@/components/delete-project'

export const dynamic = 'force-dynamic'

async function getProject(id: string) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const project = await prisma.project.findFirst({
    where: { id, teamId: { in: teamIds } },
    include: { tasks: { orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], include: { assignedTo: true, timesheets: true } } },
  })
  if (!project) notFound()
  return project
}

function colorToHex(c?: string | null) {
  const k = (c || 'gray').toLowerCase()
  switch (k) {
    case 'blue': return '#60a5fa'
    case 'green': return '#34d399'
    case 'orange': return '#fb923c'
    case 'purple': return '#a78bfa'
    case 'pink': return '#f472b6'
    case 'teal': return '#14b8a6'
    case 'red': return '#f87171'
    case 'yellow': return '#facc15'
    case 'gray':
    default: return '#9ca3af'
  }
}

function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return { r: 156, g: 163, b: 175 }
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id)
  const { user } = await requireUser()
  const startOfToday = new Date(new Date().toDateString())
  const overdueYours = project.tasks
    .filter((t: any) => t.assignedToId === user.id && t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < startOfToday)
    .sort((a: any, b: any) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())

  const hex = colorToHex(project.color)
  const { r, g, b } = hexToRgb(hex)

  return (
    <div className="relative pt-4 px-4 rounded-lg">
      {/* Soft background tint based on project color */}
      <div
        aria-hidden
        className="rounded-lg pointer-events-none absolute inset-x-0 top-0 h-48 -z-10"
        style={{
          background: `linear-gradient(180deg, rgba(${r}, ${g}, ${b}, 0.20) 0%, rgba(${r}, ${g}, ${b}, 0.08) 50%, rgba(${r}, ${g}, ${b}, 0) 100%)`,
        }}
      />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: hex }} />
            {project.name}
          </h1>
          <DeleteProject projectId={project.id} projectName={project.name} />
        </div>
        {overdueYours.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-2 text-sm font-semibold">Overdue Tasks</div>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {overdueYours.slice(0, 9).map((t: any) => (
                <li key={t.id} className="rounded-md border border-white/10 bg-white/5 p-3 text-sm">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-white/60">Due {new Date(t.dueDate).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ProjectBoard projectId={project.id} initialTasks={project.tasks as any} />

        <CredentialsPanel projectId={project.id} />
      </div>
    </div>
  )
}
