import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/tenant'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await requireUser()
  const channelId = params.id
  const member = await prisma.channelMember.findFirst({ where: { channelId, userId: user.id } })
  if (!member) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const items = await prisma.channelMessage.findMany({ where: { channelId }, include: { author: true }, orderBy: { createdAt: 'asc' }, take: 500 })
  return Response.json(items)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await requireUser()
  const channelId = params.id
  const member = await prisma.channelMember.findFirst({ where: { channelId, userId: user.id } })
  if (!member) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const content = String(body?.content || '').trim()
  if (!content) return Response.json({ error: 'Content required' }, { status: 400 })
  const created = await prisma.channelMessage.create({ data: { channelId, authorId: user.id, content }, include: { author: true } })
  return Response.json(created, { status: 201 })
}

