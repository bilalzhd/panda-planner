import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { requireUser, projectWhereForUser, projectScopeForUser } from '@/lib/tenant'
import { ProjectTabs } from '@/components/project-tabs'
import { DeleteProject } from '@/components/delete-project'
import { EditableProjectTitle } from '@/components/editable-project-title'
import { ArchiveProject } from '@/components/archive-project'

export const dynamic = 'force-dynamic'

async function getProject(id: string) {
  const { user, workspaceId } = await requireUser()
  const scope = await projectScopeForUser(user.id, workspaceId)
  const projectWhere = await projectWhereForUser(user.id, { includeArchived: true, workspaceId })
  const project = await prisma.project.findFirst({
    where: { id, AND: [projectWhere] },
    include: { tasks: { orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], include: { assignedTo: true, createdBy: true, timesheets: true } } },
  })
  if (!project) notFound()
  const superAdmin = scope.isSuperAdmin
  const directAccess = superAdmin
    ? null
    : await prisma.projectAccess.findUnique({ where: { projectId_userId: { projectId: project.id, userId: user.id } } })
  if (directAccess) {
    await prisma.projectAccess.update({
      where: { projectId_userId: { projectId: project.id, userId: user.id } },
      data: { lastSeenAt: new Date() },
    })
  }
  const accessLevel = superAdmin ? 'EDIT' : directAccess?.accessLevel || 'READ'
  return { project, user, accessLevel }
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

export default async function ProjectPage({ params, searchParams }: { params: { id: string }; searchParams?: { tab?: string } }) {
  const { project, user, accessLevel } = await getProject(params.id)
  const initialTab = searchParams?.tab || undefined
  const startOfToday = new Date(new Date().toDateString())
  const isArchived = !!project.archivedAt
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
            <EditableProjectTitle projectId={project.id} initialName={project.name} colorHex={hex} canEdit={accessLevel === 'EDIT'} />
            {isArchived && (
              <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/70">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Archived
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {accessLevel === 'EDIT' && (
              <>
                <ArchiveProject projectId={project.id} projectName={project.name} archivedAt={project.archivedAt} />
                <DeleteProject projectId={project.id} projectName={project.name} />
              </>
            )}
          </div>
        </div>
        <ProjectTabs
          projectId={project.id}
          tasks={project.tasks as any}
          overdue={overdueAll as any}
          accessLevel={accessLevel as 'READ' | 'EDIT'}
          initialTab={initialTab}
          isArchived={isArchived}
        />
      </div>
    </div>
  )
}
