import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { requireUser, projectWhereForUser } from '@/lib/tenant'
import { ProjectTabs } from '@/components/project-tabs'
import { DeleteProject } from '@/components/delete-project'
import { EditableProjectTitle } from '@/components/editable-project-title'

export const dynamic = 'force-dynamic'

async function getProject(id: string) {
  const { user } = await requireUser()
  const projectWhere = await projectWhereForUser(user.id)
  const project = await prisma.project.findFirst({
    where: { id, AND: [projectWhere] },
    include: { tasks: { orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], include: { assignedTo: true, createdBy: true, timesheets: true } } },
  })
  if (!project) notFound()
  const membership = await prisma.membership.findFirst({ where: { teamId: project.teamId, userId: user.id } })
  return { project, user, canManage: !!membership }
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
  const { project, user, canManage } = await getProject(params.id)
  const startOfToday = new Date(new Date().toDateString())
  const prRank = (p?: string | null) => (p === 'HIGH' ? 0 : p === 'MEDIUM' ? 1 : 2)
  const ownRank = (t: any) => (t.assignedToId === user.id ? 0 : 1)
  const overdueAll = (project.tasks as any[])
    .filter((t) => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < startOfToday)
    .sort((a, b) => {
      const pa = prRank(a.priority)
      const pb = prRank(b.priority)
      if (pa !== pb) return pa - pb
      const oa = ownRank(a)
      const ob = ownRank(b)
      if (oa !== ob) return oa - ob
      return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()
    })

  const hex = colorToHex(project.color)
  const { r, g, b } = hexToRgb(hex)

  return (
    <div className="relative pt-4 px-4 rounded-lg">
      <div
        aria-hidden
        className="rounded-lg pointer-events-none absolute inset-x-0 top-0 h-40 -z-10"
        style={{
          background: `linear-gradient(180deg, rgba(${r}, ${g}, ${b}, 0.18) 0%, rgba(${r}, ${g}, ${b}, 0.06) 50%, rgba(${r}, ${g}, ${b}, 0) 100%)`,
        }}
      />
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 py-1">
          <div className="flex-1 min-w-0">
            <EditableProjectTitle projectId={project.id} initialName={project.name} colorHex={hex} canEdit={canManage} />
          </div>
          {canManage && <DeleteProject projectId={project.id} projectName={project.name} />}
        </div>
        <ProjectTabs projectId={project.id} tasks={project.tasks as any} overdue={overdueAll as any} canManageClients={canManage} />
      </div>
    </div>
  )
}
