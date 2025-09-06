import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, teamIdsForUser } from '@/lib/tenant'

type Params = { params: { id: string } }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  // Ensure the credential belongs to a project within user's teams
  const cred = await prisma.credential.findFirst({
    where: { id: params.id, project: { teamId: { in: teamIds } } },
  })
  if (!cred) return Response.json({ error: 'Not found' }, { status: 404 })
  await prisma.credential.delete({ where: { id: cred.id } })
  return new Response(null, { status: 204 })
}

