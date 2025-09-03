import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { taskSchema } from '@/lib/validators'
import { TaskStatus } from '@prisma/client'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import { revalidatePath } from 'next/cache'
import { ProjectBoard } from '@/components/project-board'
import { CredentialsPanel } from '@/components/credentials-panel'

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

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: (project.color ? project.color : '#9ca3af') }} />
          {project.name}
        </h1>
      </div>

      <ProjectBoard projectId={project.id} initialTasks={project.tasks as any} />

      <CredentialsPanel projectId={project.id} />
    </div>
  )
}
