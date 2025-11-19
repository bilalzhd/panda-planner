import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/tenant'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { user, workspaceId } = await requireUser()
  if (!workspaceId) return Response.json([])
  const tid = workspaceId
  // Ensure at least one default channel exists
  const existing = await prisma.teamChannel.findMany({ where: { teamId: tid } })
  if (existing.length === 0) {
    const members = await prisma.membership.findMany({ where: { teamId: tid } })
    const general = await prisma.teamChannel.create({ data: { teamId: tid, name: 'general', createdById: user.id } })
    await prisma.channelMember.createMany({ data: members.map((m) => ({ channelId: general.id, userId: m.userId })) })
  }
  const channels = await prisma.teamChannel.findMany({
    where: { teamId: tid, members: { some: { userId: user.id } } },
    include: { _count: { select: { messages: true, members: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return Response.json(channels)
}

export async function POST(req: NextRequest) {
  const { user, workspaceId } = await requireUser()
  if (!workspaceId) {
    return Response.json({ error: 'Select a workspace first' }, { status: 400 })
  }
  const body = await req.json()
  const teamId = String(body?.teamId || workspaceId)
  const name = String(body?.name || '').trim() || 'new-channel'
  const memberIds: string[] = Array.isArray(body?.memberIds) ? body.memberIds.map((x: any) => String(x)) : []
  if (teamId !== workspaceId) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const chan = await prisma.teamChannel.create({ data: { teamId, name, createdById: user.id } })
  // Ensure creator is a member
  const allMembers = new Set([user.id, ...memberIds])
  await prisma.channelMember.createMany({ data: Array.from(allMembers).map((uid) => ({ channelId: chan.id, userId: uid })) })
  return Response.json(chan, { status: 201 })
}
