import { prisma } from '@/lib/prisma'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { user } = await requireUser()
  const body = await req.json()
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.map((x: any) => String(x)) : []
  if (ids.length === 0) return Response.json({ ok: true })
  const allowedTeams = await teamIdsForUser(user.id)
  const msgs = await prisma.teamMessage.findMany({ where: { id: { in: ids }, teamId: { in: allowedTeams } } })
  const data = msgs.map((m) => ({ messageId: m.id, userId: user.id }))
  if (data.length > 0) {
    await prisma.teamMessageRead.createMany({ data, skipDuplicates: true })
  }
  return Response.json({ ok: true })
}

