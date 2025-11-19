import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/tenant'
import { sendDirectMessageEmail } from '@/lib/email'

async function getSharedProjects(
  userId: string,
  partnerId: string,
  workspaceId: string,
  currentIsSuper: boolean,
) {
  if (currentIsSuper) {
    const partnerProjects = await prisma.projectAccess.findMany({
      where: { userId: partnerId, project: { teamId: workspaceId } },
      include: { project: { select: { id: true, name: true } } },
    })
    return partnerProjects.map((s) => ({ id: s.projectId, name: s.project?.name || 'Project' }))
  }
  const mine = await prisma.projectAccess.findMany({
    where: { userId, project: { teamId: workspaceId } },
    select: { projectId: true },
  })
  const projectIds = mine.map((p) => p.projectId)
  if (projectIds.length === 0) return []
  const shared = await prisma.projectAccess.findMany({
    where: { userId: partnerId, projectId: { in: projectIds }, project: { teamId: workspaceId } },
    include: { project: { select: { id: true, name: true } } },
  })
  return shared.map((s) => ({ id: s.projectId, name: s.project?.name || 'Project' }))
}

export async function GET(req: NextRequest) {
  const { user, workspaceId, workspace } = await requireUser()
  if (!workspaceId) {
    return Response.json({ error: 'Select a workspace first' }, { status: 400 })
  }
  const { searchParams } = new URL(req.url)
  const partnerId = searchParams.get('partnerId')
  if (!partnerId) return Response.json({ error: 'partnerId required' }, { status: 400 })
  const partner = await prisma.user.findUnique({ where: { id: partnerId } })
  if (!partner) return Response.json({ error: 'Not found' }, { status: 404 })
  const membership = await prisma.membership.findFirst({
    where: { teamId: workspaceId, userId: partner.id },
  })
  if (!membership) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  const workspaceOwnerId = workspace?.ownerId || null
  const currentIsSuper = workspaceOwnerId === user.id
  const partnerIsSuper = workspaceOwnerId === partner.id
  let shared = await getSharedProjects(user.id, partnerId, workspaceId, currentIsSuper)
  if (!currentIsSuper && !partnerIsSuper && shared.length === 0) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  const messages = await prisma.userMessage.findMany({
    where: {
      OR: [
        { senderId: user.id, receiverId: partnerId },
        { senderId: partnerId, receiverId: user.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
    include: { sender: { select: { id: true, name: true, email: true } } },
  })
  return Response.json({ messages, sharedProjects: shared })
}

export async function POST(req: NextRequest) {
  const { user, workspaceId, workspace } = await requireUser()
  if (!workspaceId) {
    return Response.json({ error: 'Select a workspace first' }, { status: 400 })
  }
  const body = await req.json().catch(() => ({}))
  const receiverId = String(body?.receiverId || '')
  const content = String(body?.content || '').trim()
  if (!receiverId || !content) {
    return Response.json({ error: 'receiverId and content required' }, { status: 400 })
  }
  const partner = await prisma.user.findUnique({ where: { id: receiverId } })
  if (!partner) return Response.json({ error: 'User not found' }, { status: 404 })
  const membership = await prisma.membership.findFirst({
    where: { teamId: workspaceId, userId: partner.id },
  })
  if (!membership) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }
  if (partner.id === user.id) return Response.json({ error: 'Cannot message yourself' }, { status: 400 })
  const workspaceOwnerId = workspace?.ownerId || null
  const currentIsSuper = workspaceOwnerId === user.id
  const partnerIsSuper = workspaceOwnerId === partner.id
  const shared = await getSharedProjects(user.id, receiverId, workspaceId, currentIsSuper)
  if (!currentIsSuper && !partnerIsSuper && shared.length === 0) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  const projectId = shared[0]?.id || null
  const created = await prisma.userMessage.create({
    data: {
      senderId: user.id,
      receiverId,
      projectId,
      content,
    },
    include: { sender: { select: { id: true, name: true, email: true } } },
  })
  const pref = await prisma.notificationPreference.findUnique({ where: { userId: receiverId } })
  if ((pref?.emailDirectMessage ?? true) && partner.email) {
    try {
      await sendDirectMessageEmail({
        to: partner.email,
        recipientName: partner.name,
        sender: { name: user.name, email: user.email },
        content,
        projectName: shared[0]?.name,
      })
    } catch (e) {
      console.error('Failed to send direct message email', e)
    }
  }
  return Response.json(created, { status: 201 })
}
