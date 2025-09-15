import { prisma } from '@/lib/prisma'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user } = await requireUser()
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('teamId') || undefined
  const allowed = new Set(await teamIdsForUser(user.id))
  const tid = teamId && allowed.has(teamId) ? teamId : (Array.from(allowed)[0] || null)
  if (!tid) return Response.json([])
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
  const { user } = await requireUser()
  const body = await req.json()
  const teamId = String(body?.teamId || '')
  const name = String(body?.name || '').trim() || 'new-channel'
  const memberIds: string[] = Array.isArray(body?.memberIds) ? body.memberIds.map((x: any) => String(x)) : []
  const allowed = new Set(await teamIdsForUser(user.id))
  if (!allowed.has(teamId)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const chan = await prisma.teamChannel.create({ data: { teamId, name, createdById: user.id } })
  // Ensure creator is a member
  const allMembers = new Set([user.id, ...memberIds])
  await prisma.channelMember.createMany({ data: Array.from(allMembers).map((uid) => ({ channelId: chan.id, userId: uid })) })
  return Response.json(chan, { status: 201 })
}

