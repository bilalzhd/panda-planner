import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, projectWhereForUser, ensureProjectPermission } from '@/lib/tenant'

type Params = { params: { id: string } }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { user } = await requireUser()
  const projectWhere = await projectWhereForUser(user.id)
  // Ensure the credential belongs to a project within user's teams
  const cred = await prisma.credential.findFirst({
    where: { id: params.id, project: projectWhere },
  })
  if (!cred) return Response.json({ error: 'Not found' }, { status: 404 })
  const canEdit = await ensureProjectPermission(user, cred.projectId, 'EDIT')
  if (!canEdit) return Response.json({ error: 'Read-only access' }, { status: 403 })
  await prisma.credential.delete({ where: { id: cred.id } })
  return new Response(null, { status: 204 })
}
