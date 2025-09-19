import { requireUser, projectWhereForUser } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { ProjectMedia } from '@/components/project-media'

export const dynamic = 'force-dynamic'

async function getProject(id: string) {
  const { user } = await requireUser()
  const projectWhere = await projectWhereForUser(user.id)
  const project = await prisma.project.findFirst({ where: { id, AND: [projectWhere] } })
  if (!project) notFound()
  return project
}

export default async function ProjectMediaPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id)
  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold">Media — {project.name}</div>
      <ProjectMedia projectId={project.id} />
    </div>
  )
}
