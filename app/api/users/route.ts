import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/tenant'

export async function GET() {
  const { user, workspaceId } = await requireUser()
  if (!workspaceId) return Response.json([])
  const users = await prisma.user.findMany({
    where: {
      memberships: { some: { teamId: workspaceId } },
    },
    select: { id: true, name: true, email: true, image: true },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  })
  return Response.json(users)
}
