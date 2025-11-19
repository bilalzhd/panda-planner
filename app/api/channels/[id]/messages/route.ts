import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/tenant'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, workspaceId } = await requireUser()
  if (!workspaceId) return Response.json({ error: 'Select a workspace first' }, { status: 400 })
  const channelId = params.id
  const channel = await prisma.teamChannel.findUnique({ where: { id: channelId }, select: { teamId: true } })
  if (!channel || channel.teamId !== workspaceId) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  const member = await prisma.channelMember.findFirst({ where: { channelId, userId: user.id } })
  if (!member) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const items = await prisma.channelMessage.findMany({ where: { channelId }, include: { author: true }, orderBy: { createdAt: 'asc' }, take: 500 })
  return Response.json(items)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, workspaceId } = await requireUser()
  if (!workspaceId) return Response.json({ error: 'Select a workspace first' }, { status: 400 })
  const channelId = params.id
  const channel = await prisma.teamChannel.findUnique({ where: { id: channelId }, select: { teamId: true } })
  if (!channel || channel.teamId !== workspaceId) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  const member = await prisma.channelMember.findFirst({ where: { channelId, userId: user.id } })
  if (!member) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const content = String(body?.content || '').trim()
  if (!content) return Response.json({ error: 'Content required' }, { status: 400 })
  const created = await prisma.channelMessage.create({ data: { channelId, authorId: user.id, content }, include: { author: true } })
  return Response.json(created, { status: 201 })
}
