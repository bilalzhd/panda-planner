import { prisma } from '@/lib/prisma'
import { projectSchema } from '@/lib/validators'
import { NextRequest } from 'next/server'
import { requireUser, teamIdsForUser } from '@/lib/tenant'

export async function GET() {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const projects = await prisma.project.findMany({
    where: { teamId: { in: teamIds } },
    orderBy: { createdAt: 'desc' },
  })
  return Response.json(projects)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = projectSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.format() }, { status: 400 })
  const { user, personalTeam } = await requireUser()
  const teamId = (body?.teamId as string) || personalTeam.id
  // Ensure user has access to this team
  const membership = await prisma.membership.findFirst({ where: { teamId, userId: user.id } })
  if (!membership) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const project = await prisma.project.create({ data: { ...parsed.data, teamId } })
  return Response.json(project, { status: 201 })
}
